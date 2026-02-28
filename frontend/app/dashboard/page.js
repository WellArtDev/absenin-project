'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import api from '@/lib/api';

// Dynamic import for AttendanceMap to avoid SSR issues with Leaflet
const AttendanceMap = dynamic(() => import('@/components/AttendanceMap'), {
  ssr: false,
  loading: () => (
    <div className="bg-gray-100 rounded-2xl h-64 sm:h-96 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
    </div>
  ),
});

// ── Utility components (defined OUTSIDE the page component so React never remounts them) ──
const InputField = ({ label, required, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
    <input {...props} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm transition-colors" />
  </div>
);

const SelectField = ({ label, children, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select {...props} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-sm bg-white transition-colors">{children}</select>
  </div>
);

const Badge = ({ status }) => {
  const c = { HADIR: 'bg-green-100 text-green-700', TERLAMBAT: 'bg-yellow-100 text-yellow-700', IZIN: 'bg-purple-100 text-purple-700', SAKIT: 'bg-orange-100 text-orange-700', ALPHA: 'bg-red-100 text-red-700' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
};
const OtBadge = ({ status }) => {
  const c = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', completed: 'bg-blue-100 text-blue-700' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c[status] || 'bg-gray-100'}`}>{status}</span>;
};
const Av = ({ name, color = 'bg-brand-100 text-brand-600', size = 'w-9 h-9' }) => {
  const sizeClass = size === 'w-7 h-7' ? 'w-7 h-7 text-xs' : size === 'w-8 h-8' ? 'w-8 h-8 text-sm' : 'w-9 h-9 text-sm';
  return <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>{(name || '?').charAt(0).toUpperCase()}</div>;
};
const Spinner = () => <div className="py-16 text-center"><div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
const mons = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [subTab, setSubTab] = useState('list');
  const [search, setSearch] = useState('');

  // Forms
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [ef, setEf] = useState({ name: '', phone_number: '', employee_code: '', email: '', division_id: '', position_id: '', employment_status: 'tetap', start_date: '', base_salary: '', ktp_number: '', npwp_number: '', birth_date: '', birth_place: '', gender: '', address: '', emergency_contact: '', emergency_phone: '', leave_balance: 12, radius_lock_enabled: true });
  const resetEf = () => setEf({ name: '', phone_number: '', employee_code: '', email: '', division_id: '', position_id: '', employment_status: 'tetap', start_date: '', base_salary: '', ktp_number: '', npwp_number: '', birth_date: '', birth_place: '', gender: '', address: '', emergency_contact: '', emergency_phone: '', leave_balance: 12, radius_lock_enabled: true });
  const [eLoading, setELoading] = useState(false);
  const [eErr, setEErr] = useState('');
  const [eOk, setEOk] = useState('');
  const [viewEmp, setViewEmp] = useState(null);

  // Data states
  const [attData, setAttData] = useState([]);
  const [attLoading, setAttLoading] = useState(false);
  const [selectedAttendanceId, setSelectedAttendanceId] = useState(null);  // For map highlighting
  const [rMonth, setRMonth] = useState(new Date().getMonth() + 1);
  const [rYear, setRYear] = useState(new Date().getFullYear());
  const [mReport, setMReport] = useState([]);
  const [otData, setOtData] = useState([]);
  const [otSummary, setOtSummary] = useState([]);
  const [otLoading, setOtLoading] = useState(false);
  const [leavesData, setLeavesData] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsForm, setSettingsForm] = useState({});
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Division/Position forms
  const [divForm, setDivForm] = useState({ name: '', description: '' });
  const [posForm, setPosForm] = useState({ name: '', division_id: '', description: '', base_salary: '' });

  // Payment
  const [plans, setPlans] = useState([]);
  const [banks, setBanks] = useState([]);
  const [myPayments, setMyPayments] = useState([]);

  useEffect(() => {
    if (!api.getToken()) { router.push('/login'); return; }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [me, an, emp, div, pos] = await Promise.all([
        api.getMe(), api.getAnalytics(), api.getEmployees(), api.getDivisions(), api.getPositions()
      ]);
      setUser(me.data);
      // Redirect superadmin
      if (me.data.role === 'superadmin') { router.push('/superadmin'); return; }
      setAnalytics(an.data);
      setEmployees(emp.data || []);
      setDivisions(div.data || []);
      setPositions(pos.data || []);
    } catch (e) {
      if (e.message.includes('Token') || e.message.includes('Sesi')) router.push('/login');
    } finally { setLoading(false); }
  };

  const loadAtt = async () => {
    try { setAttLoading(true); const d = await api.getAttendance({ start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] }); setAttData(d.data || []); }
    catch (e) { console.error(e); } finally { setAttLoading(false); }
  };

  const loadOT = async () => {
    try { setOtLoading(true); const [data, summary] = await Promise.all([api.getOvertime({ start_date: `${rYear}-${String(rMonth).padStart(2,'0')}-01`, end_date: `${rYear}-${String(rMonth).padStart(2,'0')}-31` }), api.getOvertimeSummary(rMonth, rYear)]); setOtData(data.data || []); setOtSummary(summary.data || []); }
    catch (e) { console.error(e); } finally { setOtLoading(false); }
  };

  const loadLeaves = async () => {
    try { setLeavesLoading(true); const d = await api.getLeaves(); setLeavesData(d.data || []); }
    catch (e) { console.error(e); } finally { setLeavesLoading(false); }
  };

  const loadReport = async () => {
    try { const d = await api.getMonthlyReport(rMonth, rYear); setMReport(d.data || []); }
    catch (e) { console.error(e); }
  };

  const loadSettings = async () => {
    try { setSettingsLoading(true); const s = await api.getSettings(); setSettings(s.data); setSettingsForm(s.data || {}); }
    catch (e) { console.error(e); } finally { setSettingsLoading(false); }
  };

  const loadPayment = async () => {
    try { const [pl, bn, mp] = await Promise.all([api.getPlans(), api.getBanks(), api.getMyPayments()]); setPlans(pl.data || []); setBanks(bn.data || []); setMyPayments(mp.data || []); }
    catch (e) { console.error(e); }
  };

  useEffect(() => { if (tab === 'attendance') loadAtt(); }, [tab]);
  useEffect(() => { if (tab === 'reports') loadReport(); }, [tab, rMonth, rYear]);
  useEffect(() => { if (tab === 'overtime') loadOT(); }, [tab, rMonth, rYear]);
  useEffect(() => { if (tab === 'leaves') loadLeaves(); }, [tab]);
  useEffect(() => { if (tab === 'settings') loadSettings(); }, [tab]);
  useEffect(() => { if (tab === 'payment') loadPayment(); }, [tab]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Spinner /></div>;

  const tabs = [
    { id: 'overview', l: '📊 Overview', internal: true },
    { id: 'employees', l: '👥 Karyawan', path: '/dashboard/employees' },
    { id: 'attendance', l: '📅 Absensi', path: '/dashboard' },
    { id: 'qr', l: '📱 QR Code', path: '/dashboard/qr' },
    { id: 'shifts', l: '🕐 Shift', path: '/dashboard/shifts' },
    { id: 'locations', l: '📍 Lokasi', path: '/dashboard/locations' },
    { id: 'broadcast', l: '📢 Broadcast', path: '/dashboard/broadcast' },
    { id: 'notifications', l: '🔔 Notifikasi', path: '/dashboard/notifications' },
    { id: 'slips', l: '📄 Slip Absensi', path: '/dashboard/slips' },
    { id: 'overtime', l: '🕐 Lembur', path: '/dashboard/overtime' },
    { id: 'leaves', l: '🏖️ Cuti', path: '/dashboard/leaves' },
    { id: 'reports', l: '📤 Laporan', path: '/dashboard/reports' },
    { id: 'settings', l: '⚙️ Pengaturan', path: '/dashboard/settings' },
    { id: 'payment', l: '💰 Paket', path: '/dashboard/payment' },
  ];
  const gr = new Date().getHours() < 12 ? 'Pagi' : new Date().getHours() < 17 ? 'Siang' : 'Malam';
  const todayStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-brand-500 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-xs sm:text-sm">A</span></div>
              <span className="text-sm sm:text-lg font-bold hidden sm:inline">Absenin</span>
              <span className="text-[10px] sm:text-xs text-brand-500 font-medium bg-brand-50 px-1.5 sm:px-2 py-0.5 rounded-full">{user?.plan || 'free'}</span>
            </div>
            <div className="hidden lg:flex items-center gap-1">
              {tabs.map(t => {
                if (t.internal) {
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setTab(t.id); setSubTab('list'); setSelectedAttendanceId(null); }}
                      className={`px-2 sm:px-3 py-2 rounded-lg text-xs font-medium ${tab === t.id ? 'bg-brand-50 text-brand-600' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      {t.l}
                    </button>
                  );
                }
                return (
                  <Link
                    key={t.id}
                    href={t.path}
                    className="px-2 sm:px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
                  >
                    {t.l}
                  </Link>
                );
              })}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:block text-right"><p className="text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none">{user?.name}</p><p className="text-[10px] sm:text-xs text-gray-500 truncate">{user?.company_name}</p></div>
              <button onClick={() => api.logout()} className="text-xs sm:text-sm text-red-500 hover:text-red-600 font-medium px-2 sm:px-3 py-1.5 rounded-lg hover:bg-red-50">Keluar</button>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile tabs */}
      <div className="lg:hidden overflow-x-auto border-b bg-white px-2 scrollbar-hide">
        <div className="flex gap-1 min-w-max">
          {tabs.map(t => {
            if (t.internal) {
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setSubTab('list'); setSelectedAttendanceId(null); }}
                  className={`px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'}`}
                >
                  {t.l}
                </button>
              );
            }
            return (
              <Link
                key={t.id}
                href={t.path}
                className="px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors border-transparent text-gray-500"
              >
                {t.l}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        {/* ======== OVERVIEW ======== */}
        {tab === 'overview' && analytics && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
            <div className="text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold">Selamat {gr}, {user?.name} 👋</h1>
              <p className="text-gray-600 text-xs sm:text-sm mt-1">{todayStr}</p>
            </div>

            {/* Main Stats - Responsive Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-4">
              {[
                { l: 'Karyawan', v: analytics.totalEmployees, i: '👥', bg: 'bg-blue-50', tx: 'text-blue-600', bd: 'border-blue-100' },
                { l: 'Hadir', v: analytics.today.checkedIn, i: '✅', bg: 'bg-green-50', tx: 'text-green-600', bd: 'border-green-100', sub: `${analytics.today.attendanceRate}%` },
                { l: 'Terlambat', v: analytics.today.late, i: '⏰', bg: 'bg-yellow-50', tx: 'text-yellow-600', bd: 'border-yellow-100' },
                { l: 'Belum', v: analytics.today.notCheckedIn, i: '❌', bg: 'bg-red-50', tx: 'text-red-600', bd: 'border-red-100' },
                { l: 'Lembur', v: analytics.overtime?.formatted || '0j', i: '🕐', bg: 'bg-indigo-50', tx: 'text-indigo-600', bd: 'border-indigo-100', sub: `${analytics.overtime?.total || 0} org` },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} border ${s.bd} rounded-xl sm:rounded-2xl p-3 sm:p-5`}>
                  <span className="text-xl sm:text-2xl">{s.i}</span>
                  <p className={`text-2xl sm:text-3xl font-bold ${s.tx} mt-1 sm:mt-2`}>{s.v}</p>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">{s.l}</p>
                  {s.sub && <p className="text-[10px] sm:text-xs text-gray-500">{s.sub}</p>}
                </div>
              ))}
            </div>

            {/* Secondary Stats - Responsive Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-4">
              {[
                { l: 'Izin', v: analytics.today.izin, i: '📝', bg: 'bg-purple-50', bd: 'border-purple-100' },
                { l: 'Sakit', v: analytics.today.sakit, i: '🤒', bg: 'bg-orange-50', bd: 'border-orange-100' },
                { l: 'Selfie', v: analytics.today.withSelfie || 0, i: '📸', bg: 'bg-pink-50', bd: 'border-pink-100' },
                { l: 'GPS', v: analytics.today.withLocation || 0, i: '📍', bg: 'bg-teal-50', bd: 'border-teal-100' },
                { l: 'Pending', v: analytics.pendingLeaves || 0, i: '🏖️', bg: 'bg-cyan-50', bd: 'border-cyan-100' },
              ].map((s, i) => (
                <div key={i} className={`${s.bg} border ${s.bd} rounded-lg sm:rounded-xl p-2 sm:p-4 text-center`}>
                  <span className="text-lg sm:text-xl">{s.i}</span>
                  <p className="text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1">{s.v}</p>
                  <p className="text-[10px] sm:text-xs text-gray-600 hidden sm:block">{s.l}</p>
                </div>
              ))}
            </div>

            {/* Overtime Alert - Responsive */}
            {analytics.overtime?.pending > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2 sm:gap-4">
                <span className="text-2xl sm:text-3xl">⏳</span>
                <div className="flex-1"><p className="text-xs sm:text-sm font-semibold text-yellow-800">{analytics.overtime.pending} pengajuan lembur menunggu</p></div>
                <button onClick={() => setTab('overtime')} className="bg-yellow-500 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-yellow-600">Review</button>
              </div>
            )}

            {/* Recent Attendance & Not Checked In - Responsive */}
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Recent Attendance */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
                  <h3 className="text-sm sm:text-base font-semibold">✅ Absensi Terbaru</h3>
                </div>
                {/* Mobile: Scrollable list */}
                <div className="max-h-[200px] sm:max-h-none overflow-y-auto lg:overflow-visible scrollbar-hide">
                  <div className="divide-y divide-gray-50">
                    {analytics.recentAttendance?.length > 0 ? analytics.recentAttendance.map((a, i) => (
                      <div key={i} className="px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Av name={a.employee_name} size="sm:hidden" />
                          <Av name={a.employee_name} size="hidden sm:block" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium truncate">{a.employee_name}{a.selfie_checkin_url && ' 📸'}{a.location_name && ' 📍'}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 truncate">{a.division_name || '-'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs sm:text-sm font-medium">{a.check_in ? new Date(a.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                          <Badge status={a.status} />
                        </div>
                      </div>
                    )) : <div className="px-4 sm:px-6 py-6 sm:py-8 text-center text-gray-500 text-xs sm:text-sm">📭 Belum ada</div>}
                  </div>
                </div>
              </div>

              {/* Not Checked In */}
              <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
                  <h3 className="text-sm sm:text-base font-semibold">❌ Belum Check-in</h3>
                </div>
                <div className="max-h-[200px] sm:max-h-none overflow-y-auto lg:overflow-visible scrollbar-hide">
                  <div className="divide-y divide-gray-50">
                    {analytics.notCheckedIn?.length > 0 ? analytics.notCheckedIn.map((e, i) => (
                      <div key={i} className="px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Av name={e.name} color="bg-red-100 text-red-600" size="sm:hidden" />
                          <Av name={e.name} color="bg-red-100 text-red-600" size="hidden sm:block" />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium truncate">{e.name}</p>
                            <p className="text-[10px] sm:text-xs text-gray-500 truncate">{e.division_name || '-'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] sm:text-xs text-gray-400 font-mono hidden xs:inline-block">{e.phone_number}</span>
                      </div>
                    )) : <div className="px-4 sm:px-6 py-6 sm:py-8 text-center text-gray-500 text-xs sm:text-sm">🎉 Semua sudah check-in!</div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Chart - Responsive */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b">
                <h3 className="text-sm sm:text-base font-semibold">📈 Chart Mingguan</h3>
              </div>
              <div className="p-3 sm:p-4 overflow-x-auto">
                <div className="flex items-end justify-between gap-1 sm:gap-2 min-h-[120px] sm:min-h-[150px]">
                  {analytics.weekChart?.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 sm:gap-2">
                      <div className="w-full max-w-[30px] sm:max-w-none bg-gray-100 rounded-t-lg relative" style={{ height: `${Math.max((d.total || 0) / (Math.max(...(analytics.weekChart.map(c => c.total || 0))) * 100, 1), 10)}%`, minHeight: '8px' }}>
                        <div className="absolute bottom-0 w-full bg-brand-500 rounded-t-lg" style={{ height: `${Math.max((d.on_time || 0) / (Math.max(d.total || 1, 1)) * 100, 0)}%` }}></div>
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-600 font-medium truncate w-full text-center">{new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' })}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 text-center">{d.total || 0}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======== ATTENDANCE ======== */}
        {tab === 'attendance' && (
          <div className="space-y-4 sm:space-y-6 animate-fade-in">
            {/* Peta Absensi */}
            <AttendanceMap
              attendanceData={attData}
              selectedId={selectedAttendanceId}
              onMarkerClick={(attendance) => setSelectedAttendanceId(attendance.id)}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold">📅 Absensi Hari Ini</h2>
                <p className="text-gray-600 text-xs sm:text-sm mt-1">{todayStr}</p>
              </div>
              <button onClick={loadAtt} className="bg-gray-100 text-gray-700 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm hover:bg-gray-200 whitespace-nowrap">🔄 Refresh</button>
            </div>

            {/* Attendance Table - Responsive */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 overflow-hidden">
              {attLoading ? (
                <Spinner />
              ) : attData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-3 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">Karyawan</th>
                        <th className="text-center px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">Masuk</th>
                        <th className="text-center px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">Pulang</th>
                        <th className="text-center px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="text-center px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">📸</th>
                        <th className="text-center px-2 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">📍 Lokasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {attData.map((a, i) => (
                        <tr key={i} className={`hover:bg-gray-50 transition-colors ${selectedAttendanceId === a.id ? 'bg-red-50' : ''}`}>
                          <td className="px-3 sm:px-6 py-2 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Av name={a.employee_name} size="sm:hidden" />
                              <Av name={a.employee_name} size="hidden sm:block" />
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-medium truncate">{a.employee_name}</p>
                                <p className="text-[10px] sm:text-xs text-gray-500 truncate">{a.employee_code || ''} {a.division_name || ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-4 text-center text-[10px] sm:text-sm">{a.check_in ? new Date(a.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-4 text-center text-[10px] sm:text-sm">{a.check_out ? new Date(a.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          <td className="px-2 sm:px-4 py-2 sm:py-4 text-center"><Badge status={a.status} /></td>
                          <td className="px-2 sm:px-4 py-2 sm:py-4 text-center hidden sm:table-cell">
                            {a.selfie_checkin_url ? <a href={a.selfie_checkin_url} target="_blank" rel="noopener" className="text-brand-500 text-[10px] sm:text-xs underline">📸 Lihat</a> : <span className="text-gray-400 text-[10px] sm:text-xs">—</span>}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-4 text-center hidden md:table-cell">
                            {a.latitude && a.longitude ? (
                              <button
                                onClick={() => setSelectedAttendanceId(selectedAttendanceId === a.id ? null : a.id)}
                                className={`text-[10px] sm:text-xs truncate block max-w-[80px] sm:max-w-[150px] mx-auto transition-all px-2 py-1 rounded-lg ${
                                  selectedAttendanceId === a.id
                                    ? 'text-red-600 font-semibold bg-red-50'
                                    : 'text-brand-500 hover:text-brand-700 hover:bg-brand-50'
                                }`}
                                title={a.location_name || 'Lokasi tersedia'}
                              >
                                📍 {a.location_name || 'Lihat Lokasi'}
                              </button>
                            ) : (
                              <span className="text-gray-400 text-[10px] sm:text-xs">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 sm:py-16 text-center text-gray-500 text-xs sm:text-sm">📭 Belum ada data absensi hari ini</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-4 right-4 lg:hidden z-50">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-12 h-12 bg-brand-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-brand-600"
        >
          ⬆️
        </button>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex justify-around py-2">
          {tabs.filter(t => t.internal || t.id === 'employees' || t.id === 'leaves').slice(0, 5).map(t => {
            if (t.internal) {
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setSelectedAttendanceId(null); }}
                  className={`flex flex-col items-center py-2 px-3 text-[10px] font-medium ${
                    tab === t.id ? 'text-brand-600' : 'text-gray-500'
                  }`}
                >
                  <span className="text-base">{t.l.split(' ')[0]}</span>
                  <span className="text-[8px]">{t.l.split(' ')[1]}</span>
                </button>
              );
            }
            return (
              <Link
                key={t.id}
                href={t.path}
                className="flex flex-col items-center py-2 px-3 text-[10px] font-medium text-gray-500"
              >
                <span className="text-base">{t.l.split(' ')[0]}</span>
                <span className="text-[8px]">{t.l.split(' ')[1]}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
