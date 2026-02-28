/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  images: {
    // Hardening: disable built-in image optimizer endpoint.
    // This reduces exposure to recent Image Optimizer DoS advisories without major Next upgrade.
    unoptimized: true,
    formats: ['image/webp'],
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  // Trust proxy headers when behind nginx
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};
