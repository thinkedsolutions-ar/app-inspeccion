'use client';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const customIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41]
});

const LocationMarker = ({ position, setPosition }: any) => {
  useMapEvents({ click(e) { setPosition(e.latlng); } });
  return position ? <Marker position={position} icon={customIcon} /> : null;
};

export default function MapPicker({ position, setPosition }: any) {
  return (
    <MapContainer center={[-34.617, -68.333]} zoom={13} style={{ height: '300px', width: '100%', borderRadius: '0.5rem', zIndex: 0 }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <LocationMarker position={position} setPosition={setPosition} />
    </MapContainer>
  );
}