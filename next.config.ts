import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // 旧URL（/ja プレフィックス時代）からの移行リダイレクト
      {
        source: '/ja',
        destination: '/booking',
        permanent: true,
      },
      {
        source: '/ja/:path*',
        destination: '/booking/:path*',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
