'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export default function AttendancePage() {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [empFilter, setEmpFilter] = useState('');

  const load = useCallback(async () => {
    try {
      const [ar, er] = await Promise.all([
        api.get(`/analytics/attendance?date=${dateFilter}${empFilter ? `&employee_id=${empFilter}` : ''}`).catch(() => api.get('/analytics')),
        api.get('/employees').catch(() => ({ data: [] })),
      ]);
      setRecords(ar.data?.attendance || ar.data || []);
      setEmployees(er.data || []);
    } catch (e) { setMsg('❌ ' + e.message); }
    finally { setLoading(false); }
  }, [dateFilter, empFilter]);

  useEffect(() => { load(); }, [load]);

  const badge = (s) => {
    const m = { present: 'bg-green-100 text-green-700', late: 'bg-yellow-100 text-yellow-700', absent: 'bg-red-100 text-red-700', leave: 'bg-blue-100 text-blue-700' };
    const l = { present: '✅ Hadir', late: '⚠️ Telat', absent: '❌ Absen', leave: '📅 Cuti' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${m[s] || 'bg-gray-100'}`}>{l[s] || s}</span>;
  };

  const IC = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500";

  if (loading) return <div className="p-6 flex justify-center"><div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">📋 Data Absensi</h1>

      {msg && <div className={`px-4 py-3 rounded-xl text-sm mb-4 ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <label htmlFor="att_date" className="block text-sm font-medium mb-1">Tanggal</label>
          <input id="att_date" name="att_date" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className={IC} />
        </div>
        <div className="flex-1">
          <label htmlFor="att_employee" className="block text-sm font-medium mb-1">Karyawan</label>
          <select id="att_employee" name="att_employee" value={empFilter} onChange={e => setEmpFilter(e.target.value)} className={IC}>
            <option value="">Semua Karyawan</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Karyawan</th>
                <th className="text-left px-4 py-3 font-medium">Masuk</th>
                <th className="text-left px-4 py-3 font-medium">Pulang</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Durasi</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Tidak ada data absensi</td></tr>
              ) : records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.employee_name || r.name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.check_in ? new Date(r.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.check_out ? new Date(r.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{r.work_hours ? `${r.work_hours}h` : '-'}</td>
                  <td className="px-4 py-3">{badge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
