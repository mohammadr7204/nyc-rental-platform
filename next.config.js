/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8000/api',
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  },
  images: {
    domains: [
      'localhost',
      process.env.AWS_S3_BUCKET + '.s3.amazonaws.com',
      process.env.AWS_S3_BUCKET + '.s3.us-east-1.amazonaws.com',
      'images.unsplash.com', // For demo images
      'via.placeholder.com' // For placeholder images
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      }
    ]
  },
  webpack: (config, { isServer }) => {
    // Handle node modules that need to be transpiled
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ]
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL || 'http://localhost:8000/api'}/:path*`,
      },
    ];
  }
};

module.exports = nextConfig;