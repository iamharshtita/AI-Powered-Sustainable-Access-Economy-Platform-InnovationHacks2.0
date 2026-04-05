import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "sustainableaccessplatform-listingimagesbucket35876-phncghrg4bto.s3.us-east-1.amazonaws.com",
        pathname: "/items/**",
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
