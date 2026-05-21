'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Ícono original azul de Leaflet para Inspecciones
const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Ícono Verde para Inicio de Jornada
const iconInicio = L.divIcon({
  html: '<div style="background-color: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
  className: '', iconSize: [16, 16], iconAnchor: [8, 8]
});

// Ícono Azul para Fin de Jornada
const iconFin = L.divIcon({
  html: '<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>',
  className: '', iconSize: [16, 16], iconAnchor: [8, 8]
});

export default function MapComponent({ inspecciones = [], onVerFicha, jornadas = [], mapMode = 'inspecciones' }: any) {
  return (
    <MapContainer center={[-34.617, -68.333]} zoom={11} style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 0 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* CAPA DE INSPECCIONES */}
      {mapMode === 'inspecciones' && inspecciones.map((ins: any) => (
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

      {/* CAPA DE JORNADAS (INICIO/FIN) */}
      {mapMode === 'jornadas' && jornadas.map((jor: any) => (
        jor.lat && jor.lon ? (
          <Marker key={jor.id} position={[jor.lat, jor.lon]} icon={jor.accion === 'INICIO' ? iconInicio : iconFin}>
            <Popup>
              <div className="text-center p-1">
                <strong className="block text-[#003366] mb-1">{jor.nombre}</strong>
                <span className={`text-[10px] text-white px-2 py-1 rounded block mb-2 font-bold ${jor.accion === 'INICIO' ? 'bg-green-500' : 'bg-blue-500'}`}>
                  {jor.accion} DE JORNADA
                </span>
                <div className="text-xs text-gray-500">{new Date(jor.fecha).toLocaleString()}</div>
              </div>
            </Popup>
          </Marker>
        ) : null
      ))}
    </MapContainer>
  );
}