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

function toImageUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
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

      <article className="max-w-5xl mx-auto px-4 py-10">
        <Link href="/blog" className="inline-flex text-xs uppercase tracking-[0.2em] text-gray-500 hover:text-black mb-6">
          ← Back To Newsroom
        </Link>

        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
            {new Date(post.published_at || post.created_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}
            {post.author_name ? ` · ${post.author_name}` : ''}
          </p>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mt-3">{post.title}</h1>
          {post.excerpt && <p className="text-gray-700 mt-5 text-lg max-w-3xl leading-8">{post.excerpt}</p>}
        </header>

        {post.feature_image_url && (
          <div className="mb-8 bg-white border border-gray-200">
            <img
              src={toImageUrl(post.feature_image_url)}
              alt={post.title}
              className="w-full max-h-[560px] object-cover"
            />
          </div>
        )}

        <div
          className="prose prose-gray max-w-none bg-white border border-gray-200 p-6 md:p-10"
          dangerouslySetInnerHTML={{ __html: post.content_html }}
        />
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
    </main>
  );
}
