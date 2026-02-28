const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://absenin.com';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/'
      }
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
    host: APP_URL
  };
}
