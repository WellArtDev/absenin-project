'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import DashboardHeader from '@/components/DashboardHeader';

export default function OvertimePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const r = await api.getOvertime();
      setRecords(r.data || []);
    } catch (e) { setMsg('❌ ' + e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id, status) => {
    try {
      // Use approve/reject methods instead
      if (status === 'approved') {
        await api.approveOvertime(id);
      } else {
        await api.rejectOvertime(id, '');
      }
      setMsg(`✅ Lembur ${status === 'approved' ? 'disetujui' : 'ditolak'}!`);
      load();
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const filtered = filter === 'all' ? records : records.filter(r => r.status === filter);
  const badge = (s) => {
    const c = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${c[s] || 'bg-gray-100'}`}>{s}</span>;
  };

  if (loading) return <div className="p-6 flex justify-center"><div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <>
      <DashboardHeader
        title="🕐 Lembur"
        subtitle={`${records.length} catatan lembur`}
      />
      <div className="p-4 md:p-6">

      {msg && <div className={`px-4 py-3 rounded-xl text-sm mb-4 flex justify-between ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}><span>{msg}</span><button onClick={() => setMsg('')}>&times;</button></div>}

      <div className="flex gap-2 mb-4 flex-wrap">
        <label htmlFor="ot_filter" className="sr-only">Filter status</label>
        {[['all','Semua'],['pending','⏳ Pending'],['approved','✅ Approved'],['rejected','❌ Rejected']].map(([v,l]) => (
          <button key={v} id={v === 'all' ? 'ot_filter' : undefined} onClick={() => setFilter(v)} className={`px-4 py-2 rounded-xl text-sm font-medium ${filter === v ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{l}</button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Karyawan</th>
                <th className="text-left px-4 py-3 font-medium">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Durasi</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Tidak ada data</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.employee_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">{r.date?.split('T')[0]}</td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{r.duration_hours || 0}h</td>
                  <td className="px-4 py-3">{badge(r.status)}</td>
                  <td className="px-4 py-3 text-right">
                    {r.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(r.id, 'approved')} className="text-green-500 text-xs mr-2">✅</button>
                        <button onClick={() => handleApprove(r.id, 'rejected')} className="text-red-400 text-xs">❌</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
