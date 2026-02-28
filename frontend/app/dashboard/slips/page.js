'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import DashboardHeader from '@/components/DashboardHeader';

export default function SlipsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState('individual'); // 'individual' or 'report'

  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [slipData, setSlipData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  const months = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    loadEmployees();
  }, [filters.month, filters.year]);

  const loadEmployees = async () => {
    try {
      const data = await api.getSlipEmployees(filters.month, filters.year);
      setEmployees(data.data || []);
    } catch (e) {
      if (e.message?.includes('Sesi') || e.message?.includes('401')) router.push('/login');
      else setMsg('❌ ' + (e.message || 'Gagal memuat data'));
    } finally {
      setLoading(false);
    }
  };

  const loadSlipData = async (employeeId) => {
    setGenerating(true);
    setMsg('');

    try {
      const data = await api.getEmployeeSlip(employeeId, filters.month, filters.year);
      setSlipData(data.data);
      setShowPreview(true);
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal memuat slip'));
    } finally {
      setGenerating(false);
    }
  };

  const handleViewSlip = (employee) => {
    setSelectedEmployee(employee);
    loadSlipData(employee.id);
  };

  const handleDownloadPDF = () => {
    if (!slipData) return;

    // Create simple HTML-based PDF print
    const printWindow = window.open('', '_blank');
    printWindow.document.write(generateSlipHTML());
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const generateSlipHTML = () => {
    if (!slipData) return '';

    const { company, employee, attendances, stats, overtime, period } = slipData;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Slip Absensi - ${employee.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; color: #333; }
    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #25D366; padding-bottom: 20px; }
    .header h1 { margin: 0; color: #25D366; font-size: 24px; }
    .header p { margin: 5px 0; color: #666; }
    .section { margin-bottom: 25px; }
    .section-title { font-weight: bold; font-size: 14px; margin-bottom: 10px; color: #25D366; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
    .info-grid { display: grid; grid-template-columns: 150px 1fr; gap: 5px; margin-bottom: 15px; }
    .info-label { font-weight: bold; color: #555; }
    .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
    .stat-box { border: 1px solid #ddd; padding: 10px; text-align: center; border-radius: 5px; }
    .stat-value { font-size: 20px; font-weight: bold; color: #25D366; }
    .stat-label { font-size: 10px; color: #666; margin-top: 5px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
    th { background: #f5f5f5; font-weight: bold; }
    .status-hadir { color: #25D366; font-weight: bold; }
    .status-terlambat { color: #f59e0b; font-weight: bold; }
    .status-izin { color: #8b5cf6; font-weight: bold; }
    .status-sakit { color: #f97316; font-weight: bold; }
    .status-alpha { color: #ef4444; font-weight: bold; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 10px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${company.name || 'Absenin'}</h1>
    <p>${company.address || ''}</p>
    <p>${company.phone || ''}</p>
    <h2 style="margin: 20px 0 10px 0;">SLIP ABSENSI</h2>
    <p>Periode: ${period.month} ${period.year}</p>
  </div>

  <div class="section">
    <div class="section-title">👤 Informasi Karyawan</div>
    <div class="info-grid">
      <div class="info-label">Nama:</div>
      <div>${employee.name}</div>

      <div class="info-label">Employee ID:</div>
      <div>${employee.employee_id || '-'}</div>

      <div class="info-label">Divisi:</div>
      <div>${employee.division_name || '-'}</div>

      <div class="info-label">Jabatan:</div>
      <div>${employee.position_name || '-'}</div>

      <div class="info-label">Telepon:</div>
      <div>${employee.phone_number || '-'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">📊 Ringkasan Absensi</div>
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-value">${stats.hadir}</div>
        <div class="stat-label">Hadir</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${stats.terlambat}</div>
        <div class="stat-label">Terlambat</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${stats.izin}</div>
        <div class="stat-label">Izin</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${stats.sakit}</div>
        <div class="stat-label">Sakit</div>
      </div>
      <div class="stat-box">
        <div class="stat-value">${stats.alpha}</div>
        <div class="stat-label">Alpha</div>
      </div>
    </div>
    ${overtime && overtime.total_overtime > 0 ? `
      <div style="margin-top: 15px; padding: 10px; background: #f0fdf4; border-radius: 5px; text-align: center;">
        <strong>Lembur:</strong> ${overtime.total_overtime} hari (${overtime.total_hours.toFixed(1)} jam)
      </div>
    ` : ''}
  </div>

  <div class="section">
    <div class="section-title">📅 Detail Absensi</div>
    <table>
      <thead>
        <tr>
          <th>Tanggal</th>
          <th>Check In</th>
          <th>Check Out</th>
          <th>Shift</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${attendances.length === 0 ? '<tr><td colspan="5" style="text-align: center; padding: 20px;">Tidak ada data absensi</td></tr>' : ''}
        ${attendances.map(a => `
          <tr>
            <td>${new Date(a.check_in).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
            <td>${a.check_in ? new Date(a.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
            <td>${a.check_out ? new Date(a.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
            <td>${a.shift_name || '-'}</td>
            <td class="status-${a.status.toLowerCase()}">${a.status}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>Slip absensi ini digenerate secara otomatis oleh sistem Absenin</p>
    <p>${new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}</p>
  </div>
</body>
</html>
    `;
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-wa-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <DashboardHeader
        title="📄 Slip Absensi"
        subtitle="Cetak slip absensi karyawan"
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

        {/* Filters */}
        <div className="bg-white rounded-2xl border p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium mb-2">Bulan</label>
              <select
                value={filters.month}
                onChange={e => setFilters({ ...filters, month: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-wa-primary/20 focus:border-wa-primary bg-white"
              >
                {months.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tahun</label>
              <select
                value={filters.year}
                onChange={e => setFilters({ ...filters, year: parseInt(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-wa-primary/20 focus:border-wa-primary bg-white"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <p className="text-sm text-gray-500">
                Menampilkan data untuk <strong>{months[filters.month]} {filters.year}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Employees List */}
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h3 className="font-bold">👥 Daftar Karyawan</h3>
          </div>

          {employees.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              Tidak ada data karyawan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Nama Karyawan</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Employee ID</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Divisi</th>
                    <th className="text-center px-4 py-3 font-medium">Total Absen</th>
                    <th className="text-center px-4 py-3 font-medium">Hadir</th>
                    <th className="text-center px-4 py-3 font-medium">Terlambat</th>
                    <th className="text-center px-4 py-3 font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{emp.name}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{emp.employee_id || '-'}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{emp.division_name || '-'}</td>
                      <td className="px-4 py-3 text-center">{emp.total_attendance || 0}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {emp.hadir_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                          {emp.terlambat_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleViewSlip(emp)}
                          disabled={generating}
                          className="bg-wa-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-wa-dark disabled:opacity-50"
                        >
                          {generating ? '⏳...' : '📄 Lihat Slip'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Slip Preview Modal */}
        {showPreview && slipData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex justify-between items-center p-6 border-b">
                <div>
                  <h2 className="text-lg font-bold">📄 Slip Absensi</h2>
                  <p className="text-sm text-gray-500">{slipData.employee.name} - {slipData.period.month} {slipData.period.year}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadPDF}
                    className="bg-wa-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-wa-dark flex items-center gap-2"
                  >
                    📥 Download PDF
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    &times;
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div dangerouslySetInnerHTML={{ __html: generateSlipHTML() }} />
              </div>

              <div className="p-6 border-t bg-gray-50">
                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadPDF}
                    className="flex-1 bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark"
                  >
                    📥 Download PDF
                  </button>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-300"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
