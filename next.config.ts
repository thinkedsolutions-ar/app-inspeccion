import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Esto ignora los errores de tipo durante el despliegue
    ignoreBuildErrors: true,
  },
  eslint: {
    // Esto ignora errores de formato de código durante el despliegue
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;