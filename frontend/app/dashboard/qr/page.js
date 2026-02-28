'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function QRPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'scanner'

  const [qrcodes, setQRCodes] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedQR, setSelectedQR] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState([]);

  const [qrForm, setQRForm] = useState({
    shift_id: '',
    date: new Date().toISOString().split('T')[0],
    location_name: '',
    expires_at: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [qrData, shiftData] = await Promise.all([
        api.getQRCodes({ active_only: false }),
        api.getShifts()
      ]);
      setQRCodes(qrData.data || []);
      setShifts(shiftData.data || []);
    } catch (e) {
      if (e.message?.includes('Sesi') || e.message?.includes('401')) router.push('/login');
      else setMsg('❌ ' + (e.message || 'Gagal memuat data'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQR = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      await api.createQR(qrForm);
      setMsg('✅ QR Code berhasil dibuat');
      setShowForm(false);
      setQRForm({ shift_id: '', date: new Date().toISOString().split('T')[0], location_name: '', expires_at: '' });
      loadData();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal membuat QR Code'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (qr) => {
    setMsg('');
    try {
      await api.updateQR(qr.id, { is_active: !qr.is_active });
      setMsg(`✅ QR Code berhasil ${qr.is_active ? 'dinonaktifkan' : 'diaktifkan'}`);
      loadData();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal update QR Code'));
    }
  };

  const handleDeleteQR = async (id) => {
    if (!confirm('Hapus QR Code ini?')) return;
    setMsg('');
    setLoading(true);

    try {
      await api.deleteQR(id);
      setMsg('✅ QR Code berhasil dihapus');
      loadData();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal menghapus QR Code'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewLogs = async (qr) => {
    setSelectedQR(qr);
    setShowLogs(true);
    setMsg('');

    try {
      const logsData = await api.getQRLogs(qr.id);
      setLogs(logsData.data || []);
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal memuat logs'));
    }
  };

  // Generate QR Code URL using public API
  const getQRCodeURL = (code) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(code)}`;
  };

  if (loading && qrcodes.length === 0) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-wa-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const IC = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-wa-primary/20 focus:border-wa-primary bg-white";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📱 QR Code Absensi</h1>
          <p className="text-sm text-gray-500 mt-1">{qrcodes.filter(q => q.is_active).length} QR aktif</p>
        </div>
      </div>

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

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'list' ? 'bg-white text-wa-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📋 Daftar QR Code
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'scanner' ? 'bg-white text-wa-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📷 Scanner Info
          </button>
        </div>

        {activeTab === 'list' && (
          <>
            {/* Create QR Button */}
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setShowForm(true)}
                className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark transition-colors"
              >
                + Buat QR Code
              </button>
            </div>

            {/* QR Codes Grid */}
            {qrcodes.length === 0 ? (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <div className="text-6xl mb-4">📱</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Belum Ada QR Code</h3>
                <p className="text-gray-500 mb-6">Buat QR Code pertama untuk absensi</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark"
                >
                  + Buat QR Code
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {qrcodes.map((qr) => (
                  <div key={qr.id} className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${qr.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {qr.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                          {qr.scan_count > 0 && (
                            <span className="px-2 py-1 bg-wa-light text-wa-dark rounded-full text-xs font-medium">
                              {qr.scan_count} scan
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-lg text-gray-900">{qr.location_name || 'QR Code'}</h3>
                        <p className="text-sm text-gray-500">{qr.date}</p>
                        {qr.shift_name && <p className="text-xs text-wa-primary mt-1">{qr.shift_name}</p>}
                      </div>
                    </div>

                    {/* QR Code Image */}
                    <div className="flex justify-center mb-4 bg-gray-50 rounded-xl p-3">
                      <img
                        src={getQRCodeURL(qr.code)}
                        alt="QR Code"
                        className="w-40 h-40"
                      />
                    </div>

                    {/* Code Display */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-400 mb-1">Code:</p>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">{qr.code}</code>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t">
                      <button
                        onClick={() => handleToggleActive(qr)}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        {qr.is_active ? '⏸️ Nonaktif' : '▶️ Aktif'}
                      </button>
                      <button
                        onClick={() => handleViewLogs(qr)}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        📊 Logs
                      </button>
                      <button
                        onClick={() => handleDeleteQR(qr.id)}
                        className="px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'scanner' && (
          <div className="bg-white rounded-2xl border p-6">
            <h2 className="text-lg font-bold mb-4">📷 Cara Penggunaan QR Code</h2>
            <div className="space-y-4 text-sm text-gray-700">
              <div className="flex gap-3">
                <span className="text-2xl">1️⃣</span>
                <div>
                  <h3 className="font-bold">Generate QR Code</h3>
                  <p className="text-gray-600">Buat QR Code untuk lokasi/shift tertentu. QR Code akan berisi kode unik.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">2️⃣</span>
                <div>
                  <h3 className="font-bold">Tampilkan QR Code</h3>
                  <p className="text-gray-600">Cetak atau tampilkan QR Code di lokasi absensi (kantor, pabrik, dll).</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">3️⃣</span>
                <div>
                  <h3 className="font-bold">Scan QR Code</h3>
                  <p className="text-gray-600">Karyawan scan QR Code dengan kamera HP. Sistem akan mencatat waktu scan sebagai bukti absensi.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-2xl">4️⃣</span>
                <div>
                  <h3 className="font-bold">Otomatis</h3>
                  <p className="text-gray-600">Sistem otomatis mencatat check-in berdasarkan scan QR Code. Tidak perlu ketik manual!</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-wa-light rounded-xl">
                <h4 className="font-bold text-wa-dark mb-2">🔒 Keamanan</h4>
                <ul className="text-xs text-wa-dark space-y-1">
                  <li>• QR Code bersifat unik per company & tanggal</li>
                  <li>• Dapat di-set tanggal kedaluwarsa</li>
                  <li>• Setiap scan tercatat dengan IP & user agent</li>
                  <li>• Satu karyawan hanya bisa scan sekali per QR per hari</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Create QR Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">➕ Buat QR Code Baru</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>

              <form onSubmit={handleCreateQR} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tanggal</label>
                  <input
                    type="date"
                    value={qrForm.date}
                    onChange={e => setQRForm({ ...qrForm, date: e.target.value })}
                    className={IC}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Shift (Opsional)</label>
                  <select
                    value={qrForm.shift_id}
                    onChange={e => setQRForm({ ...qrForm, shift_id: e.target.value })}
                    className={IC}
                  >
                    <option value="">-- Tanpa Shift --</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)})</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Nama Lokasi</label>
                  <input
                    type="text"
                    value={qrForm.location_name}
                    onChange={e => setQRForm({ ...qrForm, location_name: e.target.value })}
                    className={IC}
                    placeholder="Contoh: Lobby Utama, Pintu Masuk Pabrik"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Kedaluwarsa (Opsional)</label>
                  <input
                    type="datetime-local"
                    value={qrForm.expires_at}
                    onChange={e => setQRForm({ ...qrForm, expires_at: e.target.value })}
                    className={IC}
                  />
                  <p className="text-xs text-gray-400 mt-1">Biarkan kosong jika tidak ingin kadaluarsa</p>
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
                    disabled={loading}
                    className="flex-1 bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark disabled:opacity-50"
                  >
                    {loading ? '⏳ Membuat...' : '➕ Buat QR'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Logs Modal */}
        {showLogs && selectedQR && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-lg font-bold">📊 Logs Scan - {selectedQR.location_name}</h2>
                <button onClick={() => setShowLogs(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    Belum ada scan
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">Waktu</th>
                          <th className="text-left px-4 py-3 font-medium">Karyawan</th>
                          <th className="text-left px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {logs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-600">
                              {new Date(log.scanned_at).toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{log.employee_name}</p>
                                <p className="text-xs text-gray-500">{log.employee_code || log.phone_number || '-'}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {log.success ? '✅ Sukses' : '❌ Gagal'}
                              </span>
                              {log.failure_reason && <p className="text-xs text-red-500 mt-1">{log.failure_reason}</p>}
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
  );
}
