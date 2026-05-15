'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';

// Corrección del ícono de Leaflet en Next.js
const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

export default function MapComponent({ inspecciones, onVerFicha }: any) {
  return (
    <MapContainer center={[-34.617, -68.333]} zoom={11} style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 0 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {inspecciones.map((ins: any) => (
        ins.lat && ins.lon ? (
          <Marker key={ins.id} position={[ins.lat, ins.lon]} icon={customIcon}>
            <Popup>
              <div className="text-center p-1">
                <strong className="block text-[#003366] mb-1">{ins.inspector}</strong>
                <span className="text-[10px] bg-gray-100 px-2 py-1 rounded block mb-2">{ins.tipo}</span>
                <button onClick={() => onVerFicha(ins)} className="bg-[#FFCC00] text-[#003366] px-3 py-1 rounded font-bold text-xs w-full shadow-sm">
                  VER FICHA
                </button>
              </div>
            </Popup>
          </Marker>
        ) : null
      ))}
    </MapContainer>
  );
}