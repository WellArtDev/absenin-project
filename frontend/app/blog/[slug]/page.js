import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://absenin.com';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://absenin.com';

async function getPost(slug) {
  const res = await fetch(`${API_URL}/api/blog/${encodeURIComponent(slug)}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data || null;
}

async function getRecentPosts() {
  const res = await fetch(`${API_URL}/api/blog?limit=6`, { cache: 'no-store' });
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

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ');
}

function textToHtml(value = '') {
  const normalized = String(value).trim();
  if (!normalized) return '<p></p>';

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

function normalizeContentHtml(html = '') {
  const decoded = decodeHtmlEntities(html);
  const prepared = /<[a-z][\s\S]*>/i.test(decoded) ? decoded : textToHtml(decoded);

  return String(prepared)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+=(['"]).*?\1/gi, '')
    .replace(/\shref=(['"])javascript:.*?\1/gi, ' href="#"');
}

export async function generateMetadata({ params }) {
  const post = await getPost(params.slug);
  if (!post) {
    return {
      title: 'Artikel Tidak Ditemukan - Blog Absenin',
      robots: { index: false, follow: false }
    };
  }

  const description = (post.excerpt || stripHtml(post.content_html).slice(0, 160)).slice(0, 160);
  const image = post.feature_image_url ? toImageUrl(post.feature_image_url) : undefined;

  return {
    title: `${post.title} - Blog Absenin`,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description,
      type: 'article',
      url: `${SITE_URL}/blog/${post.slug}`,
      images: image ? [{ url: image }] : undefined,
      publishedTime: post.published_at || post.created_at,
      authors: post.author_name ? [post.author_name] : undefined
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title: post.title,
      description,
      images: image ? [image] : undefined
    }
  };
}

export default async function BlogDetailPage({ params }) {
  const post = await getPost(params.slug);
  if (!post) notFound();
  const recentPosts = (await getRecentPosts()).filter((item) => item.slug !== post.slug).slice(0, 5);
  const normalizedContent = normalizeContentHtml(post.content_html || '');
  const shareUrl = `${SITE_URL}/blog/${post.slug}`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(post.title);

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: { '@type': 'Person', name: post.author_name || 'Tim Absenin' },
    publisher: { '@type': 'Organization', name: 'Absenin' },
    image: post.feature_image_url ? [toImageUrl(post.feature_image_url)] : undefined,
    description: post.excerpt || stripHtml(post.content_html).slice(0, 160),
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`
  };

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
        <Link href="/blog" className="inline-flex text-xs uppercase tracking-[0.2em] text-gray-500 hover:text-black mb-6">
          ← Back To Blog
        </Link>

        <article className="bg-white border border-gray-200 overflow-hidden">
          <div className="relative min-h-[320px] md:min-h-[520px] bg-gray-200">
            {post.feature_image_url ? (
              <img
                src={toImageUrl(post.feature_image_url)}
                alt={post.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="relative z-10 px-6 md:px-12 py-10 md:py-16 min-h-[320px] md:min-h-[520px] flex flex-col justify-end">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9ff7c4] font-bold">{post.category || 'Blog'}</p>
              <h1 className="text-3xl md:text-6xl font-black leading-tight mt-3 text-white max-w-5xl">{post.title}</h1>
              <p className="text-sm text-white/85 mt-4">
                {new Date(post.published_at || post.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                {post.author_name ? ` · ${post.author_name}` : ''}
              </p>
            </div>
          </div>
        </article>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
          <div className="xl:col-span-8 space-y-6">
            {post.excerpt && (
              <div className="bg-white border border-gray-200 p-6 md:p-8">
                <p className="text-xl md:text-2xl leading-9 text-[#075E54] font-medium">{post.excerpt}</p>
              </div>
            )}
            <div className="bg-white border border-gray-200 p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center px-4 py-2 bg-[#4f46e5] text-white font-bold text-sm uppercase tracking-wide">Share</span>
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 rounded-full bg-[#7e8aa3] text-white text-sm font-semibold hover:bg-[#6b7690]">Facebook</a>
                <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 rounded-full bg-[#7e8aa3] text-white text-sm font-semibold hover:bg-[#6b7690]">Twitter</a>
                <a href={`https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 rounded-full bg-[#7e8aa3] text-white text-sm font-semibold hover:bg-[#6b7690]">Pinterest</a>
                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${post.title} - ${shareUrl}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 rounded-full bg-[#7e8aa3] text-white text-sm font-semibold hover:bg-[#6b7690]">WhatsApp</a>
              </div>
            </div>
            <div
              className="prose prose-gray max-w-none bg-white border border-gray-200 p-6 md:p-10 prose-headings:text-[#075E54] prose-a:text-[#128C7E] [&_*]:max-w-full [&_*]:whitespace-normal [&_*]:break-words [&_img]:h-auto [&_img]:my-6 [&_table]:block [&_table]:overflow-x-auto [&_pre]:overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: normalizedContent }}
            />
          </div>

          <aside className="xl:col-span-4 space-y-6">
            <div className="bg-[#128C7E] text-white p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-white/80 mb-3">Product Highlight</p>
              <h3 className="text-2xl font-bold leading-tight">Absensi WhatsApp untuk Tim Lapangan dan Kantor</h3>
              <p className="text-white/90 mt-4 leading-7 text-sm">
                Gunakan Absenin untuk monitoring kehadiran, lembur, dan payroll secara real-time.
              </p>
              <Link href="/register" className="inline-flex mt-6 bg-[#075E54] hover:bg-[#05463f] text-white px-4 py-2 text-xs font-bold uppercase tracking-wide">
                Coba Gratis
              </Link>
            </div>

            <div className="bg-white border border-gray-200 p-6">
              <h4 className="text-lg font-bold mb-4 text-[#075E54]">Recent Posts</h4>
              <div className="space-y-4">
                {recentPosts.map((item) => (
                  <Link key={item.id} href={`/blog/${item.slug}`} className="grid grid-cols-[64px_1fr] gap-3 items-center group">
                    <div className="h-16 bg-gray-200">
                      {item.feature_image_url ? (
                        <img src={toImageUrl(item.feature_image_url)} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                      )}
                    </div>
                    <span className="text-sm leading-6 group-hover:underline">{item.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
    </main>
  );
}
