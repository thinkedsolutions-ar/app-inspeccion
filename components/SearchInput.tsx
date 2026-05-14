'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface SearchInputProps {
  label: string;
  placeholder: string;
  table: 'conductores' | 'unidades' | 'servicios';
  column: string;
  onSelect: (value: string) => void;
  required?: boolean;
  initialValue?: string; // Agregamos esto para persistencia
}

export default function SearchInput({ label, placeholder, table, column, onSelect, required, initialValue }: SearchInputProps) {
  const [query, setQuery] = useState(initialValue || '');
  const [results, setResults] = useState<any[]>([]);
  const [showList, setShowList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar lista al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda en Supabase
  useEffect(() => {
    if (query.length < 2) { 
      setResults([]); 
      return; 
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from(table)
        .select(column)
        .ilike(column, `%${query}%`)
        .limit(10);
      setResults(data || []);
    }, 300); // Debounce para no saturar la base de datos

    return () => clearTimeout(timer);
  }, [query, table, column]);

  return (
    <div className="relative w-full mb-4" ref={containerRef}>
      <label className="text-xs font-bold text-[#003366] mb-1 block uppercase">{label}</label>
      <input
        type="text"
        className="w-full p-3 border-2 border-gray-200 rounded-xl bg-white font-bold text-black focus:border-[#003366] outline-none transition-all"
        placeholder={placeholder}
        value={query}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          onSelect(e.target.value); // Actualiza el padre mientras escribes
          setShowList(true);
        }}
        onFocus={() => setShowList(true)}
        required={required}
      />
      {showList && results.length > 0 && (
        <ul className="absolute z-[100] w-full bg-white border-2 border-gray-100 rounded-xl shadow-2xl mt-1 max-h-52 overflow-y-auto">
          {results.map((res, i) => (
            <li 
              key={i} 
              className="p-3 border-b last:border-0 hover:bg-blue-50 cursor-pointer text-sm font-medium text-black"
              onClick={() => {
                const val = res[column];
                setQuery(val);
                onSelect(val);
                setShowList(false);
              }}
            >
              {valideString(res[column])}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function valideString(val: any) {
    return typeof val === 'string' ? val : String(val);
}