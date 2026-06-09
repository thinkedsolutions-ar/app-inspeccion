'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Consultamos en nuestra tabla 'users' de Supabase.......
    const { data, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.trim())
      .eq('password', password.trim()) // En prod usaríamos auth.signInWithPassword
      .single();

    if (dbError || !data) {
      setError('Usuario o clave incorrecta');
      setLoading(false);
      return;
    }

    // Si el login es exitoso, guardamos la sesión y redirigimos
    localStorage.setItem('buttini_user', JSON.stringify(data));
    
    if (data.rol === 'Admin' || data.rol === 'Usuario') {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/inspeccion';
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#003366] p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-sm text-center">
        {/* Logo - Usamos la URL de tu logo original */}
        <div className="mb-6">
          <img 
            src="https://i.ibb.co/RG0tNq6t/Logo-Web-copia.png" 
            alt="Logo Buttini" 
            className="h-12 mx-auto"
          />
          <h2 className="text-xl font-bold mt-4 text-[#333]">Acceso Inspectores</h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Usuario"
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#003366] text-black"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:border-[#003366] text-black"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#003366] text-white p-3 rounded font-bold uppercase hover:bg-[#002244] transition-colors border-b-4 border-[#001122]"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}