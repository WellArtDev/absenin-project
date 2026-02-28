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
              <p className="text-xs uppercase tracking-[0.2em] text-[#9ff7c4] font-bold">Blog</p>
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
            <div
              className="prose prose-gray max-w-none bg-white border border-gray-200 p-6 md:p-10 prose-headings:text-[#075E54] prose-a:text-[#128C7E]"
              dangerouslySetInnerHTML={{ __html: post.content_html }}
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
    </main>
  );
}
