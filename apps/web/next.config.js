/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Local dev only – proxy API calls to the Express server
    if (process.env.NODE_ENV === 'development') {
      const apiBase = process.env.API_URL || 'http://localhost:4000';
      return [
        { source: '/flights/:path*', destination: `${apiBase}/flights/:path*` },
        { source: '/health', destination: `${apiBase}/health` },
      ];
    }
    return [];
  },
};

module.exports = nextConfig;
