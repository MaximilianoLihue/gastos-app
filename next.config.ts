import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['tesseract.js'],
  allowedDevOrigins: ['192.168.1.40'],
};

export default nextConfig;
