'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', company: '', name: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { const r = await api.register(form); if (r.success) router.push('/dashboard'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-500 to-brand-700 items-center justify-center p-12">
        <div className="text-white max-w-md">
          <div className="flex items-center gap-3 mb-8"><div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><span className="text-2xl font-bold">A</span></div><span className="text-3xl font-bold">Absenin</span></div>
          <h2 className="text-4xl font-bold mb-4">Mulai dalam 5 menit</h2>
          <p className="text-brand-100 text-lg mb-8">Daftar → Tambah karyawan → Langsung absen via WhatsApp!</p>
          <div className="space-y-4">
            {['Daftar akun perusahaan', 'Setting lokasi kantor & WA', 'Tambah karyawan', 'Karyawan kirim Foto+HADIR 📸'].map((s, i) => (
              <div key={i} className="flex items-center gap-4"><div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">{i + 1}</div><span className="text-brand-100">{s}</span></div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2">Buat Akun Baru</h1>
          <p className="text-gray-600 mb-8">Sudah punya akun? <Link href="/login" className="text-brand-500 font-semibold">Masuk</Link></p>
          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm border border-red-100">❌ {error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama Anda *</label><input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="John Doe" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">No. WhatsApp</label><input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="08123456789" /><p className="text-xs text-gray-500 mt-1">Untuk notifikasi</p></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama Perusahaan *</label><input type="text" required value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="PT Maju Jaya" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Email *</label><input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="nama@perusahaan.com" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Password *</label><input type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="Min 6 karakter" /></div>
            <button type="submit" disabled={loading} className="w-full bg-brand-500 text-white py-3.5 rounded-xl font-semibold hover:bg-brand-600 disabled:opacity-50 shadow-sm">{loading ? '⏳ Mendaftar...' : '🚀 Daftar Gratis'}</button>
          </form>
          <p className="text-xs text-gray-500 mt-4 text-center">✅ Gratis 10 karyawan. Bisa upgrade kapan saja.</p>
        </div>
      </div>
    </div>
  );
}
