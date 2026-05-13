'use client'; // Necesario porque usamos lógica de cliente

import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';

export default function ImportPage() {
  
  const handleUpload = (e: any, table: string) => {
    if (!e.target.files || e.target.files.length === 0) return;

    Papa.parse(e.target.files[0], {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const { error } = await supabase.from(table).insert(results.data);
        if (error) {
          alert("Error al cargar: " + error.message);
        } else {
          alert("¡Datos cargados correctamente en " + table + "!");
        }
      }
    });
  };

  return (
    <div className="p-8 text-black bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6 text-[#003366]">Carga Masiva de Listados (CSV)</h1>
      
      <div className="grid gap-6">
        {['conductores', 'unidades', 'servicios'].map((tabla) => (
          <div key={tabla} className="bg-white p-6 rounded-xl shadow-sm border flex items-center justify-between">
            <div>
              <h4 className="font-bold capitalize text-lg">{tabla}</h4>
              <p className="text-xs text-gray-500 mb-2">Asegúrate de que el CSV tenga los encabezados correctos.</p>
            </div>
            <input 
              type="file" 
              accept=".csv" 
              onChange={(e) => handleUpload(e, tabla)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-[#003366] hover:file:bg-blue-100"
            />
          </div>
        ))}
      </div>
      
      <a href="/dashboard" className="mt-8 inline-block text-[#003366] font-bold hover:underline">← Volver al Dashboard</a>
    </div>
  );
}

