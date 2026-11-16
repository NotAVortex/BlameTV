import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://i.ytimg.com https://yt3.ggpht.com https://yt3.googleusercontent.com https://www.dailymotion.com https://*.dmcdn.net https://vumbnail.com https://khpzskndakhbsdyhobgm.supabase.co data: blob:",
      "media-src 'self' blob: https://khpzskndakhbsdyhobgm.supabase.co",
      "frame-src https://www.youtube-nocookie.com https://player.vimeo.com https://www.dailymotion.com https://player.twitch.tv https://streamable.com",
      "connect-src 'self'",
      "font-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
