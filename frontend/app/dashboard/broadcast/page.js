'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import DashboardHeader from '@/components/DashboardHeader';

export default function BroadcastPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  const [formData, setFormData] = useState({
    message: '',
    target: 'all',
    division_id: '',
    position_id: ''
  });

  const [divisions, setDivisions] = useState([]);
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [hist, stat, divs, poss] = await Promise.all([
        api.getBroadcastHistory(),
        api.getBroadcastStats(),
        api.getDivisions ? api.getDivisions() : api.get('/divisions'),
        api.getPositions ? api.getPositions() : api.get('/positions')
      ]);

      setHistory(hist.data || []);
      setStats(stat.data || null);
      setDivisions(divs.data || []);
      setPositions(poss.data || []);
    } catch (e) {
      if (e.message?.includes('Sesi') || e.message?.includes('401')) router.push('/login');
      else setMsg('❌ ' + (e.message || 'Gagal memuat data'));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setMsg('');

    try {
      if (!formData.message.trim()) {
        throw new Error('Pesan wajib diisi');
      }

      const result = await api.sendBroadcast({
        message: formData.message,
        target: formData.target,
        division_id: formData.division_id || null,
        position_id: formData.position_id || null
      });

      setMsg(`✅ ${result.message}`);

      // Reset form
      setFormData({ message: '', target: 'all', division_id: '', position_id: '' });
      loadData();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal mengirim broadcast'));
    } finally {
      setSending(false);
    }
  };

  const getTargetLabel = (item) => {
    switch (item.target_type) {
      case 'all': return 'Semua Karyawan';
      case 'division': return divisions.find(d => d.id === item.division_id)?.name || 'Divisi';
      case 'position': return positions.find(p => p.id === item.position_id)?.name || 'Jabatan';
      default: return 'Unknown';
    }
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
        title="📢 Broadcast WhatsApp"
        subtitle={stats ? `${stats.totalReached} pesan terkirim` : 'Kirim pesan ke karyawan'}
      />
      <div className="p-4 md:p-6 max-w-5xl mx-auto">

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
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border p-4">
              <p className="text-2xl font-bold text-wa-primary">{stats.totalBroadcasts}</p>
              <p className="text-xs text-gray-500">Total Broadcast</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-2xl font-bold text-wa-primary">{stats.totalReached}</p>
              <p className="text-xs text-gray-500">Pesan Terkirim</p>
            </div>
            <div className="bg-white rounded-xl border p-4">
              <p className="text-2xl font-bold">{history.length}</p>
              <p className="text-xs text-gray-500">Riwayat</p>
            </div>
          </div>
        )}

        {/* Broadcast Form */}
        <div className="bg-white rounded-2xl border p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            📤 Kirim Pesan Broadcast
          </h2>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Target Penerima</label>
              <div className="grid md:grid-cols-3 gap-3">
                <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${formData.target === 'all' ? 'bg-wa-light border-wa-primary' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="target" value="all" checked={formData.target === 'all'} onChange={() => setFormData({ ...formData, target: 'all' })} className="sr-only" />
                  <span className="text-sm font-medium">Semua Karyawan</span>
                </label>
                <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${formData.target === 'division' ? 'bg-wa-light border-wa-primary' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="target" value="division" checked={formData.target === 'division'} onChange={() => setFormData({ ...formData, target: 'division' })} className="sr-only" />
                  <span className="text-sm font-medium">Per Divisi</span>
                </label>
                <label className={`flex items-center gap-2 px-4 py-3 rounded-xl border cursor-pointer transition-colors ${formData.target === 'position' ? 'bg-wa-light border-wa-primary' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name="target" value="position" checked={formData.target === 'position'} onChange={() => setFormData({ ...formData, target: 'position' })} className="sr-only" />
                  <span className="text-sm font-medium">Per Jabatan</span>
                </label>
              </div>
            </div>

            {formData.target === 'division' && (
              <div>
                <label htmlFor="division_select" className="block text-sm font-medium mb-2">Pilih Divisi</label>
                <select id="division_select" value={formData.division_id} onChange={e => setFormData({ ...formData, division_id: e.target.value })} className={IC}>
                  <option value="">-- Pilih Divisi --</option>
                  {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            {formData.target === 'position' && (
              <div>
                <label htmlFor="position_select" className="block text-sm font-medium mb-2">Pilih Jabatan</label>
                <select id="position_select" value={formData.position_id} onChange={e => setFormData({ ...formData, position_id: e.target.value })} className={IC}>
                  <option value="">-- Pilih Jabatan --</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label htmlFor="broadcast_message" className="block text-sm font-medium mb-2">Pesan *</label>
              <textarea
                id="broadcast_message"
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                required
                placeholder="Masukkan pesan yang akan dikirim ke semua karyawan...&#10;&#10;Contoh:&#10;‼️ LIBUR NASIONAL&#10;&#10;Kantor akan libur pada tanggal 17 Agustus. Mohon semua karyawan untuk check-out tepat waktu.&#10;&#10;Terima kasih, Manajemen"
                className={IC}
              />
              <p className="text-xs text-gray-400 mt-1">Pesan akan dikirim via WhatsApp ke semua karyawan target</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={sending || !formData.message.trim()}
                className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark disabled:opacity-50 flex-1"
              >
                {sending ? '⏳ Mengirim...' : '📤 Kirim Broadcast'}
              </button>
            </div>
          </form>
        </div>

        {/* Broadcast History */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-bold">📋 Riwayat Broadcast</h3>
          </div>
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              Belum ada riwayat broadcast
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Waktu</th>
                    <th className="text-left px-4 py-3 font-medium">Target</th>
                    <th className="text-left px-4 py-3 font-medium">Pesan</th>
                    <th className="text-center px-4 py-3 font-medium">Dikirim</th>
                    <th className="text-center px-4 py-3 font-medium">Sukses</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(item.created_at).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-wa-light text-wa-dark rounded-full text-xs font-medium">
                          {getTargetLabel(item)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700 max-w-md truncate" title={item.message}>
                        {item.message}
                      </td>
                      <td className="px-4 py-3 text-center">{item.total_recipients}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.success_count > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.success_count}
                        </span>
                        <span className="text-gray-400 mx-1">/</span>
                        <span className="text-gray-500">{item.total_recipients}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
