import LegalLayout from "../layout-base";

export const metadata = { title: "Terms of Service — BlameTV" };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="2025-01-01">
      <p>
        Welcome to BlameTV. By creating an account or using this site you agree to these terms. If
        you do not agree, do not use BlameTV.
      </p>

      <h2>1. Your account</h2>
      <ul>
        <li>You must provide accurate registration information and keep your password secure.</li>
        <li>You are responsible for all activity that happens under your account.</li>
        <li>One person or entity per account. Do not share credentials.</li>
        <li>We may suspend or terminate accounts that violate these terms or the law.</li>
      </ul>

      <h2>2. Your content</h2>
      <ul>
        <li>
          You keep ownership of videos, comments and other content you upload. You grant BlameTV a
          worldwide, non-exclusive, royalty-free license to host, store, reproduce and publicly
          display your content solely to operate the service.
        </li>
        <li>
          You must own or have permission for everything you upload, including music, footage and
          images. Do not upload third-party content you do not have rights to.
        </li>
        <li>
          We may remove content that violates our Community Guidelines or applicable law, with or
          without notice.
        </li>
      </ul>

      <h2>3. Prohibited conduct</h2>
      <ul>
        <li>Uploading illegal, harmful, hateful, harassing, sexually explicit or violent content.</li>
        <li>Impersonating others, spamming, scraping, or attempting to breach site security.</li>
        <li>Using automated systems to access the service without written permission.</li>
      </ul>

      <h2>4. Copyright</h2>
      <p>
        We respect intellectual property rights. Rights holders can submit takedown requests via
        our <a href="/legal/dmca">Copyright / DMCA page</a>. Repeat infringers lose their accounts.
      </p>

      <h2>5. Availability and changes</h2>
      <p>
        BlameTV is provided &quot;as is&quot; without warranties of any kind. We may modify or
        discontinue any part of the service at any time. We are not liable for lost content or
        data; keep your own backups.
      </p>

      <h2>6. Termination</h2>
      <p>
        You may delete your account at any time from Settings. We may terminate access for
        violations of these terms.
      </p>

      <h2>7. Contact</h2>
      <p>Questions about these terms: legal@blametv.example</p>
    </LegalLayout>
  );
}
