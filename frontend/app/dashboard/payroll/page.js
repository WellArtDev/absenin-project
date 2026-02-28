'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function PayrollPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState('calculate'); // 'calculate', 'history', 'settings'

  const [settings, setSettings] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [records, setRecords] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);

  const [filter, setFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const months = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    loadSettings();
    loadPeriods();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getPayrollSettings();
      setSettings(data.data);
    } catch (e) {
      if (e.message?.includes('Sesi') || e.message?.includes('401')) router.push('/login');
    }
  };

  const loadPeriods = async () => {
    try {
      const data = await api.getPayrollPeriods();
      setPeriods(data.data || []);
    } catch (e) {
      console.error('Failed to load periods:', e);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      const formData = new FormData(e.target);
      const data = {
        overtime_rate_per_hour: parseFloat(formData.get('overtime_rate')),
        late_deduction_per_minute: parseFloat(formData.get('late_rate')),
        absent_deduction_per_day: parseFloat(formData.get('absent_rate')),
        cutoff_day: parseInt(formData.get('cutoff_day'))
      };

      await api.updatePayrollSettings(data);
      setMsg('✅ Pengaturan payroll berhasil disimpan');
      loadSettings();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal menyimpan pengaturan'));
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePayroll = async () => {
    setMsg('');
    setLoading(true);
    setRecords([]);

    try {
      const result = await api.calculatePayroll(filter.month, filter.year);
      setSelectedPeriod(result.data.period);
      setRecords(result.data.records);
      setMsg(`✅ Payroll berhasil dihitung: ${result.data.records.length} karyawan, Total: Rp${result.data.total_amount.toLocaleString('id-ID')}`);
      setActiveTab('history');
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal menghitung payroll'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewRecords = async (periodId) => {
    setMsg('');
    setLoading(true);

    try {
      const data = await api.getPayrollRecords(periodId);
      setRecords(data.data || []);
      setSelectedPeriod(periods.find(p => p.id === periodId));
      setActiveTab('history');
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal memuat data'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRecord = async (recordId) => {
    const allowance = prompt('Masukkan tunjangan (angka):');
    if (!allowance) return;

    setMsg('');
    try {
      await api.updatePayrollRecord(recordId, { allowance });
      setMsg('✅ Record berhasil diupdate');
      // Reload records
      if (selectedPeriod) {
        await handleViewRecords(selectedPeriod.id);
      }
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal update record'));
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const IC = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-wa-primary/20 focus:border-wa-primary bg-white";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💰 Payroll</h1>
          <p className="text-sm text-gray-500 mt-1">Hitung gaji karyawan dengan otomatis</p>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm flex justify-between ${
          msg.startsWith('✅')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="ml-2 opacity-50 hover:opacity-100 text-lg">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl border p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('calculate')}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'calculate'
                ? 'bg-gradient-to-r from-wa-primary to-wa-dark text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🧮 Hitung Payroll
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-wa-primary to-wa-dark text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            📊 Riwayat Payroll
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-wa-primary to-wa-dark text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            ⚙️ Pengaturan
          </button>
        </div>
      </div>

      {activeTab === 'calculate' && (
        <>
          {/* Period Selection */}
          <div className="bg-white rounded-2xl border p-6">
            <h2 className="text-lg font-bold mb-4">Pilih Periode Payroll</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Bulan</label>
                <select
                  value={filter.month}
                  onChange={e => setFilter({ ...filter, month: parseInt(e.target.value) })}
                  className={IC}
                >
                  {months.slice(1).map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tahun</label>
                <select
                  value={filter.year}
                  onChange={e => setFilter({ ...filter, year: parseInt(e.target.value) })}
                  className={IC}
                >
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleCalculatePayroll}
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-wa-primary to-wa-dark text-white px-6 py-4 rounded-xl text-sm font-bold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? '⏳ Menghitung...' : '🧮 Hitung Payroll'}
            </button>
          </div>

          {/* Summary Cards */}
          {records.length > 0 && selectedPeriod && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-wa-primary to-wa-dark rounded-2xl border p-6 text-white">
                <p className="text-3xl font-bold">{records.length}</p>
                <p className="text-sm opacity-90">Total Karyawan</p>
              </div>
              <div className="bg-white rounded-2xl border p-6">
                <p className="text-2xl font-bold text-gray-900">
                  {records.reduce((sum, r) => sum + parseFloat(r.net_salary), 0).toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-gray-500">Total Gaji</p>
              </div>
              <div className="bg-white rounded-2xl border p-6">
                <p className="text-2xl font-bold text-wa-primary">
                  {records.reduce((sum, r) => sum + parseFloat(r.overtime_pay), 0).toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-gray-500">Total Lembur</p>
              </div>
              <div className="bg-white rounded-2xl border p-6">
                <p className="text-2xl font-bold text-red-600">
                  {records.reduce((sum, r) => sum + parseFloat(r.total_deductions), 0).toLocaleString('id-ID')}
                </p>
                <p className="text-sm text-gray-500">Total Potongan</p>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <>
          {/* Periods List */}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold">📊 Periode Payroll</h2>
            </div>

            {periods.length === 0 ? (
              <div className="p-12 text-center text-gray-400">Belum ada periode payroll</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Periode</th>
                      <th className="text-center px-4 py-3 font-medium">Status</th>
                      <th className="text-center px-4 py-3 font-medium">Karyawan</th>
                      <th className="text-right px-4 py-3 font-medium">Total Gaji</th>
                      <th className="text-center px-4 py-3 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {periods.map((period) => (
                      <tr key={period.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{months[period.month]} {period.year}</p>
                            <p className="text-xs text-gray-500">{period.start_date} s/d {period.end_date}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            period.status === 'paid' ? 'bg-green-100 text-green-700' :
                            period.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                            period.status === 'calculated' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {period.status === 'draft' ? 'Draft' : period.status === 'calculated' ? 'Dihitung' : period.status === 'approved' ? 'Disetujui' : 'Dibayar'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{period.employee_count || 0}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {period.total_amount ? formatCurrency(period.total_amount) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleViewRecords(period.id)}
                            className="text-wa-primary hover:underline text-xs font-medium"
                          >
                            Lihat Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payroll Records */}
          {records.length > 0 && selectedPeriod && (
            <>
              <div className="flex justify-between items-center mt-6">
                <h2 className="text-lg font-bold">
                  Detail Payroll: {months[selectedPeriod.month]} {selectedPeriod.year}
                </h2>
                <button className="bg-wa-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-wa-dark">
                  📥 Export CSV
                </button>
              </div>

              <div className="bg-white rounded-2xl border overflow-hidden mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium">Karyawan</th>
                        <th className="text-right px-4 py-3 font-medium">Gaji Pokok</th>
                        <th className="text-right px-4 py-3 font-medium">Lembur</th>
                        <th className="text-right px-4 py-3 font-medium">Tunjangan</th>
                        <th className="text-right px-4 py-3 font-medium text-red-600">Potongan</th>
                        <th className="text-right px-4 py-3 font-medium">Gaji Bersih</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {records.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{record.employee_name}</p>
                              <p className="text-xs text-gray-500">{record.employee_code || '-'}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">{formatCurrency(record.base_salary)}</td>
                          <td className="px-4 py-3 text-right text-wa-dark">{formatCurrency(record.overtime_pay)}</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(record.allowance)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCurrency(record.total_deductions)}</td>
                          <td className="px-4 py-3 text-right font-bold text-wa-primary">{formatCurrency(record.net_salary)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {activeTab === 'settings' && settings && (
        <div className="bg-white rounded-2xl border p-6">
          <h2 className="text-lg font-bold mb-6">⚙️ Pengaturan Payroll</h2>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="overtime_rate" className="block text-sm font-medium mb-2">Tarif Lembur per Jam</label>
                <input
                  id="overtime_rate"
                  name="overtime_rate"
                  type="number"
                  step="0.01"
                  defaultValue={settings.overtime_rate_per_hour || 0}
                  className={IC}
                  placeholder="Contoh: 25000"
                />
                <p className="text-xs text-gray-400 mt-1">Dalam Rupiah</p>
              </div>

              <div>
                <label htmlFor="cutoff_day" className="block text-sm font-medium mb-2">Tanggal Cutoff Gaji</label>
                <select
                  id="cutoff_day"
                  name="cutoff_day"
                  defaultValue={settings.cutoff_day || 25}
                  className={IC}
                >
                  {Array.from({ length: 28 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">Periode payroll dari tanggal 1 sampai tanggal ini</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="late_rate" className="block text-sm font-medium mb-2">Potongan Terlambat per Menit</label>
                <input
                  id="late_rate"
                  name="late_rate"
                  type="number"
                  step="0.01"
                  defaultValue={settings.late_deduction_per_minute || 0}
                  className={IC}
                  placeholder="Contoh: 500"
                />
                <p className="text-xs text-gray-400 mt-1">Dalam Rupiah</p>
              </div>

              <div>
                <label htmlFor="absent_rate" className="block text-sm font-medium mb-2">Potongan Alpha per Hari</label>
                <input
                  id="absent_rate"
                  name="absent_rate"
                  type="number"
                  step="0.01"
                  defaultValue={settings.absent_deduction_per_day || 0}
                  className={IC}
                  placeholder="Contoh: 100000"
                />
                <p className="text-xs text-gray-400 mt-1">Dalam Rupiah</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-blue-900 mb-2">💡 Cara Kerja Payroll</h3>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li>Pilih periode (bulan & tahun)</li>
                <li>Klik "Hitung Payroll" untuk menghitung semua gaji karyawan</li>
li>System otomatis menghitung berdasarkan: gaji pokok + lembur - potongan terlambat/alpha</li>
                <li>Review dan edit jika diperlukan</li>
                <li>Export untuk pembayaran</li>
              </ol>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-wa-primary text-white px-8 py-4 rounded-xl text-sm font-bold hover:bg-wa-dark disabled:opacity-50"
            >
              {loading ? '⏳ Menyimpan...' : '💾 Simpan Pengaturan'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
