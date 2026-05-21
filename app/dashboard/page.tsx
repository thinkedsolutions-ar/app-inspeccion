'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./MapComponent'), { ssr: false });

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement, ChartDataLabels);

export default function DashboardPage() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('reportes');
  const [loading, setLoading] = useState(true);
  
  const [inspecciones, setInspecciones] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]); // NUEVO: Para calcular horassss
  
  const [fechaInicio, setFechaInicio] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [chkSeguimiento, setChkSeguimiento] = useState(false);
  const [chkObservaciones, setChkObservaciones] = useState(false);
  const [filtroInspector, setFiltroInspector] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const [modalIns, setModalIns] = useState<any>(null);
  const [nuevoComentario, setNewComentario] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', nombre: '', rol: 'Inspector', jornada: 'SI' });

  const [selectedInspectorChart, setSelectedInspectorChart] = useState<string | null>(null);
  const [selectedTypeChart, setSelectedTypeChart] = useState<string | null>(null);

  // NUEVOS ESTADOS: Desempeño
  const [modalDesempeno, setModalDesempeno] = useState<string | null>(null);
  const [mesDesempeno, setMesDesempeno] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [mapaVista, setMapaVista] = useState<'inspecciones' | 'jornadas'>('inspecciones');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  useEffect(() => {
    const session = localStorage.getItem('buttini_user');
    if (!session) { window.location.href = '/'; return; }
    const userData = JSON.parse(session);
    if (userData.rol !== 'Admin') { window.location.href = '/inspeccion'; return; }
    setAdminUser(userData);
    fetchData(); fetchUsers();
  },[]);

  // SE MODIFICÓ ESTA FUNCIÓN: Se agregó supabase.from('shifts')...
  const fetchData = async () => {
    setLoading(true);
    const dYearAgo = new Date(); dYearAgo.setFullYear(dYearAgo.getFullYear() - 1);
    const [resIns, resFol, resShifts] = await Promise.all([
      supabase.from('inspections').select('*').gte('created_at', dYearAgo.toISOString()).order('created_at', { ascending: false }),
      supabase.from('followups').select('*').order('created_at', { ascending: true }),
      supabase.from('shifts').select('*').gte('fecha', dYearAgo.toISOString()).order('fecha', { ascending: true })
    ]);
    setInspecciones(resIns.data || []); setFollowups(resFol.data || []); setShifts(resShifts.data || []); setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('nombre');
    if (data) setUsuarios(data);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('users').insert([newUser]);
    if (error) alert("Error: " + error.message);
    else { alert("Usuario creado"); setNewUser({ username: '', password: '', nombre: '', rol: 'Inspector', jornada: 'SI' }); fetchUsers(); }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (confirm(`¿Eliminar al usuario ${username}?`)) { await supabase.from('users').delete().eq('id', id); fetchUsers(); }
  };

  const handleResetPassword = async (id: string, username: string) => {
    const newPass = prompt(`Ingrese la NUEVA CONTRASEÑA para ${username}:`);
    if (!newPass) return;
    const { error } = await supabase.from('users').update({ password: newPass }).eq('id', id);
    if (error) alert("Error al cambiar clave"); else alert("Contraseña actualizada exitosamente.");
  };

  const handleAddComentario = async () => {
    if (!nuevoComentario.trim()) return;
    setLoading(true);
    await supabase.from('followups').insert([{ inspection_id: modalIns.id, usuario: adminUser.nombre, accion: nuevoComentario }]);
    setNewComentario(''); await fetchData(); setLoading(false);
  };

  const handleCerrarTema = async () => {
    if(!confirm("¿Cerrar seguimiento?")) return;
    setLoading(true);
    await supabase.from('followups').insert([{ inspection_id: modalIns.id, usuario: adminUser.nombre, accion: '[CERRADO] El tema ha sido cerrado por el administrador.' }]);
    await fetchData(); setModalIns(null); setLoading(false);
  };

  const getInspectionStatus = (id: string) => {
    const f = followups.filter(x => x.inspection_id === id);
    if (f.length === 0) return 'SIN SEGUIMIENTO';
    if (f.some(x => x.accion.includes('[CERRADO]'))) return 'CERRADO';
    return 'ABIERTO';
  };

  const dataTabla = inspecciones.filter(ins => {
    const dateOk = ins.created_at >= `${fechaInicio}T00:00:00Z` && ins.created_at <= `${fechaFin}T23:59:59Z`;
    if (!dateOk) return false;
    if (chkSeguimiento && getInspectionStatus(ins.id) === 'SIN SEGUIMIENTO') return false;
    if (chkObservaciones && (!ins.obs_general || ins.obs_general.trim() === '')) return false;
    if (filtroInspector && ins.inspector !== filtroInspector) return false;
    if (filtroTipo && ins.tipo !== filtroTipo) return false;
    return true;
  });

  const inspectoresUnicos = Array.from(new Set(inspecciones.map(i => i.inspector))).sort();
  const tiposUnicos = Array.from(new Set(inspecciones.map(i => i.tipo))).sort();

  const last12Months = Array.from({length: 12}, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (11 - i)); return d.toLocaleString('es-ES', { month: 'short', year: '2-digit' }); });
  const trendData = new Array(12).fill(0);
  inspecciones.forEach(ins => {
    const d = new Date(ins.created_at);
    const idx = last12Months.indexOf(d.toLocaleString('es-ES', { month: 'short', year: '2-digit' }));
    if (idx >= 0) trendData[idx]++;
  });

  const conteoInspectores: Record<string, number> = {};
  dataTabla.forEach(ins => { conteoInspectores[ins.inspector] = (conteoInspectores[ins.inspector] || 0) + 1; });

  const conteoTipos: Record<string, number> = {};
  const dataParaGraficoTipos = selectedInspectorChart ? dataTabla.filter(ins => ins.inspector === selectedInspectorChart) : dataTabla;
  dataParaGraficoTipos.forEach(ins => { conteoTipos[ins.tipo] = (conteoTipos[ins.tipo] || 0) + 1; });

  const tiposOrdenados = Object.entries(conteoTipos).sort((a,b) => b[1] - a[1]);
  const inspectoresOrdenados = Object.entries(conteoInspectores).sort((a,b) => b[1] - a[1]);

  const chartTipos = {
    labels: tiposOrdenados.map(t => t[0]),
    datasets: [{ label: 'Cantidad', data: tiposOrdenados.map(t => t[1]), backgroundColor: tiposOrdenados.map((t, i) => selectedTypeChart && t[0] !== selectedTypeChart ? '#e5e7eb' : ['#003366', '#dc3545', '#FFCC00', '#28a745', '#6f42c1'][i % 5]) }]
  };

  const chartInspectores = {
    labels: inspectoresOrdenados.map(i => i[0]),
    datasets: [{ label: 'Inspecciones', data: inspectoresOrdenados.map(i => i[1]), backgroundColor: inspectoresOrdenados.map(i => i[0] === selectedInspectorChart ? '#FFCC00' : '#003366') }]
  };

  const types = Array.from(new Set(dataTabla.map(i => i.tipo)));
  const inspectors = Array.from(new Set(dataTabla.map(i => i.inspector)));
  const palette = ['#003366', '#dc3545', '#FFCC00', '#28a745', '#6f42c1'];
  const chartStacked = {
    labels: inspectors,
    datasets: types.map((type, i) => ({ label: type, backgroundColor: palette[i % palette.length], data: inspectors.map(insp => dataTabla.filter(ins => ins.inspector === insp && ins.tipo === type).length) }))
  };

  const chartOptionsNumbers = { maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { anchor: 'end' as const, align: 'end' as const, font: { weight: 'bold' as const }, formatter: (v:number) => v > 0 ? v : '' } }, scales: { y: { beginAtZero: true, grace: '10%' } } };

  const optionsInspectorChart = {
    ...chartOptionsNumbers,
    onClick: (e: any, elements: any) => {
      if (elements.length > 0) {
        const label = inspectoresOrdenados[elements[0].index][0];
        setSelectedInspectorChart(label === selectedInspectorChart ? null : label);
      } else setSelectedInspectorChart(null);
    }
  };

  const optionsTypeChart = {
    ...chartOptionsNumbers,
    onClick: (e: any, elements: any) => {
      if (elements.length > 0) {
        const label = tiposOrdenados[elements[0].index][0];
        setSelectedTypeChart(label === selectedTypeChart ? null : label);
      } else { setSelectedTypeChart(null); setSelectedInspectorChart(null); }
    }
  };

  const dataFinalTabla = selectedTypeChart ? dataTabla.filter(ins => ins.tipo === selectedTypeChart) : dataTabla;

  // --- LÓGICA DE HORAS TRABAJADAS (DESEMPEÑO) ---
  const getHorasRango = (nombreInsp: string, inicioYMD: string, finYMD: string) => {
    const sFiltrados = shifts.filter(s => s.nombre === nombreInsp && s.fecha.substring(0,10) >= inicioYMD && s.fecha.substring(0,10) <= finYMD);
    const iFiltradas = inspecciones.filter(i => i.inspector === nombreInsp && i.created_at.substring(0,10) >= inicioYMD && i.created_at.substring(0,10) <= finYMD);
    
    const dias: any = {};
    sFiltrados.forEach(s => {
      const dKey = s.fecha.substring(0, 10);
      if (!dias[dKey]) dias[dKey] = { start: null, end: null, refStart: null, refEnd: null };
      const dObj = new Date(s.fecha);
      if (s.accion === 'INICIO') dias[dKey].start = dObj;
      if (s.accion === 'FIN') dias[dKey].end = dObj;
      if (s.accion === 'INICIO_REF') dias[dKey].refStart = dObj;
      if (s.accion === 'FIN_REF') dias[dKey].refEnd = dObj;
    });

    let totalMs = 0;
    for (const dKey in dias) {
      const d = dias[dKey];
      if (d.start) {
        let end = d.end;
        if (!end) {
          const hoyIns = iFiltradas.filter(i => i.created_at.substring(0, 10) === dKey);
          if (hoyIns.length > 0) end = new Date(Math.max(...hoyIns.map(i => new Date(i.created_at).getTime())));
          else end = d.start;
        }
        let dayMs = end.getTime() - d.start.getTime();
        if (d.refStart && d.refEnd) dayMs -= (d.refEnd.getTime() - d.refStart.getTime());
        if (dayMs > 0) totalMs += dayMs;
      }
    }
    const h = Math.floor(totalMs / 3600000);
    const m = Math.floor((totalMs % 3600000) / 60000);
    return { ms: totalMs, text: `${h}:${m.toString().padStart(2, '0')}` };
  };

  // --- LÓGICA MODAL DESEMPEÑO (Mes Específico) ---
  const [desempenoDatos, setDesempenoDatos] = useState<any>({ grid: [], totalMs: 0, kpis: {}, temas: {}, mapaIns: [] });

  useEffect(() => {
    if (modalDesempeno) {
      const parts = mesDesempeno.split('-');
      const y = parseInt(parts[0]); const m = parseInt(parts[1]) - 1;
      const firstDay = new Date(y, m, 1); const lastDay = new Date(y, m + 1, 0);
      
      const grid = [];
      let msAcumulado = 0;
      
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const calc = getHorasRango(modalDesempeno, dateStr, dateStr);
        msAcumulado += calc.ms;
        const accH = Math.floor(msAcumulado / 3600000);
        const accM = Math.floor((msAcumulado % 3600000) / 60000);
        grid.push({
          dateISO: dateStr, // Agregado para el filtro
          fecha: `${String(day).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`,
          horas: calc.ms > 0 ? calc.text : 'F',
          acumulado: `${accH}:${accM.toString().padStart(2, '0')}`
        });
      }

      const mesStart = `${mesDesempeno}-01`;
      const mesEnd = `${mesDesempeno}-31`;
      
      // Inspecciones del mes
      const iMes = inspecciones.filter(i => i.inspector === modalDesempeno && i.created_at.substring(0, 10) >= mesStart && i.created_at.substring(0, 10) <= mesEnd);
      
      // Jornadas (Shifts) del mes normalizadas para el mapa
      const sMes = shifts.filter(s => s.nombre === modalDesempeno && s.fecha.substring(0, 10) >= mesStart && s.fecha.substring(0, 10) <= mesEnd);
      const shiftsNorm = sMes.map(s => ({
        id: s.id,
        inspector: s.nombre,
        tipo: `📍 ${s.accion} JORNADA`, // Etiqueta especial
        lat: s.lat,
        lon: s.lon,
        created_at: s.fecha,
        isShift: true // Bandera para bloquear el botón "Ver Ficha"
      }));

      const kpis: any = {}; const temas: any = {};
      iMes.forEach(i => {
        kpis[i.tipo] = (kpis[i.tipo] || 0) + 1;
        if (i.tipo.includes('TEMAS') && i.datos_formulario?.tema_tipo) temas[i.datos_formulario.tema_tipo] = (temas[i.datos_formulario.tema_tipo] || 0) + 1;
      });

      setDesempenoDatos({ grid, totalMs: msAcumulado, kpis, temas, mapaIns: iMes, mapaShifts: shiftsNorm });
    }
  }, [modalDesempeno, mesDesempeno, inspecciones, shifts]);

