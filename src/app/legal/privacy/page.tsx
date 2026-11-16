import LegalLayout from "../layout-base";

export const metadata = { title: "Privacy Policy — BlameTV" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="2025-01-01">
      <p>
        This policy explains what personal data BlameTV collects, why, and the controls you have.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data:</strong> email address, username, display name, hashed password.</li>
        <li><strong>Content you upload:</strong> videos, thumbnails, descriptions, comments.</li>
        <li><strong>Activity data:</strong> watch history, likes, playlists, subscriptions.</li>
        <li><strong>Technical data:</strong> IP address (rate limiting and abuse prevention only).</li>
      </ul>

      <h2>What we never do</h2>
      <ul>
        <li>We never store your password in plain text — only a bcrypt hash.</li>
        <li>We never sell your personal data.</li>
        <li>We never show your email address or watch history to other users.</li>
        <li>We do not use third-party advertising or tracking scripts.</li>
      </ul>

      <h2>Who can see what</h2>
      <ul>
        <li><strong>Public:</strong> your username, display name, avatar, banner, public videos, subscriber count.</li>
        <li><strong>Only you:</strong> email, watch history, playlists, liked videos, personal analytics.</li>
        <li><strong>Admins:</strong> may review reported content and account role, but cannot see your password (it is hashed and irreversible).</li>
      </ul>

      <h2>Your rights (GDPR-style)</h2>
      <ul>
        <li><strong>Export:</strong> download all your data as JSON from Settings → Your data.</li>
        <li><strong>Erasure:</strong> delete your account and all associated data from Settings → Delete account. Deletion is immediate and permanent.</li>
        <li><strong>Correction:</strong> edit your display name, bio, avatar and banner at any time.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        We set exactly one cookie: an httpOnly session token that keeps you signed in. It cannot be
        read by JavaScript and contains no personal data beyond a signed user ID. No analytics,
        advertising or third-party cookies are used.
      </p>

      <h2>Data retention</h2>
      <p>
        Data is retained while your account is active. Deleting your account removes your personal
        data immediately. Backups may take up to 30 days to fully purge.
      </p>

      <h2>Contact</h2>
      <p>Privacy questions: privacy@blametv.example</p>
    </LegalLayout>
  );
}
