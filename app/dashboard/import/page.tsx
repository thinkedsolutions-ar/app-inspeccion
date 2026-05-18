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
      header: true, // Usa la primera fila como nombres de variables
      skipEmptyLines: true,
      complete: async (results) => {
        const filas = results.data as any[];
        addToLog(`Se encontraron ${filas.length} registros en el CSV.`);

        const payload = filas.map((row) => {
          // 1. Extraer URLs de fotos separadas por coma
          let fotosArray: string[] = [];
          if (row['links_fotos']) {
            fotosArray = row['links_fotos'].split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
          } else if (row['foto']) {
            fotosArray = row['foto'].split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
          }

          // 2. Extraer observación según el tipo de hoja
          const observacion = row['calle_obs_general'] || row['emop_observacion'] || row['asp_obs_general'] || row['observacion_seguimiento_temas'] || row['desc_limp_int_obs'] || '';

          // 3. Normalizar Fecha y Hora
          let fechaHora = new Date().toISOString();
          if (row['timestamp']) {
            fechaHora = new Date(row['timestamp']).toISOString();
          } else if (row['fecha']) {
            fechaHora = new Date(row['fecha']).toISOString();
          }

          // 4. Limpiar nombre del inspector si viene con espacios extra
          let nombreInspector = row['inspector_legajo_nombre'] || 'Desconocido';
          
          return {
            id: row['id_inspeccion'] || `${new Date().getTime()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
            created_at: fechaHora,
            inspector: nombreInspector,
            tipo: tipoSeleccionado,
            lat: parseFloat(row['latitude']) || null,
            lon: parseFloat(row['longitude']) || null,
            fotos: fotosArray,
            obs_general: observacion,
            datos_formulario: row // Toda la fila cruda se guarda en el JSONB
          };
        });

        addToLog(`Subiendo ${payload.length} registros a Supabase...`);

        // Subir en bloques de 100 para evitar saturar la base de datos
        let successCount = 0;
        let errorCount = 0;
        const chunkSize = 100;
        
        for (let i = 0; i < payload.length; i += chunkSize) {
          const chunk = payload.slice(i, i + chunkSize);
          const { error } = await supabase.from('inspections').insert(chunk);
          
          if (error) {
            addToLog(`❌ Error en el bloque ${i}: ${error.message}`);
            errorCount += chunk.length;
          } else {
            successCount += chunk.length;
          }
        }

        addToLog(`✅ Proceso finalizado. Subidos con éxito: ${successCount}. Errores: ${errorCount}.`);
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
          <input 
            type="file" 
            accept=".csv"
            onChange={handleFileUpload}
            disabled={loading}
            className="w-full p-2 bg-white border rounded"
          />
        </div>

        {/* Consola de Logs */}
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs h-64 overflow-y-auto">
          {log.length === 0 ? "Esperando archivo CSV..." : log.map((msg, i) => <div key={i}>{msg}</div>)}
        </div>
      </div>
    </div>
  );
}