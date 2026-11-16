import Link from "next/link";

export const metadata = { title: "How BlameTV works — BlameTV" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">How BlameTV works</h1>
      <p className="mt-2 text-sm text-[#aaaaaa]">
        A quick tour of every feature, how the recommendation algorithm works, and how your data is
        protected.
      </p>

      <div className="mt-8 space-y-6 text-sm leading-6 text-[#d4d4d4] [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#f1f1f1] [&_li]:ml-5 [&_li]:list-disc">
        <h2>Watching</h2>
        <ul>
          <li><strong>No account needed to watch.</strong> Anyone can browse, search and watch public videos — signed in or not.</li>
          <li>The home feed shows <strong>Trending</strong> for anonymous visitors and <strong>Recommended</strong> for signed-in users.</li>
          <li>Category chips at the top filter the feed by topic.</li>
        </ul>

        <h2>The recommendation algorithm</h2>
        <p>BlameTV uses a transparent scoring system — no black box. Every candidate video gets a score:</p>
        <ul>
          <li><strong>Trending score:</strong> views ÷ (age in hours + 2)<sup>1.4</sup> — fresh popular videos rank higher than old viral ones.</li>
          <li><strong>Tag affinity:</strong> videos tagged like the ones you watch or liked get up to +4 points.</li>
          <li><strong>Category affinity:</strong> categories you watch often get +0.5 per past view/like.</li>
          <li><strong>Subscriptions:</strong> videos from channels you subscribe to get +6.</li>
          <li><strong>Already seen:</strong> videos in your history or likes get −8 so feeds stay fresh.</li>
        </ul>
        <p>
          &quot;Up next&quot; on the watch page uses the same engine: shared tags (×3), same
          category (+2), same channel (+1.5), plus a small trending boost.
        </p>

        <h2>⬆ Adding videos</h2>
        <ul>
          <li><strong>Upload file:</strong> MP4/WebM/OGG/MOV, stored on the server and streamed with range requests (instant seeking).</li>
          <li><strong>Import from link:</strong> paste a YouTube, Vimeo, Dailymotion, Twitch or Streamable URL. The video streams from the original platform in an embedded player — zero storage used.</li>
          <li>Every upload requires a rights confirmation checkbox before publishing.</li>
        </ul>

        <h2>Profile customization</h2>
        <ul>
          <li>Static avatars/banners: JPG, PNG, WebP.</li>
          <li><strong>Animated avatars:</strong> GIF or animated WebP, max 5 seconds (checked server-side).</li>
          <li><strong>Animated banners:</strong> GIF or animated WebP, max 10 seconds.</li>
          <li>Live preview in Settings before you save.</li>
        </ul>

        <h2>Privacy &amp; security</h2>
        <ul>
          <li>Passwords are hashed with bcrypt (cost 12) — even admins cannot read them.</li>
          <li>Sessions use signed JWTs in httpOnly cookies — JavaScript and other sites cannot touch them.</li>
          <li>Your email and watch history are never shown to anyone but you.</li>
          <li>Login, registration, uploads, comments and reports are rate-limited against abuse.</li>
          <li>Strict Content-Security-Policy, clickjacking protection, and MIME sniffing protection on every page.</li>
          <li>Export all your data as JSON, or delete your account permanently, from Settings.</li>
        </ul>

        <h2>Safety &amp; legal</h2>
        <ul>
          <li>Report any video or comment with the ⚑ button — admins review the queue.</li>
          <li>
            Full <Link href="/legal/terms" className="text-[#3ea6ff] underline">Terms of Service</Link>,{" "}
            <Link href="/legal/privacy" className="text-[#3ea6ff] underline">Privacy Policy</Link>,{" "}
            <Link href="/legal/dmca" className="text-[#3ea6ff] underline">DMCA process</Link> and{" "}
            <Link href="/legal/guidelines" className="text-[#3ea6ff] underline">Community Guidelines</Link>{" "}
            are linked in the footer of every page.
          </li>
        </ul>

        <h2>For admins</h2>
        <ul>
          <li>The first account created becomes an admin automatically.</li>
          <li>The admin panel shows site stats, the report queue, and user role management.</li>
        </ul>
      </div>
    </div>
  );
}
