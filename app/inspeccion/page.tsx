'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function InspeccionPage() {
  const [user, setUser] = useState<any>(null);
  const [estadoJornada, setEstadoJornada] = useState<'INACTIVA' | 'TRABAJANDO' | 'REFRIGERIO'>('INACTIVA');
  const [loading, setLoading] = useState(false);
  const [tipoInspeccion, setTipoInspeccion] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [files, setFiles] = useState<File[]>([]);

  // 1. Cargar sesión y estado de jornada al iniciar
  useEffect(() => {
    const session = localStorage.getItem('buttini_user');
    if (!session) {
      window.location.href = '/';
      return;
    }
    const userData = JSON.parse(session);
    setUser(userData);
    checkJornada(userData.username);
  }, []);

  const checkJornada = async (username: string) => {
    const hoy = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('shifts')
      .select('*')
      .eq('username', username)
      .gte('fecha', hoy)
      .order('fecha', { ascending: false });

    if (data && data.length > 0) {
      const ultimaAccion = data[0].accion;
      if (ultimaAccion === 'INICIO' || ultimaAccion === 'FIN_REF') setEstadoJornada('TRABAJANDO');
      else if (ultimaAccion === 'INICIO_REF') setEstadoJornada('REFRIGERIO');
      else if (ultimaAccion === 'FIN') setEstadoJornada('INACTIVA');
    }
  };

  // 2. Lógica de Marcación de Jornada
  const logShift = async (accion: string) => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { error } = await supabase.from('shifts').insert([{
        username: user.username,
        nombre: user.nombre,
        accion: accion,
        lat: pos.coords.latitude,
        lon: pos.coords.longitude
      }]);

      if (!error) {
        if (accion === 'FIN') {
          localStorage.removeItem('buttini_user');
          window.location.href = '/';
        } else {
          checkJornada(user.username);
        }
      }
      setLoading(false);
    });
  };

  // 3. Envío del Formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const idInspeccion = `${new Date().getTime()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      let fotosUrls: string[] = [];

      // Subir fotos si existen
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${idInspeccion}_${Math.random()}.${fileExt}`;
        const { data: uploadData } = await supabase.storage
          .from('fotos-inspecciones')
          .upload(fileName, file);
        
        if (uploadData) {
          const { data: urlData } = supabase.storage.from('fotos-inspecciones').getPublicUrl(fileName);
          fotosUrls.push(urlData.publicUrl);
        }
      }

      // Obtener ubicación
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { error } = await supabase.from('inspections').insert([{
          id: idInspeccion,
          inspector: user.nombre,
          tipo: tipoInspeccion,
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          fotos: fotosUrls,
          datos_formulario: formData,
          obs_general: formData.observaciones || ''
        }]);

        if (error) alert("Error al guardar: " + error.message);
        else {
          alert("¡Inspección guardada con éxito! ID: " + idInspeccion);
          window.location.reload();
        }
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-10 text-black">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 text-black pb-10">
      {/* BARRA SUPERIOR */}
      <nav className="bg-[#333] text-white p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="font-bold">👤 {user.nombre}</span>
          <span className="text-xs text-gray-400">{estadoJornada}</span>
        </div>
        <div className="flex gap-2">
          {estadoJornada === 'TRABAJANDO' && (
            <button onClick={() => logShift('INICIO_REF')} className="bg-orange-500 px-3 py-1 rounded text-xs font-bold">☕ PAUSA</button>
          )}
          {estadoJornada === 'REFRIGERIO' && (
            <button onClick={() => logShift('FIN_REF')} className="bg-green-600 px-3 py-1 rounded text-xs font-bold">▶ REANUDAR</button>
          )}
          {estadoJornada === 'TRABAJANDO' && (
            <button onClick={() => logShift('FIN')} className="bg-red-500 px-3 py-1 rounded text-xs font-bold">CERRAR DÍA</button>
          )}
        </div>
      </nav>

      {/* PANTALLA DE INICIO DE JORNADA */}
      {estadoJornada === 'INACTIVA' && (
        <div className="flex flex-col items-center justify-center p-10 mt-10">
          <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-sm">
            <h2 className="text-xl font-bold mb-4">¿Iniciar Jornada?</h2>
            <p className="text-gray-600 mb-6">Debe registrar el inicio para trabajar hoy.</p>
            <button 
              onClick={() => logShift('INICIO')}
              className="w-full bg-[#003366] text-white p-4 rounded-lg font-bold"
              disabled={loading}
            >
              {loading ? 'Marcando...' : 'INICIAR AHORA'}
            </button>
          </div>
        </div>
      )}

      {/* FORMULARIO (Sólo si está trabajando) */}
      {estadoJornada === 'TRABAJANDO' && (
        <main className="p-4 max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg border-t-4 border-[#003366]">
            <header className="text-center mb-6">
              <img src="https://i.ibb.co/RG0tNq6t/Logo-Web-copia.png" className="h-10 mx-auto mb-2" alt="Logo" />
              <h1 className="text-lg font-bold text-[#003366]">PARTE DIGITAL DE INSPECTORES</h1>
            </header>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* TIPO DE INSPECCIÓN */}
              <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-[#003366]">
                <label className="block font-bold text-[#003366] mb-2 text-sm uppercase">📋 Tipo de Inspección</label>
                <select 
                  className="w-full p-3 border rounded bg-white"
                  value={tipoInspeccion}
                  onChange={(e) => setTipoInspeccion(e.target.value)}
                  required
                >
                  <option value="">-- Seleccione --</option>
                  <option value="1-INSPECTOR EN CALLE">1 - INSPECTOR EN CALLE</option>
                  <option value="2-EMOP">2 - EMOP</option>
                  <option value="5-INSPECCION AREA DE DESCANSO">5 - AREA DE DESCANSO</option>
                </select>
              </div>

              {tipoInspeccion && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Unidad</label>
                      <input 
                        type="text" 
                        placeholder="Ej: 145"
                        className="w-full p-3 border rounded"
                        onChange={(e) => setFormData({...formData, unidad: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Servicio</label>
                      <input 
                        type="text" 
                        placeholder="Ej: 540"
                        className="w-full p-3 border rounded"
                        onChange={(e) => setFormData({...formData, servicio: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Observaciones</label>
                    <textarea 
                      className="w-full p-3 border rounded" 
                      rows={4}
                      onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                    ></textarea>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">📷 Adjuntar Fotos</label>
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*"
                      className="w-full p-2 text-sm"
                      onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#003366] text-white p-4 rounded font-bold hover:bg-black transition-colors"
                    disabled={loading}
                  >
                    {loading ? 'ENVIANDO...' : 'GUARDAR Y ENVIAR'}
                  </button>
                </>
              )}
            </form>
          </div>
        </main>
      )}

      {/* PANTALLA REFRIGERIO */}
      {estadoJornada === 'REFRIGERIO' && (
        <div className="fixed inset-0 bg-[#003366]/95 flex flex-col items-center justify-center text-center p-10 z-[60]">
          <h1 className="text-4xl font-bold text-orange-400 mb-4">☕ EN REFRIGERIO</h1>
          <p className="text-white mb-8">El sistema de registro está pausado.</p>
          <button 
            onClick={() => logShift('FIN_REF')}
            className="bg-green-600 text-white px-10 py-4 rounded-full font-bold text-lg"
          >
            ▶ REANUDAR TRABAJO
          </button>
        </div>
      )}
    </div>
  );
}