'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://absenin.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://absenin.com';

export default function LandingPage() {
  const [vis, setVis] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setVis(true), []);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Only fetch on client-side
    if (!mounted) return;

    const fetchPlans = async () => {
      try {
        const res = await fetch(`${API_URL}/api/payment/plans`);
        const data = await res.json();
        if (data.success) {
          setPlans(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
        // Set default plans on error
        setPlans([
          { id: 1, name: 'Gratis', slug: 'free', price: 0, max_employees: 10, duration_days: 0, sort_order: 1, features: ['10 karyawan', 'Selfie & GPS', 'Dashboard admin'] },
          { id: 2, name: 'Pro', slug: 'pro', price: 99000, max_employees: 50, duration_days: 30, sort_order: 2, features: ['50 karyawan', 'Semua fitur Gratis', 'Manajemen Lembur', 'Manajemen Cuti'] },
          { id: 3, name: 'Enterprise', slug: 'enterprise', price: 299000, max_employees: 999, duration_days: 30, sort_order: 3, features: ['Karyawan tak terbatas', 'Semua fitur Pro', 'Multi-cabang', 'API Access'] },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [mounted]);

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Absenin',
    url: APP_URL,
    logo: `${APP_URL}/logo-absenin.svg`,
    description: 'Sistem absensi karyawan via WhatsApp dengan selfie, GPS, lembur, dan multi-tenant.',
    sameAs: []
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Absenin',
    url: APP_URL,
    inLanguage: 'id-ID',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${APP_URL}/blog?search={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white rounded-lg p-1 border border-brand-100 flex items-center justify-center">
                <img src="/logo-absenin.svg" alt="Absenin Logo" className="w-full h-full object-contain" />
              </div>
              <span className="text-xl font-bold text-gray-900">Absenin</span>
              <span className="text-xs bg-brand-100 text-brand-600 px-2 py-0.5 rounded-full font-medium">v3</span>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/blog" className="text-sm font-medium text-gray-700 px-4 py-2 hover:text-brand-600">Blog</Link>
              <Link href="/login" className="text-sm font-medium text-gray-700 px-4 py-2">Masuk</Link>
              <Link href="/register" className="text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 px-5 py-2.5 rounded-lg shadow-sm">Mulai Gratis</Link>
            </div>
          </div>
        </div>
      </nav>
{/* ── NAV ── */}
      <nav style={{background:'rgba(255,255,255,.92)',backdropFilter:'blur(20px)',borderBottom:'1px solid #f1f5f9',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:64}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:34,height:34,borderRadius:10,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(37,211,102,.25)',padding:'5px',border:'1px solid #d1fae5'}}>
              <img src="/logo-absenin.svg" alt="Absenin Logo" style={{width:'100%',height:'100%',objectFit:'contain'}} />
            </div>
            <span style={{fontSize:20,fontWeight:900,color:'#0f172a',letterSpacing:'-0.5px'}}>Absenin</span>
          </div>
          <div style={{display:'flex',gap:28,alignItems:'center'}}>
            <div style={{display:'flex',gap:24}} className="hidden md:flex">
              {[['#fitur','Fitur'],['#cara-kerja','Cara Kerja'],['#harga','Harga'],['#faq','FAQ'],['/blog','Blog']].map(([h,l])=>(
                <a key={h} href={h} style={{fontSize:14,fontWeight:600,color:'#64748b',textDecoration:'none',transition:'color .15s'}} onMouseOver={e=>e.target.style.color='#25D366'} onMouseOut={e=>e.target.style.color='#64748b'}>{l}</a>
              ))}
            </div>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <Link href="/login" style={{fontSize:14,fontWeight:700,color:'#374151',textDecoration:'none',padding:'8px 14px',borderRadius:10,transition:'color .15s'}}>Masuk</Link>
              <Link href="/register" className="btn-primary" style={{padding:'9px 20px',fontSize:14,borderRadius:12}}>Mulai Gratis →</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{paddingTop:100,paddingBottom:80,position:'relative',overflow:'hidden'}} className="grid-bg">
        <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(240,249,255,.8) 0%,#fff 100%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:-60,right:-60,width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,.12),transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',top:120,left:-80,width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(37,211,102,.1),transparent 70%)',pointerEvents:'none'}}/>

        <div style={{maxWidth:1280,margin:'0 auto',padding:'0 24px',position:'relative'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center'}} className="lg:grid-cols-2 grid-cols-1">

            {/* Copy */}
            <div className="fu">
              <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'#f0f9ff',border:'1.5px solid #bae6fd',borderRadius:100,padding:'7px 18px',marginBottom:28}}>
                <span style={{width:8,height:8,borderRadius:'50%',background:'#25D366',display:'inline-block',animation:'pulse 2s infinite'}}/>
                <span style={{fontSize:13,fontWeight:700,color:'#0369a1'}}>Multi-Tenant SaaS · WA Per-Perusahaan · v3.0</span>
              </div>
              <h1 style={{fontSize:'clamp(36px,4.5vw,64px)',fontWeight:900,color:'#0f172a',lineHeight:1.06,letterSpacing:'-1.5px',marginBottom:24}}>
                #1st Absensi Karyawan<br/><span className="gt">via WhatsApp,</span><br/>Tanpa Ribet.
              </h1>
              <p style={{fontSize:18,color:'#475569',lineHeight:1.7,marginBottom:32,maxWidth:480}}>
                Karyawan kirim <strong style={{color:'#0f172a'}}>foto selfie + HADIR</strong> di WhatsApp. GPS tercatat, lembur otomatis, laporan siap. <strong style={{color:'#0f172a'}}>Tanpa install aplikasi apapun.</strong>
              </p>
              {/* social proof */}
              <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:36,flexWrap:'wrap'}}>
                <div style={{display:'flex'}}>
                  {['B','S','R','A','D'].map((l,i)=>(
                    <div key={i} style={{width:36,height:36,borderRadius:'50%',border:'2.5px solid #fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'#fff',marginLeft:i?-10:0,background:`hsl(${i*52+200},65%,52%)`}}>{l}</div>
                  ))}
                </div>
                <div>
                  <p style={{fontSize:13,fontWeight:800,color:'#0f172a',margin:0}}>500+ perusahaan aktif</p>
                  <p style={{fontSize:12,color:'#94a3b8',margin:0}}>dari UMKM hingga 200+ karyawan</p>
                </div>
                <span style={{color:'#f59e0b',fontWeight:800,fontSize:13}}>★★★★★ <span style={{color:'#64748b',fontWeight:600}}>4.9/5</span></span>
              </div>
              <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
                <Link href="/register" className="btn-primary" style={{fontSize:16}}>🚀 Mulai Gratis Sekarang</Link>
                <a href="#cara-kerja" className="btn-ghost" style={{fontSize:15}}>▶ Lihat Cara Kerja</a>
              </div>
              <p style={{fontSize:13,color:'#94a3b8',marginTop:16}}>✅ Gratis 10 karyawan &nbsp;·&nbsp; Tidak perlu kartu kredit &nbsp;·&nbsp; Setup 5 menit</p>
            </div>

            {/* WA mockup */}
            <div className="fu2" style={{display:'flex',justifyContent:'center',position:'relative'}}>
              <div className="float" style={{width:300,borderRadius:28,overflow:'hidden',boxShadow:'0 40px 80px rgba(0,0,0,.15)',border:'1px solid rgba(0,0,0,.06)'}}>
                {/* WA header */}
                <div style={{background:'#075E54',padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:38,height:38,borderRadius:'50%',background:'#25D366',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'#fff',fontSize:14}}>A</div>
                  <div><p style={{color:'#fff',fontWeight:700,fontSize:14,margin:0}}>Absenin Bot</p><p style={{color:'#b2dfdb',fontSize:11,margin:0}}>● online</p></div>
                </div>
                {/* Chat */}
                <div style={{background:'#efeae2',padding:'16px',minHeight:320,display:'flex',flexDirection:'column',gap:12}}>
                  <div style={{alignSelf:'flex-end',maxWidth:'82%'}}>
                    <div style={{background:'#e8f5e9',borderRadius:4,padding:8,marginBottom:6}}><div style={{background:'#ccc',borderRadius:10,width:150,height:90,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>📸</div></div>
                    <div className="wa-r"><p style={{margin:0,fontSize:13,fontWeight:700,color:'#1b5e20'}}>HADIR</p></div>
                    <p style={{fontSize:10,color:'#888',textAlign:'right',margin:'4px 0 0'}}>08:02 ✓✓</p>
                  </div>
                  <div style={{alignSelf:'flex-start',maxWidth:'86%'}}>
                    <div className="wa-l"><p style={{margin:0,fontSize:12,color:'#fff',lineHeight:1.6}}>✅ <strong>John Doe</strong> check-in!<br/>⏰ 08:02 · 📍 Jl. Sudirman, Jkt<br/>📸 Selfie OK · Tepat waktu</p><p style={{fontSize:10,color:'#b2dfdb',margin:'4px 0 0'}}>08:02</p></div>
                  </div>
                  <div style={{alignSelf:'flex-end'}}>
                    <div className="wa-r"><p style={{margin:0,fontSize:13,fontWeight:700,color:'#1b5e20'}}>PULANG</p></div>
                  </div>
                  <div style={{alignSelf:'flex-start',maxWidth:'86%'}}>
                    <div className="wa-l"><p style={{margin:0,fontSize:12,color:'#fff',lineHeight:1.6}}>👋 Sampai jumpa, <strong>Budi!</strong><br/>🏠 17:35 · Durasi: 9j 33m<br/>🕐 Lembur: 35 mnt tercatat ✅</p><p style={{fontSize:10,color:'#b2dfdb',margin:'4px 0 0'}}>17:35</p></div>
                  </div>
                </div>
              </div>
              {/* Floating stats */}
              <div className="fu3" style={{position:'absolute',left:-50,top:60,background:'#fff',borderRadius:16,padding:'12px 18px',boxShadow:'0 12px 36px rgba(0,0,0,.12)',border:'1px solid #f1f5f9'}}>
                <p style={{fontSize:11,color:'#94a3b8',margin:0}}>Hadir hari ini</p>
                <p style={{fontSize:26,fontWeight:900,margin:0}} className="gt">94%</p>
              </div>
              <div style={{position:'absolute',right:-42,bottom:100,background:'#fff',borderRadius:16,padding:'12px 18px',boxShadow:'0 12px 36px rgba(0,0,0,.12)',border:'1px solid #f1f5f9'}}>
                <p style={{fontSize:11,color:'#94a3b8',margin:0}}>Lembur bulan ini</p>
                <p style={{fontSize:18,fontWeight:900,color:'#075E54',margin:0}}>128j 40m</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div style={{maxWidth:1280,margin:'60px auto 0',padding:'0 24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            {[{n:'500+',l:'Perusahaan Aktif'},{n:'15.000+',l:'Karyawan Terdaftar'},{n:'2 juta+',l:'Absensi Tercatat'},{n:'5 menit',l:'Rata-rata Setup'}].map((s,i)=>(
              <div key={i} style={{textAlign:'center',padding:'20px 12px',background:'#fff',borderRadius:18,border:'1.5px solid #f1f5f9',boxShadow:'0 2px 12px rgba(0,0,0,.04)'}}>
                <p style={{fontSize:28,fontWeight:900,margin:'0 0 4px'}} className="gt">{s.n}</p>
                <p style={{fontSize:13,color:'#64748b',margin:0}}>{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
{/*       <section className="pt-32 pb-20 px-4">
        <div className={`text-center max-w-4xl mx-auto transition-all duration-1000 ${vis ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <span className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></span>Multi-Tenant + HRM + Selfie + GPS + Lembur
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 leading-tight mb-6">
            #1st Absensi Karyawan <span className="text-brand-500">via WhatsApp</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Karyawan kirim <strong>foto selfie + HADIR</strong> di WhatsApp. GPS tercatat, lembur otomatis, HRM lengkap. Tanpa install aplikasi.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-brand-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-brand-600 shadow-lg shadow-brand-500/25 animate-pulse-glow">🚀 Mulai Gratis Sekarang</Link>
          </div>
          <p className="text-sm text-gray-500">✅ Gratis 10 karyawan • 📸 Selfie verification • 🕐 Auto lembur • 📍 GPS • 🏢 Multi-tenant</p>
        </div>
      </section> */}

{/* ── MULTI-TENANT SECTION ── */}
      <section style={{padding:'100px 0',background:'#0f172a',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,opacity:.15,backgroundImage:'radial-gradient(circle at 20% 60%,#25D366,transparent 50%),radial-gradient(circle at 80% 40%,#075E54,transparent 50%)'}}/>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'0 24px',position:'relative'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:80,alignItems:'center'}}>
            <div>
              <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(37,211,102,.15)',border:'1px solid rgba(37,211,102,.3)',borderRadius:100,padding:'7px 18px',marginBottom:24}}>
                <span style={{fontSize:13,fontWeight:700,color:'#7dd3fc'}}>🏢 Multi-Tenant Architecture</span>
              </div>
              <h2 style={{fontSize:'clamp(28px,3.5vw,48px)',fontWeight:900,color:'#fff',lineHeight:1.1,marginBottom:24,letterSpacing:'-1px'}}>
                Satu Platform,<br/><span style={{color:'#38bdf8'}}>Banyak Perusahaan.</span><br/>Data 100% Terpisah.
              </h2>
              <p style={{fontSize:17,color:'#94a3b8',lineHeight:1.75,marginBottom:36}}>
                Setiap perusahaan punya <strong style={{color:'#fff'}}>dashboard sendiri</strong>, <strong style={{color:'#fff'}}>nomor WhatsApp sendiri via Fonnte</strong>, dan <strong style={{color:'#fff'}}>data yang terisolasi penuh di level database</strong>. PT A tidak bisa mengakses data PT B — dijamin.
              </p>
              <div style={{display:'flex',flexDirection:'column',gap:20}}>
                {[
                  {i:'🔐',t:'Isolasi Data Per-Tenant',d:'Semua query difilter by company_id. Data karyawan, absensi, dan lembur tidak bisa diakses lintas perusahaan.'},
                  {i:'📱',t:'WhatsApp Per-Perusahaan',d:'Tiap tenant input API token Fonnte sendiri. Bot WA berjalan atas nama nomor WA perusahaan Anda, bukan nomor bersama.'},
                  {i:'⚙️',t:'Konfigurasi Independen',d:'Jam kerja, toleransi telat, radius kantor, dan semua pengaturan bisa berbeda tiap perusahaan.'},
                ].map((item,i)=>(
                  <div key={i} style={{display:'flex',gap:16,alignItems:'flex-start'}}>
                    <div style={{width:44,height:44,borderRadius:14,background:'rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{item.i}</div>
                    <div><p style={{color:'#fff',fontWeight:700,margin:'0 0 4px',fontSize:15}}>{item.t}</p><p style={{color:'#64748b',fontSize:13,margin:0,lineHeight:1.6}}>{item.d}</p></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tenant cards */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              {[
                {name:'PT Maju Bersama',wa:'0811-xxxx',emp:45,c:'linear-gradient(135deg,#25D366,#128C7E)'},
                {name:'CV Kreasi Digital',wa:'0822-xxxx',emp:18,c:'linear-gradient(135deg,#075E54,#4f46e5)'},
                {name:'UD Sinar Jaya',wa:'0833-xxxx',emp:12,c:'linear-gradient(135deg,#8b5cf6,#7c3aed)'},
                {name:'PT Logistik Prima',wa:'0844-xxxx',emp:120,c:'linear-gradient(135deg,#06b6d4,#0891b2)'},
              ].map((t,i)=>(
                <div key={i} className="tenant-card">
                  <div style={{width:42,height:42,borderRadius:12,background:t.c,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:16,marginBottom:14}}>{t.name[0]}</div>
                  <p style={{color:'#fff',fontWeight:700,fontSize:14,margin:'0 0 6px'}}>{t.name}</p>
                  <p style={{color:'#94a3b8',fontSize:12,margin:'0 0 2px'}}>📱 {t.wa}</p>
                  <p style={{color:'#94a3b8',fontSize:12,margin:'0 0 12px'}}>👥 {t.emp} karyawan</p>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',animation:'pulse 2s infinite'}}/>
                    <span style={{color:'#4ade80',fontSize:11,fontWeight:700}}>Data terisolasi penuh</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="fitur" style={{padding:'100px 0',background:'#f8fafc'}}>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:64}}>
            <h2 style={{fontSize:'clamp(28px,3.5vw,48px)',fontWeight:900,color:'#0f172a',marginBottom:16,letterSpacing:'-1px'}}>Semua yang Anda Butuhkan</h2>
            <p style={{fontSize:18,color:'#64748b',maxWidth:560,margin:'0 auto'}}>Dari absensi sederhana sampai HRM lengkap. Tidak perlu software terpisah.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
            {[
              {i:'📸',t:'Selfie Verification',d:'Foto selfie otomatis di-watermark nama + timestamp server. Tidak bisa titip absen atau pakai foto lama.'},
              {i:'📍',t:'GPS Otomatis',d:'Lokasi karyawan tercatat via OpenStreetMap. Radius kantor bisa dikunci — di luar zona tidak bisa check-in.'},
              {i:'🕐',t:'Lembur Otomatis',d:'Pulang lewat jam kerja? Langsung terhitung dan tercatat lembur tanpa perlu input manual.'},
              {i:'💬',t:'WhatsApp Native',d:'Karyawan hanya perlu kirim foto + HADIR. Zero install. Bekerja di WA versi apapun.'},
              {i:'🏢',t:'Multi-Perusahaan',d:'Setiap tenant punya dashboard, data, dan WA bot sendiri. Isolasi penuh di level database.'},
              {i:'👥',t:'HRM Lengkap',d:'Divisi, jabatan, KTP, NPWP, gaji pokok, cuti tahunan — semua dalam satu sistem.'},
              {i:'📊',t:'Laporan CSV Instan',d:'Export rekap absensi bulanan satu klik. Format siap dikirim ke bagian keuangan atau HRD.'},
              {i:'🔒',t:'Radius Lock',d:'Karyawan field? Aktifkan radius. Karyawan kantor? Nonaktifkan radius. Bisa per-karyawan.'},
              {i:'⚙️',t:'Konfigurasi Fleksibel',d:'Jam kerja, toleransi telat, lembur minimal, dan seluruh pengaturan WA bisa dikustomisasi bebas.'},
            ].map((f,i)=>(
              <div key={i} className="card" style={{padding:'28px 28px 28px'}}>
                <div style={{width:54,height:54,borderRadius:16,background:'#f0f9ff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,marginBottom:20}}>{f.i}</div>
                <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:8}}>{f.t}</h3>
                <p style={{fontSize:13.5,color:'#64748b',lineHeight:1.7,margin:0}}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="cara-kerja" style={{padding:'100px 0',background:'#fff'}}>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:64}}>
            <h2 style={{fontSize:'clamp(28px,3.5vw,48px)',fontWeight:900,color:'#0f172a',marginBottom:16,letterSpacing:'-1px'}}>Setup dalam 5 Menit</h2>
            <p style={{fontSize:18,color:'#64748b'}}>Tanpa koding. Tanpa instalasi server. Langsung jalan.</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:24,position:'relative'}}>
            <div className="step-line hidden md:block"/>
            {[
              {n:'01',t:'Daftar Akun',d:'Email + nama perusahaan. Akun langsung aktif dalam 30 detik.'},
              {n:'02',t:'Hubungkan WhatsApp',d:'Daftarkan nomor ke Fonnte. Paste API token ke halaman pengaturan Absenin.'},
              {n:'03',t:'Tambah Karyawan',d:'Input nama + nomor WA karyawan. Sistem langsung siap digunakan.'},
              {n:'04',t:'Karyawan Kirim HADIR',d:'Foto selfie + HADIR di WA → absensi tercatat lengkap dengan GPS otomatis.'},
            ].map((s,i)=>(
              <div key={i} style={{textAlign:'center',position:'relative',zIndex:1}}>
                <div style={{width:64,height:64,borderRadius:18,background:'linear-gradient(135deg,#25D366,#075E54)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:900,fontSize:18,margin:'0 auto 20px',boxShadow:'0 8px 24px rgba(37,211,102,.35)'}}>{s.n}</div>
                <h3 style={{fontSize:16,fontWeight:800,color:'#0f172a',marginBottom:8}}>{s.t}</h3>
                <p style={{fontSize:13.5,color:'#64748b',lineHeight:1.6}}>{s.d}</p>
              </div>
            ))}
          </div>

          {/* WA Commands box */}
          <div style={{marginTop:80,background:'#0f172a',borderRadius:28,padding:'48px'}}>
            <h3 style={{fontSize:26,fontWeight:900,color:'#fff',textAlign:'center',margin:'0 0 8px'}}>Perintah WhatsApp</h3>
            <p style={{color:'#64748b',textAlign:'center',marginBottom:40,fontSize:15}}>Karyawan kirim ke nomor WA perusahaan Anda</p>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
              {[
                {t:'📋 Absensi',cmds:[['📸 foto + HADIR','Check-in dengan selfie'],['📸 foto + PULANG','Check-out dengan selfie'],['STATUS','Info absensi hari ini'],['IZIN / SAKIT','Tandai status kehadiran']]},
                {t:'🕐 Lembur',cmds:[['LEMBUR [alasan]','Ajukan lembur manual'],['SELESAI LEMBUR','Akhiri sesi lembur'],['REKAP','Rekap lembur bulan ini'],['Pulang > jam kerja','Auto-detect & catat lembur']]},
                {t:'📊 Info',cmds:[['STATUS','Cek absensi hari ini'],['REKAP','Ringkasan bulan berjalan'],['HELP','Semua perintah tersedia'],['Admin bisa','blast notif ke semua']]},
              ].map((g,i)=>(
                <div key={i} style={{background:'rgba(255,255,255,.05)',borderRadius:18,padding:'20px 22px',border:'1px solid rgba(255,255,255,.08)'}}>
                  <p style={{color:'#fff',fontWeight:800,fontSize:14,marginBottom:16}}>{g.t}</p>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {g.cmds.map(([cmd,desc],j)=>(
                      <div key={j} style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                        <code style={{background:'rgba(37,211,102,.2)',color:'#7dd3fc',padding:'3px 10px',borderRadius:7,fontSize:11,fontFamily:'monospace',whiteSpace:'nowrap'}}>{cmd}</code>
                        <span style={{color:'#64748b',fontSize:12}}>{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
          {/* ── TESTIMONIALS ── */}
      <section style={{padding:'100px 0',background:'#f0f9ff'}}>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:64}}>
            <h2 style={{fontSize:'clamp(28px,3.5vw,44px)',fontWeight:900,color:'#0f172a',marginBottom:12,letterSpacing:'-1px'}}>Dipercaya 500+ Perusahaan</h2>
            <p style={{fontSize:17,color:'#64748b'}}>Dari UMKM hingga perusahaan 200+ karyawan</p>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24}}>
            {[
              {name:'John Doe',role:'HRD Manager, PT Maju Bersama',text:'Sebelumnya pakai fingerprint yang sering rusak. Sekarang karyawan absen lewat WA, lebih mudah dan datanya langsung masuk dashboard real-time.',emp:'45 karyawan'},
              {name:'Sari Dewi',role:'Owner, CV Kreasi Nusantara',text:'Setup cuma 10 menit. Connect ke WA kantor, tambah karyawan, selesai. Fitur lembur otomatisnya sangat membantu penghitungan gaji.',emp:'18 karyawan'},
              {name:'Rahmat Hidayat',role:'Direktur, PT Logistik Prima',text:'Multi-cabang bisa dihandle dari satu dashboard. Laporan CSV tiap bulan tinggal download, langsung dikirim ke accounting.',emp:'120 karyawan'},
            ].map((t,i)=>(
              <div key={i} className="card" style={{padding:'32px',borderColor:'#bae6fd'}}>
                <div style={{color:'#f59e0b',fontWeight:800,fontSize:15,marginBottom:16}}>★★★★★</div>
                <p style={{fontSize:14,color:'#374151',lineHeight:1.75,marginBottom:24,fontStyle:'italic'}}>"{t.text}"</p>
                <div style={{display:'flex',alignItems:'center',gap:12,paddingTop:16,borderTop:'1px solid #f1f5f9'}}>
                  <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#38bdf8,#818cf8)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,flexShrink:0}}>{t.name[0]}</div>
                  <div style={{flex:1}}>
                    <p style={{fontWeight:800,color:'#0f172a',fontSize:13,margin:0}}>{t.name}</p>
                    <p style={{color:'#94a3b8',fontSize:12,margin:0}}>{t.role}</p>
                  </div>
                  <span style={{background:'#e0f2fe',color:'#0369a1',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:100}}>{t.emp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="harga" style={{padding:'100px 0',background:'#fff'}}>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:64}}>
            <h2 style={{fontSize:'clamp(28px,3.5vw,48px)',fontWeight:900,color:'#0f172a',marginBottom:16,letterSpacing:'-1px'}}>Harga Transparan</h2>
            <p style={{fontSize:18,color:'#64748b'}}>Mulai gratis. Upgrade kapan saja. Tanpa biaya tersembunyi.</p>
          </div>
          {loading ? (
            <div style={{textAlign:'center',padding:'40px'}}>Memuat paket...</div>
          ) : plans.length === 0 ? (
            <div style={{textAlign:'center',padding:'40px'}}>Tidak ada paket tersedia saat ini.</div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(plans.length, 3)},1fr)`,gap:24,alignItems:'start'}}>
              {plans.sort((a,b) => (a.sort_order || 0) - (b.sort_order || 0)).map((p,i) => {
                const features = Array.isArray(p.features) ? p.features : [];
                const highlight = p.slug === 'pro' || p.sort_order === 2;
                const badge = highlight ? 'PALING POPULER' : null;
                return (
                  <div key={p.id} style={{borderRadius:24,overflow:'hidden',border:highlight?'none':'1.5px solid #f1f5f9',boxShadow:highlight?'0 0 0 2.5px #25D366,0 20px 60px rgba(37,211,102,.2)':'0 2px 12px rgba(0,0,0,.04)',transform:highlight?'scale(1.03)':'none'}}>
                    {badge&&<div style={{background:'linear-gradient(135deg,#25D366,#075E54)',color:'#fff',textAlign:'center',padding:'12px',fontSize:12,fontWeight:900,letterSpacing:'0.5px'}}>{badge}</div>}
                    <div style={{background:'#fff',padding:'32px'}}>
                      <h3 style={{fontSize:22,fontWeight:900,color:'#0f172a',marginBottom:8}}>{p.name}</h3>
                      <div style={{display:'flex',alignItems:'baseline',gap:4,marginBottom:6}}>
                        <span style={{fontSize:13,color:'#94a3b8'}}>Rp</span>
                        <span style={{fontSize:38,fontWeight:900,color:'#0f172a',lineHeight:1}}>{Number(p.price).toLocaleString('id-ID')}</span>
                        <span style={{fontSize:13,color:'#94a3b8'}}>{p.duration_days === 0 ? 'selamanya' : `/ ${p.duration_days} hari`}</span>
                      </div>
                      <p style={{fontSize:13,color:'#25D366',fontWeight:700,marginBottom:24}}>👥 {p.max_employees >= 999 ? 'Unlimited' : `${p.max_employees}`} karyawan</p>
                      <ul style={{listStyle:'none',padding:0,margin:'0 0 28px',display:'flex',flexDirection:'column',gap:10}}>
                        {features.map((f,j) => (
                          <li key={j} style={{display:'flex',alignItems:'center',gap:10,fontSize:13,color:'#374151'}}>
                            <span style={{width:20,height:20,borderRadius:'50%',background:'#e0f2fe',color:'#0369a1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,flexShrink:0}}>✓</span>
                            <span style={{textTransform:'capitalize'}}>{typeof f === 'string' ? f.replace(/_/g, ' ') : f}</span>
                          </li>
                        ))}
                        {features.length === 0 && (
                          <li style={{display:'flex',alignItems:'center',gap:10,fontSize:13,color:'#94a3b8'}}>
                            <span style={{width:20,height:20,borderRadius:'50%',background:'#f1f5f9',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,flexShrink:0}}>✓</span>
                            Hubungi admin untuk detail fitur
                          </li>
                        )}
                      </ul>
                      <Link href="/register" className={highlight?'btn-primary':'btn-ghost'} style={{width:'100%',justifyContent:'center',fontSize:14,display:'flex'}}>
                        {p.price === 0 ? 'Mulai Gratis' : 'Langganan Sekarang'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p style={{textAlign:'center',color:'#94a3b8',fontSize:13,marginTop:32}}>Semua paket termasuk dukungan teknis. Pembayaran via transfer bank, dikonfirmasi manual. Cancel kapan saja.</p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{padding:'100px 0',background:'#f8fafc'}}>
        <div style={{maxWidth:800,margin:'0 auto',padding:'0 24px'}}>
          <div style={{textAlign:'center',marginBottom:64}}>
            <h2 style={{fontSize:'clamp(28px,3.5vw,44px)',fontWeight:900,color:'#0f172a',marginBottom:12,letterSpacing:'-1px'}}>Pertanyaan yang Sering Ditanyakan</h2>
            <p style={{fontSize:17,color:'#64748b'}}>Masih ada pertanyaan? Kami siap membantu.</p>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[
              {q:'Apakah karyawan perlu install aplikasi?',a:'Tidak sama sekali. Karyawan cukup menggunakan WhatsApp yang sudah ada di HP mereka. Kirim foto selfie + ketik HADIR, selesai. Tidak ada download, tidak ada akun baru.'},
              {q:'Bagaimana cara kerja GPS-nya?',a:'Saat karyawan mengirim lokasi di WhatsApp, sistem mencatat koordinat dan mengubahnya menjadi nama jalan/area via OpenStreetMap. Admin bisa melihat di dashboard secara real-time. Radius kantor bisa dikunci sehingga karyawan di luar area tertentu tidak bisa check-in.'},
              {q:'Bisa untuk banyak perusahaan sekaligus?',a:'Ya! Absenin adalah platform multi-tenant. Setiap perusahaan punya dashboard terpisah, data terisolasi penuh, dan bisa menggunakan nomor WhatsApp perusahaan masing-masing. PT A tidak bisa melihat data PT B — dijamin di level database.'},
              {q:'Apakah bisa pakai nomor WhatsApp perusahaan sendiri?',a:'Tentu. Setiap perusahaan menghubungkan akun Fonnte mereka sendiri ke Absenin. Bot WA berjalan atas nama nomor WA perusahaan Anda, bukan nomor bersama. Karyawan menerima pesan dari nomor kantor yang sudah dikenal.'},
              {q:'Bagaimana keamanan dan privasi data karyawan?',a:'Data setiap perusahaan tersimpan dengan isolasi ketat menggunakan company_id di semua tabel. Admin hanya bisa mengakses data perusahaannya sendiri. Superadmin platform bisa memantau status langganan tapi tidak bisa mengakses data karyawan tenant lain.'},
              {q:'Apakah selfie bisa dipalsukan atau diakali?',a:'Tidak mudah. Setiap selfie otomatis di-watermark dengan nama karyawan + timestamp dari server, bukan dari kamera. Sistem juga mencatat IP dan lokasi GPS saat pengiriman. Foto lama atau foto orang lain tidak bisa lolos verifikasi.'},
            ].map((f,i)=>(
              <details key={i} style={{background:'#fff',borderRadius:18,border:'1.5px solid #e2e8f0',overflow:'hidden'}}>
                <summary style={{padding:'20px 24px',fontWeight:700,color:'#0f172a',fontSize:15,display:'flex',justifyContent:'space-between',alignItems:'center',userSelect:'none'}}>
                  <span>{f.q}</span>
                  <span className="faq-plus" style={{color:'#25D366',fontSize:24,fontWeight:300,transition:'transform .2s',flexShrink:0,marginLeft:16}}>+</span>
                </summary>
                <div style={{padding:'0 24px 20px',color:'#475569',fontSize:14,lineHeight:1.75,borderTop:'1px solid #f1f5f9'}}><br/>{f.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{padding:'120px 0',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,#25D366,#075E54)'}}/>
        <div style={{position:'absolute',inset:0,opacity:.1,backgroundImage:'radial-gradient(circle at 30% 50%,#fff,transparent 50%)'}}/>
        <div style={{position:'absolute',top:-100,right:-100,width:400,height:400,borderRadius:'50%',border:'1px solid rgba(255,255,255,.1)',pointerEvents:'none'}}/>
        <div style={{position:'absolute',bottom:-80,left:-80,width:300,height:300,borderRadius:'50%',border:'1px solid rgba(255,255,255,.08)',pointerEvents:'none'}}/>
        <div style={{maxWidth:800,margin:'0 auto',padding:'0 24px',textAlign:'center',position:'relative'}}>
          <h2 style={{fontSize:'clamp(36px,5vw,64px)',fontWeight:900,color:'#fff',marginBottom:20,letterSpacing:'-1.5px',lineHeight:1.05}}>Mulai Sekarang,<br/>Gratis.</h2>
          <p style={{fontSize:19,color:'rgba(255,255,255,.85)',marginBottom:48,maxWidth:500,margin:'0 auto 48px',lineHeight:1.65}}>Daftar dalam 30 detik. Gratis 10 karyawan. Tidak perlu kartu kredit. Setup 5 menit, langsung jalan.</p>
          <Link href="/register" style={{display:'inline-flex',alignItems:'center',gap:12,background:'#fff',color:'#25D366',padding:'18px 48px',borderRadius:18,fontSize:18,fontWeight:900,textDecoration:'none',boxShadow:'0 8px 40px rgba(0,0,0,.2)',transition:'transform .18s,box-shadow .18s'}} onMouseOver={e=>{e.currentTarget.style.transform='scale(1.04)';e.currentTarget.style.boxShadow='0 12px 48px rgba(0,0,0,.3)'}} onMouseOut={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 8px 40px rgba(0,0,0,.2)'}}>
            🚀 Buat Akun Gratis
          </Link>
          <p style={{color:'rgba(255,255,255,.65)',fontSize:13,marginTop:24,fontWeight:600}}>✅ Gratis &nbsp;·&nbsp; ✅ Tanpa kartu kredit &nbsp;·&nbsp; ✅ Setup 5 menit &nbsp;·&nbsp; ✅ Cancel kapan saja</p>
        </div>
      </section>

{/*       <section className="py-20 bg-gray-50 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16"><h2 className="text-3xl md:text-4xl font-bold mb-4">Fitur Lengkap Absenin</h2></div>
          <div className="grid md:grid-cols-3 gap-8">
            {[{icon:'📸',t:'Selfie Verification',d:'Wajib foto selfie saat check-in/out.'},{icon:'🕐',t:'Auto Lembur',d:'Pulang > jam kerja = otomatis tercatat.'},{icon:'📍',t:'GPS + Live Map',d:'OpenStreetMap + radius kantor.'},{icon:'💬',t:'WhatsApp Bot',d:'Fonnte API per-tenant.'},{icon:'🏢',t:'Multi-Tenant',d:'Setiap perusahaan punya akun sendiri.'},{icon:'💰',t:'Payment Bank Transfer',d:'Upgrade paket via transfer bank.'},{icon:'👥',t:'HRM Lengkap',d:'Divisi, jabatan, KTP, NPWP, gaji.'},{icon:'🏖️',t:'Cuti & Lembur',d:'Pengajuan cuti + approval.'},{icon:'⚙️',t:'Settings Lengkap',d:'WA token, lokasi kantor, radius.'}].map((f,i)=>(
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md border border-gray-100"><div className="text-4xl mb-4">{f.icon}</div><h3 className="text-lg font-semibold mb-2">{f.t}</h3><p className="text-gray-600 text-sm">{f.d}</p></div>
            ))}
          </div>
        </div>
      </section> */}

{/*       <section className="py-20 bg-brand-500 px-4"><div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Siap Digitalisasi Absensi?</h2>
        <p className="text-brand-100 text-lg mb-8">Gratis 10 karyawan. Setup 5 menit.</p>
        <Link href="/register" className="inline-flex items-center gap-2 bg-white text-brand-600 px-8 py-4 rounded-xl text-lg font-bold hover:bg-brand-50 shadow-lg">🚀 Mulai Gratis</Link>
      </div></section> */}

{/*       <footer className="bg-gray-900 text-gray-400 py-12 px-4"><div className="max-w-7xl mx-auto text-center">
        <p className="text-sm">© 2025 Absenin. Made with ❤️ By WellArtDev in Indonesia.</p>
      </div></footer> */} {/* ── FOOTER ── */}
      <footer style={{background:'#020617',padding:'72px 0 40px',color:'#475569'}}>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'0 24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:48,marginBottom:56}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
                <div style={{width:34,height:34,borderRadius:10,background:'linear-gradient(135deg,#25D366,#075E54)',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{color:'#fff',fontWeight:900,fontSize:15}}>A</span></div>
                <span style={{fontSize:20,fontWeight:900,color:'#fff',letterSpacing:'-0.5px'}}>Absenin</span>
              </div>
              <p style={{fontSize:14,lineHeight:1.75,maxWidth:300,margin:'0 0 20px'}}>Sistem absensi karyawan modern via WhatsApp. Multi-tenant SaaS, selfie verification, GPS real-time, HRM lengkap untuk perusahaan Indonesia.</p>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {['Next.js','Node.js','PostgreSQL','WhatsApp','Fonnte','OpenStreetMap'].map(t=>(
                  <span key={t} style={{background:'rgba(255,255,255,.05)',color:'#475569',fontSize:11,padding:'4px 10px',borderRadius:8,border:'1px solid rgba(255,255,255,.08)'}}>{t}</span>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{color:'#fff',fontWeight:800,fontSize:14,marginBottom:20}}>Produk</h4>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                {[['#fitur','Fitur'],['#cara-kerja','Cara Kerja'],['#harga','Harga'],['#faq','FAQ']].map(([h,l])=>(
                  <a key={h} href={h} style={{fontSize:14,color:'#475569',textDecoration:'none',transition:'color .15s'}}>{l}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 style={{color:'#fff',fontWeight:800,fontSize:14,marginBottom:20}}>Akun</h4>
              <div style={{display:'flex',flexDirection:'column',gap:12}}>
                <Link href="/register" style={{fontSize:14,color:'#475569',textDecoration:'none'}}>Daftar Gratis</Link>
                <Link href="/login" style={{fontSize:14,color:'#475569',textDecoration:'none'}}>Masuk</Link>
              </div>
            </div>
          </div>
          <div style={{borderTop:'1px solid rgba(255,255,255,.06)',paddingTop:32,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
            <p style={{fontSize:13,margin:0}}>© {new Date().getFullYear()} Absenin. Made with ❤️ By WellArtDev in Indonesia.</p>
            <p style={{fontSize:13,margin:0}}>#1st Absensi Karyawan via WhatsApp · Multi-Tenant SaaS · HRM Indonesia</p>
          </div>
        </div>
      </footer>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
    </div>
  );
}
