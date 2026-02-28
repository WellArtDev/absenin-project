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
      <header className="bg-white/95 backdrop-blur border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-white border border-green-100 p-1 inline-flex">
              <img src="/logo-absenin.svg" alt="Absenin Logo" className="w-full h-full object-contain" />
            </span>
            <span className="text-xl font-bold text-gray-900">Absenin</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-600">
            <Link href="/#fitur" className="hover:text-[#25D366]">Fitur</Link>
            <Link href="/#harga" className="hover:text-[#25D366]">Harga</Link>
            <Link href="/blog" className="text-[#128C7E]">Blog</Link>
            <Link href="/login" className="hover:text-[#25D366]">Masuk</Link>
            <Link href="/register" className="bg-[#25D366] hover:bg-[#128C7E] text-white px-4 py-2 rounded-lg">Mulai Gratis</Link>
          </nav>
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
                    <p className="text-xs uppercase tracking-[0.2em] font-bold text-[#9ff7c4]">Featured Story</p>
                    <h2 className="text-3xl md:text-5xl font-black leading-tight mt-3 max-w-3xl">{featured.title}</h2>
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
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#128C7E] font-bold">Blog</p>
                        <h3 className="text-2xl font-extrabold leading-tight mt-2 text-[#075E54]">{post.title}</h3>
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

      <footer style={{ background: '#020617', padding: '64px 0 36px', color: '#64748b' }}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-10 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white border border-green-100 p-1">
                  <img src="/logo-absenin.svg" alt="Absenin Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-white text-xl font-bold">Absenin</span>
              </div>
              <p className="text-sm leading-7 max-w-sm">Sistem absensi karyawan modern via WhatsApp dengan selfie verification, GPS, lembur otomatis, dan payroll.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Produk</h4>
              <div className="space-y-2 text-sm">
                <Link href="/#fitur" className="block hover:text-[#25D366]">Fitur</Link>
                <Link href="/#harga" className="block hover:text-[#25D366]">Harga</Link>
                <Link href="/blog" className="block hover:text-[#25D366]">Blog</Link>
              </div>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Akun</h4>
              <div className="space-y-2 text-sm">
                <Link href="/login" className="block hover:text-[#25D366]">Masuk</Link>
                <Link href="/register" className="block hover:text-[#25D366]">Daftar Gratis</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-sm flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
            <p>© {new Date().getFullYear()} Absenin. All rights reserved.</p>
            <p>#1st Absensi Karyawan via WhatsApp</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
