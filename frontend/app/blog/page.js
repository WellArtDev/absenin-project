import Link from 'next/link';

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

export default async function BlogPage() {
  const posts = await getPosts();

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Blog Absenin</h1>
          <p className="text-gray-600 mt-2">Insight HR, absensi, payroll, dan produktivitas tim.</p>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center text-gray-500">Belum ada artikel.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((post) => (
              <article key={post.id} className="bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-shadow">
                {post.feature_image_url ? (
                  <img
                    src={`${API_URL}${post.feature_image_url}`}
                    alt={post.title}
                    className="w-full h-44 object-cover"
                  />
                ) : (
                  <div className="w-full h-44 bg-wa-light" />
                )}
                <div className="p-5">
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(post.published_at || post.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                  </p>
                  <h2 className="text-lg font-bold text-gray-900 line-clamp-2">{post.title}</h2>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-3">{post.excerpt || 'Baca artikel lengkap di sini.'}</p>
                  <Link href={`/blog/${post.slug}`} className="inline-block mt-4 text-sm font-semibold text-wa-dark hover:underline">
                    Baca Selengkapnya
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

