'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const Spinner = () => <div className="py-16 text-center"><div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>;
const OtBadge = ({ status }) => {
  const c = { pending: 'bg-yellow-100 text-yellow-700', waiting_confirmation: 'bg-blue-100 text-blue-700', confirmed: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', expired: 'bg-gray-100 text-gray-700' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${c[status] || 'bg-gray-100'}`}>{status}</span>;
};

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
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ name: '', slug: '', price: 0, max_employees: 10, duration_days: 30, description: '', sort_order: 0, features: [] });
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankForm, setBankForm] = useState({ bank_name: '', account_number: '', account_name: '', sort_order: 0 });
  const [blogPosts, setBlogPosts] = useState([]);
  const [blogLoading, setBlogLoading] = useState(false);
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [blogImageUploading, setBlogImageUploading] = useState(false);
  const [blogForm, setBlogForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content_html: '',
    feature_image_url: '',
    status: 'draft'
  });
  const editorRef = useRef(null);

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

  const loadDashboard = async () => { try { const r = await api.getSADashboard(); setDashboard(r.data); } catch (e) { } };
  const loadCompanies = async () => { try { const r = await api.getSACompanies(); setCompanies(r.data || []); } catch (e) { } };
  const loadPlans = async () => { try { const r = await api.getSAPlans(); setPlans(r.data || []); } catch (e) { } };
  const loadBanks = async () => { try { const r = await api.getSABanks(); setBanks(r.data || []); } catch (e) { } };
  const loadPayments = async () => { try { const r = await api.getSAPayments(); setPayments(r.data || []); } catch (e) { } };

  useEffect(() => {
    if (tab === 'companies') loadCompanies();
    if (tab === 'plans') loadPlans();
    if (tab === 'banks') loadBanks();
    if (tab === 'payments') loadPayments();
    if (tab === 'blog') loadBlogPosts();
  }, [tab]);

  const toggleCompany = async (id, active) => { try { await api.updateSACompany(id, { is_active: !active }); loadCompanies(); } catch (e) { alert(e.message); } };

  const openPlanForm = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name,
        slug: plan.slug,
        price: plan.price,
        max_employees: plan.max_employees,
        duration_days: plan.duration_days,
        description: plan.description || '',
        sort_order: plan.sort_order || 0,
        features: Array.isArray(plan.features) ? plan.features : []
      });
    } else {
      setEditingPlan(null);
      setPlanForm({ name: '', slug: '', price: 0, max_employees: 10, duration_days: 30, description: '', sort_order: 0, features: [] });
    }
    setShowPlanForm(true);
  };

  const closePlanForm = () => {
    setShowPlanForm(false);
    setEditingPlan(null);
    setPlanForm({ name: '', slug: '', price: 0, max_employees: 10, duration_days: 30, description: '', sort_order: 0, features: [] });
  };

  const savePlan = async (e) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await api.updateSAPlan(editingPlan.id, planForm);
        alert('✅ Paket berhasil diupdate!');
      } else {
        await api.createSAPlan(planForm);
        alert('✅ Paket berhasil ditambahkan!');
      }
      closePlanForm();
      loadPlans();
    } catch (err) {
      alert(err.message);
    }
  };

  const addPlan = async (e) => {
    e.preventDefault();
    try { await api.createSAPlan(planForm); setPlanForm({ name: '', slug: '', price: 0, max_employees: 10, duration_days: 30, description: '', sort_order: 0, features: [] }); setShowPlanForm(false); loadPlans(); } catch (err) { alert(err.message); }
  };

  const delPlan = async (id) => { if (!confirm('Hapus plan?')) return; try { await api.deleteSAPlan(id); loadPlans(); } catch (e) { alert(e.message); } };

  const updatePlanFeature = (index, value) => {
    const newFeatures = [...planForm.features];
    newFeatures[index] = value;
    setPlanForm({ ...planForm, features: newFeatures });
  };

  const addPlanFeature = () => {
    setPlanForm({ ...planForm, features: [...planForm.features, ''] });
  };

  const removePlanFeature = (index) => {
    const newFeatures = planForm.features.filter((_, i) => i !== index);
    setPlanForm({ ...planForm, features: newFeatures });
  };
  const addBank = async (e) => {
    e.preventDefault();
    try { await api.createSABank(bankForm); setBankForm({ bank_name: '', account_number: '', account_name: '', sort_order: 0 }); setShowBankForm(false); loadBanks(); } catch (err) { alert(err.message); }
  };
  const delBank = async (id) => { if (!confirm('Hapus bank?')) return; try { await api.deleteSABank(id); loadBanks(); } catch (e) { alert(e.message); } };
  const confirmPayment = async (id) => { if (!confirm('Konfirmasi pembayaran?')) return; try { await api.confirmSAPayment(id); alert('✅ Pembayaran dikonfirmasi!'); loadPayments(); loadDashboard(); } catch (e) { alert(e.message); } };
  const rejectPayment = async (id) => { const r = prompt('Alasan:'); if (r === null) return; try { await api.rejectSAPayment(id, r); loadPayments(); } catch (e) { alert(e.message); } };

  const loadBlogPosts = async () => {
    try {
      setBlogLoading(true);
      const r = await api.getSABlogPosts();
      setBlogPosts(r.data || []);
    } catch (e) {
      alert(e.message);
    } finally {
      setBlogLoading(false);
    }
  };

  const resetBlogForm = () => {
    setEditingBlog(null);
    setBlogForm({
      title: '',
      slug: '',
      excerpt: '',
      content_html: '',
      feature_image_url: '',
      status: 'draft'
    });
    setShowBlogForm(false);
  };

  const openBlogForm = (post = null) => {
    if (post) {
      setEditingBlog(post);
      setBlogForm({
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        content_html: post.content_html || '',
        feature_image_url: post.feature_image_url || '',
        status: post.status || 'draft'
      });
    } else {
      setEditingBlog(null);
      setBlogForm({
        title: '',
        slug: '',
        excerpt: '',
        content_html: '',
        feature_image_url: '',
        status: 'draft'
      });
    }
    setShowBlogForm(true);
  };

  const execEditor = (cmd, value = null) => {
    if (typeof document === 'undefined') return;
    if (editorRef.current) editorRef.current.focus();
    document.execCommand(cmd, false, value);
    if (editorRef.current) {
      setBlogForm((prev) => ({ ...prev, content_html: editorRef.current.innerHTML }));
    }
  };

  const handleEditorInput = () => {
    setBlogForm((prev) => ({ ...prev, content_html: editorRef.current?.innerHTML || '' }));
  };

  const handleBlogImageUpload = async (file) => {
    if (!file) return;
    try {
      setBlogImageUploading(true);
      const r = await api.uploadSABlogImage(file);
      setBlogForm((prev) => ({ ...prev, feature_image_url: r.data?.image_url || '' }));
    } catch (e) {
      alert(e.message);
    } finally {
      setBlogImageUploading(false);
    }
  };

  const saveBlogPost = async (e) => {
    e.preventDefault();
    const payload = {
      ...blogForm,
      content_html: editorRef.current?.innerHTML || blogForm.content_html || ''
    };
    if (!payload.title || !payload.content_html) {
      alert('Judul dan konten wajib diisi');
      return;
    }

    try {
      if (editingBlog) {
        await api.updateSABlogPost(editingBlog.id, payload);
      } else {
        await api.createSABlogPost(payload);
      }
      resetBlogForm();
      loadBlogPosts();
    } catch (e) {
      alert(e.message);
    }
  };

  const removeBlogPost = async (id) => {
    if (!confirm('Hapus artikel ini?')) return;
    try {
      await api.deleteSABlogPost(id);
      loadBlogPosts();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;

  const tabs = [{ id: 'dashboard', l: '📊 Dashboard' }, { id: 'companies', l: '🏢 Perusahaan' }, { id: 'plans', l: '📦 Paket' }, { id: 'banks', l: '🏦 Bank' }, { id: 'payments', l: '💰 Pembayaran' }, { id: 'blog', l: '📝 Blog' }];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-wa-dark text-white text-center text-xs py-1 font-medium">🔑 SUPERADMIN MODE</div>
      <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center gap-3"><div className="w-8 h-8 bg-wa-primary rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">SA</span></div><span className="text-lg font-bold">Absenin Admin</span></div>
            <div className="flex items-center gap-1">{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 rounded-lg text-xs font-medium ${tab === t.id ? 'bg-wa-light text-wa-dark' : 'text-gray-600 hover:bg-gray-100'}`}>{t.l}</button>)}</div>
            <button onClick={() => api.logout()} className="text-sm text-wa-primary font-medium px-3 py-1.5 rounded-lg hover:bg-wa-light">Keluar</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard */}
        {tab === 'dashboard' && dashboard && (
          <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold">📊 Superadmin Dashboard</h1>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { l: 'Perusahaan', v: dashboard.totalCompanies, i: '🏢', bg: 'bg-blue-50', tx: 'text-blue-600', bd: 'border-blue-100', sub: `${dashboard.activeCompanies} aktif` },
                { l: 'Total Karyawan', v: dashboard.totalEmployees, i: '👥', bg: 'bg-green-50', tx: 'text-green-600', bd: 'border-green-100' },
                { l: 'Absensi Hari Ini', v: dashboard.todayAttendance, i: '✅', bg: 'bg-purple-50', tx: 'text-purple-600', bd: 'border-purple-100' },
                { l: 'Revenue Bulan Ini', v: `Rp ${Number(dashboard.monthlyRevenue || 0).toLocaleString('id-ID')}`, i: '💰', bg: 'bg-yellow-50', tx: 'text-yellow-600', bd: 'border-yellow-100' },
              ].map((s, i) => (
                <div key={i} className={`stat-card ${s.bg} border ${s.bd} rounded-2xl p-5`}><span className="text-2xl">{s.i}</span><p className={`text-2xl font-bold ${s.tx} mt-2`}>{s.v}</p><p className="text-sm text-gray-600 mt-1">{s.l}</p>{s.sub && <p className="text-xs text-gray-500">{s.sub}</p>}</div>
              ))}
            </div>
            {dashboard.pendingPayments > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-4">
                <span className="text-3xl">💰</span><div className="flex-1"><p className="font-semibold text-yellow-800">{dashboard.pendingPayments} pembayaran menunggu konfirmasi</p></div>
                <button onClick={() => setTab('payments')} className="bg-yellow-500 text-white px-4 py-2 rounded-xl text-sm font-semibold">Review</button>
              </div>
            )}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="px-6 py-4 border-b"><h3 className="font-semibold">🏢 Perusahaan Terbaru</h3></div>
                <div className="divide-y">{(dashboard.recentCompanies || []).map((c, i) => (
                  <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-gray-500">Plan: {c.plan} • {c.emp_count || 0} karyawan</p></div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.is_active ? 'Aktif' : 'Nonaktif'}</span>
                  </div>
                ))}</div>
              </div>
              <div className="bg-white rounded-2xl border overflow-hidden">
                <div className="px-6 py-4 border-b"><h3 className="font-semibold">💰 Pembayaran Terbaru</h3></div>
                <div className="divide-y">{(dashboard.recentPayments || []).map((p, i) => (
                  <div key={i} className="px-6 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div><p className="text-sm font-medium">{p.company_name}</p><p className="text-xs text-gray-500">Rp {Number(p.amount).toLocaleString('id-ID')}</p></div>
                    <OtBadge status={p.status} />
                  </div>
                ))}</div>
              </div>
            </div>
          </div>
        )}

        {/* Companies */}
        {tab === 'companies' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold">🏢 Kelola Perusahaan</h2>
            <div className="bg-white rounded-2xl border overflow-hidden">
              <table className="w-full"><thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Perusahaan</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Karyawan</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
              </tr></thead><tbody className="divide-y">{companies.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-gray-500">{c.slug}</p></td>
                  <td className="px-4 py-4 text-center"><span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full text-xs font-medium capitalize">{c.plan}</span></td>
                  <td className="px-4 py-4 text-center text-sm">{c.emp_count || 0} / {c.max_employees}</td>
                  <td className="px-4 py-4 text-center"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{c.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className="px-6 py-4 text-right"><button onClick={() => toggleCompany(c.id, c.is_active)} className={`text-xs font-medium px-3 py-1 rounded-lg ${c.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}>{c.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button></td>
                </tr>
              ))}</tbody></table>
            </div>
          </div>
        )}

        {/* Plans */}
        {tab === 'plans' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">📦 Kelola Paket</h2>
              <button onClick={() => openPlanForm()} className="bg-wa-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-wa-dark">+ Tambah Paket</button>
            </div>
            {showPlanForm && (
              <form onSubmit={savePlan} className="bg-white rounded-2xl border p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">{editingPlan ? '✏️ Edit Paket' : '➕ Tambah Paket Baru'}</h3>
                  <button type="button" onClick={closePlanForm} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Nama *</label><input required value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Slug *</label><input required value={planForm.slug} onChange={e => setPlanForm({ ...planForm, slug: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border text-sm" placeholder="pro, enterprise" /></div>
                  <div><label className="block text-sm font-medium mb-1">Harga (Rp)</label><input type="number" value={planForm.price} onChange={e => setPlanForm({ ...planForm, price: parseFloat(e.target.value) })} className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Max Karyawan</label><input type="number" value={planForm.max_employees} onChange={e => setPlanForm({ ...planForm, max_employees: parseInt(e.target.value) })} className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Durasi (hari)</label><input type="number" value={planForm.duration_days} onChange={e => setPlanForm({ ...planForm, duration_days: parseInt(e.target.value) })} className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                  <div><label className="block text-sm font-medium mb-1">Urutan</label><input type="number" value={planForm.sort_order} onChange={e => setPlanForm({ ...planForm, sort_order: parseInt(e.target.value) })} className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                </div>
                <div><label className="block text-sm font-medium mb-1">Deskripsi</label><input value={planForm.description} onChange={e => setPlanForm({ ...planForm, description: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fitur</label>
                  <div className="space-y-2">
                    {planForm.features.map((feat, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          value={feat}
                          onChange={e => updatePlanFeature(i, e.target.value)}
                          className="flex-1 px-3 py-2.5 rounded-xl border text-sm"
                          placeholder="Contoh: attendance, selfie, gps"
                        />
                        <button type="button" onClick={() => removePlanFeature(i)} className="text-red-500 hover:bg-red-50 px-3 rounded-lg text-sm">Hapus</button>
                      </div>
                    ))}
                    <button type="button" onClick={addPlanFeature} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Tambah Fitur</button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Format fitur: attendance, selfie, gps, dashboard, export_csv, dll</p>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="bg-wa-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-wa-dark">{editingPlan ? '💾 Update Paket' : '💾 Simpan Paket'}</button>
                  <button type="button" onClick={closePlanForm} className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-semibold">Batal</button>
                </div>
              </form>
            )}
            <div className="bg-white rounded-2xl border overflow-hidden">
              <table className="w-full"><thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Paket</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Harga</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Max Karyawan</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Durasi</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
              </tr></thead><tbody className="divide-y">{plans.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><p className="text-sm font-medium">{p.name}</p><p className="text-xs text-gray-500">{p.slug}</p></td>
                  <td className="px-4 py-4 text-right text-sm font-medium">Rp {Number(p.price).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-4 text-center text-sm">{p.max_employees}</td>
                  <td className="px-4 py-4 text-center text-sm">{p.duration_days} hari</td>
                  <td className="px-4 py-4 text-center"><span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.is_active ? 'Aktif' : 'Nonaktif'}</span></td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openPlanForm(p)} className="text-wa-primary text-xs hover:bg-wa-light px-3 py-1 rounded-lg mr-2">✏️ Edit</button>
                    <button onClick={() => delPlan(p.id)} className="text-red-500 text-xs hover:bg-red-50 px-3 py-1 rounded-lg">Hapus</button>
                  </td>
                </tr>
              ))}</tbody></table>
            </div>
          </div>
        )}

        {/* Banks */}
        {tab === 'banks' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">🏦 Kelola Rekening Bank</h2>
              <button onClick={() => setShowBankForm(!showBankForm)} className="bg-wa-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-wa-dark">{showBankForm ? '✕ Tutup' : '+ Tambah Bank'}</button>
            </div>
            {showBankForm && (
              <form onSubmit={addBank} className="bg-white rounded-2xl border p-6 grid md:grid-cols-4 gap-4">
                <div><label className="block text-sm font-medium mb-1">Nama Bank *</label><input required value={bankForm.bank_name} onChange={e => setBankForm({ ...bankForm, bank_name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border text-sm" placeholder="BCA" /></div>
                <div><label className="block text-sm font-medium mb-1">No. Rekening *</label><input required value={bankForm.account_number} onChange={e => setBankForm({ ...bankForm, account_number: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">Atas Nama *</label><input required value={bankForm.account_name} onChange={e => setBankForm({ ...bankForm, account_name: e.target.value })} className="w-full px-3 py-2.5 rounded-xl border text-sm" /></div>
                <div className="flex items-end"><button type="submit" className="bg-wa-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-wa-dark w-full">💾 Simpan</button></div>
              </form>
            )}
            <div className="bg-white rounded-2xl border overflow-hidden">
              <table className="w-full"><thead><tr className="bg-gray-50 border-b">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Bank</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">No. Rekening</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Atas Nama</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
              </tr></thead><tbody className="divide-y">{banks.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-bold">{b.bank_name}</td>
                  <td className="px-4 py-4 text-sm font-mono">{b.account_number}</td>
                  <td className="px-4 py-4 text-sm">{b.account_name}</td>
                  <td className="px-6 py-4 text-right"><button onClick={() => delBank(b.id)} className="text-red-500 text-xs hover:bg-red-50 px-3 py-1 rounded-lg">Hapus</button></td>
                </tr>
              ))}</tbody></table>
            </div>
          </div>
        )}

        {/* Payments */}
        {tab === 'payments' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold">💰 Kelola Pembayaran</h2>
            <div className="bg-white rounded-2xl border overflow-hidden">
              {payments.length > 0 ? (
                <table className="w-full"><thead><tr className="bg-gray-50 border-b">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Perusahaan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Paket</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Jumlah</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tanggal</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                </tr></thead><tbody className="divide-y">{payments.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{p.company_name}</td>
                    <td className="px-4 py-4 text-xs font-mono">{p.invoice_number}</td>
                    <td className="px-4 py-4 text-sm">{p.plan_name || '-'}</td>
                    <td className="px-4 py-4 text-right text-sm font-medium">Rp {Number(p.amount).toLocaleString('id-ID')}</td>
                    <td className="px-4 py-4 text-center"><OtBadge status={p.status} /></td>
                    <td className="px-4 py-4 text-sm">{new Date(p.created_at).toLocaleDateString('id-ID')}</td>
                    <td className="px-6 py-4 text-right">{['pending', 'waiting_confirmation'].includes(p.status) && (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => confirmPayment(p.id)} className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-medium hover:bg-green-200">✅ Konfirmasi</button>
                        <button onClick={() => rejectPayment(p.id)} className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-200">❌ Tolak</button>
                      </div>
                    )}</td>
                  </tr>
                ))}</tbody></table>
              ) : <div className="py-16 text-center text-gray-500">💰 Belum ada pembayaran</div>}
            </div>
          </div>
        )}

        {/* Blog */}
        {tab === 'blog' && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">📝 Kelola Blog</h2>
              <button onClick={() => openBlogForm()} className="bg-wa-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-wa-dark">+ Tulis Artikel</button>
            </div>

            {showBlogForm && (
              <form onSubmit={saveBlogPost} className="bg-white rounded-2xl border p-6 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold">{editingBlog ? '✏️ Edit Artikel' : '➕ Artikel Baru'}</h3>
                  <button type="button" onClick={resetBlogForm} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Judul Artikel *</label>
                    <input
                      required
                      value={blogForm.title}
                      onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm"
                      placeholder="Contoh: Cara Meningkatkan Disiplin Absensi"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Slug (opsional)</label>
                    <input
                      value={blogForm.slug}
                      onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm"
                      placeholder="auto jika kosong"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Excerpt</label>
                  <textarea
                    rows={2}
                    value={blogForm.excerpt}
                    onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border text-sm"
                    placeholder="Ringkasan artikel..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Feature Image</label>
                  <div className="flex flex-col md:flex-row gap-3 md:items-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleBlogImageUpload(e.target.files?.[0])}
                      className="text-sm"
                    />
                    {blogImageUploading && <span className="text-xs text-gray-500">Uploading...</span>}
                    {blogForm.feature_image_url && <code className="text-xs bg-gray-100 px-2 py-1 rounded break-all">{blogForm.feature_image_url}</code>}
                  </div>
                  {blogForm.feature_image_url && (
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL || ''}${blogForm.feature_image_url}`}
                      alt="Feature"
                      className="mt-3 w-full max-w-md rounded-xl border"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Konten Artikel *</label>
                  <div className="border rounded-xl overflow-hidden">
                    <div className="flex flex-wrap gap-2 p-2 border-b bg-gray-50">
                      <button type="button" onClick={() => execEditor('bold')} className="px-2 py-1 text-xs rounded bg-white border">B</button>
                      <button type="button" onClick={() => execEditor('italic')} className="px-2 py-1 text-xs rounded bg-white border">I</button>
                      <button type="button" onClick={() => execEditor('underline')} className="px-2 py-1 text-xs rounded bg-white border">U</button>
                      <button type="button" onClick={() => execEditor('insertUnorderedList')} className="px-2 py-1 text-xs rounded bg-white border">• List</button>
                      <button type="button" onClick={() => execEditor('insertOrderedList')} className="px-2 py-1 text-xs rounded bg-white border">1. List</button>
                      <button type="button" onClick={() => execEditor('formatBlock', '<h2>')} className="px-2 py-1 text-xs rounded bg-white border">H2</button>
                      <button
                        type="button"
                        onClick={() => {
                          const url = prompt('Masukkan URL:');
                          if (url) execEditor('createLink', url);
                        }}
                        className="px-2 py-1 text-xs rounded bg-white border"
                      >
                        Link
                      </button>
                    </div>
                    <div
                      ref={editorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={handleEditorInput}
                      className="min-h-[220px] p-4 text-sm focus:outline-none"
                      dangerouslySetInnerHTML={{ __html: blogForm.content_html || '' }}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select
                      value={blogForm.status}
                      onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border text-sm bg-white"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="submit" className="bg-wa-primary text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-wa-dark">
                    {editingBlog ? '💾 Update Artikel' : '💾 Simpan Artikel'}
                  </button>
                  <button type="button" onClick={resetBlogForm} className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl text-sm font-semibold">Batal</button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl border overflow-hidden">
              {blogLoading ? (
                <div className="py-16 text-center text-gray-500">Memuat artikel...</div>
              ) : blogPosts.length > 0 ? (
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Artikel</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Slug</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Update</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {blogPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium">{post.title}</p>
                          <p className="text-xs text-gray-500">{post.excerpt || '-'}</p>
                        </td>
                        <td className="px-4 py-4 text-xs font-mono">{post.slug}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {post.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-gray-600">{new Date(post.updated_at || post.created_at).toLocaleString('id-ID')}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => openBlogForm(post)} className="text-wa-primary text-xs hover:bg-wa-light px-3 py-1 rounded-lg mr-2">✏️ Edit</button>
                          <button onClick={() => removeBlogPost(post.id)} className="text-red-500 text-xs hover:bg-red-50 px-3 py-1 rounded-lg">Hapus</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-16 text-center text-gray-500">📝 Belum ada artikel</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
