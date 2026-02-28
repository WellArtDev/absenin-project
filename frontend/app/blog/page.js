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

export default async function BlogPage() {
  const posts = await getPosts();
  const recentPosts = posts.slice(0, 5);

  return (
    <main className="min-h-screen bg-[#f2f2f2]">
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-[#1f3f70]">Blog Absenin</h1>
          <p className="text-gray-600 mt-2">Artikel absensi, HR, payroll, dan produktivitas tim.</p>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white border border-gray-200 p-12 text-center text-gray-500">Belum ada artikel.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[2.2fr_1fr] gap-6">
            <div className="space-y-5">
              {posts.map((post) => (
                <article key={post.id} className="bg-white border border-gray-200 p-6">
                  <h2 className="text-3xl font-semibold text-[#1f3f70] leading-tight">{post.title}</h2>
                  <p className="text-gray-700 mt-2 mb-4 text-sm">{formatDate(post.published_at || post.created_at)}</p>

                  <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 items-start">
                    <div className="w-full h-[190px] bg-[#dbf8e8] overflow-hidden">
                      {post.feature_image_url ? (
                        <img src={toImageUrl(post.feature_image_url)} alt={post.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#e8f3ef]" />
                      )}
                    </div>

                    <div>
                      <p className="text-[#1b1f2d] text-base leading-8">
                        {post.excerpt || 'Baca insight terbaru seputar HR, absensi, dan payroll di Absenin.'}
                      </p>
                      <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex mt-5 bg-[#1f1f27] text-white px-5 py-3 text-xl font-medium hover:bg-black transition-colors"
                      >
                        Read more
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="space-y-5">
              <div className="bg-[#7ca4cc] p-8 text-white">
                <h3 className="text-4xl font-semibold mb-5">Product Highlight</h3>
                <p className="text-[17px] leading-8 opacity-95">
                  Kelola absensi WhatsApp, lembur, cuti, dan payroll dalam satu dashboard untuk tim Anda.
                </p>
                <Link href="/register" className="inline-flex mt-8 bg-[#1f1f27] text-white px-5 py-3 text-xl font-medium hover:bg-black transition-colors">
                  Learn more
                </Link>
              </div>

              <div className="bg-white border border-gray-200 p-8">
                <h3 className="text-4xl font-semibold text-[#1f1f27] mb-6">Recent Posts</h3>
                <div className="space-y-4">
                  {recentPosts.map((post) => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="grid grid-cols-[66px_1fr] gap-3 items-center group">
                      <div className="w-[66px] h-[66px] bg-[#dbf8e8] overflow-hidden">
                        {post.feature_image_url ? (
                          <img src={toImageUrl(post.feature_image_url)} alt={post.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-[#e8f3ef]" />
                        )}
                      </div>
                      <span className="text-[#2563eb] group-hover:underline leading-6">{post.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
