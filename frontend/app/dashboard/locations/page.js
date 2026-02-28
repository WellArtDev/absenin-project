'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import DashboardHeader from '@/components/DashboardHeader';

export default function LocationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'map'

  const [locations, setLocations] = useState([]);
  const [stats, setStats] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius_meters: 500,
    sort_order: 0
  });

  const [currentPosition, setCurrentPosition] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [showCheckins, setShowCheckins] = useState(false);

  useEffect(() => {
    loadData();
    getCurrentPosition();
  }, []);

  const loadData = async () => {
    try {
      const [locationsData, statsData] = await Promise.all([
        api.getLocations(),
        api.getLocationStats()
      ]);
      setLocations(locationsData.data || []);
      setStats(statsData.data);
    } catch (e) {
      if (e.message?.includes('Sesi') || e.message?.includes('401')) router.push('/login');
      else setMsg('❌ ' + (e.message || 'Gagal memuat data'));
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPosition = () => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentPosition({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          });
        },
        (err) => {
          console.error('Geolocation error:', err);
        }
      );
    }
  };

  const handleUseCurrentLocation = () => {
    if (currentPosition) {
      setForm({
        ...form,
        latitude: currentPosition.latitude.toFixed(6),
        longitude: currentPosition.longitude.toFixed(6)
      });
    } else {
      getCurrentPosition();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    try {
      const data = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        radius_meters: parseInt(form.radius_meters)
      };

      if (editingLocation) {
        await api.updateLocation(editingLocation.id, data);
        setMsg('✅ Lokasi berhasil diupdate');
      } else {
        await api.createLocation(data);
        setMsg('✅ Lokasi berhasil dibuat');
      }

      setShowForm(false);
      setEditingLocation(null);
      resetForm();
      loadData();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal menyimpan lokasi'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (location) => {
    setEditingLocation(location);
    setForm({
      name: location.name,
      address: location.address || '',
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radius_meters: location.radius_meters,
      sort_order: location.sort_order || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus lokasi ini?')) return;
    setMsg('');
    setLoading(true);

    try {
      await api.deleteLocation(id);
      setMsg('✅ Lokasi berhasil dihapus');
      loadData();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal menghapus lokasi'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewCheckins = async (location) => {
    setEditingLocation(location);
    setShowCheckins(true);
    setMsg('');

    try {
      const data = await api.getLocationCheckins(location.id);
      setCheckins(data.data || []);
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal memuat check-in history'));
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      radius_meters: 500,
      sort_order: 0
    });
  };

  const openNewForm = () => {
    setEditingLocation(null);
    resetForm();
    setShowForm(true);
  };

  if (loading && locations.length === 0) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-wa-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const IC = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-wa-primary/20 focus:border-wa-primary bg-white";

  return (
    <>
      <DashboardHeader
        title="📍 Lokasi Kantor"
        subtitle={`${stats?.active_locations || 0} lokasi aktif`}
      />
      <div className="p-4 md:p-6 max-w-6xl mx-auto">

        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm mb-6 flex justify-between ${
            msg.startsWith('✅')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <span>{msg}</span>
            <button onClick={() => setMsg('')} className="ml-2 opacity-50 hover:opacity-100 text-lg">&times;</button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-2xl font-bold text-wa-primary">{stats.total_locations || 0}</p>
              <p className="text-xs text-gray-500">Total Lokasi</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-2xl font-bold text-green-600">{stats.active_locations || 0}</p>
              <p className="text-xs text-gray-500">Lokasi Aktif</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-2xl font-bold">{stats.total_checkins || 0}</p>
              <p className="text-xs text-gray-500">Check-in Hari Ini</p>
            </div>
          </div>
        )}

        {/* Add Location Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={openNewForm}
            className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark transition-colors"
          >
            + Tambah Lokasi
          </button>
        </div>

        {/* Locations Grid */}
        {locations.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <div className="text-6xl mb-4">📍</div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">Belum Ada Lokasi</h3>
            <p className="text-gray-500 mb-6">Tambahkan lokasi kantor untuk enable geofence</p>
            <button
              onClick={openNewForm}
              className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark"
            >
              + Tambah Lokasi
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {locations.map((loc) => (
              <div key={loc.id} className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg text-gray-900">{loc.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${loc.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {loc.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    {loc.address && <p className="text-sm text-gray-500">{loc.address}</p>}
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-gray-400">📍</span>
                    <span>{loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-gray-400">📏</span>
                    <span>Radius: {loc.radius_meters} meter</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <span className="text-gray-400">👥</span>
                    <span>{loc.checkin_count || 0} check-in</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t">
                  <button
                    onClick={() => handleEdit(loc)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleViewCheckins(loc)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                  >
                    📊 Logs
                  </button>
                  <button
                    onClick={() => handleDelete(loc.id)}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    🗑️
                  </button>
                </div>

                {/* Open in Maps */}
                <a
                  href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block text-center text-xs text-wa-primary hover:underline"
                >
                  🗺️ Buka di Google Maps
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">
                  {editingLocation ? '✏️ Edit Lokasi' : '➕ Lokasi Baru'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nama Lokasi *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className={IC}
                    placeholder="Contoh: Kantor Pusat, Gudang, Cabang Jakarta"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Alamat</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => setForm({ ...form, address: e.target.value })}
                    className={IC}
                    placeholder="Alamat lengkap..."
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium">Koordinat GPS *</label>
                    {currentPosition && (
                      <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        className="text-xs text-wa-primary hover:underline"
                      >
                        📍 Gunakan lokasi saya
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <input
                        type="number"
                        step="any"
                        value={form.latitude}
                        onChange={e => setForm({ ...form, latitude: e.target.value })}
                        className={IC}
                        placeholder="Latitude (-90 to 90)"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="any"
                        value={form.longitude}
                        onChange={e => setForm({ ...form, longitude: e.target.value })}
                        className={IC}
                        placeholder="Longitude (-180 to 180)"
                        required
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    <a
                      href="https://www.google.com/maps"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-wa-primary hover:underline"
                    >
                      🗺️ Buka Google Maps untuk mendapatkan koordinat
                    </a>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Radius Validasi (meter)</label>
                  <input
                    type="number"
                    value={form.radius_meters}
                    onChange={e => setForm({ ...form, radius_meters: e.target.value })}
                    className={IC}
                    min="10"
                    max="5000"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Karyawan bisa check-in dalam radius ini dari lokasi (default: 500m)
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-6 py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark disabled:opacity-50"
                  >
                    {saving ? '⏳ Menyimpan...' : '💾 Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Checkins Modal */}
        {showCheckins && editingLocation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <div>
                  <h2 className="text-lg font-bold">📊 Riwayat Check-in</h2>
                  <p className="text-sm text-gray-500">{editingLocation.name}</p>
                </div>
                <button onClick={() => setShowCheckins(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {checkins.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    Belum ada riwayat check-in
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">Waktu</th>
                          <th className="text-left px-4 py-3 font-medium">Karyawan</th>
                          <th className="text-center px-4 py-3 font-medium">Jarak</th>
                          <th className="text-center px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {checkins.map((checkin) => (
                          <tr key={checkin.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">
                              {new Date(checkin.checked_in_at).toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{checkin.employee_name}</p>
                                <p className="text-xs text-gray-500">{checkin.employee_code || '-'}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              {checkin.distance_meters}m
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${checkin.within_radius ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {checkin.within_radius ? '✅ Valid' : '❌ Di luar radius'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
