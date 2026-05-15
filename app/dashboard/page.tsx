'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement);

export default function DashboardPage() {
  const [adminUser, setAdminUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('reportes');
  const [loading, setLoading] = useState(true);
  
  // Datos
  const [inspecciones, setInspecciones] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  
  // Filtros de fecha (por defecto este mes)
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);

  // Estados para nuevo usuario
  const [newUser, setNewUser] = useState({ username: '', password: '', nombre: '', rol: 'Inspector', jornada: 'SI' });

  useEffect(() => {
    const session = localStorage.getItem('buttini_user');
    if (!session) { window.location.href = '/'; return; }
    
    const userData = JSON.parse(session);
    if (userData.rol !== 'Admin') {
      alert("No tienes permisos para ver esta página.");
      window.location.href = '/inspeccion';
      return;
    }
    setAdminUser(userData);
    fetchData();
    fetchUsers();
  },[]);

  const fetchData = async () => {
    setLoading(true);
    // Filtrar por rango de fechas
    const { data, error } = await supabase
      .from('inspections')
      .select('*')
      .gte('created_at', `${fechaInicio}T00:00:00Z`)
      .lte('created_at', `${fechaFin}T23:59:59Z`)
      .order('created_at', { ascending: false });

    if (data) setInspecciones(data);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*').order('nombre', { ascending: true });
    if (data) setUsuarios(data);
  };

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
  
  inspecciones.forEach(ins => {
    conteoTipos[ins.tipo] = (conteoTipos[ins.tipo] || 0) + 1;
    conteoInspectores[ins.inspector] = (conteoInspectores[ins.inspector] || 0) + 1;
  });

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
      
      {/* SIDEBAR */}
      <div className="w-64 bg-[#003366] text-white flex flex-col shadow-xl z-20 shrink-0">
        <div className="p-6 bg-white m-4 rounded-lg text-center">
          <img src="https://i.ibb.co/RG0tNq6t/Logo-Web-copia.png" className="h-10 mx-auto" alt="Logo" />
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
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
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
    </div>
  );
}