'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function InspeccionPage() {
  const [user, setUser] = useState<any>(null);
  const [estadoJornada, setEstadoJornada] = useState<'INACTIVA' | 'TRABAJANDO' | 'REFRIGERIO'>('INACTIVA');
  const [loading, setLoading] = useState(false);
  
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [tipoInspeccion, setTipoInspeccion] = useState('');
  const [subtipoPersonal, setSubtipoPersonal] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [files, setFiles] = useState<File[]>([]);

  // Listas para autocompletado
  const [listas, setListas] = useState<any>({ conductores: [], unidades: [], servicios: [] });

  useEffect(() => {
    const session = localStorage.getItem('buttini_user');
    if (!session) { window.location.href = '/'; return; }
    const userData = JSON.parse(session);
    setUser(userData);
    checkJornada(userData.username);

    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const iso = now.toISOString();
    setFecha(iso.substring(0, 10));
    setHora(iso.substring(11, 16));

    // Traer catálogos
    fetchCatalogos();
  }, []);

  const fetchCatalogos = async () => {
    const [resCond, resUni, resServ] = await Promise.all([
      supabase.from('conductores').select('nombre').order('nombre'),
      supabase.from('unidades').select('numero').order('numero'),
      supabase.from('servicios').select('nombre').order('nombre')
    ]);
    setListas({
      conductores: resCond.data || [],
      unidades: resUni.data || [],
      servicios: resServ.data || []
    });
  };

  const checkJornada = async (username: string) => {
    const hoy = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('shifts').select('*').eq('username', username).gte('fecha', hoy).order('fecha', { ascending: false });
    if (data && data.length > 0) {
      const ultimaAccion = data[0].accion;
      if (ultimaAccion === 'INICIO' || ultimaAccion === 'FIN_REF') setEstadoJornada('TRABAJANDO');
      else if (ultimaAccion === 'INICIO_REF') setEstadoJornada('REFRIGERIO');
      else if (ultimaAccion === 'FIN') setEstadoJornada('INACTIVA');
    }
  };

  const logShift = async (accion: string) => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      await supabase.from('shifts').insert([{
        username: user.username, nombre: user.nombre, accion: accion,
        lat: pos.coords.latitude, lon: pos.coords.longitude
      }]);
      if (accion === 'FIN') { localStorage.removeItem('buttini_user'); window.location.href = '/'; }
      else checkJornada(user.username);
      setLoading(false);
    });
  };

  const handleChange = (campo: string, valor: string) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación Estricta: Si NO es aspirante, el conductor debe existir en la lista
    const esAspirante = tipoInspeccion === '3-SEGUIMIENTO DE PERSONAL' && subtipoPersonal === 'Aspirante';
    if (!esAspirante && formData.conductor) {
      const existe = listas.conductores.find((c:any) => c.nombre === formData.conductor);
      if (!existe && tipoInspeccion !== '4-SEGUIMIENTO DE TEMAS' && tipoInspeccion !== '5-INSPECCION AREA DE DESCANSO') {
        alert("Atención: Debe seleccionar un conductor válido de la lista.");
        return;
      }
    }

    setLoading(true);
    try {
      const idInspeccion = `${new Date().getTime()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      let fotosUrls: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
          const fileName = `${idInspeccion}_${Math.random()}.${file.name.split('.').pop()}`;
          await supabase.storage.from('fotos-inspecciones').upload(fileName, file);
          const { data: urlData } = supabase.storage.from('fotos-inspecciones').getPublicUrl(fileName);
          fotosUrls.push(urlData.publicUrl);
        }
      }

      navigator.geolocation.getCurrentPosition(async (pos) => {
        await supabase.from('inspections').insert([{
          id: idInspeccion, inspector: user.nombre,
          tipo: tipoInspeccion + (subtipoPersonal ? ` - ${subtipoPersonal}` : ''),
          lat: pos.coords.latitude, lon: pos.coords.longitude,
          fotos: fotosUrls, datos_formulario: { ...formData, fecha_formulario: fecha, hora_formulario: hora },
          obs_general: formData.observaciones || formData.observacion_temas || ''
        }]);
        alert("¡Inspección guardada con éxito!");
        window.location.reload();
      });
    } catch (err) { alert("Error al guardar la inspección."); } finally { setLoading(false); }
  };

  // -------------------------------------------------------------
  // RENDERIZADO DE BLOQUES (Funciones en lugar de Componentes para no perder Foco)
  // -------------------------------------------------------------
  const renderSearchFields = (includesInstructor = false) => {
    const esAspirante = tipoInspeccion === '3-SEGUIMIENTO DE PERSONAL' && subtipoPersonal === 'Aspirante';
    
    return (
      <div className="space-y-4 mb-6 border-b pb-6">
        {/* Datalists (Listas de opciones ocultas) */}
        <datalist id="list-conductores">{listas.conductores.map((c:any) => <option key={c.nombre} value={c.nombre} />)}</datalist>
        <datalist id="list-unidades">{listas.unidades.map((u:any) => <option key={u.numero} value={u.numero} />)}</datalist>
        <datalist id="list-servicios">{listas.servicios.map((s:any) => <option key={s.nombre} value={s.nombre} />)}</datalist>

        <div>
          <label className="text-xs font-bold text-[#003366] flex items-center gap-1"><span className="text-blue-500">🔍</span> Conductor {esAspirante ? '(Carga Manual Permitida)' : '(Buscar en lista)'}</label>
          <input 
            type="text" 
            list={esAspirante ? undefined : "list-conductores"} 
            placeholder={esAspirante ? "Escriba el nombre del aspirante..." : "Buscar conductor..."} 
            className="w-full p-2 border rounded text-sm bg-white" 
            value={formData.conductor || ''} 
            onChange={(e) => handleChange('conductor', e.target.value)} 
            required 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#003366]">🚌 Unidad N°</label>
            <input type="text" list="list-unidades" placeholder="Buscar..." className="w-full p-2 border rounded text-sm bg-white" 
              value={formData.unidad || ''} onChange={(e) => handleChange('unidad', e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-bold text-[#003366]">Servicio</label>
            <input type="text" list="list-servicios" placeholder="Buscar..." className="w-full p-2 border rounded text-sm bg-white" 
              value={formData.servicio || ''} onChange={(e) => handleChange('servicio', e.target.value)} required />
          </div>
        </div>
        {includesInstructor && (
          <div className="pt-4 border-t">
            <label className="text-xs font-bold text-[#003366]">👨‍🏫 Instructor / Tutor</label>
            <input type="text" list="list-conductores" placeholder="Buscar tutor en lista..." className="w-full p-2 border rounded text-sm bg-white" 
              value={formData.instructor || ''} onChange={(e) => handleChange('instructor', e.target.value)} required />
          </div>
        )}
      </div>
    );
  };

  const renderRatingTable = (title: string, items: {k:string, l:string}[], options: string[], prefix: string) => (
    <div className="mb-6 overflow-hidden border border-[#003366] rounded shadow-sm">
      <table className="w-full text-sm text-center bg-white border-collapse">
        <thead className="bg-[#003366] text-white">
          <tr><th colSpan={options.length + 1} className="p-2 font-bold uppercase">{title}</th></tr>
          <tr className="bg-[#002244] text-xs">
            <th className="p-2 text-left w-1/2">ITEM</th>
            {options.map(o => <th key={o} className="p-2">{o}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.k} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="p-2 text-left border-t border-r border-gray-200">{item.l}</td>
              {options.map(opt => (
                <td key={opt} className="p-2 border-t border-gray-200" onClick={() => handleChange(`${prefix}_${item.k}`, opt)}>
                  <input type="radio" name={`${prefix}_${item.k}`} value={opt} 
                    checked={formData[`${prefix}_${item.k}`] === opt} 
                    onChange={() => handleChange(`${prefix}_${item.k}`, opt)}
                    className="w-4 h-4 cursor-pointer accent-[#003366]" required />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDescansoTable = () => {
    const items =[
      { k: 'limp_int', l: 'Limpieza general interior' }, { k: 'cocina', l: 'Cocina' },
      { k: 'bano', l: 'Baño' }, { k: 'basura', l: 'Basura retirada' },
      { k: 'insumos', l: 'Reposición insumos' }, { k: 'danos', l: 'Control daños' },
      { k: 'llaves', l: 'Revisión llaves' }, { k: 'ventilacion', l: 'Ventilación' }, { k: 'limp_ext', l: 'Limpieza exterior' },
    ];
    return (
      <div className="mb-6 overflow-hidden border border-[#003366] rounded shadow-sm">
        <table className="w-full text-sm text-center bg-white border-collapse">
          <thead className="bg-[#003366] text-white text-[10px] uppercase">
            <tr><th className="p-2 text-left">Controlar</th><th className="p-2">Estado</th><th className="p-2">Obs.</th></tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.k} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-2 text-left border-t border-r text-xs">{item.l}</td>
                <td className="p-2 border-t border-r">
                  <div className="flex flex-col gap-1">
                    {['E', 'MB', 'B', 'R'].map(opt => (
                      <label key={opt} className="flex items-center gap-1 text-[10px] cursor-pointer">
                        <input type="radio" name={`descanso_${item.k}`} value={opt} checked={formData[`descanso_${item.k}`] === opt} 
                          onChange={() => handleChange(`descanso_${item.k}`, opt)} className="accent-[#003366]" required /> {opt}
                      </label>
                    ))}
                  </div>
                </td>
                <td className="p-1 border-t"><textarea className="w-full border rounded p-1 text-xs" rows={2} value={formData[`obs_${item.k}`] || ''} onChange={(e) => handleChange(`obs_${item.k}`, e.target.value)}></textarea></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (!user) return <div className="p-10 text-center">Cargando sesión...</div>;

  return (
    <div className="min-h-screen bg-gray-100 text-black pb-10">
      <nav className="bg-[#333] text-white p-3 flex justify-between items-center sticky top-0 z-50">
        <div className="flex flex-col">
          <span className="font-bold text-sm">👤 {user.nombre}</span>
          <span className="text-[10px] text-gray-400 uppercase">{estadoJornada}</span>
        </div>
        <div className="flex gap-2">
          {estadoJornada === 'TRABAJANDO' && <button type="button" onClick={() => logShift('INICIO_REF')} className="bg-orange-500 px-3 py-1 rounded text-xs font-bold border border-white">☕ PAUSA</button>}
          {estadoJornada === 'REFRIGERIO' && <button type="button" onClick={() => logShift('FIN_REF')} className="bg-green-500 px-3 py-1 rounded text-xs font-bold border border-white">▶ REANUDAR</button>}
          {estadoJornada === 'TRABAJANDO' && <button type="button" onClick={() => logShift('FIN')} className="bg-[#003366] px-3 py-1 rounded text-xs font-bold border border-white text-yellow-400">FIN DÍA</button>}
        </div>
      </nav>

      {estadoJornada === 'INACTIVA' && (
        <div className="flex flex-col items-center justify-center p-10 mt-10">
          <div className="bg-white p-8 rounded shadow text-center max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4 text-[#003366]">¿Iniciar Jornada?</h2>
            <button onClick={() => logShift('INICIO')} className="w-full bg-[#003366] text-white p-3 rounded font-bold uppercase" disabled={loading}>{loading ? 'Cargando...' : 'Sí, Iniciar'}</button>
          </div>
        </div>
      )}

      {estadoJornada === 'TRABAJANDO' && (
        <main className="p-2 md:p-4 max-w-3xl mx-auto">
          <div className="bg-white p-4 md:p-8 rounded shadow-lg border-t-4 border-[#003366]">
            <header className="text-center mb-6 pb-4 border-b">
              <img src="https://i.ibb.co/RG0tNq6t/Logo-Web-copia.png" className="h-10 mx-auto mb-2" alt="Logo" />
              <h1 className="text-sm text-gray-600">Parte Digital de Inspectores</h1>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded border">
                <div><label className="text-xs font-bold text-[#003366]">📅 Fecha</label><input type="date" className="w-full p-2 border rounded" value={fecha} onChange={(e)=>setFecha(e.target.value)} required /></div>
                <div><label className="text-xs font-bold text-[#003366]">🕒 Hora</label><input type="time" className="w-full p-2 border rounded" value={hora} onChange={(e)=>setHora(e.target.value)} required /></div>
                <div className="col-span-2"><label className="text-xs font-bold text-[#003366]">👮 Inspector</label><input type="text" className="w-full p-2 border rounded bg-gray-200 font-bold" value={user.nombre} disabled /></div>
              </div>

              <div className="bg-[#eef4f9] p-4 rounded border-l-4 border-[#003366] mb-6">
                <label className="block font-bold text-[#003366] mb-2 uppercase text-sm">📋 TIPO DE INSPECCIÓN</label>
                <select className="w-full p-2 border-2 border-[#003366] rounded bg-white font-bold" value={tipoInspeccion} onChange={(e) => {setTipoInspeccion(e.target.value); setSubtipoPersonal('');}} required>
                  <option value="">-- Seleccione una opción --</option>
                  <option value="1-INSPECTOR EN CALLE">1 - INSPECTOR EN CALLE</option>
                  <option value="2-EMOP">2 - EMOP</option>
                  <option value="3-SEGUIMIENTO DE PERSONAL">3 - SEGUIMIENTO DE PERSONAL</option>
                  <option value="4-SEGUIMIENTO DE TEMAS">4 - SEGUIMIENTO DE TEMAS</option>
                  <option value="5-INSPECCION AREA DE DESCANSO">5 - INSPECCION AREA DE DESCANSO</option>
                </select>
              </div>

              {tipoInspeccion === '3-SEGUIMIENTO DE PERSONAL' && (
                <div className="bg-[#fffbe6] p-4 rounded border border-yellow-400 mb-6">
                  <label className="block text-sm font-bold text-[#003366] mb-2">Subtipo Personal</label>
                  <select className="w-full p-2 border rounded" value={subtipoPersonal} onChange={(e) => setSubtipoPersonal(e.target.value)} required>
                    <option value="">-- Seleccione Situación --</option>
                    <option value="Aspirante">Aspirante</option>
                    <option value="Periodo de prueba">Periodo de prueba</option>
                    <option value="Permanente">Permanente</option>
                  </select>
                </div>
              )}

              {/* RENDERIZADO DE LOS BLOQUES */}
              {(tipoInspeccion === '1-INSPECTOR EN CALLE' || subtipoPersonal === 'Permanente') && (
                <>
                  {renderSearchFields()}
                  <h3 className="text-[#003366] font-bold text-lg mb-2 border-l-4 border-yellow-400 pl-2 uppercase">Detalles Inspección</h3>
                  {renderRatingTable("Limpieza de la Unidad", [{k:'int', l:'Interior'}, {k:'ext', l:'Exterior'}, {k:'cab', l:'Cabezales'}, {k:'bano', l:'Baño'}, {k:'ac', l:'A/C - CALEF.'}], ['1','2','3','4','5','N/C'], "limp")}
                  {renderRatingTable("Evaluación del Conductor", [{k:'horarios', l:'Cumplimiento Horarios'}, {k:'uniforme', l:'Uniforme'}, {k:'atencion', l:'Atención al Usuario'}, {k:'cond', l:'Conducción'}], ['1','2','3','4','5','N/C'], "eval")}
                </>
              )}

              {tipoInspeccion === '2-EMOP' && (
                <>
                  {renderSearchFields()}
                  <h3 className="text-[#003366] font-bold text-lg mb-2 border-l-4 border-yellow-400 pl-2 uppercase">Registro EMOP</h3>
                  <textarea className="w-full p-3 border rounded mb-6" rows={5} placeholder="Ingrese detalles..." value={formData.emop_detalle || ''} onChange={(e) => handleChange('emop_detalle', e.target.value)} required></textarea>
                </>
              )}

              {(subtipoPersonal === 'Aspirante' || subtipoPersonal === 'Periodo de prueba') && (
                <>
                  {renderSearchFields(true)}
                  <h3 className="text-[#003366] font-bold text-lg mb-4 border-l-4 border-yellow-400 pl-2 uppercase">Seguimiento Aspirantes / Prueba</h3>
                  {renderRatingTable("Presentación Personal", [{k:'puntualidad', l:'Puntualidad'}, {k:'uniforme', l:'Estado del uniforme'}, {k:'aseo', l:'Aseo e imagen personal'}, {k:'barba', l:'No usa barba'}, {k:'tatuajes', l:'No usa/muestra tatuajes, aros'}], ['NC','CR','CS','NP'], "pres")}
                  {renderRatingTable("Trato al Usuario", [{k:'modo', l:'Modo de dirigirse'}, {k:'conflicto', l:'Reacción al conflicto'}, {k:'incidente', l:'Reacción al incidente'}, {k:'info', l:'Información al usuario'}], ['NC','CR','CS','NP'], "trato")}
                  {renderRatingTable("Tiempo de Reacción", [{k:'dist_seg', l:'Distancia seguimiento'}, {k:'dist_fren', l:'Distancia frenado'}, {k:'vel', l:'Velocidad'}, {k:'precaucion', l:'Precaución'}, {k:'vis_otros', l:'Vis. otros vehículos'}], ['NC','CR','CS','NP'], "reac")}
                  {renderRatingTable("Señales de Transito", [{k:'vel_minmax', l:'Velocidad min/max'}, {k:'carriles', l:'Carriles exclusivos'}, {k:'doble_linea', l:'Doble línea amarilla'}, {k:'semaforos', l:'Semáforos'}, {k:'contrario', l:'Sentido contrario'}, {k:'ceda', l:'Ceda el paso'}, {k:'cruce_nivel', l:'Cruce paso a nivel'}, {k:'prohibido', l:'Prohibido girar'}], ['NC','CR','CS','NP'], "senales")}
                  {renderRatingTable("Conducción", [{k:'espejos', l:'Uso espejos'}, {k:'senal', l:'Señalización'}, {k:'vel', l:'Velocidad'}, {k:'dist', l:'Distancia'}, {k:'maniobras', l:'Maniobras'}, {k:'entorno', l:'Vis. entorno'}, {k:'defensivo', l:'Manejo defensivo'}, {k:'guias', l:'Uso de guías'}, {k:'instructivos', l:'Cumpl. instructivos'}], ['NC','CR','CS','NP'], "cond")}
                </>
              )}

              {tipoInspeccion === '4-SEGUIMIENTO DE TEMAS' && (
                <>
                  <h3 className="text-[#003366] font-bold text-lg mb-4 border-l-4 border-yellow-400 pl-2 uppercase">Seguimiento de Temas</h3>
                  <select className="w-full p-2 border rounded mb-4" value={formData.tema_tipo || ''} onChange={(e) => handleChange('tema_tipo', e.target.value)} required>
                    <option value="">-- Seleccione --</option>
                    <option value="Quejas y reclamos">Quejas y reclamos</option>
                    <option value="Siniestros">Siniestros</option>
                    <option value="Etapas Intermedias">Etapas Intermedias</option>
                    <option value="Largada de servicios">Largada de servicios en base</option>
                    <option value="Control de servicios">Control de servicios en terminal</option>
                    <option value="Reuniones">Reuniones con entidades</option>
                    <option value="Otros">Otros</option>
                  </select>
                </>
              )}

              {tipoInspeccion === '5-INSPECCION AREA DE DESCANSO' && (
                <>
                  <h3 className="text-[#003366] font-bold text-lg mb-4 border-l-4 border-yellow-400 pl-2 uppercase">Inspección Area de Descanso</h3>
                  <select className="w-full p-2 border rounded mb-4" value={formData.ubicacion || ''} onChange={(e) => handleChange('ubicacion', e.target.value)} required>
                    <option value="">-- Seleccione --</option>
                    <option value="SAN RAFAEL">SAN RAFAEL</option>
                    <option value="GENERAL ALVEAR">GENERAL ALVEAR</option>
                  </select>
                  {renderDescansoTable()}
                </>
              )}

              {tipoInspeccion && (
                <div className="space-y-6 pt-4 border-t mt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-[#003366]">Observaciones Generales</label>
                    <textarea className="w-full p-3 border rounded" rows={3} value={formData.observaciones || ''} onChange={(e) => handleChange('observaciones', e.target.value)}></textarea>
                  </div>
                  <div className="bg-[#f8f9fa] p-4 rounded border border-gray-200">
                    <label className="text-sm font-bold text-[#003366] block mb-2">📷 Adjuntar Fotos (Opcional)</label>
                    <input type="file" multiple accept="image/*" className="w-full text-sm" onChange={(e) => setFiles(Array.from(e.target.files ||[]))} />
                  </div>
                  <button type="submit" className="w-full bg-[#002244] text-white p-4 rounded font-bold uppercase hover:bg-[#003366]" disabled={loading}>
                    {loading ? 'ENVIANDO...' : 'GUARDAR Y ENVIAR'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </main>
      )}
    </div>
  );
}