'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const r = await api.login(form.email, form.password);
      if (r.success) {
        // Route based on role
        if (r.data.user.role === 'superadmin') router.push('/superadmin');
        else router.push('/dashboard');
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-500 items-center justify-center p-12">
        <div className="text-white max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-xl p-1.5 flex items-center justify-center">
              <img src="/logo-absenin.svg" alt="Absenin Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-3xl font-bold">Absenin</span>
          </div>
          <h2 className="text-4xl font-bold mb-4">Kelola absensi & HRM</h2>
          <p className="text-brand-100 text-lg">Dashboard real-time + selfie + GPS + lembur + cuti.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold mb-2">Masuk</h1>
          <p className="text-gray-600 mb-8">Belum punya akun? <Link href="/register" className="text-brand-500 font-semibold">Daftar gratis</Link></p>
          {error && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm border border-red-100">❌ {error}</div>}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label><input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="nama@perusahaan.com" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label><input type="password" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500" placeholder="••••••••" /></div>
            <button type="submit" disabled={loading} className="w-full bg-brand-500 text-white py-3.5 rounded-xl font-semibold hover:bg-brand-600 disabled:opacity-50 shadow-sm">{loading ? '⏳ Memproses...' : 'Masuk'}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
