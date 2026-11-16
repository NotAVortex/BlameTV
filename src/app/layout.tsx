import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
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
        <Header user={user} />
        <main className="pt-14">{children}</main>
        <footer className="mt-16 border-t border-[#272727] px-6 py-8 text-xs text-[#717171]">
          <div className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2">
            <a href="/legal/terms" className="hover:text-[#f1f1f1]">Terms of Service</a>
            <a href="/legal/privacy" className="hover:text-[#f1f1f1]">Privacy Policy</a>
            <a href="/legal/dmca" className="hover:text-[#f1f1f1]">Copyright / DMCA</a>
            <a href="/legal/guidelines" className="hover:text-[#f1f1f1]">Community Guidelines</a>
            <a href="/about" className="hover:text-[#f1f1f1]">How BlameTV works</a>
            <span className="ml-auto">© {new Date().getFullYear()} BlameTV</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