// --- FILTRO DINÁMICO PARA EL MAPA DE DESEMPEÑO ---
  const mapDataToShow = (mapaVista === 'inspecciones' ? (desempenoDatos?.mapaIns || []) : (desempenoDatos?.mapaShifts || []))
      .filter((item: any) => selectedDateFilter ? item.created_at.substring(0,10) === selectedDateFilter : true);

  if (!adminUser) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="flex h-screen bg-[#f4f7f9] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-[#003366] text-white flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-6 bg-white m-4 rounded-lg text-center"><img src="https://i.ibb.co/RG0tNq6t/Logo-Web-copia.png" className="h-10 mx-auto" alt="Logo" /><div className="text-[#003366] text-[10px] font-black mt-2">GESTIÓN OPERATIVA V3</div></div>
        <nav className="flex-1 px-2 space-y-2">
          <button onClick={() => setActiveTab('reportes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold ${activeTab === 'reportes' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'hover:bg-white/5'}`}>📊 Reportes</button>
          <button onClick={() => setActiveTab('desempeno')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold ${activeTab === 'desempeno' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'hover:bg-white/5'}`}>👥 Desempeño</button>
          <button onClick={() => setActiveTab('mapa')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold ${activeTab === 'mapa' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'hover:bg-white/5'}`}>📍 Mapa Satelital</button>
          <button onClick={() => setActiveTab('usuarios')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold ${activeTab === 'usuarios' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'hover:bg-white/5'}`}>⚙️ Usuarios</button>
        </nav>
        <div className="p-4"><button onClick={() => { localStorage.removeItem('buttini_user'); window.location.href = '/'; }} className="w-full bg-red-600 p-3 rounded-lg font-bold hover:bg-red-700">CERRAR SESIÓN</button></div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOP BAR FILTROS */}
        <div className="bg-white p-4 shadow-sm flex justify-between items-center z-10 shrink-0 border-b">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2"><span className="text-xs font-bold text-gray-500 uppercase">Desde</span><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="border p-2 rounded text-sm bg-gray-50" /></div>
            <div className="flex items-center gap-2"><span className="text-xs font-bold text-gray-500 uppercase">Hasta</span><input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="border p-2 rounded text-sm bg-gray-50" /></div>
            <select value={filtroInspector} onChange={(e)=>setFiltroInspector(e.target.value)} className="border p-2 rounded text-sm bg-white font-bold text-[#003366]"><option value="">Todos los Inspectores</option>{inspectoresUnicos.map((i:any) => <option key={i} value={i}>{i}</option>)}</select>
            <select value={filtroTipo} onChange={(e)=>setFiltroTipo(e.target.value)} className="border p-2 rounded text-sm bg-white font-bold text-[#003366] max-w-xs"><option value="">Todos los Tipos</option>{tiposUnicos.map((t:any) => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div className="font-bold text-[#003366]">👤 {adminUser.nombre}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? <div className="text-center mt-20 font-bold text-xl animate-pulse">Cargando datos en vivo...</div> : (
            <>
              {/* --- REPORTES --- */}
              {activeTab === 'reportes' && (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-6">
                    <div className="min-w-[150px] border-r pr-4"><h3 className="text-gray-400 font-bold uppercase text-[10px]">Total Inspecciones</h3><div className="text-4xl font-black text-[#003366]">{dataTabla.length}</div></div>
                    <div className="flex-1 h-32"><Line data={{ labels: last12Months, datasets: [{ data: trendData, borderColor: '#3b82f6', backgroundColor: '#dc3545', pointRadius: 4, tension: 0.3 }] }} options={chartOptionsNumbers} /></div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border"><h3 className="text-[#003366] font-bold mb-4">Distribución por Tipo {selectedInspectorChart && <span className="text-xs text-orange-500 ml-2">(Filtrado por: {selectedInspectorChart})</span>}</h3><div className="h-64"><Bar data={chartTipos} options={optionsTypeChart} /></div></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border"><h3 className="text-[#003366] font-bold mb-4">Total por Inspector <span className="text-[10px] font-normal text-gray-400">(Clic para filtrar)</span></h3><div className="h-64"><Bar data={chartInspectores} options={optionsInspectorChart} /></div></div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border flex flex-col h-[500px]">
                    <div className="bg-gray-50 p-4 border-b flex justify-between items-center shrink-0 flex-wrap gap-2">
                      <div className="font-bold text-[#003366] text-lg">Registro Detallado</div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 bg-[#fffbe6] px-3 py-1 border border-yellow-200 rounded cursor-pointer text-xs font-bold text-[#003366]"><input type="checkbox" checked={chkSeguimiento} onChange={e=>setChkSeguimiento(e.target.checked)}/> Solo Seguimiento</label>
                        <label className="flex items-center gap-2 bg-[#fffbe6] px-3 py-1 border border-yellow-200 rounded cursor-pointer text-xs font-bold text-[#003366]"><input type="checkbox" checked={chkObservaciones} onChange={e=>setChkObservaciones(e.target.checked)}/> Solo Observaciones</label>
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 relative">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-white text-[#003366] sticky top-0 shadow-sm z-10"><tr><th className="p-3">Fecha/Lugar</th><th className="p-3">Inspector</th><th className="p-3">Tipo</th><th className="p-3">Observaciones</th><th className="p-3 text-center">Acción</th><th className="p-3 text-center">Estado</th></tr></thead>
                        <tbody>
                          {dataFinalTabla.map(ins => (
                            <tr key={ins.id} className="border-b hover:bg-gray-50">
                              <td className="p-3 whitespace-nowrap"><a href={`https://www.google.com/maps/search/?api=1&query=${ins.lat},${ins.lon}`} target="_blank" className="text-blue-600 hover:underline font-bold" title="Ver en Mapa">{new Date(ins.created_at).toLocaleDateString()} {new Date(ins.created_at).toLocaleTimeString().slice(0,5)} 📍</a></td>
                              <td className="p-3 font-bold">{ins.inspector}</td>
                              <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-bold border truncate block max-w-[200px]">{ins.tipo}</span></td>
                              <td className="p-3 text-xs text-gray-600 max-w-[200px] truncate">{ins.obs_general}</td>
                              <td className="p-3 text-center"><button onClick={() => setModalIns(ins)} className="bg-[#FFCC00] text-[#003366] px-3 py-1 rounded font-bold text-xs">VER</button></td>
                              <td className="p-3 text-center text-[10px] font-bold uppercase">{getInspectionStatus(ins.id)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --- DESEMPEÑO PERSONAL --- */}
              {activeTab === 'desempeno' && (
                <div className="space-y-6">
                  <h2 className="text-[#003366] font-bold text-xl mb-4 border-b-2 border-[#FFCC00] pb-2 inline-block">Reporte de Horas y Desempeño Diario</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inspectoresUnicos.map((insp: any) => {
                      const stats = getHorasRango(insp, fechaInicio, fechaFin);
                      const totalIns = inspecciones.filter(i => i.inspector === insp && i.created_at >= `${fechaInicio}T00:00:00Z` && i.created_at <= `${fechaFin}T23:59:59Z`).length;
                      return (
                        <div key={insp} className="bg-white p-6 rounded-xl shadow-sm border flex flex-col justify-between hover:shadow-md transition-shadow">
                          <div>
                            <h3 className="text-lg font-black text-[#003366] mb-4">{insp}</h3>
                            <div className="flex items-baseline gap-2 mb-2"><span className="text-4xl font-light text-[#003366]">{stats.text}</span><span className="text-sm text-gray-500">hs acumuladas</span></div>
                            <div className="flex items-baseline gap-2 mb-6"><span className="text-xl font-bold text-gray-800">{totalIns}</span><span className="text-sm text-gray-500">inspecciones</span></div>
                          </div>
                          <button onClick={() => setModalDesempeno(insp)} className="w-full bg-[#FFCC00] text-[#003366] py-3 rounded font-bold hover:bg-yellow-400">VER DETALLE</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --- MAPA --- */}
              {activeTab === 'mapa' && (
                <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border p-4">
                  <div className="mb-4 flex justify-between items-center"><h2 className="text-[#003366] font-bold text-lg">📍 Mapa de Inspecciones</h2><span className="bg-green-100 text-green-800 px-3 py-1 rounded text-xs font-bold border border-green-200">{dataTabla.length} Puntos</span></div>
                  <div className="flex-1 rounded-xl overflow-hidden border"><MapComponent inspecciones={dataTabla} onVerFicha={(ins:any) => setModalIns(ins)} /></div>
                </div>
              )}

              {/* --- USUARIOS --- */}
              {activeTab === 'usuarios' && (
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border">
                    <h3 className="text-[#003366] font-bold mb-4">Agregar Nuevo Usuario</h3>
                    <form onSubmit={handleCreateUser} className="flex flex-wrap gap-4 items-end">
                      <div className="flex-1 min-w-[150px]"><label className="block text-xs font-bold text-gray-500 mb-1">Usuario (Login)</label><input type="text" className="w-full border p-2 rounded bg-gray-50" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required /></div>
                      <div className="flex-1 min-w-[150px]"><label className="block text-xs font-bold text-gray-500 mb-1">Clave</label><input type="password" className="w-full border p-2 rounded bg-gray-50" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required /></div>
                      <div className="flex-1 min-w-[200px]"><label className="block text-xs font-bold text-gray-500 mb-1">Nombre Completo</label><input type="text" className="w-full border p-2 rounded bg-gray-50" value={newUser.nombre} onChange={e => setNewUser({...newUser, nombre: e.target.value})} required /></div>
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">Rol</label><select className="w-full border p-2 rounded bg-white" value={newUser.rol} onChange={e => setNewUser({...newUser, rol: e.target.value})}><option value="Inspector">Inspector</option><option value="Admin">Admin</option></select></div>
                      <div><label className="block text-xs font-bold text-gray-500 mb-1">Jornada Mínima</label><select className="w-full border p-2 rounded bg-white" value={newUser.jornada} onChange={e => setNewUser({...newUser, jornada: e.target.value})}><option value="SI">Requerida (Sí)</option><option value="NO">Omitir (No)</option></select></div>
                      <button type="submit" className="bg-green-600 text-white font-bold px-6 py-2 rounded">GUARDAR</button>
                    </form>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#f8f9fa] text-[#003366] uppercase text-xs font-bold"><tr><th className="p-4 border-b">Usuario</th><th className="p-4 border-b">Nombre</th><th className="p-4 border-b">Rol</th><th className="p-4 border-b">Jornada</th><th className="p-4 border-b text-right">Acciones</th></tr></thead>
                      <tbody>
                        {usuarios.map(u => (
                          <tr key={u.id} className="border-b hover:bg-gray-50">
                            <td className="p-4 font-bold">{u.username}</td><td className="p-4">{u.nombre}</td>
                            <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold text-white ${u.rol === 'Admin' ? 'bg-[#003366]' : 'bg-gray-500'}`}>{u.rol}</span></td>
                            <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-bold text-white ${u.jornada === 'SI' ? 'bg-green-500' : 'bg-red-500'}`}>{u.jornada === 'SI' ? 'Requerida' : 'Omitida'}</span></td>
                            <td className="p-4 text-right flex gap-3 justify-end">
                              <button onClick={() => handleResetPassword(u.id, u.username)} className="text-blue-600 font-bold hover:underline text-xs">🔑 Reset Clave</button>
                              <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-500 font-bold hover:underline text-xs">❌ Eliminar</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* --- MODAL DESEMPEÑO --- */}
      {modalDesempeno && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl flex flex-col h-[95vh]">
            <div className="bg-[#003366] text-white p-4 flex justify-between items-center rounded-t-xl shrink-0">
              <h2 className="font-bold text-lg">Desempeño: {modalDesempeno}</h2>
              <button onClick={() => { setModalDesempeno(null); setSelectedDateFilter(null); setMapaVista('inspecciones'); }} className="text-3xl leading-none hover:text-red-400">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <div className="flex justify-between items-center mb-6 bg-gray-50 p-4 rounded border">
                <span className="font-bold text-[#003366]">Seleccionar Mes de Análisis:</span>
                <input type="month" value={mesDesempeno} onChange={(e) => setMesDesempeno(e.target.value)} className="border p-2 rounded text-sm font-bold" />
              </div>

              <div className="flex flex-col lg:flex-row gap-8 mb-8">
                {/* COL IZQ: KPIS */}
                <div className="flex-1 space-y-4">
                  <h3 className="font-bold text-[#003366] border-b-2 border-[#FFCC00] pb-2 text-lg">Inspecciones Realizadas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#eef4f9] p-4 rounded text-center col-span-2 border"><div className="font-bold text-[#003366] text-sm mb-1">Total Inspecciones</div><div className="text-3xl font-light text-[#003366]">{desempenoDatos.mapaIns.length}</div></div>
                    {Object.entries(desempenoDatos.kpis).map(([k, v]:any) => (
                      <div key={k} className="bg-gray-50 p-4 rounded text-center border">
                        <div className="font-bold text-gray-700 text-xs mb-1 h-8 flex items-center justify-center">{k}</div>
                        <div className="text-xl font-bold text-[#FFCC00] drop-shadow-sm">{v}</div>
                        {k.includes('TEMAS') && Object.keys(desempenoDatos.temas).length > 0 && (
                          <div className="mt-2 text-left text-[9px] text-gray-500 border-t pt-2 space-y-1">
                            {Object.entries(desempenoDatos.temas).map(([tk, tv]:any) => <div key={tk} className="flex justify-between"><span>{tk}</span><b>{tv}</b></div>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* COL DER: GRILLA DIARIA */}
                <div className="flex-1">
                  <h3 className="font-bold text-[#003366] border-b-2 border-[#FFCC00] pb-2 text-lg mb-4">Grilla de Horas Diarias</h3>
                  <div className="border rounded overflow-hidden max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm text-center">
                      <thead className="bg-gray-50 text-[#003366] sticky top-0 shadow-sm font-bold"><tr><th className="p-3">Fecha</th><th className="p-3">Horas Trabajadas</th><th className="p-3">Horas Acumuladas</th></tr></thead>
                      <tbody>
                        {desempenoDatos.grid.map((g:any) => (
                          <tr 
                            key={g.fecha} 
                            onClick={() => setSelectedDateFilter(selectedDateFilter === g.dateISO ? null : g.dateISO)}
                            className={`border-b last:border-0 cursor-pointer transition-colors ${selectedDateFilter === g.dateISO ? 'bg-blue-100 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 bg-white'}`}
                            title="Clic para ver en el mapa"
                          >
                            <td className="p-3 text-gray-600 font-medium">{g.fecha}</td>
                            <td className={`p-3 font-bold ${g.horas === 'F' ? 'text-red-500' : 'text-[#003366]'}`}>{g.horas}</td>
                            <td className="p-3 text-gray-600">{g.acumulado}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {/* MAPA INFERIOR CON FILTROS */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 mt-8">
                <h3 className="font-bold text-[#003366] border-b-2 border-[#FFCC00] pb-2 text-lg">
                  Ubicación de Registros ({mesDesempeno})
                  {selectedDateFilter && <span className="ml-2 text-sm text-blue-600 font-normal bg-blue-100 px-2 py-1 rounded">(Día: {selectedDateFilter.split('-').reverse().join('/')})</span>}
                </h3>
                <div className="flex gap-4 items-center bg-gray-50 p-2 rounded border shadow-sm">
                  <label className="flex items-center gap-2 text-sm font-bold text-[#003366] cursor-pointer">
                    <input type="radio" checked={mapaVista === 'inspecciones'} onChange={() => setMapaVista('inspecciones')} className="accent-[#003366] w-4 h-4" />
                    Inspecciones
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold text-[#003366] cursor-pointer">
                    <input type="radio" checked={mapaVista === 'jornadas'} onChange={() => setMapaVista('jornadas')} className="accent-[#003366] w-4 h-4" />
                    Inicios/Fin de Jornada
                  </label>
                </div>
              </div>
              <div className="h-[400px] rounded-xl border-2 border-gray-200 overflow-hidden shadow-inner bg-gray-100">
                <MapComponent 
                  inspecciones={mapDataToShow} 
                  onVerFicha={(ins:any) => { 
                    if(ins.isShift) { 
                      alert("📍 Este punto es un registro automático de GPS de Jornada, no posee una ficha de inspección."); 
                    } else { 
                      setModalDesempeno(null); 
                      setModalIns(ins); 
                    }
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHA */}
      {modalIns && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[110] backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col h-[90vh]">
            <div className="bg-[#003366] text-white p-4 flex justify-between items-center rounded-t-xl shrink-0"><h2 className="font-bold text-lg">Inspección: {modalIns.id}</h2><button onClick={() => setModalIns(null)} className="text-3xl leading-none hover:text-red-400">&times;</button></div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                <div className="bg-white p-3 rounded shadow-sm border"><label className="text-[10px] font-bold text-[#003366] block uppercase">Inspector</label><span className="text-sm font-medium">{modalIns.inspector}</span></div>
                <div className="bg-white p-3 rounded shadow-sm border"><label className="text-[10px] font-bold text-[#003366] block uppercase">Tipo</label><span className="text-sm font-medium">{modalIns.tipo}</span></div>
                {Object.entries(modalIns.datos_formulario || {}).map(([k, v]:any) => {
                  if(k.includes('fecha_') || k.includes('hora_')) return null;
                  return (<div key={k} className="bg-white p-3 rounded shadow-sm border"><label className="text-[10px] font-bold text-[#003366] block uppercase">{k.replace(/_/g, ' ')}</label><span className="text-sm font-medium">{v}</span></div>);
                })}
              </div>
              {modalIns.fotos && modalIns.fotos.length > 0 && (<div className="mb-6"><h3 className="font-bold text-[#003366] border-b pb-2 mb-3">Fotos</h3><div className="flex gap-4 overflow-x-auto pb-2">{modalIns.fotos.map((url:string, i:number) => (<a key={i} href={url} target="_blank"><img src={url} className="h-32 rounded border hover:scale-105" /></a>))}</div></div>)}
              <div className="bg-white p-4 rounded border-t-4 border-[#FFCC00] shadow-sm">
                <h3 className="font-bold text-[#003366] flex items-center gap-2 mb-4">📝 Seguimiento y Acciones</h3>
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded border">
                  {followups.filter(f => f.inspection_id === modalIns.id).length === 0 ? <p className="text-sm text-gray-400 italic">Sin acciones registradas.</p> : (
                    followups.filter(f => f.inspection_id === modalIns.id).map(h => (
                      <div key={h.id} className="border-l-4 border-blue-400 pl-3 py-1 bg-white shadow-sm"><div className="text-[10px] text-gray-500"><b>{h.usuario}</b> - {new Date(h.created_at).toLocaleString()}</div><div className={`text-sm ${h.accion.includes('[CERRADO]') ? 'text-red-600 font-bold' : ''}`}>{h.accion}</div></div>
                    ))
                  )}
                </div>
                {!getInspectionStatus(modalIns.id).includes('CERRADO') && (
                  <div className="space-y-3">
                    <textarea className="w-full border p-3 rounded text-sm bg-gray-50" rows={2} placeholder="Nuevo comentario..." value={nuevoComentario} onChange={(e) => setNewComentario(e.target.value)}></textarea>
                    <div className="flex gap-2"><button onClick={handleAddComentario} className="flex-1 bg-green-600 text-white font-bold p-3 rounded hover:bg-green-700" disabled={loading}>AÑADIR COMENTARIO</button><button onClick={handleCerrarTema} className="flex-1 bg-red-600 text-white font-bold p-3 rounded hover:bg-red-700" disabled={loading}>🔒 MARCAR CERRADO</button></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}