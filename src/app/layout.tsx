import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "BlameTV",
  description: "Watch, upload and share videos on BlameTV",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0f0f0f] text-[#f1f1f1] antialiased">
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
