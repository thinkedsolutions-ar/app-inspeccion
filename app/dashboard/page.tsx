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
  
  // Datos Globales
  const [inspecciones, setInspecciones] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [shiftsGlobal, setShiftsGlobal] = useState<any[]>([]);
  
  // Filtros Globales
  const [fechaInicio, setFechaInicio] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);
  const [chkSeguimiento, setChkSeguimiento] = useState(false);
  const [chkObservaciones, setChkObservaciones] = useState(false);
  const [filtroInspector, setFiltroInspector] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  // Estados de Gráficos Cruzados
  const [selectedInspectorChart, setSelectedInspectorChart] = useState<string | null>(null);
  const [selectedTypeChart, setSelectedTypeChart] = useState<string | null>(null);

  // Estados para Modales
  const [modalIns, setModalIns] = useState<any>(null);
  const [nuevoComentario, setNewComentario] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', nombre: '', rol: 'Inspector', jornada: 'SI' });

  // Estados para Modal de Desempeño
  const [modalDesempeno, setModalDesempeno] = useState<string | null>(null);
  const [desempenoMes, setDesempenoMes] = useState('');
  const [modalShifts, setModalShifts] = useState<any[]>([]);
  const [modalInspections, setModalInspections] = useState<any[]>([]);

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
    const dYearAgo = new Date(); dYearAgo.setFullYear(dYearAgo.getFullYear() - 1);
    const [resIns, resFol, resShifts] = await Promise.all([
      supabase.from('inspections').select('*').gte('created_at', dYearAgo.toISOString()).order('created_at', { ascending: false }),
      supabase.from('followups').select('*').order('created_at', { ascending: true }),
      supabase.from('shifts').select('*').gte('fecha', dYearAgo.toISOString()).order('fecha', { ascending: true })
    ]);
    setInspecciones(resIns.data || []); setFollowups(resFol.data || []); setShiftsGlobal(resShifts.data || []); setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('nombre');
    if (data) setUsuarios(data);
  };

  // --- LOGICA DE CÁLCULO DE HORAS ---
  const calculateHours = (shiftsArray: any[]) => {
    let worked_ms = 0;
    let last_time: number | null = null;
    let status = 'INACTIVA';

    const sorted = [...shiftsArray].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

    sorted.forEach(s => {
      const t = new Date(s.fecha).getTime();
      if (s.accion === 'INICIO') { status = 'TRABAJANDO'; last_time = t; } 
      else if (s.accion === 'INICIO_REF' && status === 'TRABAJANDO' && last_time) { worked_ms += t - last_time; status = 'REFRIGERIO'; last_time = null; } 
      else if (s.accion === 'FIN_REF' && status === 'REFRIGERIO') { status = 'TRABAJANDO'; last_time = t; } 
      else if (s.accion === 'FIN' && status === 'TRABAJANDO' && last_time) { worked_ms += t - last_time; status = 'INACTIVA'; last_time = null; }
    });

    const hours = Math.floor(worked_ms / (1000 * 60 * 60));
    const minutes = Math.floor((worked_ms % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, total_ms: worked_ms, formatted: `${hours}:${minutes.toString().padStart(2, '0')}` };
  };

  const fetchModalDesempenoData = async (inspector: string, mesAnio: string) => {
    const startDate = `${mesAnio}-01T00:00:00Z`;
    const [year, month] = mesAnio.split('-');
    const endDate = new Date(parseInt(year), parseInt(month), 1).toISOString();

    const [resShifts, resIns] = await Promise.all([
      supabase.from('shifts').select('*').eq('nombre', inspector).gte('fecha', startDate).lt('fecha', endDate).order('fecha', {ascending: true}),
      supabase.from('inspections').select('*').eq('inspector', inspector).gte('created_at', startDate).lt('created_at', endDate)
    ]);
    setModalShifts(resShifts.data || []);
    setModalInspections(resIns.data || []);
  };

  const handleOpenDesempeno = (inspector: string) => {
    setModalDesempeno(inspector);
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
    setDesempenoMes(currentMonth);
    fetchModalDesempenoData(inspector, currentMonth);
  };

  // --- FILTRADO AVANZADO (Tabla, Mapa, KPI Main) ---
  const dataTabla = inspecciones.filter(ins => {
    const dateOk = ins.created_at >= `${fechaInicio}T00:00:00Z` && ins.created_at <= `${fechaFin}T23:59:59Z`;
    if (!dateOk) return false;
    if (chkSeguimiento && !followups.some(f => f.inspection_id === ins.id)) return false;
    if (chkObservaciones && (!ins.obs_general || ins.obs_general.trim() === '')) return false;
    if (filtroInspector && ins.inspector !== filtroInspector) return false;
    if (filtroTipo && ins.tipo !== filtroTipo) return false;
    return true;
  });

  const shiftsTabla = shiftsGlobal.filter(s => s.fecha >= `${fechaInicio}T00:00:00Z` && s.fecha <= `${fechaFin}T23:59:59Z`);
  const inspectoresActivos = Array.from(new Set([...usuarios.filter(u => u.rol === 'Inspector').map(u => u.nombre), ...dataTabla.map(i => i.inspector)])).sort();

  // --- PROCESAMIENTO GRÁFICOS CRUZADOS ---
  const conteoInspectores: Record<string, number> = {};
  dataTabla.forEach(ins => conteoInspectores[ins.inspector] = (conteoInspectores[ins.inspector] || 0) + 1);

  const conteoTipos: Record<string, number> = {};
  const dataParaGraficoTipos = selectedInspectorChart ? dataTabla.filter(ins => ins.inspector === selectedInspectorChart) : dataTabla;
  dataParaGraficoTipos.forEach(ins => conteoTipos[ins.tipo] = (conteoTipos[ins.tipo] || 0) + 1);

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

  const dataFinalTabla = selectedTypeChart ? dataTabla.filter(ins => ins.tipo === selectedTypeChart) : (selectedInspectorChart ? dataTabla.filter(ins => ins.inspector === selectedInspectorChart) : dataTabla);

  const chartOptionsNumbers = { maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { anchor: 'end' as const, align: 'end' as const, font: { weight: 'bold' as const }, formatter: (v:number) => v > 0 ? v : '' } }, scales: { y: { beginAtZero: true, grace: '10%' } } };

  const optionsInspectorChart = { ...chartOptionsNumbers, onClick: (e: any, elements: any) => { if (elements.length > 0) { const label = inspectoresOrdenados[elements[0].index][0]; setSelectedInspectorChart(label === selectedInspectorChart ? null : label); } else setSelectedInspectorChart(null); }};
  const optionsTypeChart = { ...chartOptionsNumbers, onClick: (e: any, elements: any) => { if (elements.length > 0) { const label = tiposOrdenados[elements[0].index][0]; setSelectedTypeChart(label === selectedTypeChart ? null : label); } else { setSelectedTypeChart(null); setSelectedInspectorChart(null); } }};

  // Lógica Grilla Desempeño Modal
  const getDailyDesempeno = () => {
    if (!desempenoMes) return [];
    const [year, month] = desempenoMes.split('-');
    const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
    const dailyData = [];
    let accumulatedMs = 0;

    for (let i = 1; i <= daysInMonth; i++) {
      const dayShifts = modalShifts.filter(s => { const d = new Date(s.fecha); return d.getFullYear() === parseInt(year) && (d.getMonth()+1) === parseInt(month) && d.getDate() === i; });
      const { total_ms, formatted } = calculateHours(dayShifts);
      accumulatedMs += total_ms;
      const accHours = Math.floor(accumulatedMs / (1000 * 60 * 60));
      const accMins = Math.floor((accumulatedMs % (1000 * 60 * 60)) / (1000 * 60));
      dailyData.push({ date: `${i.toString().padStart(2, '0')}/${month}/${year}`, worked: total_ms > 0 ? formatted : 'F', accumulated: total_ms > 0 ? `${accHours}:${accMins.toString().padStart(2, '0')}` : '0:00' });
    }
    return dailyData;
  };

  if (!adminUser) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="flex h-screen bg-[#f4f7f9] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-[#003366] text-white flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-6 bg-white m-4 rounded-lg text-center"><img src="https://i.ibb.co/RG0tNq6t/Logo-Web-copia.png" className="h-10 mx-auto" alt="Logo" /><div className="text-[#003366] text-[10px] font-black mt-2">GESTIÓN OPERATIVA V3</div></div>
        <nav className="flex-1 px-2 space-y-2">
          <button onClick={() => setActiveTab('reportes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold ${activeTab === 'reportes' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'hover:bg-white/5'}`}>📊 Reportes</button>
          <button onClick={() => setActiveTab('desempeno')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold ${activeTab === 'desempeno' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'hover:bg-white/5'}`}>👥 Desempeño Personal</button>
          <button onClick={() => setActiveTab('mapa')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold ${activeTab === 'mapa' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'hover:bg-white/5'}`}>📍 Mapa Satelital</button>
          <button onClick={() => setActiveTab('usuarios')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold ${activeTab === 'usuarios' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'hover:bg-white/5'}`}>⚙️ Usuarios</button>
        </nav>
        <div className="p-4"><button onClick={() => { localStorage.removeItem('buttini_user'); window.location.href = '/'; }} className="w-full bg-red-600 p-3 rounded-lg font-bold hover:bg-red-700">CERRAR SESIÓN</button></div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOP BAR FILTROS */}
        <div className="bg-white p-4 shadow-sm flex justify-between items-center z-10 shrink-0 border-b">
          <div className="flex gap-4 items-center flex-wrap">
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="border p-2 rounded text-sm bg-gray-50" />
            <span className="text-gray-400">→</span>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="border p-2 rounded text-sm bg-gray-50" />
            <select value={filtroInspector} onChange={(e)=>setFiltroInspector(e.target.value)} className="border p-2 rounded text-sm bg-white font-bold text-[#003366]">
              <option value="">Todos los Inspectores</option>
              {inspectoresActivos.map((i:any) => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          <div className="font-bold text-[#003366]">👤 {adminUser.nombre}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {loading ? <div className="text-center mt-20 font-bold text-xl animate-pulse">Cargando datos en vivo...</div> : (
            <>
              {/* --- REPORTES (MANTENIDO) --- */}
              {activeTab === 'reportes' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border"><h3 className="text-[#003366] font-bold mb-4">Distribución por Tipo <span className="text-[10px] text-gray-400 font-normal">(Clic para filtrar abajo)</span> {selectedInspectorChart && <span className="text-xs text-orange-500 ml-2">(De {selectedInspectorChart})</span>}</h3><div className="h-64"><Bar data={chartTipos} options={optionsTypeChart} /></div></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border"><h3 className="text-[#003366] font-bold mb-4">Total por Inspector <span className="text-[10px] text-gray-400 font-normal">(Clic para cruzar datos)</span></h3><div className="h-64"><Bar data={chartInspectores} options={optionsInspectorChart} /></div></div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border flex flex-col h-[500px]">
                    <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                      <div className="font-bold text-[#003366] text-lg">Registro Detallado</div>
                    </div>
                    <div className="overflow-y-auto flex-1"><table className="w-full text-sm text-left"><thead className="bg-white text-[#003366] sticky top-0 shadow-sm z-10"><tr><th className="p-3">Fecha</th><th className="p-3">Inspector</th><th className="p-3">Tipo</th><th className="p-3 text-center">Acción</th></tr></thead><tbody>{dataFinalTabla.map(ins => (<tr key={ins.id} className="border-b"><td className="p-3">{new Date(ins.created_at).toLocaleDateString()}</td><td className="p-3 font-bold">{ins.inspector}</td><td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-bold border">{ins.tipo}</span></td><td className="p-3 text-center"><button onClick={() => setModalIns(ins)} className="bg-[#FFCC00] text-[#003366] px-3 py-1 rounded font-bold text-xs">VER</button></td></tr>))}</tbody></table></div>
                  </div>
                </div>
              )}

              {/* --- DESEMPEÑO PERSONAL (NUEVO) --- */}
              {activeTab === 'desempeno' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-bold text-[#003366] border-b-4 border-[#FFCC00] inline-block pb-1">Reporte de Horas y Desempeño</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inspectoresActivos.map(insp => {
                      const misShifts = shiftsTabla.filter(s => s.nombre === insp);
                      const misIns = dataTabla.filter(i => i.inspector === insp);
                      const { formatted } = calculateHours(misShifts);
                      return (
                        <div key={insp} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                          <div>
                            <h3 className="font-bold text-[#003366] text-lg mb-6">{insp}</h3>
                            <div className="flex justify-between items-end mb-2"><span className="text-4xl font-black text-gray-800">{formatted}</span><span className="text-xs text-gray-500 mb-1">hs acumuladas</span></div>
                            <div className="flex justify-between items-end mb-6"><span className="text-2xl font-black text-[#003366]">{misIns.length}</span><span className="text-xs text-gray-500 mb-1">inspecciones realizadas</span></div>
                          </div>
                          <button onClick={() => handleOpenDesempeno(insp)} className="w-full bg-[#FFCC00] text-[#003366] font-bold py-3 rounded-lg shadow-sm hover:brightness-105 transition-all">VER DETALLE</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* --- MAPA Y USUARIOS MANTENIDOS --- */}
              {activeTab === 'mapa' && <div className="h-full bg-white rounded-xl shadow-sm border p-4 flex flex-col"><h2 className="text-[#003366] font-bold text-lg mb-4">📍 Mapa</h2><div className="flex-1 rounded-xl overflow-hidden border"><MapComponent inspecciones={dataTabla} onVerFicha={setModalIns} /></div></div>}
            </>
          )}
        </div>
      </div>

      {/* --- MODAL DETALLE DESEMPEÑO --- */}
      {modalDesempeno && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[90] backdrop-blur-sm">
          <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl flex flex-col h-[95vh]">
            <div className="bg-[#003366] text-white p-4 flex justify-between items-center rounded-t-xl shrink-0">
              <h2 className="font-bold text-lg">Desempeño: {modalDesempeno}</h2>
              <div className="flex gap-4 items-center">
                <input type="month" value={desempenoMes} onChange={(e) => { setDesempenoMes(e.target.value); fetchModalDesempenoData(modalDesempeno, e.target.value); }} className="text-black px-3 py-1 rounded text-sm font-bold" />
                <button onClick={() => setModalDesempeno(null)} className="text-3xl leading-none hover:text-red-400">&times;</button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-[#f4f7f9]">
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Panel Izquierdo: KPI */}
                <div className="md:w-1/2 flex flex-col gap-4">
                  <h3 className="font-bold text-[#003366] text-lg border-b-2 border-[#FFCC00] pb-1">Inspecciones Realizadas</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-6 rounded-lg text-center shadow-sm border border-blue-100 flex flex-col justify-center">
                      <span className="font-bold text-[#003366] mb-2">Total Inspecciones</span><span className="text-5xl font-black text-blue-600">{modalInspections.length}</span>
                    </div>
                    {['1-INSPECTOR EN CALLE', '2-EMOP', '3-SEGUIMIENTO DE PERSONAL', '4-SEGUIMIENTO DE TEMAS', '5-INSPECCION AREA DE DESCANSO'].map(t => {
                      const qty = modalInspections.filter(i => i.tipo === t).length;
                      if(qty === 0) return null;
                      return (
                        <div key={t} className="bg-white p-4 rounded-lg text-center shadow-sm border">
                          <span className="text-xs font-bold text-gray-500 block mb-2">{t}</span><span className="text-3xl font-black text-[#FFCC00]">{qty}</span>
                        </div>
                      )
                    })}
                  </div>
                  {/* Desglose Temas */}
                  {modalInspections.some(i => i.tipo === '4-SEGUIMIENTO DE TEMAS') && (
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mt-2">
                      <h4 className="font-bold text-xs text-[#003366] uppercase mb-3 border-b pb-2">Detalle Seguimiento de Temas</h4>
                      <div className="space-y-2">
                        {Array.from(new Set(modalInspections.filter(i => i.tipo === '4-SEGUIMIENTO DE TEMAS').map(i => i.datos_formulario?.tema_tipo || 'Otros'))).map(tema => (
                          <div key={tema} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                            <span className="text-gray-700">{tema}</span><span className="font-bold bg-[#FFCC00] text-[#003366] px-2 py-0.5 rounded text-xs">{modalInspections.filter(i => i.datos_formulario?.tema_tipo === tema).length}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Panel Derecho: Grilla Diaria */}
                <div className="md:w-1/2 flex flex-col gap-4">
                  <h3 className="font-bold text-[#003366] text-lg border-b-2 border-[#FFCC00] pb-1">Grilla de Horas Diarias</h3>
                  <div className="flex-1 max-h-[500px] overflow-y-auto bg-white rounded-lg shadow-sm border">
                    <table className="w-full text-center text-sm">
                      <thead className="bg-gray-50 sticky top-0 shadow-sm text-[#003366]"><tr><th className="p-3">Fecha</th><th className="p-3">Horas Trabajadas</th><th className="p-3">Horas Acumuladas</th></tr></thead>
                      <tbody>
                        {getDailyDesempeno().map(d => (
                          <tr key={d.date} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-gray-600">{d.date}</td><td className={`p-3 font-bold text-lg ${d.worked === 'F' ? 'text-red-500' : 'text-[#003366]'}`}>{d.worked}</td><td className="p-3 font-medium text-gray-400">{d.accumulated}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Mapa de Mes */}
              <div className="mt-4"><h3 className="font-bold text-[#003366] text-lg border-b-2 border-[#FFCC00] pb-1 mb-4">Mapa de Actividad (Mes Seleccionado)</h3><div className="h-96 rounded-xl overflow-hidden border shadow-sm"><MapComponent inspecciones={modalInspections} onVerFicha={setModalIns} /></div></div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHA (zIndex superior 100 para sobreponerse al de desempeño 90) */}
      {modalIns && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col h-[85vh]">
            <div className="bg-[#003366] text-white p-4 flex justify-between items-center rounded-t-xl shrink-0"><h2 className="font-bold">Ficha: {modalIns.id}</h2><button onClick={() => setModalIns(null)} className="text-3xl leading-none">&times;</button></div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
               {/* AQUÍ VA EL DETALLE COMPLETO QUE YA TENÍAMOS */}
               <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white p-3 rounded border"><label className="text-[10px] font-bold text-[#003366] uppercase block">Inspector</label><span>{modalIns.inspector}</span></div>
                <div className="bg-white p-3 rounded border"><label className="text-[10px] font-bold text-[#003366] uppercase block">Tipo</label><span>{modalIns.tipo}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}