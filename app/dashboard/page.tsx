'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement);

export default function DashboardPage() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('reportes');
  const [loading, setLoading] = useState(true);
  
  const [inspecciones, setInspecciones] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
  // Filtros Dashboard
  const [fechaInicio, setFechaInicio] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);
  const [chkSeguimiento, setChkSeguimiento] = useState(false);
  const [chkObservaciones, setChkObservaciones] = useState(false);

  // Modal Ver Detalle
  const [modalIns, setModalIns] = useState<any>(null);
  const [nuevoComentario, setNewComentario] = useState('');

  useEffect(() => {
    const session = localStorage.getItem('buttini_user');
    if (!session) { window.location.href = '/'; return; }
    const userData = JSON.parse(session);
    if (userData.rol !== 'Admin') { window.location.href = '/inspeccion'; return; }
    setAdminUser(userData);
    fetchData(); fetchUsers();
  },[]);

  const fetchData = async () => {
    setLoading(true);
    // Para la gráfica evolutiva, traemos todo el último año
    const dYearAgo = new Date(); dYearAgo.setFullYear(dYearAgo.getFullYear() - 1);
    
    const [resIns, resFol] = await Promise.all([
      supabase.from('inspections').select('*').gte('created_at', dYearAgo.toISOString()).order('created_at', { ascending: false }),
      supabase.from('followups').select('*').order('created_at', { ascending: true })
    ]);

    setInspecciones(resIns.data || []);
    setFollowups(resFol.data || []);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('nombre');
    if (data) setUsuarios(data);
  };

  // --- LOGICA SEGUIMIENTO (MODAL) ---
  const handleAddComentario = async () => {
    if (!nuevoComentario.trim()) return;
    setLoading(true);
    await supabase.from('followups').insert([{ inspection_id: modalIns.id, usuario: adminUser.nombre, accion: nuevoComentario }]);
    setNewComentario(''); await fetchData(); setLoading(false);
  };

  const handleCerrarTema = async () => {
    if(!confirm("¿Desea cerrar el seguimiento? Desaparecerá de la pantalla del inspector.")) return;
    setLoading(true);
    await supabase.from('followups').insert([{ inspection_id: modalIns.id, usuario: adminUser.nombre, accion: '[CERRADO] El tema ha sido cerrado por el administrador.' }]);
    await fetchData(); setModalIns(null); setLoading(false);
  };

  // --- PROCESAMIENTO DE DATOS ---
  // 1. Filtrar para la Tabla
  const getInspectionStatus = (id: string) => {
    const f = followups.filter(x => x.inspection_id === id);
    if (f.length === 0) return 'SIN SEGUIMIENTO';
    if (f.some(x => x.accion.includes('[CERRADO]'))) return 'CERRADO';
    return 'ABIERTO';
  };

  const dataTabla = inspecciones.filter(ins => {
    const dateOk = ins.created_at >= `${fechaInicio}T00:00:00Z` && ins.created_at <= `${fechaFin}T23:59:59Z`;
    if (!dateOk) return false;
    const status = getInspectionStatus(ins.id);
    if (chkSeguimiento && status === 'SIN SEGUIMIENTO') return false;
    if (chkObservaciones && (!ins.obs_general || ins.obs_general.trim() === '')) return false;
    return true;
  });

  // 2. Gráfico Evolutivo (Últimos 12 meses)
  const last12Months = Array.from({length: 12}, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (11 - i));
    return d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
  });
  const trendData = new Array(12).fill(0);
  inspecciones.forEach(ins => {
    const d = new Date(ins.created_at);
    const label = d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
    const idx = last12Months.indexOf(label);
    if (idx >= 0) trendData[idx]++;
  });

  // 3. Gráfico Apilado (Inspector x Tipo) - Solo rango filtrado
  const types = Array.from(new Set(dataTabla.map(i => i.tipo)));
  const inspectors = Array.from(new Set(dataTabla.map(i => i.inspector)));
  const palette = ['#003366', '#dc3545', '#FFCC00', '#28a745', '#6f42c1'];
  
  const chartStacked = {
    labels: inspectors,
    datasets: types.map((type, i) => ({
      label: type,
      backgroundColor: palette[i % palette.length],
      data: inspectors.map(insp => dataTabla.filter(ins => ins.inspector === insp && ins.tipo === type).length)
    }))
  };

  if (!adminUser) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="flex h-screen bg-[#f4f7f9] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-[#003366] text-white flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-6 bg-white m-4 rounded-lg text-center">
          <img src="https://i.ibb.co/RG0tNq6t/Logo-Web-copia.png" className="h-10 mx-auto" alt="Logo" />
          <div className="text-[#003366] text-[10px] font-black mt-2">GESTIÓN OPERATIVA V3</div>
        </div>
        <nav className="flex-1 px-2 space-y-2">
          <button onClick={() => setActiveTab('reportes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold ${activeTab === 'reportes' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'hover:bg-white/5'}`}>📊 Reportes</button>
          <button onClick={() => setActiveTab('usuarios')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold ${activeTab === 'usuarios' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'hover:bg-white/5'}`}>⚙️ Usuarios</button>
        </nav>
        <div className="p-4"><button onClick={() => { localStorage.removeItem('buttini_user'); window.location.href = '/'; }} className="w-full bg-red-600 p-3 rounded-lg font-bold hover:bg-red-700">CERRAR SESIÓN</button></div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOP BAR FILTROS */}
        <div className="bg-white p-4 shadow-sm flex justify-between items-center z-10 shrink-0 border-b">
          <div className="flex gap-4 items-center">
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="border p-2 rounded text-sm" />
            <span className="text-gray-400">→</span>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="border p-2 rounded text-sm" />
          </div>
          <div className="font-bold text-[#003366]">👤 {adminUser.nombre}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? <div className="text-center mt-20">Cargando datos...</div> : (
            <>
              {activeTab === 'reportes' && (
                <div className="space-y-6">
                  
                  {/* KPI Y TENDENCIA */}
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-6">
                    <div className="min-w-[150px] border-r pr-4">
                      <h3 className="text-gray-400 font-bold uppercase text-[10px]">Total Inspecciones</h3>
                      <div className="text-4xl font-black text-[#003366]">{dataTabla.length}</div>
                    </div>
                    <div className="flex-1 h-24">
                      <Line data={{ labels: last12Months, datasets: [{ data: trendData, borderColor: '#3b82f6', backgroundColor: '#dc3545', pointRadius: 4, tension: 0.3 }] }} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } } } }} />
                    </div>
                  </div>

                  {/* GRAFICO APILADO */}
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-[#003366] font-bold mb-4">Detalle por Inspector y Tipo</h3>
                    <div className="h-64">
                      <Bar data={chartStacked} options={{ maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }} />
                    </div>
                  </div>

                  {/* TABLA DE REGISTROS */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-[500px]">
                    <div className="bg-gray-50 p-4 border-b flex justify-between items-center shrink-0">
                      <div className="font-bold text-[#003366] text-lg">Registro Detallado</div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 bg-[#fffbe6] px-3 py-1 border border-yellow-200 rounded cursor-pointer text-xs font-bold text-[#003366]"><input type="checkbox" checked={chkSeguimiento} onChange={e=>setChkSeguimiento(e.target.checked)}/> 🔍 Solo con Seguimiento</label>
                        <label className="flex items-center gap-2 bg-[#fffbe6] px-3 py-1 border border-yellow-200 rounded cursor-pointer text-xs font-bold text-[#003366]"><input type="checkbox" checked={chkObservaciones} onChange={e=>setChkObservaciones(e.target.checked)}/> 🔍 Solo con Observaciones</label>
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 relative">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-white text-[#003366] sticky top-0 shadow-sm z-10">
                          <tr><th className="p-3">Fecha/Lugar</th><th className="p-3">Inspector</th><th className="p-3">Tipo</th><th className="p-3">Observaciones</th><th className="p-3 text-center">Acción</th><th className="p-3 text-center">Estado</th></tr>
                        </thead>
                        <tbody>
                          {dataTabla.map(ins => (
                            <tr key={ins.id} className="border-b hover:bg-gray-50">
                              <td className="p-3 whitespace-nowrap">
                                <a href={`https://www.google.com/maps/search/?api=1&query=${ins.lat},${ins.lon}`} target="_blank" className="text-blue-600 hover:underline font-bold" title="Ver en Mapa">
                                  {new Date(ins.created_at).toLocaleDateString()} {new Date(ins.created_at).toLocaleTimeString().slice(0,5)} 📍
                                </a>
                              </td>
                              <td className="p-3 font-bold">{ins.inspector}</td>
                              <td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-bold border">{ins.tipo}</span></td>
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
            </>
          )}
        </div>
      </div>

      {/* MODAL FICHA DE INSPECCION */}
      {modalIns && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col h-[90vh]">
            <div className="bg-[#003366] text-white p-4 flex justify-between items-center rounded-t-xl shrink-0">
              <h2 className="font-bold text-lg">Inspección: {modalIns.id}</h2>
              <button onClick={() => setModalIns(null)} className="text-3xl leading-none hover:text-red-400">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              {/* DATOS DEL FORMULARIO */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                <div className="bg-white p-3 rounded shadow-sm border"><label className="text-[10px] font-bold text-[#003366] block uppercase">Inspector</label><span className="text-sm font-medium">{modalIns.inspector}</span></div>
                <div className="bg-white p-3 rounded shadow-sm border"><label className="text-[10px] font-bold text-[#003366] block uppercase">Tipo</label><span className="text-sm font-medium">{modalIns.tipo}</span></div>
                {Object.entries(modalIns.datos_formulario || {}).map(([k, v]:any) => {
                  if(k.includes('fecha_') || k.includes('hora_')) return null;
                  return (
                    <div key={k} className="bg-white p-3 rounded shadow-sm border">
                      <label className="text-[10px] font-bold text-[#003366] block uppercase">{k.replace(/_/g, ' ')}</label>
                      <span className="text-sm font-medium">{v}</span>
                    </div>
                  );
                })}
              </div>

              {/* FOTOS */}
              {modalIns.fotos && modalIns.fotos.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-[#003366] border-b pb-2 mb-3">Fotos de Respaldo</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {modalIns.fotos.map((url:string, i:number) => (
                      <a key={i} href={url} target="_blank"><img src={url} className="h-32 rounded border hover:scale-105 transition-transform" /></a>
                    ))}
                  </div>
                </div>
              )}

              {/* SEGUIMIENTO */}
              <div className="bg-white p-4 rounded border-t-4 border-[#FFCC00] shadow-sm">
                <h3 className="font-bold text-[#003366] flex items-center gap-2 mb-4">📝 Seguimiento y Acciones</h3>
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto bg-gray-50 p-2 rounded border">
                  {followups.filter(f => f.inspection_id === modalIns.id).length === 0 ? <p className="text-sm text-gray-400 italic">Sin acciones registradas.</p> : (
                    followups.filter(f => f.inspection_id === modalIns.id).map(h => (
                      <div key={h.id} className="border-l-4 border-blue-400 pl-3 py-1 bg-white shadow-sm">
                        <div className="text-[10px] text-gray-500"><b>{h.usuario}</b> - {new Date(h.created_at).toLocaleString()}</div>
                        <div className={`text-sm ${h.accion.includes('[CERRADO]') ? 'text-red-600 font-bold' : ''}`}>{h.accion}</div>
                      </div>
                    ))
                  )}
                </div>

                {!getInspectionStatus(modalIns.id).includes('CERRADO') && (
                  <div className="space-y-3">
                    <textarea className="w-full border p-3 rounded text-sm bg-gray-50" rows={2} placeholder="Nuevo comentario de seguimiento..." value={nuevoComentario} onChange={(e) => setNewComentario(e.target.value)}></textarea>
                    <div className="flex gap-2">
                      <button onClick={handleAddComentario} className="flex-1 bg-green-600 text-white font-bold p-3 rounded hover:bg-green-700" disabled={loading}>AÑADIR COMENTARIO</button>
                      <button onClick={handleCerrarTema} className="flex-1 bg-red-600 text-white font-bold p-3 rounded hover:bg-red-700 flex justify-center items-center gap-2" disabled={loading}>🔒 MARCAR COMO CERRADO</button>
                    </div>
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