'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// 1. Ícono para puntos individuales (AZUL)
const blueIcon = L.divIcon({
  html: `<div style="background-color: #003366; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
  className: 'custom-div-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// 2. Función para crear los círculos de agrupación (VERDE / AMARILLO)
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  let color = '#4caf50'; // Verde por defecto (2 a 14)
  let size = '40px';

  if (count >= 15) {
    color = '#ffcc00'; // Amarillo (15 o más)
    size = '50px';
  }

  return L.divIcon({
    html: `
      <div style="
        background-color: ${color}cc; 
        width: ${size}; 
        height: ${size}; 
        border-radius: 50%; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        color: black; 
        font-weight: bold; 
        font-size: 14px;
        border: 2px solid ${color};
        box-shadow: 0 0 10px rgba(0,0,0,0.2);
        backdrop-filter: blur(2px);
      ">
        ${count}
      </div>`,
    className: 'custom-cluster-icon',
    iconSize: L.point(40, 40)
  });
};

export default function MapComponent({ inspecciones, onVerFicha }: any) {
  return (
    <MapContainer 
      center={[-34.617, -68.333]} 
      zoom={12} 
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 0 }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      
      {/* Grupo de Agrupación */}
      <MarkerClusterGroup
        chunkedLoading
        iconCreateFunction={createClusterCustomIcon}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom={true} // El efecto de separación al hacer clic
      >
        {inspecciones.map((ins: any) => (
          ins.lat && ins.lon ? (
            <Marker 
              key={ins.id} 
              position={[ins.lat, ins.lon]} 
              icon={blueIcon}
            >
              <Popup>
                <div className="text-center p-1" style={{ minWidth: '150px' }}>
                  <strong className="block text-[#003366] text-sm">{ins.inspector}</strong>
                  <span className="text-[10px] text-gray-500 uppercase font-bold block mb-2">{ins.tipo}</span>
                  <button 
                    onClick={() => onVerFicha(ins)} 
                    className="bg-[#FFCC00] text-[#003366] px-3 py-1 rounded font-black text-xs w-full shadow-md hover:bg-yellow-500 transition-colors"
                  >
                    Ver Ficha
                  </button>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}