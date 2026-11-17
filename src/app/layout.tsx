import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { getSessionUser, listStashedAccounts } from "@/lib/auth";

export const viewport: Viewport = {
  themeColor: "#0f0f0f",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  ),
  title: "BlameTV Beta",
  description: "Watch, repost and share videos on BlameTV Beta — no ads, no uploads, just embeds",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  const accounts = user ? await listStashedAccounts() : [];

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f0f0f] text-[#f1f1f1] antialiased">
        <AppShell user={user} accounts={accounts}>{children}</AppShell>
      </body>
    </html>
  );
}
