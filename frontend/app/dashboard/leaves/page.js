'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export default function LeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const [lr, er] = await Promise.all([
        api.get('/leaves'),
        api.get('/employees').catch(() => ({ data: [] })),
      ]);
      setLeaves(lr.data || []);
      setEmployees(er.data || []);
    } catch (e) { setMsg('❌ ' + e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const fd = new FormData(e.target);
      const data = {
        employee_id: fd.get('leave_employee'),
        leave_type: fd.get('leave_type'),
        start_date: fd.get('leave_start'),
        end_date: fd.get('leave_end'),
        reason: fd.get('leave_reason'),
      };
      if (!data.employee_id || !data.start_date || !data.end_date) throw new Error('Lengkapi semua field');

      await api.post('/leaves', data);
      setMsg('✅ Pengajuan cuti berhasil!');
      setShowForm(false); load();
    } catch (err) { setMsg('❌ ' + err.message); }
    finally { setSaving(false); }
  };

  const handleApprove = async (id, status) => {
    try {
      await api.put(`/leaves/${id}`, { status });
      setMsg(`✅ Cuti ${status === 'approved' ? 'disetujui' : 'ditolak'}!`);
      load();
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const filtered = filter === 'all' ? leaves : leaves.filter(l => l.status === filter);
  const statusBadge = (s) => {
    const m = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };
    const l = { pending: '⏳ Pending', approved: '✅ Disetujui', rejected: '❌ Ditolak' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${m[s] || 'bg-gray-100'}`}>{l[s] || s}</span>;
  };

  const IC = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500";

  if (loading) return <div className="p-6 flex justify-center"><div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">📅 Cuti / Izin</h1>
          <p className="text-sm text-gray-500">{leaves.length} pengajuan</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-red-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-red-600">+ Ajukan Cuti</button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl text-sm mb-4 flex justify-between ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}><span>{msg}</span><button onClick={() => setMsg('')}>&times;</button></div>}

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[['all','Semua'],['pending','⏳ Pending'],['approved','✅ Disetujui'],['rejected','❌ Ditolak']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${filter === v ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{l}</button>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">📝 Ajukan Cuti</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="leave_employee" className="block text-sm font-medium mb-1">Karyawan *</label>
                <select id="leave_employee" name="leave_employee" required className={IC}>
                  <option value="">-- Pilih Karyawan --</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="leave_type" className="block text-sm font-medium mb-1">Jenis</label>
                <select id="leave_type" name="leave_type" className={IC}>
                  <option value="annual">Cuti Tahunan</option>
                  <option value="sick">Sakit</option>
                  <option value="personal">Keperluan Pribadi</option>
                  <option value="maternity">Cuti Melahirkan</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="leave_start" className="block text-sm font-medium mb-1">Mulai *</label>
                  <input id="leave_start" name="leave_start" type="date" required className={IC} />
                </div>
                <div>
                  <label htmlFor="leave_end" className="block text-sm font-medium mb-1">Selesai *</label>
                  <input id="leave_end" name="leave_end" type="date" required className={IC} />
                </div>
              </div>
              <div>
                <label htmlFor="leave_reason" className="block text-sm font-medium mb-1">Alasan</label>
                <textarea id="leave_reason" name="leave_reason" rows={3} placeholder="Alasan cuti..." className={IC} />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="bg-red-500 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50 flex-1">{saving ? '⏳...' : '📤 Ajukan'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl text-sm">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Karyawan</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Jenis</th>
                <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{l.employee_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell capitalize">{l.leave_type || '-'}</td>
                  <td className="px-4 py-3 text-xs">{l.start_date?.split('T')[0]} → {l.end_date?.split('T')[0]}</td>
                  <td className="px-4 py-3">{statusBadge(l.status)}</td>
                  <td className="px-4 py-3 text-right">
                    {l.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(l.id, 'approved')} className="text-green-500 hover:text-green-700 text-xs mr-2">✅</button>
                        <button onClick={() => handleApprove(l.id, 'rejected')} className="text-red-400 hover:text-red-600 text-xs">❌</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
