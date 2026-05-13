'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface SearchInputProps {
  label: string;
  placeholder: string;
  table: 'conductores' | 'unidades' | 'servicios';
  column: string; // La columna a buscar (ej: 'nombre_completo', 'numero_unidad', 'descripcion')
  onSelect: (value: string) => void;
  required?: boolean;
}

export default function SearchInput({ label, placeholder, table, column, onSelect, required }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showList, setShowList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const fetchResults = async () => {
      const { data } = await supabase
        .from(table)
        .select(column)
        .ilike(column, `%${query}%`)
        .limit(5);
      setResults(data ||[]);
      setShowList(true);
    };
    fetchResults();
  }, [query, table, column]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="text-xs font-bold text-[#003366] mb-1 block">{label}</label>
      <input
        type="text"
        className="w-full p-3 border-2 border-gray-100 rounded-2xl bg-white font-bold"
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); onSelect(e.target.value); }}
        onFocus={() => setShowList(true)}
        required={required}
      />
      {showList && results.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border rounded-xl shadow-xl mt-1 max-h-40 overflow-y-auto">
          {results.map((res, i) => (
            <li 
              key={i} 
              className="p-3 border-b hover:bg-blue-50 cursor-pointer text-sm"
              onClick={() => { setQuery(res[column]); onSelect(res[column]); setShowList(false); }}
            >
              {res[column]}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}