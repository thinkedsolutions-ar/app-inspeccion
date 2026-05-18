'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';

export default function ImportPage() {
  const [loading, setLoading] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState('1-INSPECTOR EN CALLE');
  const [log, setLog] = useState<string[]>([]);

  const addToLog = (msg: string) => setLog(prev => [...prev, msg]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    addToLog(`Leyendo archivo: ${file.name}...`);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const filas = results.data as any[];
        addToLog(`Se encontraron ${filas.length} registros en el CSV.`);

        const payload = filas.map((row, index) => {
          // 1. Extraer URLs
          let fotosArray: string[] = [];
          if (row['links_fotos']) {
            fotosArray = row['links_fotos'].split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
          } else if (row['foto']) {
            fotosArray = row['foto'].split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
          }

          // 2. Extraer Observación
          const observacion = row['calle_obs_general'] || row['emop_observacion'] || row['asp_obs_general'] || row['observacion_seguimiento_temas'] || row['desc_limp_int_obs'] || '';

          // 3. NORMALIZACIÓN DE FECHAS
          let fechaHora = new Date().toISOString();
          const rawDate = row['timestamp'] || row['fecha'];
          
          if (rawDate && rawDate.trim() !== '') {
            try {
              let parsedDate = new Date(rawDate);
              if (isNaN(parsedDate.getTime())) {
                const parts = rawDate.split('/');
                if (parts.length >= 3) {
                  const mes = parts[1].trim();
                  const dia = parts[0].trim();
                  const anioYResto = parts[2].trim();
                  parsedDate = new Date(`${mes}/${dia}/${anioYResto}`);
                }
              }
              if (!isNaN(parsedDate.getTime())) {
                fechaHora = parsedDate.toISOString();
              }
            } catch (err) {}
          }

          let nombreInspector = row['inspector_legajo_nombre'] || 'Desconocido';
          
          // Generador de ID a prueba de fallos (Evita que se repitan si el CSV viene sin IDs)
          const fallbackId = `IMP-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

          return {
            id: row['id_inspeccion'] ? String(row['id_inspeccion']).trim() : fallbackId,
            created_at: fechaHora,
            inspector: nombreInspector,
            tipo: tipoSeleccionado,
            lat: parseFloat(row['latitude']) || null,
            lon: parseFloat(row['longitude']) || null,
            fotos: fotosArray,
            obs_general: observacion,
            datos_formulario: row
          };
        });

        addToLog(`Subiendo ${payload.length} registros a Supabase usando UPSERT...`);

        let successCount = 0;
        let errorCount = 0;
        const chunkSize = 100;
        
        for (let i = 0; i < payload.length; i += chunkSize) {
          const chunk = payload.slice(i, i + chunkSize);
          
          // LA MAGIA ESTÁ AQUÍ: usamos "upsert" en lugar de "insert"
          const { error } = await supabase.from('inspections').upsert(chunk, { onConflict: 'id' });
          
          if (error) {
            addToLog(`❌ Error en bloque ${i}: ${error.message}`);
            errorCount += chunk.length;
          } else {
            successCount += chunk.length;
            addToLog(`➡️ Progreso: ${successCount} / ${payload.length}`);
          }
        }

        addToLog(`✅ Proceso finalizado. Éxito: ${successCount}. Errores: ${errorCount}.`);
        setLoading(false);
      }
    });
  };

  return (
    <div className="p-10 max-w-3xl mx-auto bg-gray-50 min-h-screen">
      <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-[#003366]">
        <h1 className="text-2xl font-black text-[#003366] mb-6">Módulo de Importación Histórica (CSV)</h1>
        
        <div className="mb-6 space-y-4 bg-[#eef4f9] p-4 rounded-lg border">
          <label className="block font-bold text-[#003366]">1. Seleccione el Tipo de Inspección a Importar:</label>
          <select 
            className="w-full p-3 border rounded font-bold"
            value={tipoSeleccionado}
            onChange={(e) => setTipoSeleccionado(e.target.value)}
            disabled={loading}
          >
            <option value="1-INSPECTOR EN CALLE">1-INSPECTOR EN CALLE</option>
            <option value="2-EMOP">2-EMOP</option>
            <option value="3-SEGUIMIENTO DE PERSONAL - Aspirante">3-SEGUIMIENTO DE PERSONAL - Aspirante</option>
            <option value="3-SEGUIMIENTO DE PERSONAL - Permanente">3-SEGUIMIENTO DE PERSONAL - Permanente</option>
            <option value="4-SEGUIMIENTO DE TEMAS">4-SEGUIMIENTO DE TEMAS</option>
            <option value="5-INSPECCION AREA DE DESCANSO">5-INSPECCION AREA DE DESCANSO</option>
          </select>
        </div>

        <div className="mb-6 space-y-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <label className="block font-bold text-[#003366]">2. Suba el archivo .CSV de Google Sheets:</label>
          <input type="file" accept=".csv" onChange={handleFileUpload} disabled={loading} className="w-full p-2 bg-white border rounded" />
        </div>

        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto">
          {log.length === 0 ? "Esperando archivo CSV..." : log.map((msg, i) => <div key={i}>{msg}</div>)}
        </div>
      </div>
    </div>
  );
}