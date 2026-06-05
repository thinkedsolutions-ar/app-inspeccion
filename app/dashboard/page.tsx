'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import dynamic from 'next/dynamic';
import Papa from 'papaparse';
import FichaVisualizador from '@/components/FichaVisualizador';

const MapComponent = dynamic(() => import('./MapaInteract'), { ssr: false });

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement, ChartDataLabels);

export default function DashboardPage() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('reportes');
  const [loading, setLoading] = useState(true);
  
  const [inspecciones, setInspecciones] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  
  const [catConductores, setCatConductores] = useState<any[]>([]);
  const [catUnidades, setCatUnidades] = useState<any[]>([]);
  const [catServicios, setCatServicios] = useState<any[]>([]);
  
  const [fechaInicio, setFechaInicio] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [chkSeguimiento, setChkSeguimiento] = useState(false);
  const [chkObservaciones, setChkObservaciones] = useState(false);
  const [filtroInspector, setFiltroInspector] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('Todas');

  const [modalIns, setModalIns] = useState<any>(null);
  const [nuevoComentario, setNewComentario] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', nombre: '', rol: 'Inspector', jornada: 'SI' });

  const [selectedInspectorChart, setSelectedInspectorChart] = useState<string | null>(null);
  const [selectedTypeChart, setSelectedTypeChart] = useState<string | null>(null);

  const [modalDesempeno, setModalDesempeno] = useState<string | null>(null);
  const [mesDesempeno, setMesDesempeno] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [mapaVista, setMapaVista] = useState<'inspecciones' | 'jornadas'>('inspecciones');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Estados ABM modificados para incluir nuevos campos
  const [abmTab, setAbmTab] = useState('conductores');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCond, setFormCond] = useState({ legajo: '', nombres: '', apellido: '', telefono: '', empresa: 'Antonio Buttini', foto: '' });
  const [formUni, setFormUni] = useState({ numero: '', empresa: 'Antonio Buttini' });
  const [formServ, setFormServ] = useState({ grupo: '', linea: '', nombre: '', temporada: '', empresa: 'Antonio Buttini' });
  const [modalDriver, setModalDriver] = useState<any>(null);

  useEffect(() => {
    const session = localStorage.getItem('buttini_user');
    if (!session) { window.location.href = '/'; return; }
    const userData = JSON.parse(session);
    if (userData.rol !== 'Admin') { window.location.href = '/inspeccion'; return; }
    setAdminUser(userData);
    fetchData(); fetchUsers(); fetchCatalogosAdmin();
  },[]);

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

  const fetchUsers = async () => { const { data } = await supabase.from('users').select('*').order('nombre'); if (data) setUsuarios(data); };
  const fetchCatalogosAdmin = async () => {
    const [resCond, resUni, resServ] = await Promise.all([
      supabase.from('conductores').select('*').order('nombre'),
      supabase.from('unidades').select('*').order('numero'),
      supabase.from('servicios').select('*').order('nombre')
    ]);
    setCatConductores(resCond.data || []); setCatUnidades(resUni.data || []); setCatServicios(resServ.data || []);
  };

  const handleCreateUser = async (e: React.FormEvent) => { e.preventDefault(); await supabase.from('users').insert([newUser]); setNewUser({ username: '', password: '', nombre: '', rol: 'Inspector', jornada: 'SI' }); fetchUsers(); };
  const handleDeleteUser = async (id: string, username: string) => { if (confirm(`¿Eliminar al usuario ${username}?`)) { await supabase.from('users').delete().eq('id', id); fetchUsers(); } };
  const handleResetPassword = async (id: string, username: string) => { const newPass = prompt(`NUEVA CONTRASEÑA para ${username}:`); if (newPass) { await supabase.from('users').update({ password: newPass }).eq('id', id); } };
  
  const handleAddComentario = async () => { if (!nuevoComentario.trim()) return; setLoading(true); await supabase.from('followups').insert([{ inspection_id: modalIns.id, usuario: adminUser.nombre, accion: nuevoComentario }]); setNewComentario(''); await fetchData(); setLoading(false); };
  const handleCerrarTema = async () => { if(!confirm("¿Cerrar seguimiento?")) return; setLoading(true); await supabase.from('followups').insert([{ inspection_id: modalIns.id, usuario: adminUser.nombre, accion: '[CERRADO] El tema ha sido cerrado por el administrador.' }]); await fetchData(); setModalIns(null); setLoading(false); };

  const getInspectionStatus = (id: string) => { const f = followups.filter(x => x.inspection_id === id); if (f.length === 0) return 'SIN SEGUIMIENTO'; if (f.some(x => x.accion.includes('[CERRADO]'))) return 'CERRADO'; return 'ABIERTO'; };

  const dataTabla = inspecciones.filter(ins => {
    const dateOk = ins.created_at >= `${fechaInicio}T00:00:00Z` && ins.created_at <= `${fechaFin}T23:59:59Z`;
    if (!dateOk) return false;
    const empresaIns = ins.datos_formulario?.empresa || 'Antonio Buttini';
    if (filtroEmpresa !== 'Todas' && empresaIns !== filtroEmpresa) return false;
    if (chkSeguimiento && getInspectionStatus(ins.id) === 'SIN SEGUIMIENTO') return false;
    if (chkObservaciones && (!ins.obs_general || ins.obs_general.trim() === '')) return false;
    if (filtroInspector && ins.inspector !== filtroInspector) return false;
    if (filtroTipo && ins.tipo !== filtroTipo) return false;
    return true;
  });

  const inspectoresUnicos = Array.from(new Set(inspecciones.map(i => i.inspector))).sort();
  const tiposUnicos = Array.from(new Set(inspecciones.map(i => i.tipo))).sort();

  const getHallazgos = (form: any) => {
    const fallas: string[] = [];
    if (!form) return fallas;
    if (['1','2','3'].includes(form.eval_horarios)) fallas.push('Incumplimiento Horarios');
    if (['1','2','3'].includes(form.eval_uniforme)) fallas.push('Uniforme incorrecto');
    if (['1','2','3'].includes(form.eval_atencion)) fallas.push('Mala atención al usuario');
    if (['1','2','3'].includes(form.cond_ascenso_descenso)) fallas.push('Ascenso/Descenso indebido');
    if (['1','2','3'].includes(form.cond_marcha)) fallas.push('Inicio/Fin de marcha brusca');
    if (['1','2','3'].includes(form.cond_adelanto)) fallas.push('Maniobra de adelanto indebida');
    if (form.cond_exceso_velocidad === 'SI') fallas.push('Exceso de velocidad');
    if (form.normas_transito_frenadas === 'SI') fallas.push('Frenadas bruscas');
    if (form.normas_transito_maniobras === 'SI') fallas.push('Maniobras agresivas');
    if (form.normas_transito_linea === 'SI') fallas.push('Traspaso línea amarilla');
    if (form.normas_transito_cinturon === 'NO') fallas.push('No utiliza cinturón de seguridad');
    if (form.normas_transito_semaforos === 'NO') fallas.push('No respeta semáforos');
    if (form.normas_transito_luces === 'NO') fallas.push('Uso de luces incorrecto');
    if (form.normas_transito_bocina === 'NO') fallas.push('Mal uso de bocina');
    if (form.normas_transito_paso === 'NO') fallas.push('No cede el paso');
    return fallas;
  };

  const flotaInspecciones = dataTabla.filter(ins => ins.tipo.startsWith('1-') || ins.tipo.includes('Permanente'));
  const driverStats: Record<string, any> = {};
  const urgentInspections: any[] = [];
  flotaInspecciones.forEach(ins => {
    const form = ins.datos_formulario || {}; const cond = form.conductor; if (!cond) return;
    const fallas = getHallazgos(form);
    if (!driverStats[cond]) driverStats[cond] = { faltas: 0, unidad: form.unidad || '-', count: 0, fallasDetalle: [] };
    driverStats[cond].count++; driverStats[cond].faltas += fallas.length; driverStats[cond].unidad = form.unidad || driverStats[cond].unidad;
    if (fallas.length > 0) urgentInspections.push({ ...ins, hallazgos: fallas });
  });

  const rankingConductores = Object.entries(driverStats).map(([nombre, data]:any) => ({ nombre, ...data })).sort((a,b) => b.faltas - a.faltas);
  const activosCondCount = catConductores.filter(c => c.activo).length;
  const pendientesCount = activosCondCount - rankingConductores.length;
  const scoreFlota = rankingConductores.length > 0 ? Math.max(0, 100 - Math.round((urgentInspections.length / flotaInspecciones.length) * 100)) : 100;

  // --- LÓGICA ABM Y EDICIÓN ---
  const toggleActivo = async (table: string, id: string, current: boolean) => { await supabase.from(table).update({ activo: !current }).eq('id', id); fetchCatalogosAdmin(); };

  const editItem = (item: any, type: string) => {
    setEditingId(item.id);
    if (type === 'conductores') setFormCond({ legajo: item.legajo || '', nombres: item.nombres || '', apellido: item.apellido || '', telefono: item.telefono || '', empresa: item.empresa || 'Antonio Buttini', foto: item.foto || '' });
    if (type === 'unidades') setFormUni({ numero: item.numero || '', empresa: item.empresa || 'Antonio Buttini' });
    if (type === 'servicios') setFormServ({ grupo: item.grupo || '', linea: item.linea || '', nombre: item.nombre || '', temporada: item.temporada || '', empresa: item.empresa || 'Antonio Buttini' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveABM = async (e: any, type: string) => {
    e.preventDefault();
    if(type === 'conductores') {
      const fullName = `${formCond.legajo} - ${formCond.apellido}, ${formCond.nombres}`;
      const payloadCond = { legajo: formCond.legajo, nombres: formCond.nombres, apellido: formCond.apellido, telefono: formCond.telefono, nombre: fullName, empresa: formCond.empresa, foto: formCond.foto };
      if (editingId) await supabase.from('conductores').update(payloadCond).eq('id', editingId);
      else await supabase.from('conductores').insert([{ ...payloadCond, activo: true }]);
    }
    if(type === 'unidades') {
      if (editingId) await supabase.from('unidades').update({ numero: formUni.numero, empresa: formUni.empresa }).eq('id', editingId);
      else await supabase.from('unidades').insert([{ numero: formUni.numero, empresa: formUni.empresa, activo: true }]);
    }
    if(type === 'servicios') {
      const payloadServ = { grupo: formServ.grupo, linea: formServ.linea, nombre: formServ.nombre, temporada: formServ.temporada, empresa: formServ.empresa };
      if (editingId) await supabase.from('servicios').update(payloadServ).eq('id', editingId);
      else await supabase.from('servicios').insert([{ ...payloadServ, activo: true }]);
    }
    setEditingId(null); 
    setFormCond({ legajo: '', nombres: '', apellido: '', telefono: '', empresa: 'Antonio Buttini', foto: '' }); 
    setFormUni({ numero: '', empresa: 'Antonio Buttini' }); 
    setFormServ({ grupo: '', linea: '', nombre: '', temporada: '', empresa: 'Antonio Buttini' });
    alert(editingId ? "Actualizado correctamente" : "Guardado correctamente"); fetchCatalogosAdmin();
  };

  const activarTemporada = async (temp: string) => {
    if(!confirm(`¿Activar todos los servicios de la temporada "${temp}" e inhabilitar el resto?`)) return;
    await supabase.from('servicios').update({ activo: false }).neq('temporada', temp);
    await supabase.from('servicios').update({ activo: true }).eq('temporada', temp);
    fetchCatalogosAdmin(); alert("Temporada actualizada.");
  };

  const downloadCSVTemplate = (type: string) => {
    let csv = '';
    if(type === 'conductores') csv = 'legajo,nombres,apellido,telefono,empresa,foto\n101,Juan,Perez,2604123456,Antonio Buttini,https://url.com/foto.jpg';
    if(type === 'unidades') csv = 'numero,empresa\n145,Antonio Buttini';
    if(type === 'servicios') csv = 'grupo,linea,nombre,temporada,empresa\n540,541,540 - Ciudad,INVIERNO,Antonio Buttini';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `plantilla_${type}.csv`; a.click();
  };

  const handleCSVUpload = (e: any, type: string) => {
    const file = e.target.files[0]; if(!file) return;
    Papa.parse(file, { header: true, complete: async (res) => {
      const data = res.data as any[];
      let payload: any[] = [];
      if(type === 'conductores') payload = data.filter(r=>r.legajo).map(r => ({ legajo: r.legajo, apellido: r.apellido, telefono: r.telefono, nombres: r.nombres, nombre: `${r.legajo} - ${r.apellido}, ${r.nombres}`, empresa: r.empresa || 'Antonio Buttini', foto: r.foto || null, activo: true }));
      if(type === 'unidades') payload = data.filter(r=>r.numero).map(r => ({ numero: r.numero, empresa: r.empresa || 'Antonio Buttini', activo: true }));
      if(type === 'servicios') payload = data.filter(r=>r.nombre).map(r => ({ grupo: r.grupo || null, linea: r.linea || null, nombre: r.nombre, temporada: r.temporada || null, empresa: r.empresa || 'Antonio Buttini', activo: true }));
      
      const col = type === 'conductores' ? 'nombre' : (type === 'unidades' ? 'numero' : 'nombre');
      await supabase.from(type).upsert(payload, { onConflict: col });
      alert(`Importación completada para ${type}`); fetchCatalogosAdmin();
    }});
  };

  // --- GRÁFICOS (Reportes Generales) ---
  const last12Months = Array.from({length: 12}, (_, i) => { const d = new Date(); d.setMonth(d.getMonth() - (11 - i)); return d.toLocaleString('es-ES', { month: 'short', year: '2-digit' }); });
  const trendData = new Array(12).fill(0);
  inspecciones.forEach(ins => { const idx = last12Months.indexOf(new Date(ins.created_at).toLocaleString('es-ES', { month: 'short', year: '2-digit' })); if (idx >= 0) trendData[idx]++; });

  const conteoInspectores: Record<string, number> = {}; dataTabla.forEach(ins => { conteoInspectores[ins.inspector] = (conteoInspectores[ins.inspector] || 0) + 1; });
  const conteoTipos: Record<string, number> = {};
  const dataParaGraficoTipos = selectedInspectorChart ? dataTabla.filter(ins => ins.inspector === selectedInspectorChart) : dataTabla;
  dataParaGraficoTipos.forEach(ins => { conteoTipos[ins.tipo] = (conteoTipos[ins.tipo] || 0) + 1; });

  const tiposOrdenados = Object.entries(conteoTipos).sort((a,b) => b[1] - a[1]);
  const inspectoresOrdenados = Object.entries(conteoInspectores).sort((a,b) => b[1] - a[1]);

  const chartTipos = { labels: tiposOrdenados.map(t => t[0]), datasets: [{ label: 'Cantidad', data: tiposOrdenados.map(t => t[1]), backgroundColor: tiposOrdenados.map((t, i) => selectedTypeChart && t[0] !== selectedTypeChart ? '#e5e7eb' : ['#003366', '#dc3545', '#FFCC00', '#28a745', '#6f42c1'][i % 5]) }] };
  const chartInspectores = { labels: inspectoresOrdenados.map(i => i[0]), datasets: [{ label: 'Inspecciones', data: inspectoresOrdenados.map(i => i[1]), backgroundColor: inspectoresOrdenados.map(i => i[0] === selectedInspectorChart ? '#FFCC00' : '#003366') }] };

  const chartOptionsNumbers = { maintainAspectRatio: false, layout: { padding: { top: 30, right: 10, left: 10 } }, plugins: { legend: { display: false }, datalabels: { anchor: 'end' as const, align: 'top' as const, offset: 4, color: '#333', font: { weight: 'bold' as const }, formatter: (v:number) => v > 0 ? v : '' } }, scales: { y: { beginAtZero: true, grace: '20%' } } };

  const optionsInspectorChart = { ...chartOptionsNumbers, onClick: (e: any, elements: any) => { if (elements.length > 0) { const label = inspectoresOrdenados[elements[0].index][0]; setSelectedInspectorChart(label === selectedInspectorChart ? null : label); } else setSelectedInspectorChart(null); } };
  const optionsTypeChart = { ...chartOptionsNumbers, onClick: (e: any, elements: any) => { if (elements.length > 0) { const label = tiposOrdenados[elements[0].index][0]; setSelectedTypeChart(label === selectedTypeChart ? null : label); } else { setSelectedTypeChart(null); setSelectedInspectorChart(null); } } };
  const dataFinalTabla = selectedTypeChart ? dataTabla.filter(ins => ins.tipo === selectedTypeChart) : dataTabla;

  // --- LÓGICA HORAS (Desempeño) ---
  const getHorasRango = (nombreInsp: string, inicioYMD: string, finYMD: string) => {
    const sFiltrados = shifts.filter(s => s.nombre === nombreInsp && s.fecha.substring(0,10) >= inicioYMD && s.fecha.substring(0,10) <= finYMD);
    const iFiltradas = inspecciones.filter(i => i.inspector === nombreInsp && i.created_at.substring(0,10) >= inicioYMD && i.created_at.substring(0,10) <= finYMD);
    const dias: any = {};
    sFiltrados.forEach(s => { const dKey = s.fecha.substring(0, 10); if (!dias[dKey]) dias[dKey] = { start: null, end: null, refStart: null, refEnd: null }; const dObj = new Date(s.fecha); if (s.accion === 'INICIO') dias[dKey].start = dObj; if (s.accion === 'FIN') dias[dKey].end = dObj; if (s.accion === 'INICIO_REF') dias[dKey].refStart = dObj; if (s.accion === 'FIN_REF') dias[dKey].refEnd = dObj; });
    let totalMs = 0;
    for (const dKey in dias) {
      const d = dias[dKey];
      if (d.start) {
        let end = d.end; if (!end) { const hoyIns = iFiltradas.filter(i => i.created_at.substring(0, 10) === dKey); if (hoyIns.length > 0) end = new Date(Math.max(...hoyIns.map(i => new Date(i.created_at).getTime()))); else end = d.start; }
        let dayMs = end.getTime() - d.start.getTime(); if (d.refStart && d.refEnd) dayMs -= (d.refEnd.getTime() - d.refStart.getTime()); if (dayMs > 0) totalMs += dayMs;
      }
    }
    return { ms: totalMs, text: `${Math.floor(totalMs / 3600000)}:${Math.floor((totalMs % 3600000) / 60000).toString().padStart(2, '0')}` };
  };

  const [desempenoDatos, setDesempenoDatos] = useState<any>({ grid: [], totalMs: 0, kpis: {}, temas: {}, mapaIns: [], mapaShifts: [] });
  useEffect(() => {
    if (modalDesempeno) {
      const parts = mesDesempeno.split('-'); const y = parseInt(parts[0]); const m = parseInt(parts[1]) - 1;
      const firstDay = new Date(y, m, 1); const lastDay = new Date(y, m + 1, 0); const grid = []; let msAcumulado = 0;
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const calc = getHorasRango(modalDesempeno, dateStr, dateStr); msAcumulado += calc.ms;
        grid.push({ dateISO: dateStr, fecha: `${String(day).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y}`, horas: calc.ms > 0 ? calc.text : 'F', acumulado: `${Math.floor(msAcumulado / 3600000)}:${Math.floor((msAcumulado % 3600000) / 60000).toString().padStart(2, '0')}` });
      }
      const iMes = inspecciones.filter(i => i.inspector === modalDesempeno && i.created_at.substring(0, 10) >= `${mesDesempeno}-01` && i.created_at.substring(0, 10) <= `${mesDesempeno}-31`);
      const sMes = shifts.filter(s => s.nombre === modalDesempeno && s.fecha.substring(0, 10) >= `${mesDesempeno}-01` && s.fecha.substring(0, 10) <= `${mesDesempeno}-31`);
      const shiftsNorm = sMes.map(s => ({ id: s.id, inspector: s.nombre, tipo: `📍 ${s.accion} JORNADA`, lat: s.lat, lon: s.lon, created_at: s.fecha, isShift: true }));
      const kpis: any = {}; const temas: any = {};
      iMes.forEach(i => { kpis[i.tipo] = (kpis[i.tipo] || 0) + 1; if (i.tipo.includes('TEMAS') && i.datos_formulario?.tema_tipo) temas[i.datos_formulario.tema_tipo] = (temas[i.datos_formulario.tema_tipo] || 0) + 1; });
      setDesempenoDatos({ grid, totalMs: msAcumulado, kpis, temas, mapaIns: iMes, mapaShifts: shiftsNorm });
    }
  }, [modalDesempeno, mesDesempeno, inspecciones, shifts]);

  const mapDataToShow = (mapaVista === 'inspecciones' ? (desempenoDatos?.mapaIns || []) : (desempenoDatos?.mapaShifts || [])).filter((item: any) => selectedDateFilter ? item.created_at.substring(0,10) === selectedDateFilter : true);

// --- LÓGICA REPORTES OPERATIVOS (NUEVO TAB) ---
  const [grupoSel540, setGrupoSel540] = useState('');
  const [grupoSel570, setGrupoSel570] = useState('');
  
  // Nuevos estados para el filtro cruzado al hacer clic en los gráficos
  const [selectedServ540, setSelectedServ540] = useState<string | null>(null);
  const [selectedServ570, setSelectedServ570] = useState<string | null>(null);

  // Separar inspecciones por grupo (Buscando en catálogo o por patrón 54x / 57x)
  const dataGrupos = flotaInspecciones.map(ins => {
    const serv = ins.datos_formulario?.servicio || '';
    let grupo = 'Otro';
    const servCatalogo = catServicios.find(s => s.nombre === serv);
    
    if (servCatalogo && servCatalogo.grupo) {
      grupo = String(servCatalogo.grupo).trim();
    } else {
      if (/(54[0-9])/.test(serv)) grupo = '540';
      else if (/(57[0-9])/.test(serv)) grupo = '570';
    }

    const faltas = getHallazgos(ins.datos_formulario).length;
    return { ...ins, grupo, faltas, servicioStr: serv, conductorStr: ins.datos_formulario?.conductor || 'Desconocido' };
  });

  const data540 = dataGrupos.filter(d => d.grupo === '540');
  const data570 = dataGrupos.filter(d => d.grupo === '570');
  const faltas540 = data540.reduce((acc, ins) => acc + ins.faltas, 0);
  const faltas570 = data570.reduce((acc, ins) => acc + ins.faltas, 0);

  const pieQx = { labels: ['Grupo 540', 'Grupo 570'], datasets: [{ data: [data540.length, data570.length], backgroundColor: ['#003366', '#FFCC00'] }] };
  const pieFaltas = { labels: ['Grupo 540', 'Grupo 570'], datasets: [{ data: [faltas540, faltas570], backgroundColor: ['#dc3545', '#fd7e14'] }] };

  // Generador de gráficos con soporte de selección (Color gris para los no seleccionados)
  const getRankServicios = (data: any[], selectedServ: string | null) => {
    const counts: any = {};
    data.forEach(d => { if(d.servicioStr) counts[d.servicioStr] = (counts[d.servicioStr] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a:any, b:any) => b[1] - a[1]).slice(0, 10);
    
    const fullLabels = sorted.map(s => s[0]);
    const labels = sorted.map(s => s[0].length > 20 ? s[0].substring(0,20)+'...' : s[0]);
    const bgColors = fullLabels.map(label => selectedServ && label !== selectedServ ? '#e5e7eb' : '#003366');

    return { fullLabels, labels, datasets: [{ label: 'Inspecciones', data: sorted.map(s => s[1]), backgroundColor: bgColors }] };
  };

  const getRankConductoresFaltas = (data: any[]) => {
    const stats: any = {};
    data.forEach(d => {
      if(!stats[d.conductorStr]) stats[d.conductorStr] = 0;
      stats[d.conductorStr] += d.faltas;
    });
    // MODIFICACIÓN: Filtramos (x[1] > 0) para NO mostrar los que tienen cero irregularidades
    return Object.entries(stats).filter((x:any) => x[1] > 0).sort((a:any, b:any) => b[1] - a[1]).map(x => ({ nombre: x[0], faltas: x[1] }));
  };

  // Opciones interactivas para atrapar el clic
  const optionsBarraServicio = (fullLabels: string[], setter: any, currentSelection: string | null) => ({
    maintainAspectRatio: false, 
    layout: { padding: { top: 30, right: 10, left: 10 } },
    plugins: { legend: { display: false }, datalabels: { anchor: 'end' as const, align: 'top' as const, offset: 4, color: '#333', font: { weight: 'bold' as const }, formatter: (v:number) => v > 0 ? v : '' } }, 
    scales: { y: { beginAtZero: true, grace: '20%' } },
    onClick: (e: any, elements: any) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const label = fullLabels[index];
        setter(label === currentSelection ? null : label);
      } else {
        setter(null);
      }
    }
  });

  const chartData540 = getRankServicios(data540, selectedServ540);
  const chartData570 = getRankServicios(data570, selectedServ570);
  
  // Tablas de ranking filtradas según el servicio tocado en el gráfico
  const rankCond540 = getRankConductoresFaltas(selectedServ540 ? data540.filter(d => d.servicioStr === selectedServ540) : data540);
  const rankCond570 = getRankConductoresFaltas(selectedServ570 ? data570.filter(d => d.servicioStr === selectedServ570) : data570);

  if (!adminUser) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="flex h-screen bg-[#f4f7f9] font-sans overflow-hidden">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-[#0B132B] text-white flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-4 bg-white m-4 rounded-lg text-center shadow-sm">
          <img src="https://i.ibb.co/RG0tNq6t/Logo-Web-copia.png" className="h-10 mx-auto" alt="Logo" />
          <div className="text-[#003366] text-[10px] font-black mt-2 tracking-widest leading-tight">ADMINISTRACIÓN DE INSPECCIONES</div>
        </div>
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <button onClick={() => setActiveTab('reportes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'reportes' ? 'bg-[#1864f8] text-white shadow-lg shadow-blue-500/30' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>📊 Reportes Generales</button>
          <button onClick={() => setActiveTab('operativos')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'operativos' ? 'bg-[#1864f8] text-white shadow-lg shadow-blue-500/30' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>📈 Reportes Operativos</button>
          <button onClick={() => setActiveTab('flota')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'flota' ? 'bg-[#1864f8] text-white shadow-lg shadow-blue-500/30' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>🚍 Panel de Seguimiento</button>
          <button onClick={() => setActiveTab('desempeno')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'desempeno' ? 'bg-[#1864f8] text-white shadow-lg shadow-blue-500/30' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>👥 Desempeño</button>
          <button onClick={() => setActiveTab('mapa')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'mapa' ? 'bg-[#1864f8] text-white shadow-lg shadow-blue-500/30' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>📍 Mapa Satelital</button>
          <button onClick={() => setActiveTab('usuarios')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'usuarios' ? 'bg-[#1864f8] text-white shadow-lg shadow-blue-500/30' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>⚙️ Usuarios</button>
          <button onClick={() => setActiveTab('config')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'config' ? 'bg-[#1864f8] text-white shadow-lg shadow-blue-500/30' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}>🛠️ Configuración</button>
        </nav>
        <div className="p-4"><button onClick={() => { localStorage.removeItem('buttini_user'); window.location.href = '/'; }} className="w-full bg-red-500/10 text-red-500 border border-red-500/20 p-3 rounded-lg font-bold hover:bg-red-500 hover:text-white transition-all text-sm flex justify-center items-center gap-2">↪ Cerrar Sesión</button></div>
      </div>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOP BAR FILTROS */}
        <div className="bg-white p-4 shadow-sm flex justify-between items-center z-10 shrink-0 border-b border-gray-100">
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200"><span className="text-xs font-bold text-gray-500">🗓️ Desde</span><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-transparent border-none text-sm font-bold text-[#0B132B] outline-none" /></div>
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200"><span className="text-xs font-bold text-gray-500">Hasta</span><input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="bg-transparent border-none text-sm font-bold text-[#0B132B] outline-none" /></div>
            <select value={filtroInspector} onChange={(e)=>setFiltroInspector(e.target.value)} className="border border-gray-200 p-2 rounded-lg text-sm bg-white font-bold text-[#0B132B]"><option value="">Todos los Inspectores</option>{inspectoresUnicos.map((i:any) => <option key={i} value={i}>{i}</option>)}</select>
            <select value={filtroTipo} onChange={(e)=>setFiltroTipo(e.target.value)} className="border border-gray-200 p-2 rounded-lg text-sm bg-white font-bold text-[#0B132B] max-w-xs"><option value="">Todos los Tipos</option>{tiposUnicos.map((t:any) => <option key={t} value={t}>{t}</option>)}</select>
            <select value={filtroEmpresa} onChange={(e)=>setFiltroEmpresa(e.target.value)} className="border border-gray-200 p-2 rounded-lg text-sm bg-white font-bold text-[#0B132B]"><option value="Todas">Ambas Empresas</option><option value="Antonio Buttini">Antonio Buttini</option><option value="Turismo Buttini">Turismo Buttini</option></select>
          </div>
          <div className="flex items-center gap-3"><div className="text-right"><div className="font-bold text-[#0B132B] text-sm leading-tight">{adminUser.nombre}</div><div className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">Administrador</div></div><div className="w-10 h-10 bg-[#0B132B] rounded-full flex items-center justify-center text-white font-bold shadow-md">A</div></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#f8f9fa]">
          {loading ? <div className="text-center mt-20 font-bold text-xl animate-pulse text-gray-400">Analizando flota...</div> : (
            <>
              {/* === REPORTES OPERATIVOS === */}
              {activeTab === 'operativos' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div><h2 className="text-2xl font-black text-[#0B132B]">Reportes Operativos por Grupos</h2><p className="text-gray-500 text-sm mt-1">Análisis específico de los grupos 540 y 570 (Según filtro de fechas superior)</p></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                      <h3 className="text-[#0B132B] font-bold mb-4">Total Registros (Qx) por Grupo</h3>
                      <div className="h-64 w-full"><Pie data={pieQx} options={{ maintainAspectRatio: false, plugins: { datalabels: { color: '#fff', font: { weight: 'bold' as const }, formatter: (v:number) => v > 0 ? v : '' } } }} /></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                      <h3 className="text-[#0B132B] font-bold mb-4">Total Irregularidades por Grupo</h3>
                      <div className="h-64 w-full"><Pie data={pieFaltas} options={{ maintainAspectRatio: false, plugins: { datalabels: { color: '#fff', font: { weight: 'bold' as const }, formatter: (v:number) => v > 0 ? v : '' } } }} /></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="text-[#0B132B] font-bold mb-4">Top 10 Servicios Controlados (Grupo 540) <span className="text-[10px] text-gray-400 font-normal ml-1">(Clic para filtrar)</span></h3>
                      <div className="h-64"><Bar data={chartData540} options={optionsBarraServicio(chartData540.fullLabels, setSelectedServ540, selectedServ540)} /></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <h3 className="text-[#0B132B] font-bold mb-4">Top 10 Servicios Controlados (Grupo 570) <span className="text-[10px] text-gray-400 font-normal ml-1">(Clic para filtrar)</span></h3>
                      <div className="h-64"><Bar data={chartData570} options={optionsBarraServicio(chartData570.fullLabels, setSelectedServ570, selectedServ570)} /></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                      <h3 className="text-[#0B132B] font-bold mb-4">
                        Ranking de Irregularidades (Grupo 540)
                        {selectedServ540 && <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 truncate max-w-full inline-block ml-2 border border-blue-100">{selectedServ540}</div>}
                      </h3>
                      <div className="overflow-y-auto flex-1 border rounded-lg">
                        <table className="w-full text-sm text-left"><thead className="bg-gray-50 text-gray-500 sticky top-0"><tr><th className="p-3">Conductor</th><th className="p-3 text-center">Irregularidades</th></tr></thead>
                          <tbody>
                            {rankCond540.length === 0 ? <tr><td colSpan={2} className="p-4 text-center text-gray-400">Sin irregularidades reportadas.</td></tr> : rankCond540.map((c:any, i:number) => <tr key={i} className="border-b"><td className="p-3 font-bold">{c.nombre}</td><td className="p-3 text-center"><span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg font-bold">{c.faltas}</span></td></tr>)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[400px]">
                      <h3 className="text-[#0B132B] font-bold mb-4">
                        Ranking de Irregularidades (Grupo 570)
                        {selectedServ570 && <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1 truncate max-w-full inline-block ml-2 border border-blue-100">{selectedServ570}</div>}
                      </h3>
                      <div className="overflow-y-auto flex-1 border rounded-lg">
                        <table className="w-full text-sm text-left"><thead className="bg-gray-50 text-gray-500 sticky top-0"><tr><th className="p-3">Conductor</th><th className="p-3 text-center">Irregularidades</th></tr></thead>
                          <tbody>
                            {rankCond570.length === 0 ? <tr><td colSpan={2} className="p-4 text-center text-gray-400">Sin irregularidades reportadas.</td></tr> : rankCond570.map((c:any, i:number) => <tr key={i} className="border-b"><td className="p-3 font-bold">{c.nombre}</td><td className="p-3 text-center"><span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg font-bold">{c.faltas}</span></td></tr>)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === ABM / CONFIGURACION CON NUEVAS COLUMNAS === */}
              {activeTab === 'config' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                  <div className="flex gap-4 border-b border-gray-200">
                    <button onClick={() => {setAbmTab('conductores'); setEditingId(null);}} className={`pb-3 font-bold text-sm px-2 ${abmTab==='conductores' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-[#0B132B]'}`}>👨‍✈️ Conductores</button>
                    <button onClick={() => {setAbmTab('unidades'); setEditingId(null);}} className={`pb-3 font-bold text-sm px-2 ${abmTab==='unidades' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-[#0B132B]'}`}>🚌 Unidades</button>
                    <button onClick={() => {setAbmTab('servicios'); setEditingId(null);}} className={`pb-3 font-bold text-sm px-2 ${abmTab==='servicios' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-[#0B132B]'}`}>🗺️ Servicios</button>
                  </div>

                  {abmTab === 'servicios' && catServicios.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border flex items-center gap-3">
                      <span className="text-sm font-bold text-[#0B132B]">Activar todos los servicios de la temporada:</span>
                      {Array.from(new Set(catServicios.map(s => s.temporada).filter(Boolean))).map(t => (
                        <button key={t as string} onClick={() => activarTemporada(t as string)} className="bg-yellow-100 text-yellow-800 border border-yellow-300 px-3 py-1 rounded font-bold text-xs hover:bg-yellow-200">{t as string}</button>
                      ))}
                    </div>
                  )}

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center bg-blue-50/50">
                    <div><h3 className="font-bold text-[#0B132B] mb-1">Carga Masiva ({abmTab.toUpperCase()})</h3><p className="text-xs text-gray-500">Descarga la plantilla CSV, complétala y súbela para actualizar.</p></div>
                    <div className="flex gap-3"><button onClick={() => downloadCSVTemplate(abmTab)} className="bg-white text-blue-600 border border-blue-200 px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-50 shadow-sm">⬇️ Plantilla CSV</button><label className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 cursor-pointer shadow-sm">⬆️ Subir CSV <input type="file" accept=".csv" className="hidden" onChange={(e) => handleCSVUpload(e, abmTab)}/></label></div>
                  </div>

                  <div className={`p-6 rounded-2xl shadow-sm border ${editingId ? 'bg-yellow-50 border-yellow-400' : 'bg-white border-gray-100'}`}>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-[#0B132B]">{editingId ? `✏️ Editando Registro` : `➕ Alta Manual Individual`}</h3>
                      {editingId && <button onClick={() => {setEditingId(null); setFormCond({ legajo: '', nombres: '', apellido: '', telefono: '', empresa: 'Antonio Buttini', foto: '' }); setFormUni({ numero: '', empresa: 'Antonio Buttini' }); setFormServ({ grupo: '', linea: '', nombre: '', temporada: '', empresa: 'Antonio Buttini' });}} className="text-xs text-red-500 font-bold underline">Cancelar Edición</button>}
                    </div>
                    <form onSubmit={(e) => handleSaveABM(e, abmTab)} className="flex gap-4 items-end flex-wrap">
                      {abmTab === 'conductores' && (
                        <>
                          <div className="flex-1 min-w-[80px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Legajo</label><input type="text" className="w-full border p-2 rounded-xl bg-white text-sm" value={formCond.legajo} onChange={e=>setFormCond({...formCond, legajo: e.target.value})} required/></div>
                          <div className="flex-1 min-w-[150px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nombres</label><input type="text" className="w-full border p-2 rounded-xl bg-white text-sm" value={formCond.nombres} onChange={e=>setFormCond({...formCond, nombres: e.target.value})} required/></div>
                          <div className="flex-1 min-w-[150px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Apellidos</label><input type="text" className="w-full border p-2 rounded-xl bg-white text-sm" value={formCond.apellido} onChange={e=>setFormCond({...formCond, apellido: e.target.value})} required/></div>
                          <div className="flex-1 min-w-[120px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Teléfono</label><input type="text" className="w-full border p-2 rounded-xl bg-white text-sm" value={formCond.telefono} onChange={e=>setFormCond({...formCond, telefono: e.target.value})} /></div>
                          <div className="flex-1 min-w-[200px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">URL Foto (Opcional)</label><input type="text" placeholder="https://..." className="w-full border p-2 rounded-xl bg-white text-sm" value={formCond.foto} onChange={e=>setFormCond({...formCond, foto: e.target.value})} /></div>
                        </>
                      )}
                      {abmTab === 'unidades' && <div className="flex-1 min-w-[200px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Número de Unidad</label><input type="text" className="w-full border p-2 rounded-xl bg-white text-sm" value={formUni.numero} onChange={e=>setFormUni({...formUni, numero: e.target.value})} required/></div>}
                      {abmTab === 'servicios' && (
                        <>
                          <div className="w-[80px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Grupo</label><input type="text" placeholder="540" className="w-full border p-2 rounded-xl bg-white text-sm" value={formServ.grupo} onChange={e=>setFormServ({...formServ, grupo: e.target.value})} /></div>
                          <div className="w-[80px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Línea</label><input type="text" placeholder="541" className="w-full border p-2 rounded-xl bg-white text-sm" value={formServ.linea} onChange={e=>setFormServ({...formServ, linea: e.target.value})} /></div>
                          <div className="flex-1 min-w-[200px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nombre Servicio</label><input type="text" className="w-full border p-2 rounded-xl bg-white text-sm" value={formServ.nombre} onChange={e=>setFormServ({...formServ, nombre: e.target.value})} required/></div>
                          <div className="flex-1 min-w-[150px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Temporada</label><input type="text" placeholder="Ej: Verano" className="w-full border p-2 rounded-xl bg-white text-sm" value={formServ.temporada} onChange={e=>setFormServ({...formServ, temporada: e.target.value})} /></div>
                        </>
                      )}
                      
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Empresa</label>
                        <select className="w-full border p-2 rounded-xl bg-white text-sm" value={abmTab === 'conductores' ? formCond.empresa : (abmTab === 'unidades' ? formUni.empresa : formServ.empresa)} onChange={(e) => { const val = e.target.value; if(abmTab === 'conductores') setFormCond({...formCond, empresa: val}); if(abmTab === 'unidades') setFormUni({...formUni, empresa: val}); if(abmTab === 'servicios') setFormServ({...formServ, empresa: val}); }}>
                          <option value="Antonio Buttini">Antonio Buttini</option><option value="Turismo Buttini">Turismo Buttini</option>
                        </select>
                      </div>

                      <button type="submit" className={`text-white font-bold px-6 py-2 rounded-xl text-sm h-[38px] transition-colors ${editingId ? 'bg-[#FFCC00] text-[#0B132B]' : 'bg-[#0B132B] hover:bg-blue-900'}`}>{editingId ? 'Actualizar' : 'Guardar'}</button>
                    </form>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50/50 text-gray-400 uppercase text-xs font-bold tracking-wider">
                        <tr>
                          {abmTab === 'conductores' ? <><th className="p-4 w-12 text-center">Foto</th><th className="p-4">Legajo / Nombre</th><th className="p-4 text-center">Empresa</th><th className="p-4 text-center">Teléfono</th></> : 
                          (abmTab === 'servicios' ? <><th className="p-4 text-center">Grupo</th><th className="p-4 text-center">Linea</th><th className="p-4">Servicio</th><th className="p-4 text-center">Empresa</th><th className="p-4 text-center">Temporada</th></> : 
                          <><th className="p-4">Unidad</th><th className="p-4 text-center">Empresa</th></>)}
                          <th className="p-4 text-center w-32">Estado</th><th className="p-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(abmTab === 'conductores' ? catConductores : (abmTab === 'unidades' ? catUnidades : catServicios)).map(item => (
                           <tr key={item.id} className={`border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${!item.activo ? 'opacity-50 grayscale' : ''}`}>
                             {abmTab === 'conductores' ? (
                               <><td className="p-4 text-center"><img src={item.foto || 'https://i.ibb.co/68v1rJv/user.png'} className="w-8 h-8 rounded-full object-cover border bg-gray-100 mx-auto" /></td><td className="p-4"><div className="font-bold text-[#0B132B]">{item.legajo} - {item.apellido}, {item.nombres}</div></td><td className="p-4 text-center text-xs text-gray-500 font-bold">{item.empresa || '-'}</td><td className="p-4 text-center text-gray-600">{item.telefono || '-'}</td></>
                             ) : (
                               abmTab === 'servicios' ? <><td className="p-4 text-center font-bold text-gray-500">{item.grupo || '-'}</td><td className="p-4 text-center font-bold text-gray-500">{item.linea || '-'}</td><td className="p-4 font-bold text-[#0B132B]">{item.nombre}</td><td className="p-4 text-center text-xs text-gray-500 font-bold">{item.empresa || '-'}</td><td className="p-4 text-center text-gray-600 font-bold">{item.temporada || '-'}</td></> : 
                               <><td className="p-4 font-bold text-[#0B132B]">{item.numero}</td><td className="p-4 text-center text-xs text-gray-500 font-bold">{item.empresa || '-'}</td></>
                             )}
                             <td className="p-4 text-center">{item.activo ? <span className="bg-green-100 text-green-700 font-bold px-2 py-1 rounded text-[10px]">ACTIVO</span> : <span className="bg-red-100 text-red-700 font-bold px-2 py-1 rounded text-[10px]">INHABILITADO</span>}</td>
                             <td className="p-4 text-right flex gap-2 justify-end">
                               <button onClick={() => editItem(item, abmTab)} className="font-bold text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">Editar</button>
                               <button onClick={() => toggleActivo(abmTab, item.id, item.activo)} className={`font-bold text-xs px-3 py-1.5 rounded-lg transition-colors ${item.activo ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{item.activo ? 'Inhabilitar' : 'Reactivar'}</button>
                             </td>
                           </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ========================================================================================= */}
              {/* RESTO DE PESTAÑAS (MANTIENEN SU CÓDIGO INTACTO) */}
              {/* ========================================================================================= */}
              {activeTab === 'reportes' && (
                <div className="space-y-6">
                  <div className="bg-white p-4 rounded-xl shadow-sm border flex items-center gap-6">
                    <div className="min-w-[150px] border-r pr-4"><h3 className="text-gray-400 font-bold uppercase text-[10px]">Total Inspecciones</h3><div className="text-4xl font-black text-[#0B132B]">{dataTabla.length}</div></div>
                    <div className="flex-1 min-h-[150px] w-full relative"><Line data={{ labels: last12Months, datasets: [{ data: trendData, borderColor: '#1864f8', backgroundColor: '#dc3545', pointRadius: 4, tension: 0.3 }] }} options={chartOptionsNumbers} /></div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-4 rounded-xl shadow-sm border"><h3 className="text-[#0B132B] font-bold mb-4">Distribución por Tipo {selectedInspectorChart && <span className="text-xs text-blue-500 ml-2">(Filtro: {selectedInspectorChart})</span>}</h3><div className="min-h-[250px] w-full relative"><Bar data={chartTipos} options={optionsTypeChart} /></div></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border"><h3 className="text-[#0B132B] font-bold mb-4">Total por Inspector <span className="text-[10px] font-normal text-gray-400">(Clic para filtrar)</span></h3><div className="min-h-[250px] w-full relative"><Bar data={chartInspectores} options={optionsInspectorChart} /></div></div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border flex flex-col h-[500px]">
                    <div className="bg-gray-50 p-4 border-b flex justify-between items-center shrink-0 flex-wrap gap-2">
                      <div className="font-bold text-[#0B132B] text-lg">Registro Detallado</div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 bg-white px-3 py-1 border rounded cursor-pointer text-xs font-bold text-[#0B132B]"><input type="checkbox" checked={chkSeguimiento} onChange={e=>setChkSeguimiento(e.target.checked)}/> Solo Seguimiento</label>
                        <label className="flex items-center gap-2 bg-white px-3 py-1 border rounded cursor-pointer text-xs font-bold text-[#0B132B]"><input type="checkbox" checked={chkObservaciones} onChange={e=>setChkObservaciones(e.target.checked)}/> Solo Observaciones</label>
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 relative">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-white text-[#0B132B] sticky top-0 shadow-sm z-10"><tr><th className="p-3">Fecha</th><th className="p-3">Inspector</th><th className="p-3">Tipo</th><th className="p-3">Observaciones</th><th className="p-3 text-center">Acción</th><th className="p-3 text-center">Estado</th></tr></thead>
                        <tbody>
                          {dataFinalTabla.map(ins => (
                            <tr key={ins.id} className="border-b hover:bg-gray-50">
                              <td className="p-3 whitespace-nowrap"><a href={`https://www.google.com/maps/search/?api=1&query=${ins.lat},${ins.lon}`} target="_blank" className="text-blue-600 hover:underline font-bold" title="Ver en Mapa">{new Date(ins.created_at).toLocaleDateString()} {new Date(ins.created_at).toLocaleTimeString().slice(0,5)} 📍</a></td>
                              <td className="p-3 font-bold">{ins.inspector}</td><td className="p-3"><span className="bg-gray-100 px-2 py-1 rounded text-[10px] font-bold border truncate block max-w-[200px]">{ins.tipo}</span></td><td className="p-3 text-xs text-gray-600 max-w-[200px] truncate">{ins.obs_general}</td>
                              <td className="p-3 text-center"><button onClick={() => setModalIns(ins)} className="bg-[#0B132B] text-white px-3 py-1 rounded font-bold text-xs">VER</button></td><td className="p-3 text-center text-[10px] font-bold uppercase">{getInspectionStatus(ins.id)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'flota' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                  <div><h2 className="text-2xl font-black text-[#0B132B]">Panel de Inspecciones</h2><p className="text-gray-500 text-sm mt-1">Estado actual de la flota y conductores</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4 hover:shadow-md transition-shadow"><div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl">👨‍✈️</div><div><div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Inspeccionados</div><div className="text-3xl font-black text-[#0B132B] leading-none">{rankingConductores.length}</div></div></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4 hover:shadow-md transition-shadow"><div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 text-2xl">⏳</div><div><div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pendientes</div><div className="text-3xl font-black text-[#0B132B] leading-none">{Math.max(0, pendientesCount)}</div></div></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4 hover:shadow-md transition-shadow"><div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 text-2xl">⚠️</div><div><div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Alertas Críticas</div><div className="text-3xl font-black text-red-600 leading-none">{urgentInspections.length}</div></div></div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border flex items-center gap-4 hover:shadow-md transition-shadow"><div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-500 text-2xl">🛡️</div><div><div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Score Flota</div><div className="text-3xl font-black text-green-600 leading-none">{scoreFlota}%</div></div></div>
                  </div>
                  {urgentInspections.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-[#0B132B] mb-4 flex items-center gap-2"><span className="text-red-500 animate-pulse">🚨</span> Revisiones Urgentes</h3>
                      <div className="flex gap-6 overflow-x-auto pb-4 snap-x">
                        {urgentInspections.slice(0,10).map((ins, i) => (
                          <div key={i} className="min-w-[300px] bg-white rounded-2xl shadow-sm border border-l-4 border-l-red-500 p-5 flex flex-col justify-between shrink-0 snap-start">
                            <div><div className="flex justify-between items-start mb-3"><div><div className="font-black text-[#0B132B] truncate w-48">{ins.datos_formulario?.conductor || 'Desconocido'}</div><div className="text-xs text-gray-500">🕒 {new Date(ins.created_at).toLocaleString('es-ES', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</div></div><span className="bg-red-50 text-red-600 text-[10px] font-black px-2 py-1 rounded">URGENTE</span></div><div className="bg-gray-50 p-3 rounded-xl mb-4"><div className="text-[10px] font-bold text-gray-400 uppercase mb-1">Vehículo / Servicio</div><div className="font-bold text-[#0B132B] text-xs">{ins.datos_formulario?.unidad || '-'} • {ins.datos_formulario?.servicio || '-'}</div></div></div>
                            <button onClick={() => setModalIns(ins)} className="w-full bg-[#0B132B] text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-900 transition-colors">Ver Detalles</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center"><h3 className="text-lg font-bold text-[#0B132B]">Ranking de Novedades (Gravedad)</h3></div>
                    <table className="w-full text-sm text-left"><thead className="bg-gray-50/50 text-gray-400 uppercase text-xs font-bold tracking-wider"><tr><th className="p-4 pl-6 w-16">Rank</th><th className="p-4">Conductor</th><th className="p-4 text-center">Última Unidad</th><th className="p-4 text-center">Estado / Faltas</th><th className="p-4 text-right pr-6">Acción</th></tr></thead>
                      <tbody>
                        {rankingConductores.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-400">No hay inspecciones en este rango.</td></tr> : rankingConductores.map((c:any, i:number) => (
                            <tr key={c.nombre} onClick={() => setModalDriver(c)} className="border-b hover:bg-gray-50/80 cursor-pointer group">
                              <td className="p-4 pl-6"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs ${i < 3 ? 'bg-red-500 shadow-lg shadow-red-500/30' : 'bg-gray-300'}`}>{i + 1}</div></td>
                              <td className="p-4"><div className="font-bold text-[#0B132B]">{c.nombre.split('-')[1]?.trim() || c.nombre}</div><div className="text-[10px] text-gray-400 font-mono">ID: {c.nombre.split('-')[0]?.trim()}</div></td>
                              <td className="p-4 text-center"><span className="bg-gray-100 text-gray-600 font-bold px-3 py-1 rounded-lg text-xs">{c.unidad}</span></td>
                              <td className="p-4 text-center">{c.faltas > 0 ? <span className="bg-red-50 text-red-600 font-bold px-3 py-1.5 rounded-lg text-xs border border-red-100 inline-flex items-center gap-1">⚠️ {c.faltas} FALTAS</span> : <span className="bg-green-50 text-green-600 font-bold px-3 py-1.5 rounded-lg text-xs border border-green-100 inline-flex items-center gap-1">✔️ SIN FALTAS</span>}</td>
                              <td className="p-4 pr-6 text-right text-gray-300 group-hover:text-blue-600 font-bold">VER HISTORIAL ❯</td>
                            </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'desempeno' && (
                <div className="space-y-6">
                  <h2 className="text-[#0B132B] font-bold text-xl mb-4 border-b-2 border-blue-500 pb-2 inline-block">Reporte de Horas y Desempeño Diario</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {inspectoresUnicos.map((insp: any) => {
                      const stats = getHorasRango(insp, fechaInicio, fechaFin);
                      const totalIns = inspecciones.filter(i => i.inspector === insp && i.created_at >= `${fechaInicio}T00:00:00Z` && i.created_at <= `${fechaFin}T23:59:59Z`).length;
                      return (
                        <div key={insp} className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col justify-between hover:shadow-md transition-shadow">
                          <div><h3 className="text-lg font-black text-[#0B132B] mb-4">{insp}</h3><div className="flex items-baseline gap-2 mb-2"><span className="text-4xl font-light text-[#0B132B]">{stats.text}</span><span className="text-sm text-gray-500">hs acumuladas</span></div><div className="flex items-baseline gap-2 mb-6"><span className="text-xl font-bold text-gray-800">{totalIns}</span><span className="text-sm text-gray-500">inspecciones</span></div></div>
                          <button onClick={() => setModalDesempeno(insp)} className="w-full bg-[#0B132B] text-white py-3 rounded-xl font-bold hover:bg-blue-900 transition-colors">VER DETALLE</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'mapa' && (
                <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border p-4">
                  <div className="mb-4 flex justify-between items-center"><h2 className="text-[#0B132B] font-bold text-lg">📍 Mapa de Inspecciones</h2><span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold border border-blue-200">{dataTabla.length} Puntos</span></div>
                  <div className="flex-1 rounded-xl overflow-hidden border"><MapComponent inspecciones={dataTabla} onVerFicha={(ins:any) => setModalIns(ins)} /></div>
                </div>
              )}

              {activeTab === 'usuarios' && (
                 <div className="space-y-6 animate-in fade-in duration-500">
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                   <h3 className="text-[#0B132B] font-bold mb-4">Agregar Nuevo Usuario</h3>
                   <form onSubmit={handleCreateUser} className="flex flex-wrap gap-4 items-end">
                     <div className="flex-1 min-w-[150px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Usuario (Login)</label><input type="text" className="w-full border p-2 rounded-xl bg-gray-50 text-sm" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required /></div>
                     <div className="flex-1 min-w-[150px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Clave</label><input type="password" className="w-full border p-2 rounded-xl bg-gray-50 text-sm" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required /></div>
                     <div className="flex-1 min-w-[200px]"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Nombre Completo</label><input type="text" className="w-full border p-2 rounded-xl bg-gray-50 text-sm" value={newUser.nombre} onChange={e => setNewUser({...newUser, nombre: e.target.value})} required /></div>
                     <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Rol</label><select className="w-full border p-2 rounded-xl bg-white text-sm" value={newUser.rol} onChange={e => setNewUser({...newUser, rol: e.target.value})}><option value="Inspector">Inspector</option><option value="Admin">Admin</option></select></div>
                     <div><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Jornada Mínima</label><select className="w-full border p-2 rounded-xl bg-white text-sm" value={newUser.jornada} onChange={e => setNewUser({...newUser, jornada: e.target.value})}><option value="SI">Requerida (Sí)</option><option value="NO">Omitir (No)</option></select></div>
                     <button type="submit" className="bg-[#0B132B] text-white font-bold px-6 py-2 rounded-xl text-sm h-[38px] hover:bg-blue-900 transition-colors">GUARDAR</button>
                   </form>
                 </div>
                 
                 <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                   <table className="w-full text-sm text-left">
                     <thead className="bg-gray-50/50 text-gray-400 uppercase text-xs font-bold tracking-wider">
                       <tr><th className="p-4 pl-6">Usuario</th><th className="p-4">Nombre</th><th className="p-4 text-center">Rol</th><th className="p-4 text-center">Jornada</th><th className="p-4 text-right pr-6">Acciones</th></tr>
                     </thead>
                     <tbody>
                       {usuarios.map(u => (
                         <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/80 transition-colors">
                           <td className="p-4 pl-6 font-bold text-[#0B132B]">{u.username}</td>
                           <td className="p-4 font-medium text-gray-600">{u.nombre}</td>
                           <td className="p-4 text-center"><span className={`px-3 py-1 rounded-lg text-[10px] font-bold text-white ${u.rol === 'Admin' ? 'bg-[#0B132B]' : 'bg-gray-500'}`}>{u.rol}</span></td>
                           <td className="p-4 text-center"><span className={`px-3 py-1 rounded-lg text-[10px] font-bold text-white ${u.jornada === 'SI' ? 'bg-green-500' : 'bg-red-500'}`}>{u.jornada === 'SI' ? 'Requerida' : 'Omitida'}</span></td>
                           <td className="p-4 pr-6 text-right flex gap-2 justify-end">
                             <button onClick={() => handleResetPassword(u.id, u.username)} className="text-blue-600 font-bold hover:bg-blue-100 transition-colors text-xs bg-blue-50 px-3 py-1.5 rounded-lg">🔑 Reset Clave</button>
                             <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-600 font-bold hover:bg-red-100 transition-colors text-xs bg-red-50 px-3 py-1.5 rounded-lg">❌ Eliminar</button>
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
      
      {/* MODAL FICHA (Reutilizable para Reportes y Mapa) */}
      {modalIns && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col h-[90vh]">
            <div className="bg-[#003366] text-white p-4 flex justify-between items-center rounded-t-xl shrink-0">
              <h2 className="font-bold text-lg">Inspección: {modalIns.id}</h2>
              <button onClick={() => setModalIns(null)} className="text-3xl leading-none hover:text-red-400">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              {/* Visualizador de Ficha Completo y a Ancho Completo */}
              <FichaVisualizador ins={modalIns} />

              {/* FOTOS */}
              {modalIns.fotos && modalIns.fotos.length > 0 && (
                <div className="mb-6 mt-6">
                  <h3 className="font-bold text-[#003366] border-b pb-2 mb-3">Fotos</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {modalIns.fotos.map((url:string, i:number) => (
                      <a key={i} href={url} target="_blank"><img src={url} className="h-32 rounded border hover:scale-105 transition-transform" /></a>
                    ))}
                  </div>
                </div>
              )}

              {/* SEGUIMIENTO */}
              <div className="bg-white p-4 rounded border-t-4 border-[#FFCC00] shadow-sm mt-6">
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
                    <textarea className="w-full border p-3 rounded text-sm bg-gray-50" rows={2} placeholder="Nuevo comentario..." value={nuevoComentario} onChange={(e) => setNewComentario(e.target.value)}></textarea>
                    <div className="flex gap-2">
                      <button onClick={handleAddComentario} className="flex-1 bg-green-600 text-white font-bold p-3 rounded hover:bg-green-700" disabled={loading}>AÑADIR COMENTARIO</button>
                      <button onClick={handleCerrarTema} className="flex-1 bg-red-600 text-white font-bold p-3 rounded hover:bg-red-700" disabled={loading}>🔒 MARCAR CERRADO</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DESEMPEÑO DE INSPECTOR (Ya Existente) */}
      {modalDesempeno && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[100] backdrop-blur-sm">
          <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl flex flex-col h-[95vh]">
            <div className="bg-[#0B132B] text-white p-4 flex justify-between items-center rounded-t-xl shrink-0"><h2 className="font-bold text-lg">Desempeño Inspector: {modalDesempeno}</h2><button onClick={() => { setModalDesempeno(null); setSelectedDateFilter(null); setMapaVista('inspecciones'); }} className="text-3xl leading-none hover:text-red-400">&times;</button></div>
            <div className="p-6 overflow-y-auto flex-1 bg-white">
              <div className="flex justify-between items-center mb-6 bg-gray-50 p-4 rounded border"><span className="font-bold text-[#0B132B]">Seleccionar Mes de Análisis:</span><input type="month" value={mesDesempeno} onChange={(e) => setMesDesempeno(e.target.value)} className="border p-2 rounded text-sm font-bold" /></div>
              <div className="flex flex-col lg:flex-row gap-8 mb-8">
                <div className="flex-1 space-y-4"><h3 className="font-bold text-[#0B132B] border-b-2 border-blue-500 pb-2 text-lg">Inspecciones Realizadas</h3><div className="grid grid-cols-2 gap-4"><div className="bg-[#eef4f9] p-4 rounded text-center col-span-2 border"><div className="font-bold text-[#0B132B] text-sm mb-1">Total Inspecciones</div><div className="text-3xl font-light text-[#0B132B]">{desempenoDatos.mapaIns.length}</div></div>{Object.entries(desempenoDatos.kpis).map(([k, v]:any) => (<div key={k} className="bg-gray-50 p-4 rounded text-center border"><div className="font-bold text-gray-700 text-xs mb-1 h-8 flex items-center justify-center">{k}</div><div className="text-xl font-bold text-blue-600 drop-shadow-sm">{v}</div>{k.includes('TEMAS') && Object.keys(desempenoDatos.temas).length > 0 && (<div className="mt-2 text-left text-[9px] text-gray-500 border-t pt-2 space-y-1">{Object.entries(desempenoDatos.temas).map(([tk, tv]:any) => <div key={tk} className="flex justify-between"><span>{tk}</span><b>{tv}</b></div>)}</div>)}</div>))}</div></div>
                <div className="flex-1"><h3 className="font-bold text-[#0B132B] border-b-2 border-blue-500 pb-2 text-lg mb-4">Grilla de Horas Diarias</h3><div className="border rounded overflow-hidden max-h-[400px] overflow-y-auto"><table className="w-full text-sm text-center"><thead className="bg-gray-50 text-[#0B132B] sticky top-0 shadow-sm font-bold"><tr><th className="p-3">Fecha</th><th className="p-3">Horas Trabajadas</th><th className="p-3">Horas Acumuladas</th></tr></thead><tbody>{desempenoDatos.grid.map((g:any) => (<tr key={g.fecha} onClick={() => setSelectedDateFilter(selectedDateFilter === g.dateISO ? null : g.dateISO)} className={`border-b last:border-0 cursor-pointer transition-colors ${selectedDateFilter === g.dateISO ? 'bg-blue-100 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 bg-white'}`} title="Clic para ver en el mapa"><td className="p-3 text-gray-600 font-medium">{g.fecha}</td><td className={`p-3 font-bold ${g.horas === 'F' ? 'text-red-500' : 'text-[#0B132B]'}`}>{g.horas}</td><td className="p-3 text-gray-600">{g.acumulado}</td></tr>))}</tbody></table></div></div>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4 mt-8"><h3 className="font-bold text-[#0B132B] border-b-2 border-blue-500 pb-2 text-lg">Ubicación de Registros ({mesDesempeno}){selectedDateFilter && <span className="ml-2 text-sm text-blue-600 font-normal bg-blue-100 px-2 py-1 rounded">(Día: {selectedDateFilter.split('-').reverse().join('/')})</span>}</h3><div className="flex gap-4 items-center bg-gray-50 p-2 rounded border shadow-sm"><label className="flex items-center gap-2 text-sm font-bold text-[#0B132B] cursor-pointer"><input type="radio" checked={mapaVista === 'inspecciones'} onChange={() => setMapaVista('inspecciones')} className="accent-blue-600 w-4 h-4" />Inspecciones</label><label className="flex items-center gap-2 text-sm font-bold text-[#0B132B] cursor-pointer"><input type="radio" checked={mapaVista === 'jornadas'} onChange={() => setMapaVista('jornadas')} className="accent-blue-600 w-4 h-4" />Inicios/Fin de Jornada</label></div></div>
              <div className="h-[400px] rounded-xl border-2 border-gray-200 overflow-hidden shadow-inner bg-gray-100"><MapComponent inspecciones={mapDataToShow} onVerFicha={(ins:any) => { if(ins.isShift) { alert("📍 Registro automático de GPS de Jornada."); } else { setModalDesempeno(null); setModalIns(ins); } }} /></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}