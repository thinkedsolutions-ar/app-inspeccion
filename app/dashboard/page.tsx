'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement
} from 'chart.js';
<<<<<<< HEAD
import { Bar, Line, Doughnut } from 'react-chartjs-2';
=======
import { Bar, Doughnut } from 'react-chartjs-2';
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement);

export default function DashboardPage() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('reportes');
  const [loading, setLoading] = useState(true);
  
  // Datos
  const [inspecciones, setInspecciones] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
<<<<<<< HEAD
  // Filtros de fecha (por defecto este mes)
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);

  // Estados para nuevo usuario
=======
  // Filtros
  const [fechaInicio, setFechaInicio] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);

  // Modal de Detalle
  const [selectedIns, setSelectedIns] = useState<any>(null);
  const [followups, setFollowups] = useState<any[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [savingComentario, setSavingComentario] = useState(false);

  // Nuevo Usuario
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
  const [newUser, setNewUser] = useState({ username: '', password: '', nombre: '', rol: 'Inspector', jornada: 'SI' });

  useEffect(() => {
    const session = localStorage.getItem('buttini_user');
    if (!session) { window.location.href = '/'; return; }
<<<<<<< HEAD
    
    const userData = JSON.parse(session);
    if (userData.rol !== 'Admin') {
      alert("No tienes permisos para ver esta página.");
      window.location.href = '/inspeccion';
      return;
    }
=======
    const userData = JSON.parse(session);
    if (userData.rol !== 'Admin') { window.location.href = '/inspeccion'; return; }
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
    setAdminUser(userData);
    fetchData();
    fetchUsers();
  },[]);

  const fetchData = async () => {
    setLoading(true);
<<<<<<< HEAD
    // Filtrar por rango de fechas
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .gte('created_at', `${fechaInicio}T00:00:00Z`)
      .lte('created_at', `${fechaFin}T23:59:59Z`)
      .order('created_at', { ascending: false });

=======
    const { data } = await supabase.from('inspections').select('*')
      .gte('created_at', `${fechaInicio}T00:00:00Z`).lte('created_at', `${fechaFin}T23:59:59Z`)
      .order('created_at', { ascending: false });
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
    if (data) setInspecciones(data);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('nombre', { ascending: true });
    if (data) setUsuarios(data);
  };

<<<<<<< HEAD
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('users').insert([newUser]);
    if (error) {
      alert("Error al crear usuario: " + error.message);
    } else {
      alert("Usuario creado exitosamente");
      setNewUser({ username: '', password: '', nombre: '', rol: 'Inspector', jornada: 'SI' });
      fetchUsers();
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    if (confirm(`¿Eliminar al usuario ${username}?`)) {
      await supabase.from('users').delete().eq('id', id);
      fetchUsers();
    }
  };

  // --- PROCESAMIENTO DE DATOS PARA GRÁFICOS ---
  const conteoTipos: Record<string, number> = {};
  const conteoInspectores: Record<string, number> = {};
  
=======
  // --- LÓGICA DEL MODAL Y SEGUIMIENTO ---
  const abrirModal = async (inspeccion: any) => {
    setSelectedIns(inspeccion);
    setFollowups([]); // Limpiar historial anterior
    // Buscar el historial de comentarios de esta inspección
    const { data } = await supabase.from('followups').select('*').eq('inspection_id', inspeccion.id).order('created_at', { ascending: true });
    if (data) setFollowups(data);
  };

  const cerrarModal = () => { setSelectedIns(null); setNuevoComentario(''); };

  const agregarComentario = async () => {
    if (!nuevoComentario.trim()) return;
    setSavingComentario(true);
    const { data, error } = await supabase.from('followups').insert([{
      inspection_id: selectedIns.id,
      usuario: adminUser.nombre,
      accion: nuevoComentario
    }]).select();

    if (!error && data) {
      setFollowups([...followups, data[0]]);
      setNuevoComentario('');
    } else { alert("Error al guardar comentario"); }
    setSavingComentario(false);
  };

  const cerrarTema = async () => {
    if(!confirm("¿Marcar este tema como CERRADO?")) return;
    setSavingComentario(true);
    const msj = "[CERRADO] El tema ha sido cerrado por el administrador.";
    const { data, error } = await supabase.from('followups').insert([{ inspection_id: selectedIns.id, usuario: adminUser.nombre, accion: msj }]).select();
    if (!error && data) { setFollowups([...followups, data[0]]); setNuevoComentario(''); }
    setSavingComentario(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('users').insert([newUser]);
    if (!error) { alert("Usuario creado"); setNewUser({ username: '', password: '', nombre: '', rol: 'Inspector', jornada: 'SI' }); fetchUsers(); }
  };
  const handleDeleteUser = async (id: string, username: string) => {
    if (confirm(`¿Eliminar al usuario ${username}?`)) { await supabase.from('users').delete().eq('id', id); fetchUsers(); }
  };

  // --- GRÁFICOS ---
  const conteoTipos: Record<string, number> = {};
  const conteoInspectores: Record<string, number> = {};
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
  inspecciones.forEach(ins => {
    conteoTipos[ins.tipo] = (conteoTipos[ins.tipo] || 0) + 1;
    conteoInspectores[ins.inspector] = (conteoInspectores[ins.inspector] || 0) + 1;
  });
<<<<<<< HEAD

  const chartTipos = {
    labels: Object.keys(conteoTipos),
    datasets: [{ label: 'Inspecciones', data: Object.values(conteoTipos), backgroundColor: ['#003366', '#dc3545', '#FFCC00', '#28a745', '#6f42c1'] }]
  };

  const chartInspectores = {
    labels: Object.keys(conteoInspectores),
    datasets: [{ label: 'Total por Inspector', data: Object.values(conteoInspectores), backgroundColor: '#003366' }]
  };

  if (!adminUser) return <div className="p-10 text-center">Verificando accesos...</div>;

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden">
      
=======
  const chartTipos = { labels: Object.keys(conteoTipos), datasets: [{ data: Object.values(conteoTipos), backgroundColor: ['#003366', '#dc3545', '#FFCC00', '#28a745', '#6f42c1'] }] };
  const chartInspectores = { labels: Object.keys(conteoInspectores), datasets: [{ label: 'Inspecciones', data: Object.values(conteoInspectores), backgroundColor: '#003366' }] };

  if (!adminUser) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <div className="flex h-screen bg-gray-100 font-sans overflow-hidden text-black">
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
      {/* SIDEBAR */}
      <div className="w-64 bg-[#003366] text-white flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-6 bg-white m-4 rounded-lg text-center">
          <img src="https://i.ibb.co/RG0tNq6t/Logo-Web-copia.png" className="h-10 mx-auto" alt="Logo" />
<<<<<<< HEAD
          <div className="text-[#003366] text-[10px] font-black mt-2">GESTIÓN OPERATIVA V3</div>
        </div>
        
        <nav className="flex-1 px-2 space-y-2">
          <button onClick={() => setActiveTab('reportes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors ${activeTab === 'reportes' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'text-white/70 hover:bg-white/5'}`}>
            📊 Reportes Generales
          </button>
          <button onClick={() => setActiveTab('usuarios')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors ${activeTab === 'usuarios' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'text-white/70 hover:bg-white/5'}`}>
            ⚙️ Usuarios
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold text-white/50 cursor-not-allowed">
            📍 Mapa Satelital (Próximamente)
          </button>
        </nav>
        
        <div className="p-4">
          <button onClick={() => { localStorage.removeItem('buttini_user'); window.location.href = '/'; }} className="w-full bg-red-600 text-white p-3 rounded-lg font-bold hover:bg-red-700">
            CERRAR SESIÓN
          </button>
=======
        </div>
        <nav className="flex-1 px-2 space-y-2 mt-4">
          <button onClick={() => setActiveTab('reportes')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors ${activeTab === 'reportes' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'text-white/70 hover:bg-white/5'}`}>📊 Reportes Generales</button>
          <button onClick={() => setActiveTab('usuarios')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-colors ${activeTab === 'usuarios' ? 'bg-white/10 text-[#FFCC00] border-l-4 border-[#FFCC00]' : 'text-white/70 hover:bg-white/5'}`}>⚙️ Usuarios</button>
          <button onClick={() => setActiveTab('listados')} className="w-full ...">📁 Listados Maestros</button> 
        </nav>
        <div className="p-4">
          <button onClick={() => { localStorage.removeItem('buttini_user'); window.location.href = '/'; }} className="w-full bg-red-600 text-white p-3 rounded-lg font-bold hover:bg-red-700">CERRAR SESIÓN</button>
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
<<<<<<< HEAD
        
        {/* TOP BAR (Filtros) */}
        <div className="bg-white p-4 shadow-sm flex justify-between items-center z-10 shrink-0">
          <div className="flex gap-4 items-center">
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="border p-2 rounded" />
            <span className="text-gray-400">→</span>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="border p-2 rounded" />
            <button onClick={fetchData} className="bg-[#FFCC00] text-[#003366] px-4 py-2 rounded font-bold hover:bg-yellow-400">FILTRAR</button>
          </div>
          <div className="font-bold text-[#003366]">Hola, {adminUser.nombre}</div>
        </div>

        {/* CONTENIDO ESCROLEABLE */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div></div>
          ) : (
            <>
              {/* VISTA REPORTES */}
              {activeTab === 'reportes' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  
                  {/* KPI */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border-l-8 border-[#FFCC00] flex items-center gap-6">
                    <div>
                      <h3 className="text-gray-400 font-bold uppercase text-xs">Total Inspecciones</h3>
                      <div className="text-5xl font-black text-[#003366]">{inspecciones.length}</div>
                    </div>
                  </div>

                  {/* GRÁFICOS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="text-[#003366] font-bold mb-4">Distribución por Tipo</h3>
                      <div className="h-64"><Doughnut data={chartTipos} options={{ maintainAspectRatio: false }} /></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="text-[#003366] font-bold mb-4">Total por Inspector</h3>
                      <div className="h-64"><Bar data={chartInspectores} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
                    </div>
                  </div>

                  {/* TABLA DE REGISTROS */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b font-bold text-[#003366]">Registro Detallado</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#f8f9fa] text-gray-600 uppercase text-xs">
                          <tr>
                            <th className="p-4 border-b">Fecha</th>
                            <th className="p-4 border-b">Inspector</th>
                            <th className="p-4 border-b">Tipo</th>
                            <th className="p-4 border-b">Observaciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inspecciones.length === 0 ? (
                            <tr><td colSpan={4} className="p-4 text-center text-gray-500">No hay registros en estas fechas.</td></tr>
                          ) : (
                            inspecciones.map(ins => (
                              <tr key={ins.id} className="hover:bg-blue-50 border-b last:border-0">
                                <td className="p-4 whitespace-nowrap">{new Date(ins.created_at).toLocaleDateString()} {new Date(ins.created_at).toLocaleTimeString().slice(0,5)}</td>
                                <td className="p-4 font-bold text-[#003366]">{ins.inspector}</td>
                                <td className="p-4">
                                  <span className="bg-gray-100 px-2 py-1 rounded text-xs font-bold border border-gray-200">{ins.tipo}</span>
                                </td>
                                <td className="p-4 text-gray-600 truncate max-w-xs">{ins.obs_general || '-'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA USUARIOS */}
              {activeTab === 'usuarios' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* FORMULARIO NUEVO USUARIO */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-[#003366] font-bold mb-4">Agregar Nuevo Usuario</h3>
                    <form onSubmit={handleCreateUser} className="flex flex-wrap gap-4 items-end">
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Usuario (Login)</label>
                        <input type="text" className="w-full border p-2 rounded" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Clave</label>
                        <input type="password" className="w-full border p-2 rounded" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Completo</label>
                        <input type="text" className="w-full border p-2 rounded" value={newUser.nombre} onChange={e => setNewUser({...newUser, nombre: e.target.value})} required />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Rol</label>
                        <select className="w-full border p-2 rounded bg-white" value={newUser.rol} onChange={e => setNewUser({...newUser, rol: e.target.value})}>
                          <option value="Inspector">Inspector</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Jornada Mínima</label>
                        <select className="w-full border p-2 rounded bg-white" value={newUser.jornada} onChange={e => setNewUser({...newUser, jornada: e.target.value})}>
                          <option value="SI">Requerida (Sí)</option>
                          <option value="NO">Omitir (No)</option>
                        </select>
                      </div>
                      <button type="submit" className="bg-green-600 text-white font-bold px-6 py-2 rounded hover:bg-green-700">GUARDAR</button>
                    </form>
                  </div>

                  {/* TABLA DE USUARIOS */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#f8f9fa] text-[#003366] uppercase text-xs font-bold">
                        <tr>
                          <th className="p-4 border-b">Usuario</th>
                          <th className="p-4 border-b">Nombre</th>
                          <th className="p-4 border-b">Rol</th>
                          <th className="p-4 border-b">Jornada</th>
                          <th className="p-4 border-b text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usuarios.map(u => (
                          <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="p-4 font-bold">{u.username}</td>
                            <td className="p-4">{u.nombre}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold text-white ${u.rol === 'Admin' ? 'bg-[#003366]' : 'bg-gray-500'}`}>{u.rol}</span>
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded text-xs font-bold text-white ${u.jornada === 'SI' ? 'bg-green-500' : 'bg-red-500'}`}>
                                {u.jornada === 'SI' ? 'Requerida' : 'Omitida'}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-500 font-bold hover:underline text-xs">Eliminar</button>
=======
        <div className="bg-white p-4 shadow-sm flex justify-between items-center z-10 shrink-0 border-b">
          <div className="flex gap-4 items-center">
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="border p-2 rounded" />
            <span>→</span>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="border p-2 rounded" />
            <button onClick={fetchData} className="bg-[#FFCC00] text-[#003366] px-4 py-2 rounded font-bold hover:bg-yellow-400">FILTRAR</button>
          </div>
          <div className="font-bold text-[#003366]">Admin: {adminUser.nombre}</div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? ( <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#003366]"></div></div> ) : (
            <>
              {activeTab === 'reportes' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-8 border-[#FFCC00]">
                      <h3 className="text-gray-400 font-bold uppercase text-xs">Total Inspecciones</h3>
                      <div className="text-5xl font-black text-[#003366]">{inspecciones.length}</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm h-48"><Doughnut data={chartTipos} options={{ maintainAspectRatio: false }} /></div>
                    <div className="bg-white p-4 rounded-xl shadow-sm h-48"><Bar data={chartInspectores} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b font-bold text-[#003366]">Registro Detallado</div>
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#003366] text-white uppercase text-xs">
                        <tr><th className="p-3">Fecha</th><th className="p-3">Inspector</th><th className="p-3">Tipo</th><th className="p-3">Observaciones</th><th className="p-3 text-center">Acción</th></tr>
                      </thead>
                      <tbody>
                        {inspecciones.map(ins => (
                          <tr key={ins.id} className="hover:bg-blue-50 border-b">
                            <td className="p-3 whitespace-nowrap">{new Date(ins.created_at).toLocaleDateString()} {new Date(ins.created_at).toLocaleTimeString().slice(0,5)}</td>
                            <td className="p-3 font-bold">{ins.inspector}</td>
                            <td className="p-3"><span className="bg-gray-200 px-2 py-1 rounded text-[10px] font-bold">{ins.tipo}</span></td>
                            <td className="p-3 text-gray-600 truncate max-w-[200px]">{ins.obs_general}</td>
                            <td className="p-3 text-center">
                              <button onClick={() => abrirModal(ins)} className="bg-[#FFCC00] text-[#003366] px-3 py-1 rounded font-bold text-xs hover:bg-yellow-400 shadow">VER FICHA</button>
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
<<<<<<< HEAD
=======

              {activeTab === 'usuarios' && (
                 /* Mantenemos la vista de usuarios igual */
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-[#003366] font-bold mb-4 border-b pb-2">Gestión de Usuarios</h3>
                    <form onSubmit={handleCreateUser} className="flex gap-4 items-end mb-8 bg-gray-50 p-4 rounded">
                      <div className="flex-1"><label className="text-xs font-bold text-gray-500">Usuario</label><input type="text" className="w-full border p-2 rounded" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required /></div>
                      <div className="flex-1"><label className="text-xs font-bold text-gray-500">Clave</label><input type="password" className="w-full border p-2 rounded" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required /></div>
                      <div className="flex-1"><label className="text-xs font-bold text-gray-500">Nombre</label><input type="text" className="w-full border p-2 rounded" value={newUser.nombre} onChange={e => setNewUser({...newUser, nombre: e.target.value})} required /></div>
                      <div>
                        <label className="text-xs font-bold text-gray-500">Rol</label>
                        <select className="w-full border p-2 rounded" value={newUser.rol} onChange={e => setNewUser({...newUser, rol: e.target.value})}><option value="Inspector">Inspector</option><option value="Admin">Admin</option></select>
                      </div>
                      <button type="submit" className="bg-green-600 text-white font-bold px-6 py-2 rounded">GUARDAR</button>
                    </form>
                    
                    <table className="w-full text-sm text-left border">
                      <thead className="bg-[#003366] text-white uppercase text-xs"><tr><th className="p-3">Usuario</th><th className="p-3">Nombre</th><th className="p-3">Rol</th><th className="p-3">Acciones</th></tr></thead>
                      <tbody>
                        {usuarios.map(u => (
                          <tr key={u.id} className="border-b"><td className="p-3 font-bold">{u.username}</td><td className="p-3">{u.nombre}</td><td className="p-3">{u.rol}</td><td className="p-3"><button onClick={() => handleDeleteUser(u.id, u.username)} className="text-red-500 font-bold hover:underline">Eliminar</button></td></tr>
                        ))}
                      </tbody>
                    </table>
                 </div>
              )}
              {activeTab === 'listados' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border space-y-8">
                  <h3 className="text-[#003366] font-bold text-xl">Gestión de Listados Maestros</h3>
                  
                  {['conductores', 'unidades', 'servicios'].map(tabla => (
                    <div key={tabla} className="p-4 border rounded-lg flex items-center justify-between">
                      <div>
                        <h4 className="font-bold capitalize">{tabla}</h4>
                        <a href={`/templates/${tabla}.csv`} download className="text-xs text-blue-600 underline">Descargar modelo CSV</a>
                      </div>
                      <input type="file" accept=".csv" onChange={(e) => console.log("Función pendiente")} />
                    </div>
                  ))}
                </div>
              )}
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
            </>
          )}
        </div>
      </div>
<<<<<<< HEAD
=======

      {/* MODAL FICHA DE DETALLE */}
      {selectedIns && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header Modal */}
            <div className="bg-[#003366] text-white p-4 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg">Inspección: <span className="font-mono text-[#FFCC00] ml-2">{selectedIns.id}</span></h2>
              <button onClick={cerrarModal} className="text-3xl hover:text-red-400 leading-none">&times;</button>
            </div>
            
            {/* Cuerpo Modal Scroll */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-3 border rounded shadow-sm"><span className="block text-[10px] font-bold text-gray-400 uppercase">Inspector</span><span className="font-bold text-[#003366]">{selectedIns.inspector}</span></div>
                <div className="bg-white p-3 border rounded shadow-sm"><span className="block text-[10px] font-bold text-gray-400 uppercase">Fecha</span><span className="font-bold text-[#003366]">{new Date(selectedIns.created_at).toLocaleString()}</span></div>
                <div className="bg-white p-3 border rounded shadow-sm col-span-2"><span className="block text-[10px] font-bold text-gray-400 uppercase">Tipo</span><span className="font-bold text-[#003366]">{selectedIns.tipo}</span></div>
              </div>

              <h3 className="font-bold text-[#003366] border-b-2 border-orange-400 inline-block mb-4 uppercase">Datos Relevados</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {Object.entries(selectedIns.datos_formulario || {}).map(([key, value]) => {
                  if(!value || key === 'fecha_formulario' || key === 'hora_formulario') return null;
                  return (
                    <div key={key} className="bg-white p-3 border border-gray-200 rounded shadow-sm">
                      <span className="block text-[10px] font-bold text-[#003366] uppercase mb-1">{key.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-medium">{String(value)}</span>
                    </div>
                  );
                })}
              </div>

              {selectedIns.fotos && selectedIns.fotos.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-[#003366] border-b-2 border-orange-400 inline-block mb-4 uppercase">Fotos Adjuntas</h3>
                  <div className="flex gap-4 overflow-x-auto pb-4">
                    {selectedIns.fotos.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="shrink-0 border-2 border-gray-200 rounded-lg overflow-hidden hover:border-[#FFCC00] transition-colors">
                        <img src={url} alt={`Foto ${i}`} className="h-32 w-auto object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* SECCIÓN SEGUIMIENTO */}
              <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-300">
                <h3 className="font-bold text-lg text-[#003366] mb-4">📝 Historial de Seguimiento</h3>
                
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto bg-white p-4 border rounded shadow-inner">
                  {followups.length === 0 ? <p className="text-sm text-gray-400 italic">No hay comentarios aún.</p> : followups.map(f => (
                    <div key={f.id} className={`p-3 rounded text-sm ${f.accion.includes('[CERRADO]') ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-100'}`}>
                      <div className="flex justify-between items-center mb-1">
                        <strong className="text-[#003366]">{f.usuario}</strong>
                        <span className="text-[10px] text-gray-500">{new Date(f.created_at).toLocaleString()}</span>
                      </div>
                      <p className={f.accion.includes('[CERRADO]') ? 'font-bold text-red-600' : 'text-gray-700'}>{f.accion}</p>
                    </div>
                  ))}
                </div>

                {!followups.some(f => f.accion.includes('[CERRADO]')) && (
                  <div className="flex flex-col gap-2">
                    <textarea value={nuevoComentario} onChange={e => setNuevoComentario(e.target.value)} placeholder="Agregar un nuevo comentario o actualización..." className="w-full border rounded p-3 text-sm" rows={2}></textarea>
                    <div className="flex gap-2">
                      <button onClick={agregarComentario} disabled={savingComentario} className="bg-green-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-green-700 disabled:opacity-50 flex-1">
                        {savingComentario ? 'Guardando...' : '➕ GUARDAR COMENTARIO'}
                      </button>
                      <button onClick={cerrarTema} disabled={savingComentario} className="bg-red-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-red-700 disabled:opacity-50">
                        🔒 MARCAR COMO CERRADO
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
>>>>>>> bcfe3a920d1f612d54f03b120e0476b4513182dd
    </div>
  );
}