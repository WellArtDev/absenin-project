'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const Spinner = () => <div className="py-16 text-center"><div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
const Badge = ({ s }) => { const c = {pending:'bg-yellow-100 text-yellow-700',waiting_confirmation:'bg-blue-100 text-blue-700',confirmed:'bg-green-100 text-green-700',rejected:'bg-red-100 text-red-700'}; return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${c[s]||'bg-gray-100 text-gray-700'}`}>{s}</span>; };
const Msg = ({ text }) => { if(!text) return null; const ok = text.startsWith('✅'); return <div className={`px-4 py-3 rounded-xl text-sm ${ok?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>{text}</div>; };

export default function SuperadminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [banks, setBanks] = useState([]);
  const [payments, setPayments] = useState([]);
  const [editCo, setEditCo] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pwModal, setPwModal] = useState(null);
  const [delModal, setDelModal] = useState(null);
  const [showPF, setShowPF] = useState(false);
  const [showBF, setShowBF] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [testWA, setTestWA] = useState(false);

  useEffect(() => { if (!api.getToken()) { router.push('/login'); return; } init(); }, []);

  const init = async () => {
    try { const me = await api.getMe(); if (me.data.role !== 'superadmin') { router.push('/dashboard'); return; } setUser(me.data); loadDash(); }
    catch(e) { router.push('/login'); } finally { setLoading(false); }
  };

  const loadDash = async () => { try { const r = await api.getSADashboard(); setDashboard(r.data); } catch(e){} };
  const loadCo = useCallback(async () => { try { const r = await api.getSACompanies({ search }); setCompanies(r.data||[]); } catch(e){} }, [search]);
  const loadPlans = async () => { try { const r = await api.getSAPlans(); setPlans(r.data||[]); } catch(e){} };
  const loadBanks = async () => { try { const r = await api.getSABanks(); setBanks(r.data||[]); } catch(e){} };
  const loadPay = async () => { try { const r = await api.getSAPayments(); setPayments(r.data||[]); } catch(e){} };

  useEffect(() => { if(tab==='companies') loadCo(); }, [tab, loadCo]);
  useEffect(() => { if(tab==='plans') loadPlans(); }, [tab]);
  useEffect(() => { if(tab==='banks') loadBanks(); }, [tab]);
  useEffect(() => { if(tab==='payments') loadPay(); }, [tab]);

  const openEdit = async (id) => { try { const r = await api.getSACompany(id); setEditCo(r.data); setMsg(''); } catch(e) { alert(e.message); } };

  const saveEdit = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      const fd = new FormData(e.target);
      const d = {}; for (const [k,v] of fd.entries()) d[k] = v;
      d.is_active = fd.has('is_active');
      d.require_selfie = fd.has('require_selfie');
      d.require_location = fd.has('require_location');
      d.radius_lock_enabled = fd.has('radius_lock_enabled');
      d.overtime_enabled = fd.has('overtime_enabled');
      ['max_employees','late_tolerance_minutes','allowed_radius_meters','overtime_min_minutes','overtime_max_hours'].forEach(k => { if(d[k]) d[k]=parseInt(d[k]); });
      if (d.wa_api_token && d.wa_api_token.includes('*')) delete d.wa_api_token;
      if (d.wa_api_token === '') delete d.wa_api_token;
      await api.updateSACompany(editCo.id, d);
      setMsg('✅ Berhasil disimpan!'); loadCo(); loadDash();
    } catch(err) { setMsg('❌ '+err.message); } finally { setSaving(false); }
  };

  const createCo = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const fd = new FormData(e.target); const d = {};
      for (const [k,v] of fd.entries()) d[k] = v;
      if(d.max_employees) d.max_employees = parseInt(d.max_employees);
      await api.createSACompany(d);
      alert('✅ Dibuat!'); setCreateOpen(false); loadCo(); loadDash();
    } catch(err) { alert(err.message); } finally { setSaving(false); }
  };

  const deleteCo = async () => {
    if(!delModal) return; setSaving(true);
    try { const r = await api.deleteSACompany(delModal.id); alert(r.message); setDelModal(null); setEditCo(null); loadCo(); loadDash(); }
    catch(err) { alert(err.message); } finally { setSaving(false); }
  };

  const changePw = async (e) => {
    e.preventDefault(); const fd = new FormData(e.target); const pw = fd.get('new_password');
    if(!pw||pw.length<6) { alert('Min 6 karakter'); return; }
    try { const r = await api.changeSAUserPassword(pwModal.id, pw); alert(r.message); setPwModal(null); } catch(err) { alert(err.message); }
  };

  const doTestWA = async () => {
    if(!editCo) return; setTestWA(true);
    try {
      const form = document.getElementById('edit-form');
      const fd = new FormData(form);
      const num = prompt('Nomor WA test (628xxx):', fd.get('wa_device_number')||'');
      if(!num) { setTestWA(false); return; }
      const tok = fd.get('wa_api_token');
      const r = await api.testSACompanyWA(editCo.id, {
        wa_api_url: fd.get('wa_api_url'),
        wa_api_token: (tok && !tok.includes('*')) ? tok : null,
        wa_device_number: fd.get('wa_device_number'),
        test_number: num,
      });
      setMsg('✅ '+r.message);
    } catch(err) { setMsg('❌ '+err.message); } finally { setTestWA(false); }
  };

  const toggleCo = async (id, a) => { try { await api.updateSACompany(id, { is_active: !a }); loadCo(); } catch(e){ alert(e.message); } };
  const toggleU = async (id) => { try { await api.toggleSAUser(id); if(editCo) openEdit(editCo.id); } catch(e){ alert(e.message); } };
  const confPay = async (id) => { if(!confirm('Konfirmasi?')) return; try { await api.confirmSAPayment(id); loadPay(); loadDash(); } catch(e){ alert(e.message); } };
  const rejPay = async (id) => { const r=prompt('Alasan:'); if(r===null) return; try { await api.rejectSAPayment(id,r); loadPay(); } catch(e){ alert(e.message); } };
  const addPlan = async (e) => { e.preventDefault(); const fd=new FormData(e.target); try { await api.createSAPlan({name:fd.get('name'),slug:fd.get('slug'),price:parseFloat(fd.get('price')||0),max_employees:parseInt(fd.get('max_employees')||10),duration_days:parseInt(fd.get('duration_days')||30),description:fd.get('description')}); setShowPF(false); loadPlans(); } catch(err){alert(err.message);} };
  const addBank = async (e) => { e.preventDefault(); const fd=new FormData(e.target); try { await api.createSABank({bank_name:fd.get('bank_name'),account_number:fd.get('account_number'),account_name:fd.get('account_name')}); setShowBF(false); loadBanks(); } catch(err){alert(err.message);} };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;

  const tabs = [{id:'dashboard',l:'📊 Dashboard'},{id:'companies',l:'🏢 Perusahaan'},{id:'plans',l:'📦 Paket'},{id:'banks',l:'🏦 Bank'},{id:'payments',l:'💰 Pembayaran'}];
  const I = "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-red-600 text-white text-center text-xs py-1 font-medium">🔑 SUPERADMIN</div>
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-center h-14">
        <div className="flex items-center gap-3"><div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">SA</span></div><span className="text-lg font-bold hidden sm:block">Absenin</span><span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">v3.3</span></div>
        <div className="hidden md:flex gap-1">{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`px-3 py-2 rounded-lg text-xs font-medium ${tab===t.id?'bg-red-50 text-red-600':'text-gray-600 hover:bg-gray-100'}`}>{t.l}</button>)}</div>
        <button onClick={()=>api.logout()} className="text-sm text-red-500 font-medium">Keluar</button>
      </div></div></div>
      <div className="md:hidden flex overflow-x-auto border-b bg-white px-2">{tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} className={`px-3 py-3 text-xs font-medium whitespace-nowrap border-b-2 ${tab===t.id?'border-red-500 text-red-600':'border-transparent text-gray-500'}`}>{t.l}</button>)}</div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* DASHBOARD */}
        {tab==='dashboard'&&dashboard&&(
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold">📊 Dashboard</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[{l:'Perusahaan',v:dashboard.totalCompanies,i:'🏢',bg:'bg-blue-50',tx:'text-blue-600',s:`${dashboard.activeCompanies} aktif`},{l:'Karyawan',v:dashboard.totalEmployees,i:'👥',bg:'bg-green-50',tx:'text-green-600'},{l:'Absensi',v:dashboard.todayAttendance,i:'✅',bg:'bg-purple-50',tx:'text-purple-600'},{l:'Revenue',v:`Rp ${Number(dashboard.monthlyRevenue||0).toLocaleString('id-ID')}`,i:'💰',bg:'bg-yellow-50',tx:'text-yellow-600'}].map((c,i)=>(
                <div key={i} className={`${c.bg} border rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg transition-all`}><span className="text-2xl">{c.i}</span><p className={`text-2xl font-bold ${c.tx} mt-2`}>{c.v}</p><p className="text-sm text-gray-600 mt-1">{c.l}</p>{c.s&&<p className="text-xs text-gray-500">{c.s}</p>}</div>
              ))}
            </div>
            {dashboard.pendingPayments>0&&<div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-4"><span className="text-3xl">💰</span><p className="flex-1 font-semibold text-yellow-800">{dashboard.pendingPayments} pembayaran pending</p><button onClick={()=>setTab('payments')} className="bg-yellow-500 text-white px-4 py-2 rounded-xl text-sm font-semibold">Review</button></div>}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border overflow-hidden"><div className="px-6 py-4 border-b flex justify-between"><h3 className="font-semibold">🏢 Terbaru</h3><button onClick={()=>setTab('companies')} className="text-xs text-red-500">Semua →</button></div><div className="divide-y">{(dashboard.recentCompanies||[]).slice(0,5).map((c,i)=><div key={i} className="px-6 py-3 flex justify-between hover:bg-gray-50 cursor-pointer" onClick={()=>{setTab('companies');setTimeout(()=>openEdit(c.id),300);}}><div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-gray-500 capitalize">{c.plan} • {c.emp_count||0}/{c.max_employees}</p></div><span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{c.is_active?'Aktif':'Off'}</span></div>)}</div></div>
              <div className="bg-white rounded-2xl border overflow-hidden"><div className="px-6 py-4 border-b flex justify-between"><h3 className="font-semibold">💰 Pembayaran</h3><button onClick={()=>setTab('payments')} className="text-xs text-red-500">Semua →</button></div><div className="divide-y">{(dashboard.recentPayments||[]).slice(0,5).map((p,i)=><div key={i} className="px-6 py-3 flex justify-between"><div><p className="text-sm font-medium">{p.company_name}</p><p className="text-xs text-gray-500">Rp {Number(p.amount).toLocaleString('id-ID')}</p></div><Badge s={p.status}/></div>)}</div></div>
            </div>
          </div>
        )}
        {/* COMPANIES */}
        {tab==='companies'&&(
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <h2 className="text-2xl font-bold">🏢 Perusahaan</h2>
              <div className="flex gap-2"><input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari..." className={`${I} flex-1 sm:w-64`}/><button onClick={()=>setCreateOpen(true)} className="bg-red-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-red-600">+ Tambah</button></div>
            </div>
            <div className="bg-white rounded-2xl border overflow-x-auto">
              <table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left px-6 py-3">Perusahaan</th><th className="text-center px-4 py-3">Plan</th><th className="text-center px-4 py-3">Karyawan</th><th className="text-center px-4 py-3 hidden md:table-cell">Selfie</th><th className="text-center px-4 py-3 hidden md:table-cell">WA</th><th className="text-center px-4 py-3">Status</th><th className="text-right px-6 py-3">Aksi</th></tr></thead>
              <tbody className="divide-y">{companies.map(c=>(
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-gray-500">{c.email||c.slug}</p></td>
                  <td className="px-4 py-4 text-center"><span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize">{c.plan}</span></td>
                  <td className="px-4 py-4 text-center text-sm">{c.emp_count||0}<span className="text-gray-400">/{c.max_employees}</span></td>
                  <td className="px-4 py-4 text-center hidden md:table-cell text-sm">{c.require_selfie?'📸':'—'}</td>
                  <td className="px-4 py-4 text-center hidden md:table-cell text-sm">{c.wa_api_url?'💬':'—'}</td>
                  <td className="px-4 py-4 text-center"><button onClick={()=>toggleCo(c.id,c.is_active)} className={`text-xs px-2.5 py-1 rounded-full font-medium ${c.is_active?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{c.is_active?'✅Aktif':'❌Off'}</button></td>
                  <td className="px-6 py-4 text-right"><div className="flex gap-1 justify-end"><button onClick={()=>openEdit(c.id)} className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100">✏️</button><button onClick={()=>setDelModal(c)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100">🗑️</button></div></td>
                </tr>
              ))}{companies.length===0&&<tr><td colSpan="7" className="py-16 text-center text-gray-500">Kosong</td></tr>}</tbody></table>
            </div>

            {/* Create Modal */}
            {createOpen&&(<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setCreateOpen(false)}><div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e=>e.stopPropagation()}>
              <div className="flex justify-between mb-4"><h3 className="text-xl font-bold">➕ Buat Perusahaan</h3><button onClick={()=>setCreateOpen(false)} className="text-2xl text-gray-400">&times;</button></div>
              <form onSubmit={createCo} className="space-y-4">
                <div><label className="block text-sm font-medium mb-1">Nama *</label><input name="name" required className={I}/></div>
                <div><label className="block text-sm font-medium mb-1">Email</label><input name="email" type="email" className={I}/></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Plan</label><select name="plan" className={I}><option value="free">Free</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></div><div><label className="block text-sm font-medium mb-1">Max</label><input name="max_employees" type="number" defaultValue="10" className={I}/></div></div>
                <hr/><p className="text-sm font-semibold text-gray-500">👤 Admin</p>
                <div><label className="block text-sm font-medium mb-1">Nama *</label><input name="admin_name" required className={I}/></div>
                <div><label className="block text-sm font-medium mb-1">Email *</label><input name="admin_email" type="email" required className={I}/></div>
                <div><label className="block text-sm font-medium mb-1">Password *</label><input name="admin_password" type="password" required className={I}/></div>
                <div><label className="block text-sm font-medium mb-1">WA</label><input name="admin_phone" className={I}/></div>
                <div className="flex gap-3"><button type="submit" disabled={saving} className="bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-600 disabled:opacity-50">{saving?'⏳...':'🏢 Buat'}</button><button type="button" onClick={()=>setCreateOpen(false)} className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-semibold">Batal</button></div>
              </form>
            </div></div>)}

            {/* Delete Modal */}
            {delModal&&(<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={()=>setDelModal(null)}><div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e=>e.stopPropagation()}>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-3xl">⚠️</span></div>
                <h3 className="text-xl font-bold">Hapus Perusahaan?</h3>
                <p className="text-sm text-gray-500 mt-2">Hapus <strong className="text-red-600">{delModal.name}</strong> beserta:</p>
                <ul className="text-sm text-left bg-red-50 rounded-xl p-4 mt-3 space-y-1"><li>• {delModal.emp_count||0} karyawan</li><li>• {delModal.user_count||0} user</li><li>• Semua absensi, lembur, cuti</li><li>• Semua data perusahaan</li></ul>
                <p className="text-xs text-red-600 font-semibold mt-3">⚠️ TIDAK BISA dibatalkan!</p>
              </div>
              <div className="flex gap-3"><button onClick={deleteCo} disabled={saving} className="flex-1 bg-red-500 text-white py-3 rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50">{saving?'⏳...':'🗑️ Hapus Permanen'}</button><button onClick={()=>setDelModal(null)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl text-sm font-semibold">Batal</button></div>
            </div></div>)}
            {/* Edit Modal */}
            {editCo&&(<div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto" onClick={()=>{setEditCo(null);setMsg('');}}>
              <div className="bg-white rounded-2xl w-full max-w-3xl my-8 p-6" onClick={e=>e.stopPropagation()}>
                <div className="flex justify-between mb-6"><h3 className="text-xl font-bold">✏️ {editCo.name}</h3><div className="flex gap-2"><button onClick={()=>setDelModal(editCo)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium">🗑️ Hapus</button><button onClick={()=>{setEditCo(null);setMsg('');}} className="text-2xl text-gray-400">&times;</button></div></div>
                <Msg text={msg}/>
                <form id="edit-form" onSubmit={saveEdit} className="space-y-6 mt-4">
                  <div><p className="text-sm font-bold text-gray-500 mb-3">🏢 Info</p><div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Nama *</label><input name="name" defaultValue={editCo.name} required className={I}/></div>
                    <div><label className="block text-sm font-medium mb-1">Email</label><input name="email" type="email" defaultValue={editCo.email||''} className={I}/></div>
                    <div><label className="block text-sm font-medium mb-1">Telepon</label><input name="phone" defaultValue={editCo.phone||''} className={I}/></div>
                    <div><label className="block text-sm font-medium mb-1">Logo URL</label><input name="logo_url" defaultValue={editCo.logo_url||''} className={I}/></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Alamat</label><textarea name="address" defaultValue={editCo.address||''} rows={2} className={I}/></div>
                  </div></div>

                  <div><p className="text-sm font-bold text-gray-500 mb-3">📦 Plan</p><div className="grid md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Plan</label><select name="plan" defaultValue={editCo.plan} className={I}><option value="free">Free</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></div>
                    <div><label className="block text-sm font-medium mb-1">Max Karyawan</label><input name="max_employees" type="number" defaultValue={editCo.max_employees} className={I}/></div>
                    <div className="flex items-end pb-1"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="is_active" defaultChecked={editCo.is_active} className="w-4 h-4 rounded"/><span className="text-sm font-medium">🟢 Aktif</span></label></div>
                  </div></div>

                  <div><p className="text-sm font-bold text-gray-500 mb-3">⏰ Jam Kerja</p><div className="grid md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Masuk</label><input name="work_start" type="time" defaultValue={editCo.work_start||'08:00'} className={I}/></div>
                    <div><label className="block text-sm font-medium mb-1">Pulang</label><input name="work_end" type="time" defaultValue={editCo.work_end||'17:00'} className={I}/></div>
                    <div><label className="block text-sm font-medium mb-1">Toleransi (menit)</label><input name="late_tolerance_minutes" type="number" defaultValue={editCo.late_tolerance_minutes||15} className={I}/></div>
                  </div></div>

                  <div><p className="text-sm font-bold text-gray-500 mb-3">⚙️ Fitur</p><div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="require_selfie" defaultChecked={editCo.require_selfie} className="w-4 h-4 rounded"/><span className="text-sm">📸 Selfie</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="require_location" defaultChecked={editCo.require_location} className="w-4 h-4 rounded"/><span className="text-sm">📍 Lokasi</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="radius_lock_enabled" defaultChecked={editCo.radius_lock_enabled} className="w-4 h-4 rounded"/><span className="text-sm">🔒 Radius</span></label>
                    <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="overtime_enabled" defaultChecked={editCo.overtime_enabled} className="w-4 h-4 rounded"/><span className="text-sm">🕐 Lembur</span></label>
                  </div></div>

                  <div><p className="text-sm font-bold text-gray-500 mb-3">🕐 Lembur</p><div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Min Menit</label><input name="overtime_min_minutes" type="number" defaultValue={editCo.overtime_min_minutes||30} className={I}/></div>
                    <div><label className="block text-sm font-medium mb-1">Max Jam</label><input name="overtime_max_hours" type="number" defaultValue={editCo.overtime_max_hours||4} className={I}/></div>
                  </div></div>

                  <div><p className="text-sm font-bold text-gray-500 mb-3">📍 Lokasi</p><div className="grid md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Latitude</label><input name="office_latitude" defaultValue={editCo.office_latitude||''} className={I}/></div>
                    <div><label className="block text-sm font-medium mb-1">Longitude</label><input name="office_longitude" defaultValue={editCo.office_longitude||''} className={I}/></div>
                    <div><label className="block text-sm font-medium mb-1">Radius (m)</label><input name="allowed_radius_meters" type="number" defaultValue={editCo.allowed_radius_meters||500} className={I}/></div>
                  </div></div>

                  <div><p className="text-sm font-bold text-gray-500 mb-3">💬 WhatsApp (Fonnte)</p><div className="grid md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">API URL</label><input name="wa_api_url" defaultValue={editCo.wa_api_url||''} placeholder="https://api.fonnte.com/send" className={I}/></div>
                    <div><label className="block text-sm font-medium mb-1">Token {editCo.has_wa_token&&<span className="text-green-500 text-xs">(tersimpan)</span>}</label><input name="wa_api_token" defaultValue={editCo.wa_api_token_display||''} placeholder="Token baru atau kosongkan" className={I}/><p className="text-xs text-gray-400 mt-1">Kosongkan = pakai token lama</p></div>
                    <div><label className="block text-sm font-medium mb-1">Device</label><input name="wa_device_number" defaultValue={editCo.wa_device_number||''} placeholder="628xxx" className={I}/></div>
                    <div className="flex items-end"><button type="button" onClick={doTestWA} disabled={testWA} className="bg-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-green-600 disabled:opacity-50 w-full">{testWA?'⏳...':'📤 Test WA'}</button></div>
                  </div></div>
                  {editCo.users&&editCo.users.length>0&&(<div><p className="text-sm font-bold text-gray-500 mb-3">👤 Users ({editCo.users.length})</p>
                    <div className="bg-gray-50 rounded-xl overflow-hidden"><table className="w-full"><thead><tr className="border-b"><th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">User</th><th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Role</th><th className="text-center px-4 py-2 text-xs font-semibold text-gray-500">Status</th><th className="text-right px-4 py-2 text-xs font-semibold text-gray-500">Aksi</th></tr></thead>
                    <tbody className="divide-y">{editCo.users.map(u=>(
                      <tr key={u.id} className="hover:bg-gray-100">
                        <td className="px-4 py-2"><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-gray-500">{u.email}</p></td>
                        <td className="px-4 py-2 text-center text-xs capitalize">{u.role}</td>
                        <td className="px-4 py-2 text-center"><button onClick={()=>toggleU(u.id)} className={`text-xs px-2 py-0.5 rounded-full ${u.is_active?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{u.is_active?'Aktif':'Off'}</button></td>
                        <td className="px-4 py-2 text-right"><button onClick={()=>setPwModal(u)} className="text-xs text-orange-600 hover:bg-orange-50 px-2 py-1 rounded-lg">🔑 PW</button></td>
                      </tr>
                    ))}</tbody></table></div>
                  </div>)}

                  <div className="flex gap-3 pt-4 border-t">
                    <button type="submit" disabled={saving} className="bg-red-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-red-600 disabled:opacity-50 text-sm">{saving?'⏳...':'💾 Simpan'}</button>
                    <button type="button" onClick={()=>{setEditCo(null);setMsg('');}} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold text-sm">Tutup</button>
                  </div>
                </form>
              </div>
            </div>)}

            {/* Password Modal */}
            {pwModal&&(<div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={()=>setPwModal(null)}><div className="bg-white rounded-2xl w-full max-w-sm p-6" onClick={e=>e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-2">🔑 Ganti Password</h3>
              <p className="text-sm text-gray-500 mb-4">{pwModal.name} ({pwModal.email})</p>
              <form onSubmit={changePw}>
                <div><label className="block text-sm font-medium mb-1">Password Baru</label><input name="new_password" type="password" required placeholder="Min 6" className={I}/></div>
                <div className="flex gap-3 mt-4"><button type="submit" className="bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">💾 Simpan</button><button type="button" onClick={()=>setPwModal(null)} className="bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold">Batal</button></div>
              </form>
            </div></div>)}
          </div>
        )}
        {/* PLANS */}
        {tab==='plans'&&(
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between"><h2 className="text-2xl font-bold">📦 Paket</h2><button onClick={()=>setShowPF(!showPF)} className="bg-red-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-red-600">{showPF?'✕':'+ Tambah'}</button></div>
            {showPF&&(<form onSubmit={addPlan} className="bg-white rounded-2xl border p-6 space-y-4"><div className="grid md:grid-cols-3 gap-4">
              <div><label className="block text-sm font-medium mb-1">Nama *</label><input name="name" required className={I}/></div>
              <div><label className="block text-sm font-medium mb-1">Slug *</label><input name="slug" required className={I}/></div>
              <div><label className="block text-sm font-medium mb-1">Harga</label><input name="price" type="number" defaultValue="0" className={I}/></div>
              <div><label className="block text-sm font-medium mb-1">Max</label><input name="max_employees" type="number" defaultValue="10" className={I}/></div>
              <div><label className="block text-sm font-medium mb-1">Hari</label><input name="duration_days" type="number" defaultValue="30" className={I}/></div>
              <div><label className="block text-sm font-medium mb-1">Deskripsi</label><input name="description" className={I}/></div>
            </div><button type="submit" className="bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold">💾 Simpan</button></form>)}
            <div className="bg-white rounded-2xl border overflow-hidden"><table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left px-6 py-3">Paket</th><th className="text-right px-4 py-3">Harga</th><th className="text-center px-4 py-3">Max</th><th className="text-center px-4 py-3">Hari</th><th className="text-right px-6 py-3">Aksi</th></tr></thead>
            <tbody className="divide-y">{plans.map(p=>(<tr key={p.id} className="hover:bg-gray-50"><td className="px-6 py-4"><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-gray-500">{p.slug}</p></td><td className="px-4 py-4 text-right text-sm">Rp {Number(p.price).toLocaleString('id-ID')}</td><td className="px-4 py-4 text-center text-sm">{p.max_employees}</td><td className="px-4 py-4 text-center text-sm">{p.duration_days}</td><td className="px-6 py-4 text-right"><button onClick={()=>{if(confirm('Hapus?'))api.deleteSAPlan(p.id).then(loadPlans)}} className="text-red-500 text-xs">Hapus</button></td></tr>))}{plans.length===0&&<tr><td colSpan="5" className="py-12 text-center text-gray-500">Kosong</td></tr>}</tbody></table></div>
          </div>
        )}

        {/* BANKS */}
        {tab==='banks'&&(
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between"><h2 className="text-2xl font-bold">🏦 Bank</h2><button onClick={()=>setShowBF(!showBF)} className="bg-red-500 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-red-600">{showBF?'✕':'+ Tambah'}</button></div>
            {showBF&&(<form onSubmit={addBank} className="bg-white rounded-2xl border p-6 grid md:grid-cols-4 gap-4 items-end">
              <div><label className="block text-sm font-medium mb-1">Bank *</label><input name="bank_name" required className={I}/></div>
              <div><label className="block text-sm font-medium mb-1">No Rek *</label><input name="account_number" required className={I}/></div>
              <div><label className="block text-sm font-medium mb-1">Atas Nama *</label><input name="account_name" required className={I}/></div>
              <button type="submit" className="bg-red-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold h-[42px]">💾</button>
            </form>)}
            <div className="bg-white rounded-2xl border overflow-hidden"><table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left px-6 py-3">Bank</th><th className="text-left px-4 py-3">No Rek</th><th className="text-left px-4 py-3">Nama</th><th className="text-right px-6 py-3">Aksi</th></tr></thead>
            <tbody className="divide-y">{banks.map(b=>(<tr key={b.id} className="hover:bg-gray-50"><td className="px-6 py-4 text-sm font-bold">{b.bank_name}</td><td className="px-4 py-4 text-sm font-mono">{b.account_number}</td><td className="px-4 py-4 text-sm">{b.account_name}</td><td className="px-6 py-4 text-right"><button onClick={()=>{if(confirm('Hapus?'))api.deleteSABank(b.id).then(loadBanks)}} className="text-red-500 text-xs">Hapus</button></td></tr>))}{banks.length===0&&<tr><td colSpan="4" className="py-12 text-center text-gray-500">Kosong</td></tr>}</tbody></table></div>
          </div>
        )}

        {/* PAYMENTS */}
        {tab==='payments'&&(
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between"><h2 className="text-2xl font-bold">💰 Pembayaran</h2><button onClick={loadPay} className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl text-sm">🔄</button></div>
            <div className="bg-white rounded-2xl border overflow-x-auto">
              {payments.length>0?(<table className="w-full"><thead><tr className="bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase"><th className="text-left px-6 py-3">Perusahaan</th><th className="text-left px-4 py-3">Paket</th><th className="text-right px-4 py-3">Jumlah</th><th className="text-center px-4 py-3">Status</th><th className="text-right px-6 py-3">Aksi</th></tr></thead>
              <tbody className="divide-y">{payments.map((p,i)=>(<tr key={i} className={`hover:bg-gray-50 ${['pending','waiting_confirmation'].includes(p.status)?'bg-yellow-50/50':''}`}><td className="px-6 py-4 text-sm font-medium">{p.company_name}</td><td className="px-4 py-4 text-sm">{p.plan_name||'-'}</td><td className="px-4 py-4 text-right text-sm font-bold">Rp {Number(p.amount).toLocaleString('id-ID')}</td><td className="px-4 py-4 text-center"><Badge s={p.status}/></td><td className="px-6 py-4 text-right">{['pending','waiting_confirmation'].includes(p.status)&&<div className="flex gap-2 justify-end"><button onClick={()=>confPay(p.id)} className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-600">✅</button><button onClick={()=>rejPay(p.id)} className="bg-red-100 text-red-700 px-3 py-1.5 rounded-lg text-xs">❌</button></div>}</td></tr>))}</tbody></table>):(<div className="py-16 text-center text-gray-500">Kosong</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
