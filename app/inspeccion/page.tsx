'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import FichaVisualizador from '@/components/FichaVisualizador';
import dynamic from 'next/dynamic';
const MapPicker = dynamic(() => import('./MapPicker'), { ssr: false });

export default function InspeccionPage() {
  const [user, setUser] = useState<any>(null);
  const [estadoJornada, setEstadoJornada] = useState<'INACTIVA' | 'TRABAJANDO' | 'REFRIGERIO'>('INACTIVA');
  const [loading, setLoading] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState<boolean | null>(null);
  
  const [esTurismo, setEsTurismo] = useState(false); // <-- NUEVO ESTADO
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [tipoInspeccion, setTipoInspeccion] = useState('');
  const [subtipoPersonal, setSubtipoPersonal] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [files, setFiles] = useState<File[]>([]);
  const [showModalClave, setShowModalClave] = useState(false);
  const [claveActual, setClaveActual] = useState('');
  const [claveNueva, setClaveNueva] = useState('');
  const [isAdminManual, setIsAdminManual] = useState(false);
  const [manualInspector, setManualInspector] = useState('');
  const [manualPos, setManualPos] = useState<any>(null);
  const [listaInspectoresUsers, setListaInspectoresUsers] = useState<any[]>([]);

  // Listas y Seguimientos
  const [listas, setListas] = useState<any>({ conductores: [], unidades: [], servicios: [] });
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [showSeguimiento, setShowSeguimiento] = useState(true);
  const [modalSeg, setModalSeg] = useState<any>(null);
  const [nuevoComentario, setNewComentario] = useState('');
  const [historialChat, setHistorialChat] = useState<any[]>([]);

  // INTEGRACIÓN SINIESTROS: Modal y Estado de Carga
  const [showSiniestroModal, setShowSiniestroModal] = useState(false);

  useEffect(() => {
    const session = localStorage.getItem('buttini_user');
    if (!session) { window.location.href = '/'; return; }
    const userData = JSON.parse(session);
    setUser(userData);
    
    // OBLIGAR A COMPARTIR UBICACIÓN (Solo si NO es Admin Manual)
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('modo');

    if (userData.rol === 'Admin') {
       if (mode === 'manual' && userData.puede_cargar_manual) {
           setIsAdminManual(true);
           setEstadoJornada('TRABAJANDO'); // Forza entrada directa al formulario
           setLocationEnabled(true); // Evita el bloqueo del GPS
           fetchInspectoresUsers();
       } else {
           window.location.href = '/dashboard';
           return;
       }
    } else {
       navigator.geolocation.getCurrentPosition(() => setLocationEnabled(true), () => setLocationEnabled(false));
       checkJornada(userData.username);
    }

    const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setFecha(now.toISOString().substring(0, 10)); setHora(now.toISOString().substring(11, 16));

    fetchCatalogos(); fetchPendientes(userData.nombre);
  }, []);

  const fetchInspectoresUsers = async () => {
    const { data } = await supabase.from('users').select('nombre').eq('rol', 'Inspector').order('nombre');
    setListaInspectoresUsers(data || []);
  };

  const fetchCatalogos = async () => {
    const [resCond, resUni, resServ] = await Promise.all([
      supabase.from('conductores').select('*').eq('activo', true),
      supabase.from('unidades').select('*').eq('activo', true).order('numero'),
      supabase.from('servicios').select('*').eq('activo', true).order('nombre')
    ]);
    
    const condFormatted = (resCond.data || []).map(c => ({
      ...c, fullName: `${c.legajo || ''} - ${c.apellido || ''}, ${c.nombres || c.nombre || ''}`
    })).sort((a, b) => a.fullName.localeCompare(b.fullName));

    setListas({ conductores: condFormatted, unidades: resUni.data || [], servicios: resServ.data || [] });
  };

  const fetchPendientes = async (inspectorNombre: string) => {
    const { data: follows } = await supabase.from('followups').select('*').order('created_at', { ascending: true });
    if (!follows) return;
    
    const statusById: Record<string, string> = {};
    follows.forEach(f => {
      statusById[f.inspection_id] = 'OPEN';
      if (f.accion.includes('[CERRADO]')) statusById[f.inspection_id] = 'CLOSED';
    });
    
    const activeIds = Object.keys(statusById).filter(id => statusById[id] === 'OPEN');
    if (activeIds.length === 0) { setPendientes([]); return; }

    const { data: insps } = await supabase.from('inspections').select('*').in('id', activeIds).eq('inspector', inspectorNombre);
    setPendientes(insps || []);
  };

  const abrirModalSeguimiento = async (inspeccion: any) => {
    setModalSeg(inspeccion);
    const { data } = await supabase.from('followups').select('*').eq('inspection_id', inspeccion.id).order('created_at', { ascending: true });
    setHistorialChat(data || []);
  };

  const enviarComentario = async () => {
    if (!nuevoComentario.trim()) return;
    setLoading(true);
    await supabase.from('followups').insert([{ inspection_id: modalSeg.id, usuario: user.nombre, accion: nuevoComentario }]);
    setNewComentario('');
    abrirModalSeguimiento(modalSeg);
    setLoading(false);
  };

  const handleCambiarClave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').eq('username', user.username).eq('password', claveActual).single();
    if (error || !data) {
      alert("La contraseña actual es incorrecta.");
      setLoading(false); return;
    }
    const { error: updateError } = await supabase.from('users').update({ password: claveNueva }).eq('username', user.username);
    if (updateError) { alert("Error al actualizar la contraseña."); } 
    else {
      alert("Contraseña actualizada con éxito.");
      const updatedUser = { ...user, password: claveNueva };
      localStorage.setItem('buttini_user', JSON.stringify(updatedUser));
      setUser(updatedUser); setShowModalClave(false); setClaveActual(''); setClaveNueva('');
    }
    setLoading(false);
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
    setFormData((prev: any) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const esAspirante = tipoInspeccion === '3-SEGUIMIENTO DE PERSONAL' && subtipoPersonal === 'Aspirante';
    if (!esAspirante && formData.conductor) {
      const existe = listas.conductores.find((c:any) => c.fullName === formData.conductor);
      if (!existe && !tipoInspeccion.includes('TEMAS') && !tipoInspeccion.includes('DESCANSO')) {
        alert("Atención: Debe seleccionar un conductor válido de la lista."); return;
      }
    }

    const empresaActual = esTurismo ? 'Turismo Buttini' : 'Antonio Buttini';
    if (formData.servicio && esTurismo) {
      const existeServicio = listas.servicios.find((s:any) => s.nombre === formData.servicio && s.empresa === 'Turismo Buttini');
      if (!existeServicio) { await supabase.from('servicios').insert([{ nombre: formData.servicio, empresa: 'Turismo Buttini', activo: true }]); }
    }

    setLoading(true);
    try {
      const idInspeccion = `${new Date().getTime()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      let fotosUrls: string[] = [];
      if (files.length > 0) {
        for (const file of files) {
          const fileName = `${idInspeccion}_${Math.random()}.${file.name.split('.').pop()}`;
          const { error: uploadError } = await supabase.storage.from('fotos-inspecciones').upload(fileName, file);
          if (uploadError) { alert(`Error al subir la imagen: ${uploadError.message}`); setLoading(false); return; }
          const { data: urlData } = supabase.storage.from('fotos-inspecciones').getPublicUrl(fileName);
          fotosUrls.push(urlData.publicUrl);
        }
      }

      // FUNCIÓN ENCAPSULADA PARA GUARDAR EL REGISTRO
      const ejecutarGuardado = async (lat: number | null, lon: number | null) => {
         let timestampOficial = new Date().toISOString();
         if (isAdminManual) {
            const fechaManualObj = new Date(`${fecha}T${hora}:00`);
            timestampOficial = fechaManualObj.toISOString();
         }

         await supabase.from('inspections').insert([{
          id: idInspeccion, 
          inspector: isAdminManual ? manualInspector : user.nombre,
          tipo: tipoInspeccion + (subtipoPersonal ? ` - ${subtipoPersonal}` : ''),
          lat: lat, lon: lon, fotos: fotosUrls, 
          created_at: timestampOficial,
          datos_formulario: { ...formData, fecha_formulario: fecha, hora_formulario: hora, empresa: empresaActual },
          obs_general: formData.observaciones || formData.observacion_temas || ''
        }]);
        alert("¡Inspección guardada con éxito!"); window.location.reload();
      };

      if (isAdminManual) {
         // Eliminamos la validación del manualPos
         if (!manualInspector) { alert("⚠️ Debe seleccionar a qué Inspector se le asignará el reporte."); setLoading(false); return; }
         
         // Pasamos las coordenadas si existen, si no, pasamos null
         ejecutarGuardado(manualPos ? manualPos.lat : null, manualPos ? manualPos.lng : null);
      } else {
         navigator.geolocation.getCurrentPosition(
           async (pos) => ejecutarGuardado(pos.coords.latitude, pos.coords.longitude),
           () => { alert("No se pudo obtener su ubicación GPS."); setLoading(false); }
         );
      }
    } catch (err) { alert("Error al guardar."); setLoading(false); } 
  };

  const renderSearchFields = (includesInstructor = false) => {
    const esAspirante = tipoInspeccion === '3-SEGUIMIENTO DE PERSONAL' && subtipoPersonal === 'Aspirante';
    const empresaActual = esTurismo ? 'Turismo Buttini' : 'Antonio Buttini';
    
    // Filtrar listas por empresa
    const condFiltrados = listas.conductores.filter((c:any) => c.empresa === empresaActual);
    const uniFiltradas = listas.unidades.filter((u:any) => u.empresa === empresaActual);
    const servFiltrados = listas.servicios.filter((s:any) => s.empresa === empresaActual);

    return (
      <div className="space-y-4 mb-6 border-b pb-6">
        <datalist id="list-conductores">{condFiltrados.map((c:any) => <option key={c.id} value={c.fullName} />)}</datalist>
        <datalist id="list-unidades">{uniFiltradas.map((u:any) => <option key={u.id} value={u.numero} />)}</datalist>
        <datalist id="list-servicios">{servFiltrados.map((s:any) => <option key={s.id} value={s.nombre} />)}</datalist>

        <div>
          <label className="text-xs font-bold text-[#003366]">🔍 Conductor {esAspirante ? '(Carga Manual)' : ''}</label>
          <input type="text" list={esAspirante ? undefined : "list-conductores"} placeholder="Buscar conductor..." className="w-full p-2 border rounded bg-white text-sm" value={formData.conductor || ''} onChange={(e) => handleChange('conductor', e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-[#003366]">🚌 Unidad N°</label>
            <input type="text" list="list-unidades" placeholder="Buscar..." className="w-full p-2 border rounded bg-white text-sm" value={formData.unidad || ''} onChange={(e) => handleChange('unidad', e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-bold text-[#003366]">Servicio</label>
            <input type="text" list="list-servicios" placeholder="Buscar..." className="w-full p-2 border rounded bg-white text-sm" value={formData.servicio || ''} onChange={(e) => handleChange('servicio', e.target.value)} required />
          </div>
        </div>
        {includesInstructor && (
          <div className="pt-4 border-t">
            <label className="text-xs font-bold text-[#003366]">👨‍🏫 Instructor / Tutor</label>
            <input type="text" list="list-conductores" placeholder="Buscar tutor..." className="w-full p-2 border rounded bg-white text-sm" value={formData.instructor || ''} onChange={(e) => handleChange('instructor', e.target.value)} required />
          </div>
        )}
      </div>
    );
  };

  const renderRatingTable = (title: string, items: {k:string, l:string}[], options: string[], prefix: string, hasObservations: boolean = false) => (
    <div className="mb-6 overflow-hidden border border-[#003366] rounded shadow-sm">
      <table className="w-full text-sm text-center bg-white border-collapse">
        <thead className="bg-[#003366] text-white">
          <tr><th colSpan={options.length + 1} className="p-2 font-bold uppercase text-xs">{title}</th></tr>
          <tr className="bg-[#002244] text-xs"><th className="p-2 text-left w-1/2">ITEM</th>{options.map(o => <th key={o} className="p-2">{o}</th>)}</tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={item.k} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="p-2 text-left border-t border-r text-xs font-medium">{item.l}</td>
              {options.map(opt => (
                <td key={opt} className="p-2 border-t" onClick={() => handleChange(`${prefix}_${item.k}`, opt)}>
                  <input type="radio" name={`${prefix}_${item.k}`} value={opt} checked={formData[`${prefix}_${item.k}`] === opt} onChange={() => handleChange(`${prefix}_${item.k}`, opt)} className="w-4 h-4 cursor-pointer accent-[#003366]" required />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {hasObservations && (
        <div className="p-2 border-t border-[#003366] bg-white flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <label className="text-[10px] font-bold text-[#003366] uppercase w-24 text-left pl-1">OBSERVACIONES</label>
          <input type="text" className="flex-1 border border-gray-300 p-2 rounded text-xs bg-white w-full" value={formData[`obs_${prefix}`] || ''} onChange={(e) => handleChange(`obs_${prefix}`, e.target.value)} />
        </div>
      )}
    </div>
  );

  const renderDescansoTable = () => {
    const items = [
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
                        <input type="radio" name={`descanso_${item.k}`} value={opt} checked={formData[`descanso_${item.k}`] === opt} onChange={() => handleChange(`descanso_${item.k}`, opt)} className="accent-[#003366]" required /> {opt}
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

  if (locationEnabled === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#003366] text-white p-6 text-center">
        <span className="text-6xl mb-4">📍</span><h1 className="text-2xl font-bold mb-2">Ubicación Requerida</h1><p className="text-sm opacity-80 mb-6">Para utilizar la aplicación debe permitir el acceso a su ubicación GPS en el navegador.</p><button onClick={() => window.location.reload()} className="bg-[#FFCC00] text-[#003366] font-bold py-3 px-6 rounded-lg">REINTENTAR</button>
      </div>
    );
  }

  if (!user || locationEnabled === null) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gray-100 text-black pb-10">
      <nav className={`p-3 flex justify-between items-center sticky top-0 z-40 ${isAdminManual ? 'bg-red-700' : 'bg-[#333]'} text-white`}>
        <div className="flex flex-col">
          <span className="font-bold text-sm">👤 {user.nombre}</span>
          <span className="text-[10px] text-gray-200 uppercase">{isAdminManual ? '⚡ MODO ADMINISTRADOR' : estadoJornada}</span>
        </div>
        <div className="flex gap-2">
          {!isAdminManual && (
            <>
              <button type="button" onClick={() => setShowModalClave(true)} className="bg-[#0055a5] px-3 py-1 rounded text-xs font-bold border border-white">🔑 Clave</button>
              {estadoJornada === 'TRABAJANDO' && <button type="button" onClick={() => logShift('INICIO_REF')} className="bg-orange-500 px-3 py-1 rounded text-xs font-bold border border-white">☕ PAUSA</button>}
              {estadoJornada === 'REFRIGERIO' && <button type="button" onClick={() => logShift('FIN_REF')} className="bg-green-500 px-3 py-1 rounded text-xs font-bold border border-white">▶ REANUDAR</button>}
              {estadoJornada === 'TRABAJANDO' && <button type="button" onClick={() => logShift('FIN')} className="bg-[#003366] px-3 py-1 rounded text-xs font-bold text-yellow-400 border border-white">FIN DÍA</button>}
            </>
          )}
        </div>
      </nav>

      {estadoJornada === 'INACTIVA' && (
        <div className="flex flex-col items-center justify-center p-10 mt-10">
          <div className="bg-white p-8 rounded shadow text-center max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4 text-[#003366]">¿Iniciar Jornada?</h2>
            <button onClick={() => logShift('INICIO')} className="w-full bg-[#003366] text-white p-3 rounded font-bold uppercase" disabled={loading}>{loading ? '...' : 'Sí, Iniciar'}</button>
          </div>
        </div>
      )}

      {estadoJornada === 'TRABAJANDO' && (
        <main className="p-2 md:p-4 max-w-3xl mx-auto space-y-4">
          {pendientes.length > 0 && (
            <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-[#FFCC00] text-[#003366] p-3 font-bold flex justify-between items-center cursor-pointer" onClick={() => setShowSeguimiento(!showSeguimiento)}>
                <span>⚠️ TEMAS EN SEGUIMIENTO ({pendientes.length})</span><span>{showSeguimiento ? '▼' : '▶'}</span>
              </div>
              {showSeguimiento && (
                <div className="p-2">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-500 uppercase"><tr><th className="p-2">Fecha</th><th className="p-2">Tipo</th><th className="p-2 text-center">Acción</th></tr></thead>
                    <tbody>
                      {pendientes.map(p => (
                        <tr key={p.id} className="border-b">
                          <td className="p-2">{new Date(p.created_at).toLocaleDateString()}</td><td className="p-2 font-bold">{p.tipo}</td><td className="p-2 text-center"><button onClick={() => abrirModalSeguimiento(p)} className="bg-[#FFCC00] text-[#003366] px-3 py-1 rounded font-bold">VER</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="bg-white p-4 md:p-8 rounded shadow-lg border-t-4 border-[#003366]">
            <header className="text-center mb-6 pb-4 border-b">
              <img src="https://i.ibb.co/RG0tNq6t/Logo-Web-copia.png" className="h-10 mx-auto mb-2" alt="Logo" />
              <h1 className="text-sm text-gray-600">Parte Digital de Inspectores</h1>
            </header>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded border">
                <div><label className="text-xs font-bold text-[#003366]">📅 Fecha</label><input type="date" className="w-full p-2 border rounded" value={fecha} onChange={(e)=>setFecha(e.target.value)} required /></div>
                <div><label className="text-xs font-bold text-[#003366]">🕒 Hora</label><input type="time" className="w-full p-2 border rounded" value={hora} onChange={(e)=>setHora(e.target.value)} required /></div>
                
                <div className="col-span-2 flex justify-between items-center bg-gray-200 p-2 rounded border">
                  <div className="w-full mr-4">
                    <label className="text-xs font-bold text-[#003366] flex items-center gap-1">👮 Inspector</label>
                    {isAdminManual ? (
                      <select className="w-full p-1.5 rounded border border-gray-400 text-sm font-bold mt-1" value={manualInspector} onChange={e=>setManualInspector(e.target.value)} required>
                        <option value="">-- Seleccione Inspector Destino --</option>
                        {listaInspectoresUsers.map((insp:any) => <option key={insp.nombre} value={insp.nombre}>{insp.nombre}</option>)}
                      </select>
                    ) : (
                      <div className="font-bold text-[#003366] text-sm px-1">{user.nombre}</div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 bg-white px-3 py-1.5 border border-gray-300 rounded shadow-sm cursor-pointer text-[#003366] font-bold text-xs select-none h-fit">
                    <input type="checkbox" checked={esTurismo} onChange={(e) => setEsTurismo(e.target.checked)} className="w-4 h-4 accent-[#003366] cursor-pointer" /> Turismo
                  </label>
                </div>
              </div>

              {/* MAPA MANUAL PARA ADMINISTRADORES */}
              {isAdminManual && (
                <div className="col-span-2 bg-yellow-50 p-4 rounded-xl border-2 border-yellow-400 mb-6 shadow-sm">
                  <label className="text-xs font-black text-red-600 block mb-2 uppercase">📍 SELECCIONE EL PUNTO GPS EXACTO (Opcional - Haga clic en el mapa)</label>
                  <MapPicker position={manualPos} setPosition={setManualPos} />
                </div>
              )}

              <div className="bg-[#eef4f9] p-4 rounded border-l-4 border-[#003366] mb-6">
                <label className="block font-bold text-[#003366] mb-2 uppercase text-sm">📋 TIPO DE INSPECCIÓN</label>
                <select className="w-full p-2 border-2 border-[#003366] rounded bg-white font-bold" value={tipoInspeccion} onChange={(e) => {
                  const val = e.target.value;
                  // REDIRECCIÓN DIRECTA PARA SINIESTROS
                  if (val === '6-SINIESTRO CARGA') {
                    const url = esTurismo ? 'https://riesgo-vial-turismo-buttini.vercel.app/?mode=siniestro' : 'https://seguridad-vial-buttini.vercel.app/?mode=siniestro';
                    window.open(url, '_blank');
                    setTipoInspeccion('');
                    setSubtipoPersonal('');
                    return;
                  }
                  setTipoInspeccion(val); setSubtipoPersonal('');
                }} required>
                  <option value="">-- Seleccione una opción --</option>
                  <option value="1-INSPECTOR EN CALLE">1 - INSPECTOR EN CALLE</option>
                  <option value="2-EMOP">2 - EMOP</option>
                  <option value="3-SEGUIMIENTO DE PERSONAL">3 - SEGUIMIENTO DE PERSONAL</option>
                  <option value="4-SEGUIMIENTO DE TEMAS">4 - SEGUIMIENTO DE TEMAS</option>
                  <option value="5-INSPECCION AREA DE DESCANSO">5 - INSPECCION AREA DE DESCANSO</option>
                  <option value="6-SINIESTRO CARGA" className="font-bold text-red-600 bg-red-50">6 - SINIESTRO CARGA ↗</option>
                </select>
              </div>

              {tipoInspeccion === '3-SEGUIMIENTO DE PERSONAL' && (
                <div className="bg-[#fffbe6] p-4 rounded border border-yellow-400 mb-6">
                  <label className="block text-sm font-bold text-[#003366] mb-2">Subtipo Personal</label>
                  <select className="w-full p-2 border rounded" value={subtipoPersonal} onChange={(e) => setSubtipoPersonal(e.target.value)} required>
                    <option value="">-- Seleccione --</option>
                    <option value="Aspirante">Aspirante</option>
                    <option value="Periodo de prueba">Periodo de prueba</option>
                    <option value="Permanente">Permanente</option>
                  </select>
                </div>
              )}

              {/* RENDER FORMULARIOS */}
              {(tipoInspeccion === '1-INSPECTOR EN CALLE' || subtipoPersonal === 'Permanente') && (
                <>
                  {renderSearchFields()}
                  <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6 rounded shadow-sm text-xs text-[#003366]">
                    <strong className="block mb-1 text-sm uppercase">Criterios de Calificación:</strong>
                    <ul className="list-disc pl-4 space-y-1">
                      <li><b>1 - 2:</b> No Permitido - Revisión de acción del Comité</li>
                      <li><b>3:</b> Observado - Acción de Seguimiento</li>
                      <li><b>4 - 5:</b> Aceptable</li>
                    </ul>
                  </div>
                  {renderRatingTable("Limpieza de la Unidad", [{k:'int', l:'Interior'}, {k:'ext', l:'Exterior'}, {k:'cab', l:'Cabezales'}, {k:'bano', l:'Baño'}, {k:'ac', l:'A/C - CALEF.'}], ['1','2','3','4','5','N/C'], "limp")}
                  {renderRatingTable("Evaluación del Conductor", [{k:'horarios', l:'Cumplimiento Horarios'}, {k:'uniforme', l:'Uniforme'}, {k:'atencion', l:'Atención al Usuario'}], ['1','2','3','4','5','N/C'], "eval")}
                  
                  {/* CONDUCCIÓN */}
                  <div className="mb-6 overflow-hidden border border-[#003366] rounded shadow-sm text-sm">
                    <div className="bg-[#003366] text-white p-2 font-bold uppercase">Conducción</div>
                    <div className="bg-white p-3 sm:p-4 space-y-4">
                      {[
                        { k: 'ascenso_descenso', l: 'Ascenso / Descenso de pasajeros', opts: ['1','2','3','4','5','N/C'] },
                        { k: 'exceso_velocidad', l: 'Excesos de velocidad', opts: ['SI','NO'] },
                        { k: 'marcha', l: 'Inicio y fin de marcha (Cambios)', opts: ['1','2','3','4','5','N/C'] },
                        { k: 'adelanto', l: 'Maniobra de adelanto', opts: ['1','2','3','4','5','N/C'] }
                      ].map((item) => (
                        <div key={item.k} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 mb-2">
                             <label className="font-bold text-[#003366] text-xs">{item.l}</label>
                             <select className="border border-gray-300 p-2 rounded w-full sm:w-1/3 text-xs bg-white font-bold" value={formData[`cond_${item.k}`] || ''} onChange={(e) => handleChange(`cond_${item.k}`, e.target.value)} required>
                               <option value="">--</option>
                               {item.opts.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                             </select>
                           </div>
                           <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                             <label className="text-[10px] font-bold text-[#003366] uppercase sm:w-28 shrink-0">OBSERVACIONES:</label>
                             <input type="text" className="w-full border border-gray-300 p-2 rounded text-xs bg-white" value={formData[`obs_cond_${item.k}`] || ''} onChange={(e) => handleChange(`obs_cond_${item.k}`, e.target.value)} />
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* NORMAS DE TRÁNSITO */}
                  {renderRatingTable("NORMAS DE TRÁNSITO", [{k:'frenadas', l:'Frenadas Bruscas'}, {k:'cinturon', l:'Cinturón de Seguridad'}, {k:'semaforos', l:'Respeta Semáforos'}, {k:'maniobras', l:'Maniobras Agresivas'}, {k:'luces', l:'Uso de luces'}, {k:'bocina', l:'Uso de bocina'}, {k:'paso', l:'Cede el paso'}, {k:'linea', l:'Traspaso línea amarilla'}], ['SI', 'NO'], "normas_transito", true)}

                  {/* EQUIPAMIENTO Y SISTEMAS (Solo si NO es Turismo) */}
                  {!esTurismo && (
                    <div className="mb-6 overflow-hidden border border-[#003366] rounded shadow-sm text-sm text-center">
                      <div className="bg-[#003366] text-white p-2 font-bold uppercase">Equipamiento y Sistemas</div>
                      <div className="grid grid-cols-2 bg-gray-50 p-2 gap-2 text-left">
                        <div className="font-bold self-center text-xs text-[#003366]">Micronauta</div>
                        <div><select className="w-full border p-1 rounded bg-white" value={formData.micron_existe || ''} onChange={(e)=>handleChange('micron_existe',e.target.value)}><option value="">--</option><option>Existe</option><option>No Existe</option></select></div>
                        
                        <div className="font-bold self-center text-xs text-[#003366]">Func. Equipo Micronauta</div>
                        <div><select className="w-full border p-1 rounded bg-white" value={formData.micron_func || ''} onChange={(e)=>handleChange('micron_func',e.target.value)}><option value="">--</option><option>Correcto</option><option>Incorrecto</option></select></div>
                        
                        <div className="font-bold self-center text-xs text-[#003366]">Cant. Pasajeros Micronauta</div>
                        <div><input type="number" className="w-full border p-1 rounded bg-white" value={formData.micron_pasajeros || ''} onChange={(e)=>handleChange('micron_pasajeros',e.target.value)} /></div>
                        
                        <div className="col-span-2 border-t my-1 border-gray-200"></div>

                        <div className="font-bold self-center text-xs text-[#003366]">SUBE</div>
                        <div><select className="w-full border p-1 rounded bg-white" value={formData.sube_existe || ''} onChange={(e)=>handleChange('sube_existe',e.target.value)}><option value="">--</option><option>Existe</option><option>No Existe</option></select></div>
                        
                        <div className="font-bold self-center text-xs text-[#003366]">Func. Equipo SUBE</div>
                        <div><select className="w-full border p-1 rounded bg-white" value={formData.sube_func || ''} onChange={(e)=>handleChange('sube_func',e.target.value)}><option value="">--</option><option>Correcto</option><option>Incorrecto</option></select></div>
                        
                        {/* CONDICIONAL: TIPO FALLA SUBE (Solo si es Incorrecto) */}
                        {formData.sube_func === 'Incorrecto' && (
                          <>
                            <div className="font-bold self-center text-xs text-red-600">Tipo Falla SUBE</div>
                            <div>
                              <select className="w-full border p-1 rounded bg-white border-red-300 text-xs" value={formData.sube_tipo_falla || ''} onChange={(e)=>handleChange('sube_tipo_falla',e.target.value)}>
                                <option value="">-- Seleccione Falla --</option>
                                <option value="CONSOLA NO RESPONDE">CONSOLA NO RESPONDE</option>
                                <option value="SINCRONIZANDO">SINCRONIZANDO</option>
                                <option value="NO GRABA QR">NO GRABA QR</option>
                                <option value="APAGADA">APAGADA</option>
                                <option value="NO ACREDITA CARGAS">NO ACREDITA CARGAS</option>
                              </select>
                            </div>
                          </>
                        )}
                        
                        <div className="font-bold self-center text-xs text-[#003366]">Pasajeros Transportados Sin SUBE</div>
                        <div><input type="number" className="w-full border p-1 rounded bg-white" value={formData.sube_pasajeros_sin_sube || ''} onChange={(e)=>handleChange('sube_pasajeros_sin_sube',e.target.value)} /></div>
                      </div>
                    </div>
                  )}
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
                  {renderRatingTable("Presentación Personal", [{k:'puntualidad', l:'Puntualidad'}, {k:'uniforme', l:'Uniforme'}, {k:'aseo', l:'Aseo'}, {k:'barba', l:'No usa barba'}, {k:'tatuajes', l:'No tatuajes'}], ['NC','CR','CS','NP'], "pres")}
                  {renderRatingTable("Trato al Usuario", [{k:'modo', l:'Modo'}, {k:'conflicto', l:'Reacción conflicto'}, {k:'incidente', l:'Reacción incidente'}, {k:'info', l:'Información'}], ['NC','CR','CS','NP'], "trato")}
                  {renderRatingTable("Conducción", [{k:'espejos', l:'Espejos'}, {k:'senal', l:'Señalización'}, {k:'vel', l:'Velocidad'}, {k:'dist', l:'Distancia'}, {k:'defensivo', l:'Manejo defensivo'}], ['NC','CR','CS','NP'], "cond")}
                </>
              )}

              {tipoInspeccion === '4-SEGUIMIENTO DE TEMAS' && (
                <>
                  <h3 className="text-[#003366] font-bold text-lg mb-4 border-l-4 border-yellow-400 pl-2 uppercase">Seguimiento de Temas</h3>
                  <select className="w-full p-2 border rounded mb-4" value={formData.tema_tipo || ''} onChange={(e) => handleChange('tema_tipo', e.target.value)} required>
                    <option value="">-- Seleccione Tipo de Tema --</option>
                    <option value="Quejas y reclamos">Quejas y reclamos</option>
                    <option value="Etapas Intermedias">Etapas Intermedias</option>
                    <option value="Largada de servicios en base">Largada de servicios en base</option>
                    <option value="Control de servicios en terminal">Control de servicios en terminal</option>
                    <option value="Reuniones con entidades">Reuniones con entidades</option>
                    <option value="Otros">Otros</option>
                  </select>

                  {/* NUEVO: BOTÓN INTEGRADOR PARA CARGAR SINIESTROS AL MAPA DE SEGURIDAD VIAL */}
                  {formData.tema_tipo === 'Siniestros' && (
                    <div className="mb-4 space-y-2 animate-in fade-in duration-300">
                      <button 
                        type="button" 
                        onClick={() => setShowSiniestroModal(true)} 
                        className={`w-full text-white font-black p-4 rounded-xl text-sm transition-all shadow-md active:scale-95 ${formData.siniestro_cargado_mapa === 'SÍ' ? 'bg-green-600' : 'bg-red-600 hover:bg-red-700'}`}
                      >
                        {formData.siniestro_cargado_mapa === 'SÍ' ? '✅ SINIESTRO CARGADO CON ÉXITO' : '🚨 CARGAR A MAPA DE SINESTRALIDAD'}
                      </button>
                      <small className="block text-center text-gray-500 italic">Debe registrar el siniestro en la plataforma vial externa antes de guardar.</small>
                    </div>
                  )}

                  <textarea className="w-full p-3 border rounded mb-6" rows={4} placeholder="Observaciones / Novedades..." value={formData.observacion_temas || ''} onChange={(e) => handleChange('observacion_temas', e.target.value)} required></textarea>
                </>
              )}

              {tipoInspeccion === '5-INSPECCION AREA DE DESCANSO' && (
                <>
                  <h3 className="text-[#003366] font-bold text-lg mb-4 border-l-4 border-yellow-400 pl-2 uppercase">Inspección Area de Descanso</h3>
                  <select className="w-full p-2 border rounded mb-4" value={formData.ubicacion || ''} onChange={(e) => handleChange('ubicacion', e.target.value)} required>
                    <option value="">-- Seleccione Ubicación --</option>
                    <option value="SAN RAFAEL">SAN RAFAEL</option>
                    <option value="GENERAL ALVEAR">GENERAL ALVEAR</option>
                  </select>
                  {renderDescansoTable()}
                </>
              )}

              {tipoInspeccion && (
                <div className="space-y-4 pt-4 border-t mt-6">
                  {/* Ocultamos las Observaciones Generales y la caja de Fotos si es un Siniestro */}
                  {!String(formData.tema_tipo || '').toLowerCase().includes('siniest') && (
                    <>
                      <textarea className="w-full p-3 border rounded text-sm" rows={2} placeholder="Observaciones Generales" value={formData.observaciones || ''} onChange={(e) => handleChange('observaciones', e.target.value)}></textarea>
                      <div className="bg-[#f8f9fa] p-3 rounded border">
                        <label className="text-sm font-bold text-[#003366] block mb-2">📷 Adjuntar Fotos (Opcional)</label>
                        <input type="file" multiple accept="image/*" className="w-full text-sm" onChange={(e) => setFiles(Array.from(e.target.files ||[]))} />
                      </div>
                    </>
                  )}
                  <button type="submit" className="w-full bg-[#002244] text-white p-4 rounded font-bold uppercase" disabled={loading}>
                    {loading ? 'ENVIANDO...' : 'GUARDAR Y ENVIAR'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </main>
      )}

      {/* MODAL INTEGRACIÓN MAPA DE SINIESTROS */}
      {showSiniestroModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 z-[80] backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col h-[90vh] overflow-hidden">
            <div className="bg-red-600 text-white p-4 flex justify-between items-center rounded-t-lg shrink-0">
              <h2 className="font-bold text-sm">Carga Mapa de Siniestralidad</h2>
              <button onClick={() => setShowSiniestroModal(false)} className="text-2xl leading-none">&times;</button>
            </div>
            <div className="flex-1 bg-gray-900">
              <iframe 
                src="https://seguridad-vial-buttini.vercel.app/?mode=siniestro" 
                className="w-full h-full border-none"
                title="Mapa de Siniestralidad"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL SEGUIMIENTO INSPECTOR */}
      {modalSeg && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[70] backdrop-blur-sm">
          <div className="bg-[#f4f7f9] w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="bg-[#003366] text-white p-4 flex justify-between items-center rounded-t-lg shrink-0">
              <h2 className="font-bold text-sm">Seguimiento: {modalSeg.tipo}</h2>
              <button onClick={() => setModalSeg(null)} className="text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50 space-y-4">
              
              {/* RECONSTRUCCIÓN DE FICHA EN EL MODAL */}
              <FichaVisualizador ins={modalSeg} />

              {/* FOTOS DE RESPALDO */}
              {modalSeg.fotos && modalSeg.fotos.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-[#003366] text-xs uppercase border-b pb-2 mb-3">Fotos de Respaldo</h3>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {modalSeg.fotos.map((url:string, i:number) => (
                      <a key={i} href={url} target="_blank"><img src={url} className="h-20 rounded border" /></a>
                    ))}
                  </div>
                </div>
              )}

              {/* HISTORIAL DE ACCIONES (CHAT) */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-2">
                <div className="font-bold text-[#003366] text-xs border-b pb-1 mb-2">💬 Historial de Acciones</div>
                {historialChat.length === 0 ? <p className="text-gray-400 italic text-xs">Sin comentarios previos.</p> : (
                  historialChat.map(h => (
                    <div key={h.id} className="border-l-2 border-blue-400 pl-2 py-1 text-xs">
                      <div className="text-[10px] text-gray-500"><b>{h.usuario}</b> - {new Date(h.created_at).toLocaleString()}</div>
                      <div className="text-xs text-gray-700">{h.accion}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 bg-white border-t rounded-b-lg space-y-2 shrink-0">
              <textarea className="w-full border p-2 rounded text-sm bg-gray-50" rows={2} placeholder="Escribir nuevo comentario..." value={nuevoComentario} onChange={(e) => setNewComentario(e.target.value)}></textarea>
              <button onClick={enviarComentario} className="w-full bg-green-600 text-white font-bold p-3 rounded-lg text-xs" disabled={loading}>AÑADIR COMENTARIO</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL CAMBIO DE CLAVE */}
      {showModalClave && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[120] backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-[#003366] text-white p-4 flex justify-between items-center">
              <h2 className="font-bold">Cambiar Contraseña</h2>
              <button onClick={() => setShowModalClave(false)} className="text-2xl leading-none hover:text-red-400">&times;</button>
            </div>
            <form onSubmit={handleCambiarClave} className="p-6 space-y-4">
              <div><label className="block text-xs font-bold text-[#003366] mb-1">Contraseña Actual</label><input type="password" value={claveActual} onChange={(e) => setClaveActual(e.target.value)} className="w-full border p-2 rounded bg-gray-50 text-sm" required /></div>
              <div><label className="block text-xs font-bold text-[#003366] mb-1">Nueva Contraseña</label><input type="password" value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} className="w-full border p-2 rounded bg-gray-50 text-sm" required /></div>
              <button type="submit" disabled={loading} className="w-full bg-green-600 text-white font-bold p-3 rounded-lg hover:bg-green-700 transition-colors">{loading ? 'GUARDANDO...' : 'GUARDAR CAMBIO'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}