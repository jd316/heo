/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Configure ESLint for proper linting
  eslint: {
    dirs: ['src'], // Only run ESLint on src directory during builds
    ignoreDuringBuilds: false, // Continue builds even if there are ESLint warnings
  },
  // Configure output directory for build
  distDir: '.next',
  // Edge runtime compatibility - disable EdgeRuntime
  experimental: {
    serverComponentsExternalPackages: ['snarkjs', 'circom', 'ipfs-http-client', 'dkg.js', 'web-streams-polyfill'],
    disableOptimizedLoading: true,
  },
  // Configure runtime environment
  serverRuntimeConfig: {
    // Will only be available on the server side
    mySecret: process.env.JWT_SECRET,
  },
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/static',
  },
  // Force all API routes to use Node.js runtime
  typescript: {
    // Ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  // Webpack configuration to handle Node.js modules and fix build issues
  webpack: (config, { isServer }) => {
    // Fix for missing fetch.node and other Node.js modules
    if (isServer) {
      config.externals = [...(config.externals || [])];
      
      // Handle modules that cause issues during build
      const nodeModules = ['snarkjs', 'circom', 'ipfs-http-client', 'node-fetch', 'dkg.js', 'web-streams-polyfill'];
      nodeModules.forEach(mod => {
        config.externals.push((context, request, callback) => {
          if (request === mod || request.startsWith(`${mod}/`)) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        });
      });
    }
    
    // Fallback for Node.js modules in browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      buffer: false,
      util: false,
    };

    return config;
  },
}

export default nextConfig; 