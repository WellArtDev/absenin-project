import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function getPost(slug) {
  const res = await fetch(`${API_URL}/api/blog/${encodeURIComponent(slug)}`, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data || null;
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
  const image = post.feature_image_url ? `${API_URL}${post.feature_image_url}` : undefined;

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

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: { '@type': 'Person', name: post.author_name || 'Tim Absenin' },
    publisher: { '@type': 'Organization', name: 'Absenin' },
    image: post.feature_image_url ? [`${API_URL}${post.feature_image_url}`] : undefined,
    description: post.excerpt || stripHtml(post.content_html).slice(0, 160),
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <article className="max-w-3xl mx-auto px-4 py-10">
        <header className="mb-6">
          <p className="text-sm text-gray-500">
            {new Date(post.published_at || post.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}
            {post.author_name ? ` · ${post.author_name}` : ''}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">{post.title}</h1>
          {post.excerpt && <p className="text-gray-600 mt-3 text-lg">{post.excerpt}</p>}
        </header>

        {post.feature_image_url && (
          <img
            src={`${API_URL}${post.feature_image_url}`}
            alt={post.title}
            className="w-full rounded-2xl border mb-8 object-cover"
          />
        )}

        <div
          className="prose prose-gray max-w-none bg-white rounded-2xl border p-6 md:p-8"
          dangerouslySetInnerHTML={{ __html: post.content_html }}
        />
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
    </main>
  );
}

