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
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
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
  return text.slice(0, 170) || 'Baca insight terbaru seputar HR, absensi, dan payroll di Absenin.';
}

export default async function BlogPage() {
  const posts = await getPosts();
  const [featured, ...restPosts] = posts;
  const recentPosts = posts.slice(0, 6);

  return (
    <main className="min-h-screen bg-[#f5f5f5] text-[#111111]">
      <header className="bg-[#111111] text-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-wide">ABSENIN</Link>
          <nav className="flex items-center gap-5 text-sm uppercase tracking-widest">
            <Link href="/" className="opacity-80 hover:opacity-100">Home</Link>
            <Link href="/blog" className="opacity-100">Newsroom</Link>
            <Link href="/register" className="bg-white text-black px-3 py-1.5 text-xs font-semibold">Start</Link>
          </nav>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Absenin Newsroom</p>
          <h1 className="text-4xl md:text-6xl font-black mt-2">Stories, Product, and Company Updates</h1>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white border border-gray-200 p-12 text-center text-gray-500">Belum ada artikel.</div>
        ) : (
          <div className="space-y-10">
            {featured && (
              <article className="bg-white border border-gray-200 overflow-hidden">
                <div className="grid lg:grid-cols-[1.3fr_1fr]">
                  <div className="min-h-[340px] bg-gray-200">
                    {featured.feature_image_url ? (
                      <img src={toImageUrl(featured.feature_image_url)} alt={featured.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                    )}
                  </div>
                  <div className="p-8 md:p-10">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-3">Featured</p>
                    <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">{featured.title}</h2>
                    <p className="text-gray-500 text-sm mt-3">{formatDate(featured.published_at || featured.created_at)}</p>
                    <p className="text-gray-700 leading-7 mt-5">{plainExcerpt(featured)}</p>
                    <Link href={`/blog/${featured.slug}`} className="inline-flex mt-7 bg-black text-white px-5 py-3 text-sm font-semibold uppercase tracking-wide hover:bg-gray-800">
                      View Story
                    </Link>
                  </div>
                </div>
              </article>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
              <div className="grid sm:grid-cols-2 gap-6">
                {restPosts.map((post) => (
                  <article key={post.id} className="bg-white border border-gray-200 overflow-hidden">
                    <div className="h-48 bg-gray-200">
                      {post.feature_image_url ? (
                        <img src={toImageUrl(post.feature_image_url)} alt={post.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300" />
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 mb-2">Story</p>
                      <h3 className="text-xl font-bold leading-tight min-h-[60px]">{post.title}</h3>
                      <p className="text-gray-500 text-xs mt-2">{formatDate(post.published_at || post.created_at)}</p>
                      <p className="text-sm text-gray-700 mt-4 line-clamp-3">{plainExcerpt(post)}</p>
                      <Link href={`/blog/${post.slug}`} className="inline-flex mt-5 text-sm font-semibold uppercase tracking-wide hover:underline">
                        Read More
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="space-y-6">
                <div className="bg-[#101820] text-white p-8">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-300 mb-3">Platform Update</p>
                  <h3 className="text-2xl font-bold leading-tight">Absensi WhatsApp, Payroll, dan HR dalam Satu Produk</h3>
                  <p className="text-gray-300 mt-4 leading-7 text-sm">
                    Ikuti pembaruan fitur, rilis terbaru, dan insight implementasi Absenin untuk tim operasional.
                  </p>
                  <Link href="/register" className="inline-flex mt-6 bg-white text-black px-4 py-2 text-xs font-bold uppercase tracking-wide">
                    Coba Gratis
                  </Link>
                </div>

                <div className="bg-white border border-gray-200 p-6">
                  <h4 className="text-lg font-bold uppercase tracking-wide mb-4">Latest Stories</h4>
                  <div className="space-y-4">
                    {recentPosts.map((post) => (
                      <Link key={post.id} href={`/blog/${post.slug}`} className="block border-b border-gray-100 pb-4 last:border-none last:pb-0">
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">News</p>
                        <p className="font-semibold leading-6 hover:underline">{post.title}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
