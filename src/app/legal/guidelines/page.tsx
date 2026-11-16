import LegalLayout from "../layout-base";
import { SITE } from "@/lib/site";

export const metadata = { title: "Community Guidelines — BlameTV" };

export default function GuidelinesPage() {
  return (
    <LegalLayout title="Community Guidelines" updated="2025-01-01">
      <p>
        BlameTV is a video community. These rules keep it safe and watchable for everyone.
        Violations can lead to content removal and account termination.
      </p>

      <h2>Not allowed</h2>
      <ul>
        <li><strong>Hate and harassment:</strong> attacks on people based on protected traits, bullying, doxxing, threats.</li>
        <li><strong>Sexual content:</strong> nudity or sexual acts, especially involving minors (reported to authorities).</li>
        <li><strong>Violence:</strong> gratuitous gore, promotion of violence or terrorism.</li>
        <li><strong>Illegal activity:</strong> instructions for serious harm, fraud, drug or weapons sales.</li>
        <li><strong>Spam and scams:</strong> misleading metadata, pyramid schemes, phishing, fake engagement.</li>
        <li><strong>Misinformation:</strong> content that risks serious real-world harm.</li>
        <li><strong>Intellectual property:</strong> content you do not own or have permission to use.</li>
      </ul>

      <h2>Upload requirements</h2>
      <ul>
        <li>Only upload videos you created or have rights to publish.</li>
        <li>Use accurate titles, descriptions and tags — no bait-and-switch.</li>
        <li>Mark private or unlisted anything not meant for the public feed.</li>
      </ul>

      <h2>Enforcement</h2>
      <ul>
        <li>Users can report any video or comment with the ⚑ button.</li>
        <li>Admins review reports and can remove content or suspend accounts.</li>
        <li>Severe violations (threats, CSAM, terrorism) result in immediate termination and, where required, reports to law enforcement.</li>
      </ul>

      <h2>Appeals</h2>
      <p>
        If your content was removed and you believe it was a mistake, contact
        {SITE.appealsEmail} with the video title and reason.
      </p>
    </LegalLayout>
  );
}
