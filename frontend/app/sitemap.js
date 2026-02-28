const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://absenin.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || APP_URL;

async function fetchPublishedPosts() {
  const posts = [];
  let page = 1;
  const limit = 100;
  const maxPages = 50;

  while (page <= maxPages) {
    const response = await fetch(`${API_URL}/api/blog?page=${page}&limit=${limit}`, {
      next: { revalidate: 300 }
    });

    if (!response.ok) {
      break;
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.data) ? payload.data : [];
    posts.push(...rows);

    const totalPages = Number(payload?.pagination?.totalPages) || 1;
    if (page >= totalPages || rows.length === 0) {
      break;
    }
    page += 1;
  }

  return posts;
}

export default async function sitemap() {
  const now = new Date();
  const staticRoutes = [
    {
      url: `${APP_URL}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1
    },
    {
      url: `${APP_URL}/blog`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9
    }
  ];

  let blogRoutes = [];
  try {
    const posts = await fetchPublishedPosts();
    blogRoutes = posts
      .filter((post) => post?.slug)
      .map((post) => ({
        url: `${APP_URL}/blog/${post.slug}`,
        lastModified: post.published_at || post.created_at || now,
        changeFrequency: 'weekly',
        priority: 0.7
      }));
  } catch (error) {
    console.error('Failed to build dynamic blog sitemap:', error);
  }

  return [...staticRoutes, ...blogRoutes];
}
