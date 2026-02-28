'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [settings, setSettings] = useState(null);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    manager_name: '',
    manager_phone: '',
    late: true,
    absent: true,
    leave: true,
    overtime: true
  });

  const [testMessage, setTestMessage] = useState('Ini adalah pesan test notifikasi');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, logsData, statsData] = await Promise.all([
        api.getNotificationSettings(),
        api.getNotificationLogs({ limit: 20 }),
        api.getNotificationStats()
      ]);

      setSettings(settingsData.data);
      setLogs(logsData.data || []);
      setStats(statsData.data);

      // Pre-fill form
      if (settingsData.data) {
        setForm({
          manager_name: settingsData.data.manager_name || '',
          manager_phone: settingsData.data.manager_phone || '',
          late: settingsData.data.notification_settings?.late !== false,
          absent: settingsData.data.notification_settings?.absent !== false,
          leave: settingsData.data.notification_settings?.leave !== false,
          overtime: settingsData.data.notification_settings?.overtime !== false
        });
      }
    } catch (e) {
      if (e.message?.includes('Sesi') || e.message?.includes('401')) router.push('/login');
      else setMsg('❌ ' + (e.message || 'Gagal memuat data'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    try {
      await api.updateNotificationSettings(form);
      setMsg('✅ Pengaturan notifikasi berhasil disimpan');
      loadData();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal menyimpan pengaturan'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    setMsg('');

    try {
      await api.testNotification(testMessage);
      setMsg('✅ Test notifikasi berhasil dikirim ke WhatsApp manager');
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal mengirim test notifikasi'));
    } finally {
      setTesting(false);
    }
  };

  const getEventTypeLabel = (type) => {
    const labels = {
      late: '⏰ Terlambat',
      absent: '❌ Tidak Hadir',
      leave: '🏖️ Pengajuan Cuti',
      overtime: '🕐 Pengajuan Lembur',
      overtime_approved: '✅ Lembur Disetujui'
    };
    return labels[type] || type;
  };

  if (loading) {
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
        title="🔔 Notifikasi Manager"
        subtitle="Kirim notifikasi otomatis ke manager via WhatsApp"
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

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-2xl font-bold text-wa-primary">{stats.total_sent || 0}</p>
              <p className="text-xs text-gray-500">Total Terkirim (30 hari)</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-2xl font-bold text-green-600">{stats.successful || 0}</p>
              <p className="text-xs text-gray-500">Sukses</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-2xl font-bold text-red-600">{stats.failed || 0}</p>
              <p className="text-xs text-gray-500">Gagal</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-sm font-bold text-gray-900">
                {stats.last_sent_at ? new Date(stats.last_sent_at).toLocaleDateString('id-ID') : '-'}
              </p>
              <p className="text-xs text-gray-500">Terakhir Dikirim</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Settings Form */}
          <div className="bg-white rounded-2xl border p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              ⚙️ Pengaturan Notifikasi
            </h2>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nama Manager</label>
                <input
                  type="text"
                  value={form.manager_name}
                  onChange={e => setForm({ ...form, manager_name: e.target.value })}
                  className={IC}
                  placeholder="Contoh: Budi Santoso"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">WhatsApp Manager *</label>
                <input
                  type="text"
                  value={form.manager_phone}
                  onChange={e => setForm({ ...form, manager_phone: e.target.value })}
                  className={IC}
                  placeholder="Contoh: 628123456789"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Gunakan format 628... (tanpa + atau 0)</p>
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-bold text-gray-700 mb-3">Notifikasi yang Aktif:</h3>

                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">⏰ Karyawan Terlambat</span>
                    <input
                      type="checkbox"
                      checked={form.late}
                      onChange={e => setForm({ ...form, late: e.target.checked })}
                      className="w-5 h-5 rounded text-wa-primary focus:ring-wa-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">❌ Karyawan Tidak Hadir (Alpha)</span>
                    <input
                      type="checkbox"
                      checked={form.absent}
                      onChange={e => setForm({ ...form, absent: e.target.checked })}
                      className="w-5 h-5 rounded text-wa-primary focus:ring-wa-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">🏖️ Pengajuan Cuti/Izin</span>
                    <input
                      type="checkbox"
                      checked={form.leave}
                      onChange={e => setForm({ ...form, leave: e.target.checked })}
                      className="w-5 h-5 rounded text-wa-primary focus:ring-wa-primary"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm">🕐 Pengajuan Lembur</span>
                    <input
                      type="checkbox"
                      checked={form.overtime}
                      onChange={e => setForm({ ...form, overtime: e.target.checked })}
                      className="w-5 h-5 rounded text-wa-primary focus:ring-wa-primary"
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark disabled:opacity-50"
                >
                  {saving ? '⏳ Menyimpan...' : '💾 Simpan Pengaturan'}
                </button>
              </div>
            </form>
          </div>

          {/* Test Notification & Logs */}
          <div className="space-y-6">
            {/* Test Notification */}
            <div className="bg-wa-light rounded-2xl border border-wa-primary p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                🧪 Test Notifikasi
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Pesan Test</label>
                  <textarea
                    value={testMessage}
                    onChange={e => setTestMessage(e.target.value)}
                    className={IC}
                    rows={3}
                    placeholder="Masukkan pesan untuk dikirim ke WhatsApp manager..."
                  />
                </div>

                <button
                  onClick={handleTestNotification}
                  disabled={testing || !form.manager_phone}
                  className="w-full bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testing ? '⏳ Mengirim...' : '📤 Kirim Test Notifikasi'}
                </button>

                {!form.manager_phone && (
                  <p className="text-xs text-red-600">⚠️ Masukkan nomor WhatsApp manager dulu</p>
                )}
              </div>
            </div>

            {/* Notification Logs */}
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="font-bold">📋 Riwayat Notifikasi</h3>
              </div>

              {logs.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  Belum ada riwayat notifikasi
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 border-b hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-gray-500">
                          {new Date(log.sent_at).toLocaleString('id-ID')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {log.success ? '✅ Sukses' : '❌ Gagal'}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{getEventTypeLabel(log.event_type)}</p>
                      <p className="text-xs text-gray-600 mt-1">{log.employee_name}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate" title={log.message}>{log.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
