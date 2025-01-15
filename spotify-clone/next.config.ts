import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "btpllmbaopwljputtqqs.supabase.co",
      },
    ],
  },
};

export default nextConfig;
