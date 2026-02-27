'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const Spinner = () => <div className="py-16 text-center"><div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
const StatusBadge = ({ status }) => {
  const c = { pending:'bg-yellow-100 text-yellow-700', waiting_confirmation:'bg-blue-100 text-blue-700', confirmed:'bg-green-100 text-green-700', rejected:'bg-red-100 text-red-700', expired:'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${c[status]||'bg-gray-100 text-gray-700'}`}>{status}</span>;
};

// Uncontrolled input to prevent lag
function FormInput({ label, defaultValue, name, type = 'text', required, placeholder, inputRef, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && ' *'}</label>
      <input ref={inputRef} type={type} name={name} defaultValue={defaultValue || ''} required={required} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm" {...props} />
    </div>
  );
}

function FormSelect({ label, defaultValue, name, children, selectRef }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select ref={selectRef} name={name} defaultValue={defaultValue || ''}
        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm">{children}</select>
    </div>
  );
}

function FormCheckbox({ label, defaultChecked, name, inputRef }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input ref={inputRef} type="checkbox" name={name} defaultChecked={defaultChecked} className="w-4 h-4 text-red-500 rounded border-gray-300" />
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </label>
  );
}

export default function SuperadminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  
  // Data states
  const [dashboard, setDashboard] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [banks, setBanks] = useState([]);
  const [payments, setPayments] = useState([]);
  
  // Modals
  const [editCompany, setEditCompany] = useState(null);
  const [editCompanyLoading, setEditCompanyLoading] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [passwordModal, setPasswordModal] = useState(null);
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [searchCompany, setSearchCompany] = useState('');

  useEffect(() => {
    if (!api.getToken()) { router.push('/login'); return; }
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const me = await api.getMe();
      if (me.data.role !== 'superadmin') { router.push('/dashboard'); return; }
      setUser(me.data);
      loadDashboard();
    } catch (e) { router.push('/login'); } finally { setLoading(false); }
  };

  const loadDashboard = async () => { try { const r = await api.getSADashboard(); setDashboard(r.data); } catch(e){} };
  const loadCompanies = useCallback(async () => { try { const r = await api.getSACompanies({ search: searchCompany }); setCompanies(r.data || []); } catch(e){} }, [searchCompany]);
  const loadPlans = async () => { try { const r = await api.getSAPlans(); setPlans(r.data || []); } catch(e){} };
  const loadBanks = async () => { try { const r = await api.getSABanks(); setBanks(r.data || []); } catch(e){} };
  const loadPayments = async () => { try { const r = await api.getSAPayments(); setPayments(r.data || []); } catch(e){} };

  useEffect(() => { if(tab==='companies') loadCompanies(); }, [tab, loadCompanies]);
  useEffect(() => { if(tab==='plans') loadPlans(); }, [tab]);
  useEffect(() => { if(tab==='banks') loadBanks(); }, [tab]);
  useEffect(() => { if(tab==='payments') loadPayments(); }, [tab]);

  // Load company detail for edit
  const openEditCompany = async (id) => {
    try {
      setEditCompanyLoading(true);
      const r = await api.getSACompany(id);
      setEditCompany(r.data);
    } catch(e) { alert(e.message); } finally { setEditCompanyLoading(false); }
  };

  // Save company edit using FormData from refs
  const saveCompanyEdit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const fd = new FormData(e.target);
      const data = {};
      for (const [key, value] of fd.entries()) {
        if (key.endsWith('_bool')) {
          // Skip, handled separately
        } else {
          data[key] = value;
        }
      }
      // Handle checkboxes (unchecked = not in FormData)
      data.is_active = fd.has('is_active');
      data.require_selfie = fd.has('require_selfie');
      data.radius_lock_enabled = fd.has('radius_lock_enabled');
      data.overtime_enabled = fd.has('overtime_enabled');
      data.require_location = fd.has('require_location');
      // Parse numbers
      if (data.max_employees) data.max_employees = parseInt(data.max_employees);
      if (data.late_tolerance_minutes) data.late_tolerance_minutes = parseInt(data.late_tolerance_minutes);
      if (data.allowed_radius_meters) data.allowed_radius_meters = parseInt(data.allowed_radius_meters);
      if (data.overtime_min_minutes) data.overtime_min_minutes = parseInt(data.overtime_min_minutes);
      if (data.overtime_max_hours) data.overtime_max_hours = parseInt(data.overtime_max_hours);
      
      await api.updateSACompany(editCompany.id, data);
      setMsg('✅ Perusahaan berhasil disimpan!');
      loadCompanies();
      setTimeout(() => setMsg(''), 3000);
    } catch(err) { setMsg('❌ ' + err.message); } finally { setSaving(false); }
  };

  // Create company
  const createCompany = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData(e.target);
      const data = {};
      for (const [key, value] of fd.entries()) data[key] = value;
      if (data.max_employees) data.max_employees = parseInt(data.max_employees);
      await api.createSACompany(data);
      alert('✅ Perusahaan & admin berhasil dibuat!');
      setCreateCompanyOpen(false);
      loadCompanies(); loadDashboard();
    } catch(err) { alert('❌ ' + err.message); } finally { setSaving(false); }
  };

  // Change password
  const changePassword = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const pw = fd.get('new_password');
    if (!pw || pw.length < 6) { alert('Password minimal 6 karakter'); return; }
    try {
      const r = await api.changeSAUserPassword(passwordModal.id, pw);
      alert(r.message);
      setPasswordModal(null);
    } catch(err) { alert('❌ ' + err.message); }
  };

  const toggleCompany = async (id, active) => { try { await api.updateSACompany(id, { is_active: !active }); loadCompanies(); } catch(e){ alert(e.message); }};
  const toggleUser = async (id) => { try { await api.toggleSAUser(id); if(editCompany) openEditCompany(editCompany.id); } catch(e){ alert(e.message); }};
  const confirmPayment = async (id) => { if(!confirm('Konfirmasi pembayaran?')) return; try { await api.confirmSAPayment(id); alert('✅ Dikonfirmasi!'); loadPayments(); loadDashboard(); } catch(e){ alert(e.message); }};
  const rejectPayment = async (id) => { const r=prompt('Alasan:'); if(r===null) return; try { await api.rejectSAPayment(id,r); loadPayments(); } catch(e){ alert(e.message); }};

  // Plans
  const addPlan = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.createSAPlan({
        name: fd.get('name'), slug: fd.get('slug'), price: parseFloat(fd.get('price')||0),
        max_employees: parseInt(fd.get('max_employees')||10), duration_days: parseInt(fd.get('duration_days')||30),
        description: fd.get('description'), sort_order: parseInt(fd.get('sort_order')||0)
      });
      setShowPlanForm(false); loadPlans();
    } catch(err) { alert(err.message); }
  };
  const delPlan = async (id) => { if(!confirm('Hapus plan?')) return; try { await api.deleteSAPlan(id); loadPlans(); } catch(e){ alert(e.message); }};

  // Banks
  const addBank = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await api.createSABank({ bank_name: fd.get('bank_name'), account_number: fd.get('account_number'), account_name: fd.get('account_name') });
      setShowBankForm(false); loadBanks();
    } catch(err) { alert(err.message); }
  };
  const delBank = async (id) => { if(!confirm('Hapus bank?')) return; try { await api.deleteSABank(id); loadBanks(); } catch(e){ alert(e.message); }};

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;

  const tabs = [
    { id:'dashboard', l:'📊 Dashboard' }, { id:'companies', l:'🏢 Perusahaan' },
    { id:'plans', l:'📦 Paket' }, { id:'banks', l:'🏦 Bank' }, { id:'payments', l:'💰 Pembayaran' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-600 text-white text-center text-xs py-1 font-medium">🔑 SUPERADMIN — Multi-Tenant SaaS Management</div>
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-3"><div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">SA</span></div><span className="text-lg font-bold">Absenin Admin</span><span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">v3.1</span></div>
            <div className="hidden md:flex items-center gap-1">{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${tab===t.id?'bg-red-50 text-red-600':'text-gray-600 hover:bg-gray-100'}`}>{t.l}</button>)}</div>
            <button onClick={()=>api.logout()} className="text-sm text-red-500 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50">Keluar</button>
          </div>
        </div>
      </div>
      <div className="md:hidden flex overflow-x-auto border-b bg-white px-2">{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 ${tab===t.id?'border-red-500 text-red-600':'border-transparent text-gray-500'}`}>{t.l}</button>)}</div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* ======== DASHBOARD ======== */}
        {tab==='dashboard' && dashboard && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold">📊 Superadmin Dashboard</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {l:'Perusahaan',v:dashboard.totalCompanies,i:'🏢',bg:'bg-blue-50',tx:'text-blue-600',bd:'border-blue-100',sub:`${dashboard.activeCompanies} aktif`},
                {l:'Total Karyawan',v:dashboard.totalEmployees,i:'👥',bg:'bg-green-50',tx:'text-green-600',bd:'border-green-100'},
                {l:'Absensi Hari Ini',v:dashboard.todayAttendance,i:'✅',bg:'bg-purple-50',tx:'text-purple-600',bd:'border-purple-100'},
                {l:'Revenue Bulan Ini',v:`Rp ${Number(dashboard.monthlyRevenue||0).toLocaleString('id-ID')}`,i:'💰',bg:'bg-yellow-50',tx:'text-yellow-600',bd:'border-yellow-100'},
              ].map((s,i)=>(
                <div key={i} className={`${s.bg} border ${s.bd} rounded-2xl p-5 transition-all hover:-translate-y-1 hover:shadow-lg`}><span className="text-2xl">{s.i}</span><p className={`text-2xl font-bold ${s.tx} mt-2`}>{s.v}</p><p className="text-sm text-gray-600 mt-1">{s.l}</p>{s.sub&&<p className="text-xs text-gray-500">{s.sub}</p>}</div>
              ))}
            </div>
            {dashboard.pendingPayments > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-4">
                <span className="text-3xl">💰</span><div className="flex-1"><p className="font-semibold text-yellow-800">{dashboard.pendingPayments} pembayaran menunggu konfirmasi</p></div>
                <button onClick={()=>setTab('payments')} className="bg-yellow-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-yellow-600">Review</button>
              </div>
            )}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border overflow-hidden"><div className="px-6 py-4 border-b flex items-center justify-between"><h3 className="font-semibold">🏢 Perusahaan Terbaru</h3><button onClick={()=>setTab('companies')} className="text-xs text-red-500 font-medium">Lihat Semua →</button></div>
                <div className="divide-y">{(dashboard.recentCompanies||[]).map((c,i)=>(
                  <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer" onClick={()=>{setTab('companies');openEditCompany(c.id);}}>
                    <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-gray-500">Plan: <span className="capitalize font-medium">{c.plan}</span> • {c.emp_count||0} / {c.max_employees} karyawan</p></div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{c.is_active?'Aktif':'Off'}</span>
                  </div>
                ))}</div>
              </div>
              <div className="bg-white rounded-2xl border overflow-hidden"><div className="px-6 py-4 border-b flex items-center justify-between"><h3 className="font-semibold">💰 Pembayaran Terbaru</h3><button onClick={()=>setTab('payments')} className="text-xs text-red-500 font-medium">Lihat Semua →</button></div>
                <div className="divide-y">{(dashboard.recentPayments||[]).map((p,i)=>(
                  <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div><p className="text-sm font-medium">{p.company_name}</p><p className="text-xs text-gray-500">Rp {Number(p.amount).toLocaleString('id-ID')} — {p.plan_name||'-'}</p></div>
                    <StatusBadge status={p.status} />
                  </div>
                ))}</div>
              </div>
            </div>
          </div>
        )}

        {/* ======== COMPANIES ======== */}
        {tab==='companies' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">🏢 Kelola Perusahaan</h2>
              <div className="flex gap-2">
                <input type="text" value={searchCompany} onChange={e=>setSearchCompany(e.target.value)} placeholder="Cari perusahaan..." className="px-4 py-2 rounded-xl border text-sm w-64 focus:outline-none focus:ring-2 focus:ring-red-500/20" />
                <button onClick={()=>setCreateCompanyOpen(true)} className="bg-red-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-red-600 whitespace-nowrap">+ Tambah</button>
              </div>
            </div>

            {/* Company Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Perusahaan</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Karyawan</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Selfie</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">WA</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
              </tr></thead><tbody className="divide-y">{companies.map(c=>(
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-gray-500">{c.email||c.slug}</p></td>
                  <td className="px-4 py-4 text-center"><span className="bg-brand-100 text-brand-700 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize">{c.plan}</span></td>
                  <td className="px-4 py-4 text-center text-sm font-medium">{c.emp_count||0} <span className="text-gray-400">/ {c.max_employees}</span></td>
                  <td className="px-4 py-4 text-center hidden md:table-cell">{c.require_selfie?<span className="text-green-500 text-sm">📸 On</span>:<span className="text-gray-400 text-sm">Off</span>}</td>
                  <td className="px-4 py-4 text-center hidden md:table-cell">{c.wa_api_url?<span className="text-green-500 text-sm">💬 On</span>:<span className="text-gray-400 text-sm">Off</span>}</td>
                  <td className="px-4 py-4 text-center">
                    <button onClick={()=>toggleCompany(c.id,c.is_active)} className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition-colors ${c.is_active?'bg-green-100 text-green-700 hover:bg-green-200':'bg-red-100 text-red-700 hover:bg-red-200'}`}>{c.is_active?'✅ Aktif':'❌ Off'}</button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={()=>openEditCompany(c.id)} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100">✏️ Edit</button>
                  </td>
                </tr>
              ))}{companies.length===0&&<tr><td colSpan="7" className="py-16 text-center text-gray-500">Belum ada perusahaan</td></tr>}</tbody></table></div>
            </div>

            {/* Create Company Modal */}
            {createCompanyOpen && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setCreateCompanyOpen(false)}>
                <div className="bg-white rounded-2xl w-full max-w-lg p-6" onClick={e=>e.stopPropagation()}>
                  <h3 className="text-xl font-bold mb-4">➕ Buat Perusahaan Baru</h3>
                  <form onSubmit={createCompany} className="space-y-4">
                    <FormInput label="Nama Perusahaan" name="name" required placeholder="PT Maju Jaya" />
                    <FormInput label="Email Perusahaan" name="email" type="email" placeholder="info@perusahaan.com" />
                    <div className="grid grid-cols-2 gap-4">
                      <FormSelect label="Plan" name="plan"><option value="free">Gratis</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></FormSelect>
                      <FormInput label="Max Karyawan" name="max_employees" type="number" defaultValue="10" />
                    </div>
                    <hr />
                    <p className="text-sm font-semibold text-gray-500">👤 Admin Perusahaan</p>
                    <FormInput label="Nama Admin" name="admin_name" required placeholder="John Doe" />
                    <FormInput label="Email Admin" name="admin_email" type="email" required placeholder="admin@perusahaan.com" />
                    <FormInput label="Password Admin" name="admin_password" type="password" required placeholder="Min 6 karakter" />
                    <FormInput label="No. WA Admin" name="admin_phone" placeholder="08xxx" />
                    <div className="flex gap-3 pt-2">
                      <button type="submit" disabled={saving} className="bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50">{saving?'⏳...':'🏢 Buat Perusahaan'}</button>
                      <button type="button" onClick={()=>setCreateCompanyOpen(false)} className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-semibold">Batal</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Edit Company Modal */}
            {editCompany && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={()=>{setEditCompany(null);setMsg('');}}>
                <div className="bg-white rounded-2xl w-full max-w-3xl my-8 p-6" onClick={e=>e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold">✏️ Edit: {editCompany.name}</h3>
                    <button onClick={()=>{setEditCompany(null);setMsg('');}} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                  </div>
                  {msg && <div className={`px-4 py-3 rounded-xl mb-4 text-sm ${msg.startsWith('✅')?'bg-green-50 text-green-700 border border-green-100':'bg-red-50 text-red-700 border border-red-100'}`}>{msg}</div>}
                  
                  <form onSubmit={saveCompanyEdit} className="space-y-6">
                    {/* Company Info */}
                    <div>
                      <p className="text-sm font-bold text-gray-500 mb-3">🏢 Info Perusahaan</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormInput label="Nama" name="name" defaultValue={editCompany.name} required />
                        <FormInput label="Email" name="email" type="email" defaultValue={editCompany.email} />
                        <FormInput label="Telepon" name="phone" defaultValue={editCompany.phone} />
                        <FormInput label="Logo URL" name="logo_url" defaultValue={editCompany.logo_url} />
                        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label><textarea name="address" defaultValue={editCompany.address||''} rows={2} className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                      </div>
                    </div>

                    {/* Plan & Limit */}
                    <div>
                      <p className="text-sm font-bold text-gray-500 mb-3">📦 Plan & Limit</p>
                      <div className="grid md:grid-cols-3 gap-4">
                        <FormSelect label="Plan" name="plan" defaultValue={editCompany.plan}><option value="free">Gratis</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></FormSelect>
                        <FormInput label="Max Karyawan" name="max_employees" type="number" defaultValue={editCompany.max_employees} />
                        <div className="pt-6"><FormCheckbox label="🟢 Perusahaan Aktif" name="is_active" defaultChecked={editCompany.is_active} /></div>
                      </div>
                    </div>

                    {/* Work Settings */}
                    <div>
                      <p className="text-sm font-bold text-gray-500 mb-3">⏰ Jam Kerja & Fitur</p>
                      <div className="grid md:grid-cols-3 gap-4">
                        <FormInput label="Jam Masuk" name="work_start" type="time" defaultValue={editCompany.work_start||'08:00'} />
                        <FormInput label="Jam Pulang" name="work_end" type="time" defaultValue={editCompany.work_end||'17:00'} />
                        <FormInput label="Toleransi Telat (menit)" name="late_tolerance_minutes" type="number" defaultValue={editCompany.late_tolerance_minutes||15} />
                      </div>
                      <div className="flex flex-wrap gap-6 mt-4">
                        <FormCheckbox label="📸 Wajib Selfie" name="require_selfie" defaultChecked={editCompany.require_selfie} />
                        <FormCheckbox label="📍 Wajib Lokasi" name="require_location" defaultChecked={editCompany.require_location} />
                        <FormCheckbox label="🔒 Radius Lock" name="radius_lock_enabled" defaultChecked={editCompany.radius_lock_enabled} />
                        <FormCheckbox label="🕐 Lembur Aktif" name="overtime_enabled" defaultChecked={editCompany.overtime_enabled} />
                      </div>
                    </div>

                    {/* Location */}
                    <div>
                      <p className="text-sm font-bold text-gray-500 mb-3">📍 Lokasi Kantor</p>
                      <div className="grid md:grid-cols-3 gap-4">
                        <FormInput label="Latitude" name="office_latitude" defaultValue={editCompany.office_latitude} placeholder="-6.2088" />
                        <FormInput label="Longitude" name="office_longitude" defaultValue={editCompany.office_longitude} placeholder="106.8456" />
                        <FormInput label="Radius (meter)" name="allowed_radius_meters" type="number" defaultValue={editCompany.allowed_radius_meters||500} />
                      </div>
                    </div>

                    {/* WA Config */}
                    <div>
                      <p className="text-sm font-bold text-gray-500 mb-3">💬 WhatsApp (Fonnte)</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormInput label="API URL" name="wa_api_url" defaultValue={editCompany.wa_api_url} placeholder="https://api.fonnte.com/send" />
                        <FormInput label="Token" name="wa_api_token" defaultValue={editCompany.wa_api_token} placeholder="Token Fonnte" />
                        <FormInput label="Nomor Device" name="wa_device_number" defaultValue={editCompany.wa_device_number} placeholder="628xxx" />
                      </div>
                    </div>

                    {/* Users */}
                    {editCompany.users && editCompany.users.length > 0 && (
                      <div>
                        <p className="text-sm font-bold text-gray-500 mb-3">👤 Users ({editCompany.users.length})</p>
                        <div className="bg-gray-50 rounded-xl overflow-hidden">
                          <table className="w-full"><thead><tr className="border-b"><th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">User</th><th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Role</th><th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Status</th><th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Aksi</th></tr></thead>
                          <tbody className="divide-y">{editCompany.users.map(u=>(
                            <tr key={u.id} className="hover:bg-gray-100">
                              <td className="px-4 py-2"><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-gray-500">{u.email}</p></td>
                              <td className="px-4 py-2 text-center"><span className="text-xs capitalize">{u.role}</span></td>
                              <td className="px-4 py-2 text-center">
                                <button onClick={()=>toggleUser(u.id)} className={`text-xs px-2 py-0.5 rounded-full ${u.is_active?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{u.is_active?'Aktif':'Off'}</button>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <button onClick={()=>setPasswordModal(u)} className="text-xs text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg font-medium">🔑 Password</button>
                              </td>
                            </tr>
                          ))}</tbody></table>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-2 border-t">
                      <button type="submit" disabled={saving} className="bg-red-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 text-sm">{saving?'⏳ Menyimpan...':'💾 Simpan Perubahan'}</button>
                      <button type="button" onClick={()=>{setEditCompany(null);setMsg('');}} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold text-sm">Tutup</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Password Modal */}
            {passwordModal && (
              <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={()=>setPasswordModal(null)}>
                <div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={e=>e.stopPropagation()}>
                  <h3 className="text-lg font-bold mb-2">🔑 Ganti Password</h3>
                  <p className="text-sm text-gray-500 mb-4">{passwordModal.name} ({passwordModal.email})</p>
                  <form onSubmit={changePassword}>
                    <FormInput label="Password Baru" name="new_password" type="password" required placeholder="Min 6 karakter" />
                    <div className="flex gap-3 mt-4">
                      <button type="submit" className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-600">💾 Simpan</button>
                      <button type="button" onClick={()=>setPasswordModal(null)} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold">Batal</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======== PLANS ======== */}
        {tab==='plans' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">📦 Kelola Paket</h2>
              <button onClick={()=>setShowPlanForm(!showPlanForm)} className="bg-red-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-red-600">{showPlanForm?'✕ Tutup':'+ Tambah Paket'}</button>
            </div>
            {showPlanForm && (
              <form onSubmit={addPlan} className="bg-white rounded-2xl border p-6 space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <FormInput label="Nama" name="name" required placeholder="Pro" />
                  <FormInput label="Slug" name="slug" required placeholder="pro" />
                  <FormInput label="Harga (Rp)" name="price" type="number" defaultValue="0" />
                  <FormInput label="Max Karyawan" name="max_employees" type="number" defaultValue="10" />
                  <FormInput label="Durasi (hari)" name="duration_days" type="number" defaultValue="30" />
                  <FormInput label="Urutan" name="sort_order" type="number" defaultValue="0" />
                </div>
                <FormInput label="Deskripsi" name="description" placeholder="Untuk bisnis berkembang" />
                <button type="submit" className="bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600">💾 Simpan</button>
              </form>
            )}
            <div className="bg-white rounded-2xl border overflow-hidden">
              <table className="w-full"><thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Paket</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Harga</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Max</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Durasi</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
              </tr></thead><tbody className="divide-y">{plans.map(p=>(
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-gray-500">{p.slug} — {p.description}</p></td>
                  <td className="px-4 py-4 text-right text-sm font-medium">Rp {Number(p.price).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-4 text-center text-sm">{p.max_employees}</td>
                  <td className="px-4 py-4 text-center text-sm">{p.duration_days}d</td>
                  <td className="px-4 py-4 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{p.is_active?'Aktif':'Off'}</span></td>
                  <td className="px-6 py-4 text-right"><button onClick={()=>delPlan(p.id)} className="text-red-500 text-xs hover:bg-red-50 px-3 py-1 rounded-lg font-medium">Hapus</button></td>
                </tr>
              ))}</tbody></table>
            </div>
          </div>
        )}

        {/* ======== BANKS ======== */}
        {tab==='banks' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">🏦 Rekening Bank</h2>
              <button onClick={()=>setShowBankForm(!showBankForm)} className="bg-red-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-red-600">{showBankForm?'✕ Tutup':'+ Tambah Bank'}</button>
            </div>
            {showBankForm && (
              <form onSubmit={addBank} className="bg-white rounded-2xl border p-6 grid md:grid-cols-4 gap-4 items-end">
                <FormInput label="Nama Bank" name="bank_name" required placeholder="BCA" />
                <FormInput label="No. Rekening" name="account_number" required placeholder="1234567890" />
                <FormInput label="Atas Nama" name="account_name" required placeholder="PT Absenin" />
                <button type="submit" className="bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 h-[42px]">💾 Simpan</button>
              </form>
            )}
            <div className="bg-white rounded-2xl border overflow-hidden">
              <table className="w-full"><thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">No. Rekening</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Atas Nama</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
              </tr></thead><tbody className="divide-y">{banks.map(b=>(
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-bold">{b.bank_name}</td>
                  <td className="px-4 py-4 text-sm font-mono">{b.account_number}</td>
                  <td className="px-4 py-4 text-sm">{b.account_name}</td>
                  <td className="px-6 py-4 text-right"><button onClick={()=>delBank(b.id)} className="text-red-500 text-xs hover:bg-red-50 px-3 py-1 rounded-lg font-medium">Hapus</button></td>
                </tr>
              ))}</tbody></table>
            </div>
          </div>
        )}

        {/* ======== PAYMENTS ======== */}
        {tab==='payments' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">💰 Kelola Pembayaran</h2>
              <button onClick={loadPayments} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm hover:bg-gray-200">🔄 Refresh</button>
            </div>
            <div className="bg-white rounded-2xl border overflow-hidden">
              {payments.length > 0 ? (
                <div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-gray-50 border-b">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Perusahaan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Paket</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Jumlah</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                </tr></thead><tbody className="divide-y">{payments.map((p,i)=>(
                  <tr key={i} className={`hover:bg-gray-50 ${['pending','waiting_confirmation'].includes(p.status)?'bg-yellow-50/50':''}`}>
                    <td className="px-6 py-4 text-sm font-medium">{p.company_name}</td>
                    <td className="px-4 py-4 text-xs font-mono text-gray-500">{p.invoice_number}</td>
                    <td className="px-4 py-4 text-sm">{p.plan_name||'-'}</td>
                    <td className="px-4 py-4 text-right text-sm font-bold">Rp {Number(p.amount).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 text-center"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-4 text-sm text-gray-500">{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 text-right">{['pending','waiting_confirmation'].includes(p.status) && (
                      <div className="flex gap-2 justify-end">
                        <button onClick={()=>confirmPayment(p.id)} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-600">✅ Konfirmasi</button>
                        <button onClick={()=>rejectPayment(p.id)} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-200">❌ Tolak</button>
                      </div>
                    )}</td>
                  </tr>
                ))}</tbody></table></div>
              ) : <div className="py-16 text-center text-gray-500">💰 Belum ada pembayaran</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
