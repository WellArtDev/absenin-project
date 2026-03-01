import Link from 'next/link';

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://absenin.com';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://absenin.com';

export const metadata = {
  title: 'Blog Absenin - Insight HR, Absensi, dan Produktivitas',
  description: 'Artikel terbaru seputar absensi karyawan, HR, payroll, lembur, dan produktivitas tim dari Absenin.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog Absenin',
    description: 'Insight HR, absensi, payroll, dan produktivitas tim.',
    type: 'website',
    url: `${SITE_URL}/blog`
  }
};

async function getPosts() {
  const res = await fetch(`${API_URL}/api/blog?limit=24`, { cache: 'no-store' });
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data || [];
}

function toImageUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const normalized = url.startsWith('/') ? url : `/${url}`;
  const migrated = normalized.startsWith('/uploads/blog/')
    ? normalized.replace('/uploads/blog/', '/api/uploads/blog/')
    : normalized;
  return `${API_URL}${migrated}`;
}

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function plainExcerpt(post) {
  if (post?.excerpt) return post.excerpt;
  const text = String(post?.content_html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 200) || 'Baca insight terbaru seputar HR, absensi, dan payroll di Absenin.';
}

export default async function BlogPage() {
  const posts = await getPosts();
  const [featured, ...restPosts] = posts;
  const recentPosts = posts.slice(0, 7);

  return (
    <main className="min-h-screen bg-[#f3f6f4] text-[#111111]">
      <header style={{background:'rgba(255,255,255,.92)',backdropFilter:'blur(20px)',borderBottom:'1px solid #f1f5f9',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:1280,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:64}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:34,height:34,borderRadius:10,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 12px rgba(37,211,102,.25)',padding:'5px',border:'1px solid #d1fae5'}}>
              <img src="/logo-absenin.svg" alt="Absenin Logo" style={{width:'100%',height:'100%',objectFit:'contain'}} />
            </div>
            <span style={{fontSize:20,fontWeight:900,color:'#075E54',letterSpacing:'-0.5px'}}>Absenin</span>
          </div>
          <div style={{display:'flex',gap:28,alignItems:'center'}}>
            <div style={{display:'flex',gap:24}} className="hidden md:flex">
              {[
                ['/', 'Beranda'],
                ['/#fitur', 'Fitur'],
                ['/#cara-kerja', 'Cara Kerja'],
                ['/#harga', 'Harga'],
                ['/#faq', 'FAQ'],
                ['/blog', 'Blog']
              ].map(([h, l]) => (
                <Link key={h} href={h} className={`text-sm font-semibold transition-colors ${h === '/blog' ? 'text-[#25D366]' : 'text-[#64748b] hover:text-[#25D366]'}`}>
                  {l}
                </Link>
              ))}
            </div>
            <div style={{display:'flex',gap:10,alignItems:'center'}}>
              <Link href="/login" style={{fontSize:14,fontWeight:700,color:'#374151',textDecoration:'none',padding:'8px 14px',borderRadius:10}}>Masuk</Link>
              <Link href="/register" className="btn-primary" style={{padding:'9px 20px',fontSize:14,borderRadius:12}}>Mulai Gratis →</Link>
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-[#128C7E] font-bold">Kategori</p>
          <h1 className="text-3xl md:text-5xl font-black mt-2 text-[#075E54]">Blog</h1>
          <p className="mt-3 text-gray-600">Berita produk, insight HR, payroll, dan absensi WhatsApp untuk operasional tim.</p>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white border border-gray-200 p-12 text-center text-gray-500">Belum ada artikel.</div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <div className="xl:col-span-8 space-y-6">
            {featured && (
              <article className="bg-white border border-gray-200 overflow-hidden">
                <div className="relative min-h-[420px]">
                  <div className="absolute inset-0 bg-gray-200">
                    {featured.feature_image_url ? (
                      <img src={toImageUrl(featured.feature_image_url)} alt={featured.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="relative z-10 p-6 md:p-10 flex flex-col justify-end min-h-[420px] text-white">
                    <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#9ff7c4]">
                      {featured.category || 'Featured Story'}
                    </p>
                    <h2 className="text-3xl md:text-5xl font-black leading-tight mt-3 max-w-3xl">
                      <Link href={`/blog/${featured.slug}`} className="hover:underline">
                        {featured.title}
                      </Link>
                    </h2>
                    <p className="text-sm text-white/85 mt-4">{formatDate(featured.published_at || featured.created_at)}</p>
                    <Link href={`/blog/${featured.slug}`} className="inline-flex mt-6 bg-[#25D366] hover:bg-[#128C7E] text-white px-5 py-3 text-sm font-bold uppercase tracking-wide w-fit">
                      Baca Artikel
                    </Link>
                  </div>
                </div>
              </article>
            )}

              <div className="space-y-5">
                {restPosts.map((post) => (
                  <article key={post.id} className="bg-white border border-gray-200 p-5 md:p-6">
                    <div className="grid md:grid-cols-[280px_1fr] gap-5 items-start">
                      <div className="h-48 md:h-40 bg-gray-200">
                        {post.feature_image_url ? (
                          <img src={toImageUrl(post.feature_image_url)} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#128C7E] font-bold">{post.category || 'Blog'}</p>
                        <h3 className="text-2xl font-extrabold leading-tight mt-2 text-[#075E54]">
                          <Link href={`/blog/${post.slug}`} className="hover:underline">
                            {post.title}
                          </Link>
                        </h3>
                        <p className="text-gray-500 text-sm mt-2">{formatDate(post.published_at || post.created_at)}</p>
                        <p className="text-gray-700 mt-4 leading-7">{plainExcerpt(post)}</p>
                        <Link href={`/blog/${post.slug}`} className="inline-flex mt-4 bg-[#1f1f27] hover:bg-black text-white px-4 py-2 text-sm font-semibold">
                          Read more
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className="xl:col-span-4 space-y-6">
              <div className="bg-[#128C7E] text-white p-8">
                <p className="text-xs uppercase tracking-[0.2em] text-white/80 mb-3">Product Highlight</p>
                <h3 className="text-2xl font-bold leading-tight">Sistem Absensi Karyawan Via WhatsApp</h3>
                <p className="text-white/85 mt-4 leading-7 text-sm">
                  Absen, lembur, payroll, dan laporan dalam satu sistem. Cocok untuk UMKM sampai enterprise.
                </p>
                <Link href="/register" className="inline-flex mt-6 bg-[#075E54] hover:bg-[#05463f] text-white px-4 py-2 text-xs font-bold uppercase tracking-wide">
                  Learn More
                </Link>
              </div>

              <div className="bg-white border border-gray-200 p-6">
                <h4 className="text-lg font-bold mb-4 text-[#075E54]">Recent Posts</h4>
                <div className="space-y-4">
                  {recentPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="grid grid-cols-[64px_1fr] gap-3 items-center group">
                      <div className="h-16 bg-gray-200">
                        {post.feature_image_url ? (
                          <img src={toImageUrl(post.feature_image_url)} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                        )}
                      </div>
                      <span className="text-sm leading-6 group-hover:underline">{post.title}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-gray-200 p-6">
                <h4 className="text-lg font-bold mb-3 text-[#075E54]">Kategori</h4>
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between"><span>Absensi</span><span className="text-gray-500">12</span></p>
                  <p className="flex justify-between"><span>Payroll</span><span className="text-gray-500">9</span></p>
                  <p className="flex justify-between"><span>HR & People</span><span className="text-gray-500">14</span></p>
                  <p className="flex justify-between"><span>Product Update</span><span className="text-gray-500">7</span></p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>

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
                {[['/','Beranda'],['/#fitur','Fitur'],['/#cara-kerja','Cara Kerja'],['/#harga','Harga'],['/#faq','FAQ'],['/blog','Blog']].map(([h,l])=>(
                  <Link key={h} href={h} style={{fontSize:14,color:'#475569',textDecoration:'none',transition:'color .15s'}}>{l}</Link>
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
    </main>
  );
}
