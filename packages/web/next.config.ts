import type { NextConfig } from 'next'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'clinica-demo.lvh.me',
    '*.lvh.me',
  ],
}

export default nextConfig

initOpenNextCloudflareForDev()
