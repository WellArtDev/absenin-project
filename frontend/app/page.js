'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingPage() {
  const [vis, setVis] = useState(false);
  useEffect(() => setVis(true), []);

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center"><span className="text-white font-bold text-sm">A</span></div>
              <span className="text-xl font-bold text-gray-900">Absenin</span>
              <span className="text-xs bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full font-medium">v3</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium text-gray-700 px-4 py-2">Masuk</Link>
              <Link href="/register" className="text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 px-5 py-2.5 rounded-lg shadow-sm">Mulai Gratis</Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-4">
        <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>v3.0 — Multi-Tenant + HRM + Selfie + GPS + Lembur
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            Absensi Karyawan <span className="text-brand-500">via WhatsApp</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Karyawan kirim <strong>foto selfie + HADIR</strong> di WhatsApp. GPS tercatat, lembur otomatis, HRM lengkap. Tanpa install aplikasi.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-brand-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-brand-600 shadow-lg shadow-brand-500/25 animate-pulse-glow">🚀 Mulai Gratis Sekarang</Link>
          </div>
          <p className="text-sm text-gray-500">✅ Gratis 10 karyawan • 📸 Selfie verification • 🕐 Auto lembur • 📍 GPS • 🏢 Multi-tenant</p>
        </div>
      </section>

      <section className="py-20 bg-gray-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16"><h2 className="text-3xl md:text-4xl font-bold mb-4">Fitur Lengkap v3.0</h2></div>
          <div className="grid md:grid-cols-3 gap-8">
            {[{icon:'📸',t:'Selfie Verification',d:'Wajib foto selfie saat check-in/out.'},{icon:'🕐',t:'Auto Lembur',d:'Pulang > jam kerja = otomatis tercatat.'},{icon:'📍',t:'GPS + Live Map',d:'OpenStreetMap + radius kantor.'},{icon:'💬',t:'WhatsApp Bot',d:'Fonnte API per-tenant.'},{icon:'🏢',t:'Multi-Tenant',d:'Setiap perusahaan punya akun sendiri.'},{icon:'💰',t:'Payment Bank Transfer',d:'Upgrade paket via transfer bank.'},{icon:'👥',t:'HRM Lengkap',d:'Divisi, jabatan, KTP, NPWP, gaji.'},{icon:'🏖️',t:'Cuti & Lembur',d:'Pengajuan cuti + approval.'},{icon:'⚙️',t:'Settings Lengkap',d:'WA token, lokasi kantor, radius.'}].map((f,i)=>(
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-gray-100"><div className="text-4xl mb-4">{f.icon}</div><h3 className="text-lg font-semibold mb-2">{f.t}</h3><p className="text-gray-600 text-sm">{f.d}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-brand-500 px-4"><div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Siap Digitalisasi Absensi?</h2>
        <p className="text-brand-100 text-lg mb-8">Gratis 10 karyawan. Setup 5 menit.</p>
        <Link href="/register" className="inline-flex items-center gap-2 bg-white text-brand-600 px-8 py-4 rounded-xl text-lg font-bold hover:bg-brand-50 shadow-lg">🚀 Mulai Gratis</Link>
      </div></section>

      <footer className="bg-gray-900 text-gray-400 py-12 px-4"><div className="max-w-7xl mx-auto text-center">
        <p className="text-sm">© 2025 Absenin v3.0. Made with ❤️ in Indonesia.</p>
      </div></footer>
    </div>
  );
}
