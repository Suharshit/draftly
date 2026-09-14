import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      // Drive redirects its direct-download links to this host, so the
      // optimizer needs it allowed as well.
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async redirects() {
    return [
      // The landing page is served at `/` (app/page.tsx renders it); its source file stays
      // in app/(marketing)/landing/ for editing, so send the old path home.
      {
        source: '/landing',
        destination: '/',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
