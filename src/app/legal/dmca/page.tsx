import LegalLayout from "../layout-base";
import { SITE } from "@/lib/site";

export const metadata = { title: "Copyright / DMCA — BlameTV" };

export default function DmcaPage() {
  return (
    <LegalLayout title="Copyright / DMCA Policy" updated="2025-01-01">
      <p>
        BlameTV respects the intellectual property rights of others and expects users to do the
        same. We respond to clear notices of alleged copyright infringement.
      </p>

      <h2>Filing a takedown notice</h2>
      <p>If you believe content on BlameTV infringes your copyright, send a notice to {SITE.dmcaEmail} containing:</p>
      <ul>
        <li>Your full name, address, phone number and email.</li>
        <li>A description of the copyrighted work you claim is infringed.</li>
        <li>The exact URL of the infringing content on BlameTV.</li>
        <li>A statement that you have a good-faith belief the use is unauthorized.</li>
        <li>A statement, under penalty of perjury, that the information is accurate and you are the rights holder or authorized to act for them.</li>
        <li>Your physical or electronic signature.</li>
      </ul>

      <h2>What happens next</h2>
      <ul>
        <li>Valid notices are processed promptly; infringing content is removed.</li>
        <li>The uploader is notified and may file a counter-notice.</li>
        <li>Repeat infringers have their accounts terminated.</li>
      </ul>

      <h2>Counter-notification</h2>
      <p>
        If your content was removed by mistake or misidentification, you may submit a
        counter-notice to {SITE.dmcaEmail} with the same contact details, identification of the
        removed content, and a statement under penalty of perjury that you have a good-faith belief
        it was removed in error.
      </p>

      <h2>Report abuse in-app</h2>
      <p>
        For non-copyright issues (spam, harassment, harmful content), use the ⚑ Report button on
        any video or comment.
      </p>
    </LegalLayout>
  );
}
