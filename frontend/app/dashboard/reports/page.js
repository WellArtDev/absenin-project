'use client';
import { useState } from 'react';
import api from '@/lib/api';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [data, setData] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg(''); setData(null);
    try {
      const fd = new FormData(e.target);
      const params = {
        start_date: fd.get('report_start'),
        end_date: fd.get('report_end'),
        type: fd.get('report_type'),
      };
      const r = await api.get('/reports', params);
      setData(r.data || r);
      setMsg('✅ Laporan berhasil dibuat!');
    } catch (err) { setMsg('❌ ' + err.message); }
    finally { setLoading(false); }
  };

  const IC = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500";

  return (
    <>
      <DashboardHeader title="📊 Laporan" />
      <div className="p-4 md:p-6">

      {msg && <div className={`px-4 py-3 rounded-xl text-sm mb-4 ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{msg}</div>}

      <div className="bg-white rounded-2xl border p-6 mb-6">
        <h2 className="font-bold mb-4">📋 Generate Laporan</h2>
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="report_start" className="block text-sm font-medium mb-1">Tanggal Mulai</label>
              <input id="report_start" name="report_start" type="date" required className={IC} />
            </div>
            <div>
              <label htmlFor="report_end" className="block text-sm font-medium mb-1">Tanggal Akhir</label>
              <input id="report_end" name="report_end" type="date" required className={IC} />
            </div>
            <div>
              <label htmlFor="report_type" className="block text-sm font-medium mb-1">Jenis Laporan</label>
              <select id="report_type" name="report_type" className={IC}>
                <option value="attendance">Absensi</option>
                <option value="overtime">Lembur</option>
                <option value="leaves">Cuti</option>
                <option value="summary">Rekap</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={loading} className="bg-red-500 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">
            {loading ? '⏳ Memproses...' : '📊 Generate'}
          </button>
        </form>
      </div>

      {data && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="p-4 border-b bg-gray-50"><h3 className="font-bold">📋 Hasil Laporan</h3></div>
          <div className="p-4">
            {Array.isArray(data) && data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>{Object.keys(data[0]).map(k => <th key={k} className="text-left px-3 py-2 font-medium text-xs">{k}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 text-xs">{String(v ?? '-')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <pre className="text-xs bg-gray-50 p-4 rounded-xl overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
