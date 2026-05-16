import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: false,
  crossOrigin: "anonymous",
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer-when-downgrade" },
          {
            key: "Content-Security-Policy",
            // TEMPORARY: Allow 'unsafe-eval' to diagnose CSP/eval issues with third-party widgets.
            // Remove 'unsafe-eval' as soon as debugging is complete.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.pusher.com https://www.youtube-nocookie.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "media-src 'self' blob: https:",
              "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
              "connect-src 'self' https: wss: blob:",
            ].join("; ")
          },
        ],
      },
    ];
  },
};

export default nextConfig;
