import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  allowedDevOrigins: [
    'clinica-demo.lvh.me',
    '*.lvh.me',
  ],
}

export default nextConfig
