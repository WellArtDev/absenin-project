'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to change map view
function MapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

// Custom marker icon with color
function createColorIcon(color = '#3B82F6') {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${color};
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        width: 12px;
        height: 12px;
        background: white;
        border-radius: 50%;
      "></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

// Status colors
const statusColors = {
  HADIR: '#10B981',      // Green
  TERLAMBAT: '#F59E0B',  // Yellow
  IZIN: '#8B5CF6',       // Purple
  SAKIT: '#F97316',      // Orange
  ALPHA: '#EF4444',      // Red
};

export default function AttendanceMap({ attendanceData = [], selectedId, onMarkerClick }) {
  const [mounted, setMounted] = useState(false);

  // Indonesia center coordinates
  const indonesiaCenter = [-2.5489, 118.0149];
  const [mapCenter, setMapCenter] = useState(indonesiaCenter);
  const [mapZoom, setMapZoom] = useState(5);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter attendance with valid coordinates
  const validAttendance = attendanceData.filter(a =>
    a.latitude && a.longitude && !isNaN(a.latitude) && !isNaN(a.longitude)
  );

  // Handle marker click
  const handleMarkerClick = (attendance) => {
    setMapCenter([attendance.latitude, attendance.longitude]);
    setMapZoom(16);
    if (onMarkerClick) {
      onMarkerClick(attendance);
    }
  };

  if (!mounted) {
    return (
      <div className="bg-gray-100 rounded-2xl h-80 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">📍 Peta Absensi</h3>
            <p className="text-sm text-gray-500 mt-1">
              {validAttendance.length} karyawan terdeteksi lokasinya
            </p>
          </div>
          <button
            onClick={() => {
              setMapCenter(indonesiaCenter);
              setMapZoom(5);
            }}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            🔄 Reset View
          </button>
        </div>
      </div>

      <div className="h-96 relative">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapView center={mapCenter} zoom={mapZoom} />

          {validAttendance.map((attendance) => {
            const isSelected = selectedId === attendance.id;
            const statusColor = statusColors[attendance.status] || '#3B82F6';
            const icon = createColorIcon(isSelected ? '#DC2626' : statusColor);

            return (
              <Marker
                key={attendance.id}
                position={[attendance.latitude, attendance.longitude]}
                icon={icon}
                eventHandlers={{
                  click: () => handleMarkerClick(attendance),
                })}
              >
                <Popup>
                  <div className="p-2 min-w-[200px]">
                    <div className="font-bold text-gray-800 text-base">
                      {attendance.employee_name}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {attendance.check_in && (
                        <div>🕐 Masuk: {new Date(attendance.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                      {attendance.check_out && (
                        <div>🕕 Pulang: {new Date(attendance.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                      )}
                      {attendance.location_name && (
                        <div className="text-xs text-gray-500 mt-1">📍 {attendance.location_name}</div>
                      )}
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        attendance.status === 'HADIR' ? 'bg-green-100 text-green-700' :
                        attendance.status === 'TERLAMBAT' ? 'bg-yellow-100 text-yellow-700' :
                        attendance.status === 'IZIN' ? 'bg-purple-100 text-purple-700' :
                        attendance.status === 'SAKIT' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {attendance.status}
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {validAttendance.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-2">📍</div>
              <p className="text-sm">Belum ada data lokasi absensi hari ini</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
