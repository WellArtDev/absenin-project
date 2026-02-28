'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState('');
  const [settings, setSettings] = useState(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const r = await api.getSettings();
      setSettings(r.data);
    } catch (e) {
      if (e.message?.includes('Sesi') || e.message?.includes('401')) router.push('/login');
      else setMsg('❌ ' + (e.message || 'Gagal memuat'));
    } finally { setLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const fd = new FormData(e.target);
      const d = {};
      d.work_start = fd.get('work_start') || '08:00';
      d.work_end = fd.get('work_end') || '17:00';
      d.late_tolerance_minutes = parseInt(fd.get('late_tolerance_minutes')) || 15;
      d.overtime_min_minutes = parseInt(fd.get('overtime_min_minutes')) || 30;
      d.overtime_max_hours = parseInt(fd.get('overtime_max_hours')) || 4;
      d.office_latitude = fd.get('office_latitude') || '';
      d.office_longitude = fd.get('office_longitude') || '';
      d.office_address = fd.get('office_address') || '';
      d.allowed_radius_meters = parseInt(fd.get('allowed_radius_meters')) || 500;
      d.wa_api_url = fd.get('wa_api_url') || '';
      d.wa_device_number = fd.get('wa_device_number') || '';
      const tok = fd.get('wa_api_token') || '';
      if (tok && !tok.includes('*')) d.wa_api_token = tok;
      d.require_selfie = fd.has('require_selfie');
      d.require_location = fd.has('require_location');
      d.radius_lock_enabled = fd.has('radius_lock_enabled');
      d.overtime_enabled = fd.has('overtime_enabled');

      await api.updateSettings(d);
      setMsg('✅ Pengaturan berhasil disimpan!');
      setTimeout(load, 500);
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal menyimpan'));
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    setMsg('');
    try {
      const r = await api.testWA();
      setMsg('✅ ' + (r.message || 'Pesan test terkirim!'));
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal kirim test'));
    } finally { setTesting(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordSaving(true);
    setMsg('');
    try {
      const fd = new FormData(e.target);
      const currentPassword = fd.get('current_password');
      const newPassword = fd.get('new_password');
      const confirmPassword = fd.get('confirm_password');

      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error('Semua field password wajib diisi');
      }

      if (newPassword.length < 6) {
        throw new Error('Password baru minimal 6 karakter');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Password baru dan konfirmasi tidak cocok');
      }

      await api.changePassword(currentPassword, newPassword);
      setMsg('✅ Password berhasil diubah!');
      setShowPasswordForm(false);
      e.target.reset();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal mengubah password'));
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          Gagal memuat pengaturan.
          <button onClick={load} className="underline ml-2">Coba lagi</button>
        </div>
      </div>
    );
  }

  const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white";

  return (
    <>
      <DashboardHeader
        title="⚙️ Pengaturan"
        subtitle={`${settings.company_name} — ${settings.plan}`}
      />
      <div className="p-4 md:p-6 max-w-4xl mx-auto">

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm mb-6 flex items-center justify-between ${
          msg.startsWith('✅')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="ml-2 opacity-50 hover:opacity-100 text-lg">&times;</button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">

        {/* ===== JAM KERJA ===== */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-bold mb-4">⏰ Jam Kerja</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="work_start" className="block text-sm font-medium mb-2">Jam Masuk</label>
              <input id="work_start" name="work_start" type="time" defaultValue={settings.work_start || '08:00'} className={inputCls} />
            </div>
            <div>
              <label htmlFor="work_end" className="block text-sm font-medium mb-2">Jam Pulang</label>
              <input id="work_end" name="work_end" type="time" defaultValue={settings.work_end || '17:00'} className={inputCls} />
            </div>
            <div>
              <label htmlFor="late_tolerance_minutes" className="block text-sm font-medium mb-2">Toleransi Telat (menit)</label>
              <input id="late_tolerance_minutes" name="late_tolerance_minutes" type="number" min="0" max="120" defaultValue={settings.late_tolerance_minutes || 15} className={inputCls} />
            </div>
          </div>
        </div>

        {/* ===== FITUR ===== */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-bold mb-4">📋 Fitur</h2>
          <div className="space-y-3">
            {[
              { id: 'require_selfie', checked: settings.require_selfie, icon: '📸', label: 'Wajib Foto Selfie', desc: 'Karyawan harus foto saat absen' },
              { id: 'require_location', checked: settings.require_location, icon: '📍', label: 'Wajib Lokasi GPS', desc: 'Lokasi direkam saat absen' },
              { id: 'radius_lock_enabled', checked: settings.radius_lock_enabled, icon: '🔒', label: 'Radius Lock', desc: 'Absen hanya dari area kantor' },
              { id: 'overtime_enabled', checked: settings.overtime_enabled, icon: '🕐', label: 'Deteksi Lembur Otomatis', desc: 'Otomatis catat jika pulang lewat jam kerja' },
            ].map(f => (
              <label key={f.id} htmlFor={f.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  id={f.id}
                  name={f.id}
                  defaultChecked={f.checked}
                  className="w-5 h-5 text-red-500 rounded border-gray-300 cursor-pointer focus:ring-red-500"
                />
                <div>
                  <p className="text-sm font-medium">{f.icon} {f.label}</p>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ===== LEMBUR ===== */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-bold mb-4">🕐 Pengaturan Lembur</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="overtime_min_minutes" className="block text-sm font-medium mb-2">Minimal Lembur (menit)</label>
              <input id="overtime_min_minutes" name="overtime_min_minutes" type="number" min="0" defaultValue={settings.overtime_min_minutes || 30} className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Pulang lebih dari ini = lembur</p>
            </div>
            <div>
              <label htmlFor="overtime_max_hours" className="block text-sm font-medium mb-2">Maksimal Lembur (jam)</label>
              <input id="overtime_max_hours" name="overtime_max_hours" type="number" min="1" max="12" defaultValue={settings.overtime_max_hours || 4} className={inputCls} />
            </div>
          </div>
        </div>

        {/* ===== LOKASI KANTOR ===== */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-bold mb-4">📍 Lokasi Kantor</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="office_latitude" className="block text-sm font-medium mb-2">Latitude</label>
              <input id="office_latitude" name="office_latitude" type="text" inputMode="decimal" defaultValue={settings.office_latitude || ''} placeholder="-6.2088" className={inputCls} />
            </div>
            <div>
              <label htmlFor="office_longitude" className="block text-sm font-medium mb-2">Longitude</label>
              <input id="office_longitude" name="office_longitude" type="text" inputMode="decimal" defaultValue={settings.office_longitude || ''} placeholder="106.8456" className={inputCls} />
            </div>
            <div>
              <label htmlFor="allowed_radius_meters" className="block text-sm font-medium mb-2">Radius (meter)</label>
              <input id="allowed_radius_meters" name="allowed_radius_meters" type="number" min="50" max="10000" defaultValue={settings.allowed_radius_meters || 500} className={inputCls} />
            </div>
          </div>
          <div className="mt-4">
            <label htmlFor="office_address" className="block text-sm font-medium mb-2">Alamat Kantor</label>
            <textarea id="office_address" name="office_address" defaultValue={settings.office_address || ''} rows={2} placeholder="Jl. Contoh No. 123, Jakarta" className={inputCls} />
          </div>
          <p className="text-xs text-gray-400 mt-2">💡 Buka Google Maps → klik kanan lokasi kantor → copy koordinat</p>
        </div>

        {/* ===== WHATSAPP ===== */}
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-bold mb-2">💬 WhatsApp Notification</h2>
          <p className="text-sm text-gray-500 mb-4">Kirim notifikasi otomatis saat karyawan absen masuk/pulang via Fonnte</p>

          <div className="space-y-4">
            <div>
              <label htmlFor="wa_api_url" className="block text-sm font-medium mb-2">API URL</label>
              <input id="wa_api_url" name="wa_api_url" type="url" defaultValue={settings.wa_api_url || ''} placeholder="https://api.fonnte.com/send" className={inputCls} />
            </div>
            <div>
              <label htmlFor="wa_api_token" className="block text-sm font-medium mb-2">
                API Token {settings.has_wa_token && <span className="text-green-600 text-xs ml-1">✅ Tersimpan</span>}
              </label>
              <input
                id="wa_api_token"
                name="wa_api_token"
                type="text"
                autoComplete="off"
                defaultValue={settings.has_wa_token ? settings.wa_api_token : ''}
                placeholder={settings.has_wa_token ? 'Kosongkan jika tidak ingin ganti' : 'Paste token dari fonnte.com'}
                className={inputCls}
              />
              <p className="text-xs text-gray-400 mt-1">
                {settings.has_wa_token ? '💡 Kosongkan = tetap pakai token lama' : '💡 Daftar di fonnte.com → Dashboard → Copy Token'}
              </p>
            </div>
            <div>
              <label htmlFor="wa_device_number" className="block text-sm font-medium mb-2">Nomor Device WhatsApp</label>
              <input id="wa_device_number" name="wa_device_number" type="tel" defaultValue={settings.wa_device_number || ''} placeholder="628123456789" className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Format: 628xxx (tanpa + atau 0 di depan)</p>
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-700 font-semibold mb-2">📌 Cara Setup:</p>
            <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
              <li>Daftar di <strong>fonnte.com</strong> → Connect WhatsApp</li>
              <li>Copy Token dari Dashboard Fonnte</li>
              <li>Isi URL: <code className="bg-blue-100 px-1 rounded">https://api.fonnte.com/send</code></li>
              <li>Isi Token dan Nomor Device di atas</li>
              <li>Klik <strong>💾 Simpan Pengaturan</strong> dulu</li>
              <li>Lalu klik <strong>📤 Test Kirim WA</strong></li>
            </ol>
          </div>

          {/* Webhook info */}
          <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-700 font-semibold mb-2">📥 Untuk Auto-Reply WA (opsional):</p>
            <p className="text-xs text-amber-600 mb-1">Set Webhook URL di Dashboard Fonnte:</p>
            <code className="text-xs bg-amber-100 px-2 py-1 rounded block break-all">
              {typeof window !== 'undefined' ? window.location.origin.replace(':3000', ':3001') : 'https://yourdomain.com'}/api/webhook/fonnte
            </code>
            <p className="text-xs text-amber-500 mt-1">Karyawan bisa ketik &quot;status&quot; untuk cek absensi via WA</p>
          </div>

          {/* Test button */}
          <div className="mt-4">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing}
              className="bg-green-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 transition-colors"
            >
              {testing ? '⏳ Mengirim...' : '📤 Test Kirim WA'}
            </button>
          </div>
        </div>

        {/* ===== PASSWORD ===== */}
        <div className="bg-white rounded-2xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">🔑 Ganti Password</h2>
            {!showPasswordForm && (
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="text-sm text-red-500 hover:text-red-600 font-medium"
              >
                Ubah Password
              </button>
            )}
          </div>

          {!showPasswordForm ? (
            <p className="text-sm text-gray-500">Klik tombol "Ubah Password" untuk mengubah password akun Anda.</p>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label htmlFor="current_password" className="block text-sm font-medium mb-2">Password Saat Ini *</label>
                <input
                  id="current_password"
                  name="current_password"
                  type="password"
                  required
                  className={inputCls}
                  placeholder="Masukkan password saat ini"
                />
              </div>
              <div>
                <label htmlFor="new_password" className="block text-sm font-medium mb-2">Password Baru *</label>
                <input
                  id="new_password"
                  name="new_password"
                  type="password"
                  required
                  minLength={6}
                  className={inputCls}
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <div>
                <label htmlFor="confirm_password" className="block text-sm font-medium mb-2">Konfirmasi Password Baru *</label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  required
                  minLength={6}
                  className={inputCls}
                  placeholder="Ulangi password baru"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="bg-red-500 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50"
                >
                  {passwordSaving ? '⏳ Menyimpan...' : '💾 Simpan Password'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPasswordForm(false); setMsg(''); }}
                  className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-200"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ===== SAVE BUTTON ===== */}
        <div className="sticky bottom-4 bg-white/90 backdrop-blur-sm rounded-2xl border p-4 flex gap-3 shadow-lg z-10">
          <button
            type="submit"
            disabled={saving}
            className="bg-red-500 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50 transition-colors flex-1 md:flex-none"
          >
            {saving ? '⏳ Menyimpan...' : '💾 Simpan Pengaturan'}
          </button>
          <button
            type="button"
            onClick={() => { load(); setMsg(''); }}
            className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
          >
            🔄 Reset
          </button>
        </div>
      </form>
    </div>
    </>
  );
}
