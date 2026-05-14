'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
<<<<<<< HEAD
=======
import SearchInput from '@/components/SearchInput';
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd

export default function InspeccionPage() {
  const [user, setUser] = useState<any>(null);
  const[estadoJornada, setEstadoJornada] = useState<'INACTIVA' | 'TRABAJANDO' | 'REFRIGERIO'>('INACTIVA');
  const [loading, setLoading] = useState(false);
  
  // Estados del Formulario
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [tipoInspeccion, setTipoInspeccion] = useState('');
  const [subtipoPersonal, setSubtipoPersonal] = useState('');
  const[formData, setFormData] = useState<any>({});
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    const session = localStorage.getItem('buttini_user');
    if (!session) { window.location.href = '/'; return; }
    const userData = JSON.parse(session);
    setUser(userData);
    checkJornada(userData.username);

    // Setear Fecha y Hora actual (Zona Horaria Argentina)
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const iso = now.toISOString();
    setFecha(iso.substring(0, 10));
    setHora(iso.substring(11, 16));
  },[]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const idInspeccion = `${new Date().getTime()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
      let fotosUrls: string[] =[];

      if (files.length > 0) {
        for (const file of files) {
          const fileName = `${idInspeccion}_${Math.random()}.${file.name.split('.').pop()}`;
          await supabase.storage.from('fotos-inspecciones').upload(fileName, file);
          const { data: urlData } = supabase.storage.from('fotos-inspecciones').getPublicUrl(fileName);
          fotosUrls.push(urlData.publicUrl);
        }
      }

      navigator.geolocation.getCurrentPosition(async (pos) => {
        const payload = {
          id: idInspeccion,
          inspector: user.nombre,
          tipo: tipoInspeccion + (subtipoPersonal ? ` - ${subtipoPersonal}` : ''),
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          fotos: fotosUrls,
          datos_formulario: { ...formData, fecha_formulario: fecha, hora_formulario: hora },
          obs_general: formData.observaciones || formData.observacion_temas || ''
        };
        
        await supabase.from('inspections').insert([payload]);
        alert("¡Inspección guardada con éxito!");
        window.location.reload();
      });
    } catch (err) { alert("Error al guardar la inspección."); } finally { setLoading(false); }
  };

  // -------------------------------------------------------------
  // COMPONENTES REUTILIZABLES PARA DIBUJAR LAS TABLAS EXACTAS
  // -------------------------------------------------------------
  const RatingTable = ({ title, items, options, prefix }: { title: string, items: {k:string, l:string}[], options: string[], prefix: string }) => (
<<<<<<< HEAD
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
                <td key={opt} className="p-2 border-t border-gray-200">
                  <input type="radio" name={`${prefix}_${item.k}`} value={opt} className="w-4 h-4 cursor-pointer" required
                    onChange={(e) => setFormData({...formData, [`${prefix}_${item.k}`]: e.target.value})} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
=======
    <div className="mb-8 overflow-hidden border border-[#003366] rounded-xl shadow-md bg-white">
      <div className="bg-[#003366] text-white p-3 font-bold uppercase text-center text-sm">{title}</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-center border-collapse">
          <thead>
            <tr className="bg-[#002244] text-white text-[10px]">
              <th className="p-2 text-left w-1/2">ITEM</th>
              {options.map(o => <th key={o} className="p-2">{o}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={`${prefix}-${item.k}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-3 text-left border-t border-r font-medium border-gray-100">{item.l}</td>
                {options.map(opt => (
                  <td key={`${prefix}-${item.k}-${opt}`} className="p-2 border-t border-gray-100">
                    <input 
                      type="radio" 
                      name={`${prefix}_${item.k}`} 
                      value={opt} 
                      className="w-5 h-5 cursor-pointer accent-[#003366]" 
                      checked={formData[`${prefix}_${item.k}`] === String(opt)}
                      required
                      onChange={(e) => {
                        // Evita que el evento se propague y cause saltos
                        setFormData(prev => ({ ...prev, [`${prefix}_${item.k}`]: e.target.value }));
                      }} 
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
    </div>
  );

  const DescansoTable = () => {
    const items =[
      { k: 'limp_int', l: 'Limpieza general interior (pisos, polvo, vidrios)' },
      { k: 'cocina', l: 'Cocina (electrodomésticos, mesadas, utensilios)' },
      { k: 'bano', l: 'Baño (inodoros, duchas, toallas, papel higiénico)' },
      { k: 'basura', l: 'Basura retirada' },
      { k: 'insumos', l: 'Reposición de insumos de limpieza' },
      { k: 'danos', l: 'Control de daños/mantenimiento necesario' },
      { k: 'llaves', l: 'Revisión de llaves y cerraduras' },
      { k: 'ventilacion', l: 'Ventilación y aromas' },
      { k: 'limp_ext', l: 'Limpieza general exterior' },
    ];
    return (
      <div className="mb-6 overflow-hidden border border-[#003366] rounded shadow-sm">
        <table className="w-full text-sm text-center bg-white border-collapse">
          <thead className="bg-[#003366] text-white text-xs uppercase">
            <tr>
              <th className="p-3 text-left w-1/2">Controlar</th>
              <th className="p-3">Estado (E-MB-B-R)</th>
              <th className="p-3">Obs.</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.k} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="p-3 text-left border-t border-r border-gray-200">{item.l}</td>
                <td className="p-3 border-t border-r border-gray-200">
                  <div className="flex justify-center gap-2">
                    {['E', 'MB', 'B', 'R'].map(opt => (
                      <label key={opt} className="flex items-center gap-1 text-xs cursor-pointer">
<<<<<<< HEAD
                        <input type="radio" name={`descanso_${item.k}`} value={opt} required onChange={(e) => setFormData({...formData, [`descanso_${item.k}`]: e.target.value})} />
=======
                        <input type="radio" 
                        name={`descanso_${item.k}`} 
                        value={opt} 
                        checked={formData[`descanso_${item.k}`] === opt} 
                        required onChange={(e) => setFormData({...formData, [`descanso_${item.k}`]: e.target.value})} />
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
                        {opt}
                      </label>
                    ))}
                  </div>
                </td>
                <td className="p-2 border-t border-gray-200">
<<<<<<< HEAD
                  <textarea className="w-full border rounded p-1 text-xs" rows={2} onChange={(e) => setFormData({...formData,[`obs_${item.k}`]: e.target.value})}></textarea>
=======
                  <textarea className="w-full border rounded p-1 text-xs" rows={2} value={formData[`obs_${item.k}`] || ''} onChange={(e) => setFormData({...formData,[`obs_${item.k}`]: e.target.value})}></textarea>
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const SearchFieldsBlock = ({ includesInstructor = false }) => (
    <div className="space-y-4 mb-6 border-b pb-6">
      <div>
        <label className="text-xs font-bold text-[#003366] flex items-center gap-1"><span className="text-blue-500">🔍</span> Conductor (Escriba 3 letras)</label>
<<<<<<< HEAD
        <input type="text" placeholder="Buscar conductor..." className="w-full p-2 border rounded" onChange={(e) => setFormData({...formData, conductor: e.target.value})} required />
=======
        <SearchInput 
          label="🔍 Conductor (Escriba 3 letras)" 
          placeholder="Buscar conductor..."
          table="conductores"
          column="nombre_completo"
          onSelect={(val) => setFormData({...formData, conductor: val})}
          required={true}
        />
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-[#003366] flex items-center gap-1">🚌 Unidad N° (Escriba 2 letras)</label>
<<<<<<< HEAD
          <input type="text" placeholder="Buscar unidad..." className="w-full p-2 border rounded" onChange={(e) => setFormData({...formData, unidad: e.target.value})} required />
        </div>
        <div>
          <label className="text-xs font-bold text-[#003366]">Servicio (Escriba 3 letras)</label>
          <input type="text" placeholder="Buscar servicio..." className="w-full p-2 border rounded" onChange={(e) => setFormData({...formData, servicio: e.target.value})} required />
        </div>
      </div>
      {includesInstructor && (
        <div className="pt-4 border-t">
          <label className="text-xs font-bold text-[#003366] flex items-center gap-1">👨‍🏫 Instructor / Tutor (Escriba 3 letras)</label>
          <input type="text" placeholder="Buscar instructor..." className="w-full p-2 border rounded" onChange={(e) => setFormData({...formData, instructor: e.target.value})} required />
        </div>
      )}
=======
          <SearchInput 
            label="🚌 Unidad N°" 
            placeholder="Buscar unidad..."
            table="unidades"
            column="numero_unidad"
            onSelect={(val) => setFormData({...formData, unidad: val})}
            required={true}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-[#003366]">Servicio (Escriba 3 letras)</label>
            <SearchInput 
            label="🚌 Unidad N°" 
            placeholder="Buscar servicio..."
            table="servicios"
            column="descripcion"
            onSelect={(val) => setFormData({...formData, servicio: val})}
            required={true}
          />
        </div>
      </div>
    {includesInstructor && (
      <div className="pt-4 border-t mt-4">
        <SearchInput 
          label="👨‍🏫 Instructor / Tutor" 
          placeholder="Buscar instructor..."
          table="conductores" // Usa la misma tabla de conductores
          column="nombre_completo"
          onSelect={(val) => setFormData(prev => ({...prev, instructor: val}))}
          required={true}
        />
      </div>
    )}
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
    </div>
  );

  const PhotosBlock = () => (
    <div className="bg-[#f8f9fa] p-4 rounded border border-gray-200 mb-6">
      <label className="text-sm font-bold text-[#003366] flex items-center gap-2 mb-2">📷 Adjuntar Fotos (Opcional)</label>
      <input type="file" multiple accept="image/*" className="w-full text-sm" onChange={(e) => setFiles(Array.from(e.target.files ||[]))} />
      <span className="text-xs text-gray-500 block mt-1">Puede tomar fotos o seleccionar de la galería.</span>
    </div>
  );

  const FormInspectorCalleYPermanente = () => (
    <>
      <SearchFieldsBlock />
      <h3 className="text-[#003366] font-bold text-lg mb-2 border-l-4 border-yellow-400 pl-2 uppercase">Detalles Inspección</h3>
      <RatingTable title="Limpieza de la Unidad" prefix="limp" options={['1','2','3','4','5','N/C']} items={[
        {k:'int', l:'Interior'}, {k:'ext', l:'Exterior'}, {k:'cab', l:'Cabezales'}, {k:'bano', l:'Baño'}, {k:'ac', l:'A/C - CALEF.'}
      ]}/>
      <RatingTable title="Evaluación del Conductor" prefix="eval" options={['1','2','3','4','5','N/C']} items={[
        {k:'horarios', l:'Cumplimiento Horarios'}, {k:'uniforme', l:'Uniforme'}, {k:'atencion', l:'Atención al Usuario'}, {k:'cond', l:'Conducción'}
      ]}/>
      
      {/* Equipamiento Custom */}
      <div className="mb-6 overflow-hidden border border-[#003366] rounded shadow-sm text-sm">
        <div className="bg-[#003366] text-white p-2 font-bold uppercase text-center">Equipamiento y Sistemas</div>
        <div className="grid grid-cols-2">
          <div className="p-3 border-r border-b font-bold bg-white flex items-center">Micronauta</div>
          <div className="p-3 border-b bg-gray-50">
<<<<<<< HEAD
            <label className="block"><input type="radio" name="micron_existe" value="Existe" onChange={(e)=>setFormData({...formData, micron_existe: e.target.value})}/> Existe</label>
=======
            <label className="block"><input type="radio" name="micron_existe" value="Existe" checked={formData.micron_existe === 'Existe'}  onChange={(e)=>setFormData({...formData, micron_existe: e.target.value})}/> Existe</label>
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
            <label className="block"><input type="radio" name="micron_existe" value="No Existe" onChange={(e)=>setFormData({...formData, micron_existe: e.target.value})}/> No Existe</label>
          </div>
          <div className="p-3 border-r border-b bg-white">Func. Equipo</div>
          <div className="p-3 border-b bg-gray-50">
            <label className="block"><input type="radio" name="micron_func" value="Correcto" onChange={(e)=>setFormData({...formData, micron_func: e.target.value})}/> Correcto</label>
            <label className="block"><input type="radio" name="micron_func" value="Incorrecto" onChange={(e)=>setFormData({...formData, micron_func: e.target.value})}/> Incorrecto</label>
          </div>
          <div className="p-3 border-r border-b bg-white">Cant. Pasajeros</div>
          <div className="p-3 border-b bg-gray-50"><input type="number" className="w-full border rounded p-1" onChange={(e)=>setFormData({...formData, micron_pasajeros: e.target.value})}/></div>
          <div className="p-3 border-r border-b font-bold bg-white flex items-center">SUBE</div>
          <div className="p-3 border-b bg-gray-50">
            <label className="block"><input type="radio" name="sube_existe" value="Existe" onChange={(e)=>setFormData({...formData, sube_existe: e.target.value})}/> Existe</label>
            <label className="block"><input type="radio" name="sube_existe" value="No Existe" onChange={(e)=>setFormData({...formData, sube_existe: e.target.value})}/> No Existe</label>
          </div>
          <div className="p-3 border-r bg-white">Func. Equipo</div>
          <div className="p-3 bg-gray-50">
            <label className="block"><input type="radio" name="sube_func" value="Correcto" onChange={(e)=>setFormData({...formData, sube_func: e.target.value})}/> Correcto</label>
            <label className="block"><input type="radio" name="sube_func" value="Incorrecto" onChange={(e)=>setFormData({...formData, sube_func: e.target.value})}/> Incorrecto</label>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="text-sm font-bold text-[#003366] block mb-1">Observaciones Generales</label>
        <textarea className="w-full p-2 border rounded" rows={3} onChange={(e) => setFormData({...formData, observaciones: e.target.value})}></textarea>
      </div>
      <PhotosBlock />
    </>
  );

  if (!user) return <div className="p-10 text-center">Cargando sesión...</div>;

  return (
    <div className="min-h-screen bg-gray-100 text-black pb-10">
      {/* BARRA SUPERIOR (Usuario y Jornada) */}
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

      {/* PANTALLAS DE JORNADA */}
      {estadoJornada === 'INACTIVA' && (
        <div className="flex flex-col items-center justify-center p-10 mt-10">
          <div className="bg-white p-8 rounded shadow text-center max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4 text-[#003366]">¿Iniciar Jornada?</h2>
            <p className="text-gray-600 mb-6 text-sm">Debe registrar el inicio para trabajar hoy.</p>
            <button onClick={() => logShift('INICIO')} className="w-full bg-[#003366] text-white p-3 rounded font-bold uppercase" disabled={loading}>{loading ? 'Cargando...' : 'Sí, Iniciar'}</button>
          </div>
        </div>
      )}
      {estadoJornada === 'REFRIGERIO' && (
        <div className="fixed inset-0 bg-[#003366]/95 flex flex-col items-center justify-center text-center p-10 z-[60]">
          <h1 className="text-4xl font-bold text-orange-400 mb-4">☕ EN REFRIGERIO</h1>
          <button onClick={() => logShift('FIN_REF')} className="bg-green-600 text-white px-10 py-4 rounded font-bold text-lg">REANUDAR TRABAJO</button>
        </div>
      )}

      {/* FORMULARIO PRINCIPAL */}
      {estadoJornada === 'TRABAJANDO' && (
        <main className="p-2 md:p-4 max-w-3xl mx-auto">
          <div className="bg-white p-4 md:p-8 rounded shadow-lg border-t-4 border-[#003366]">
            {/* ENCABEZADO TIPO DOCUMENTO */}
            <header className="text-center mb-6 pb-4 border-b">
              <img src="https://i.ibb.co/RG0tNq6t/Logo-Web-copia.png" className="h-10 mx-auto mb-2" alt="Logo" />
              <h1 className="text-sm text-gray-600">Parte Digital de Inspectores</h1>
            </header>

            <form onSubmit={handleSubmit}>
              {/* FECHA, HORA, INSPECTOR */}
              <div className="grid grid-cols-2 gap-4 mb-4 bg-gray-50 p-4 rounded border">
                <div>
                  <label className="text-xs font-bold text-[#003366] flex items-center gap-1">📅 Fecha</label>
                  <input type="date" className="w-full p-2 border rounded bg-white text-sm" value={fecha} onChange={(e)=>setFecha(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#003366] flex items-center gap-1">🕒 Hora</label>
                  <input type="time" className="w-full p-2 border rounded bg-white text-sm" value={hora} onChange={(e)=>setHora(e.target.value)} required />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-[#003366] flex items-center gap-1">👮 Inspector</label>
                  <input type="text" className="w-full p-2 border rounded bg-gray-200 text-sm font-bold text-gray-700" value={user.nombre} disabled />
                </div>
              </div>

              {/* TIPO DE INSPECCION */}
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

              {/* TIPO 3: SUBTIPO DE PERSONAL */}
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

              {/* ---------------------------------------------------------------- */}
              {/* RENDERIZADO CONDICIONAL DE FORMULARIOS */}
              {/* ---------------------------------------------------------------- */}

              {/* TIPO 1: CALLE | TIPO 3: PERMANENTE */}
              {(tipoInspeccion === '1-INSPECTOR EN CALLE' || subtipoPersonal === 'Permanente') && (
                <FormInspectorCalleYPermanente />
              )}

              {/* TIPO 2: EMOP */}
              {tipoInspeccion === '2-EMOP' && (
                <>
                  <SearchFieldsBlock />
                  <h3 className="text-[#003366] font-bold text-lg mb-2 border-l-4 border-yellow-400 pl-2 uppercase">Registro EMOP</h3>
                  <textarea className="w-full p-3 border rounded mb-6" rows={5} placeholder="Ingrese detalles de la inspección EMOP..." onChange={(e) => setFormData({...formData, emop_detalle: e.target.value})} required></textarea>
                  <PhotosBlock />
                </>
              )}

              {/* TIPO 3: ASPIRANTE O PRUEBA */}
              {(subtipoPersonal === 'Aspirante' || subtipoPersonal === 'Periodo de prueba') && (
                <>
                  <SearchFieldsBlock includesInstructor={true} />
                  <h3 className="text-[#003366] font-bold text-lg mb-4 border-l-4 border-yellow-400 pl-2 uppercase">Seguimiento Aspirantes / Prueba</h3>
                  
                  <RatingTable title="Presentación Personal" prefix="pres" options={['NC','CR','CS','NP']} items={[
                    {k:'puntualidad', l:'Puntualidad'}, {k:'uniforme', l:'Estado del uniforme'}, {k:'aseo', l:'Aseo e imagen personal'}, {k:'barba', l:'No usa barba'}, {k:'tatuajes', l:'No usa/muestra tatuajes, aros'}
                  ]}/>
                  <RatingTable title="Trato al Usuario" prefix="trato" options={['NC','CR','CS','NP']} items={[
                    {k:'modo', l:'Modo de dirigirse'}, {k:'conflicto', l:'Reacción al conflicto'}, {k:'incidente', l:'Reacción al incidente (caídas)'}, {k:'info', l:'Información al usuario'}
                  ]}/>
                  <RatingTable title="Tiempo de Reacción" prefix="reac" options={['NC','CR','CS','NP']} items={[
                    {k:'dist_seg', l:'Distancia de seguimiento'}, {k:'dist_fren', l:'Distancia de frenado'}, {k:'vel', l:'Velocidad'}, {k:'precaucion', l:'Precaución'}, {k:'vis_otros', l:'Visualización de otros vehículos'}
                  ]}/>
                  <RatingTable title="Señales de Transito" prefix="senales" options={['NC','CR','CS','NP']} items={[
                    {k:'vel_minmax', l:'Velocidad mínima y máxima'}, {k:'carriles', l:'Carriles exclusivos'}, {k:'doble_linea', l:'Doble línea amarilla'}, {k:'semaforos', l:'Semáforos'}, {k:'contrario', l:'Sentido contrario'}, {k:'ceda', l:'Ceda el paso'}, {k:'cruce_nivel', l:'Cruce con paso a nivel'}, {k:'prohibido', l:'Prohibido girar'}
                  ]}/>
                  <RatingTable title="Conducción" prefix="cond" options={['NC','CR','CS','NP']} items={[
                    {k:'espejos', l:'Uso de espejos retrovisores'}, {k:'senal', l:'Señalización'}, {k:'vel', l:'Velocidad'}, {k:'dist', l:'Distancia'}, {k:'maniobras', l:'Movimientos y Maniobras'}, {k:'entorno', l:'Visualización del entorno'}, {k:'defensivo', l:'Manejo defensivo'}, {k:'guias', l:'Uso y cumplimiento de guías'}, {k:'instructivos', l:'Cumplimiento de instructivos'}
                  ]}/>

                  <div className="mb-6">
                    <label className="text-sm font-bold text-[#003366] block mb-1">Observaciones</label>
                    <textarea className="w-full p-2 border rounded" rows={3} onChange={(e) => setFormData({...formData, observaciones: e.target.value})}></textarea>
                  </div>
                </>
              )}

              {/* TIPO 4: TEMAS */}
              {tipoInspeccion === '4-SEGUIMIENTO DE TEMAS' && (
                <>
                  <h3 className="text-[#003366] font-bold text-lg mb-4 border-l-4 border-yellow-400 pl-2 uppercase">Seguimiento de Temas</h3>
                  <div className="mb-4">
                    <label className="text-sm font-bold text-[#003366] block mb-1">Tipo de Temas</label>
                    <select className="w-full p-2 border rounded" onChange={(e) => setFormData({...formData, tema_tipo: e.target.value})} required>
                      <option value="">-- Seleccione --</option>
                      <option value="Quejas y reclamos">Quejas y reclamos</option>
                      <option value="Siniestros">Siniestros</option>
                      <option value="Etapas Intermedias">Etapas Intermedias</option>
                      <option value="Largada de servicios en base">Largada de servicios en base</option>
                      <option value="Control de servicios en terminal">Control de servicios en terminal</option>
                      <option value="Reuniones con entidades">Reuniones con entidades</option>
                      <option value="Otros">Otros</option>
                    </select>
                  </div>
                  <div className="mb-6">
                    <label className="text-sm font-bold text-[#003366] block mb-1">Observaciones / Novedades</label>
                    <textarea className="w-full p-3 border rounded" rows={5} onChange={(e) => setFormData({...formData, observacion_temas: e.target.value})} required></textarea>
                  </div>
                </>
              )}

              {/* TIPO 5: DESCANSO */}
              {tipoInspeccion === '5-INSPECCION AREA DE DESCANSO' && (
                <>
                  <h3 className="text-[#003366] font-bold text-lg mb-4 border-l-4 border-yellow-400 pl-2 uppercase">Inspección Area de Descanso</h3>
                  <div className="mb-4">
                    <label className="text-sm font-bold text-[#003366] block mb-1">Ubicación</label>
                    <select className="w-full p-2 border rounded" onChange={(e) => setFormData({...formData, ubicacion: e.target.value})} required>
                      <option value="">-- Seleccione --</option>
                      <option value="SAN RAFAEL">SAN RAFAEL</option>
                      <option value="GENERAL ALVEAR">GENERAL ALVEAR</option>
                    </select>
                  </div>
                  <DescansoTable />
                  <PhotosBlock />
                </>
              )}

              {/* BOTON ENVIAR */}
              {tipoInspeccion && (
                <button type="submit" className="w-full bg-[#002244] text-white p-4 rounded font-bold uppercase shadow hover:bg-[#003366] transition-colors text-lg" disabled={loading}>
                  {loading ? 'ENVIANDO DATOS...' : 'GUARDAR Y ENVIAR'}
                </button>
              )}

            </form>
          </div>
        </main>
      )}
    </div>
  );
}