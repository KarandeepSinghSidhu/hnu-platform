import "server-only";
import { Resend } from "resend";

// Outbound mail for the public contact form. Sends a notification to the
// recipient configured per inquiry category (see `ContactRecipient`), with the
// enquirer set as Reply-To so staff can reply directly.
//
// Deliverability notes:
// - `from` MUST be an address on a domain verified in Resend. Set EMAIL_FROM to
//   that address in production (e.g. "HNU Website <noreply@yourdomain>").
// - We never send "from" the enquirer's address (that fails SPF/DKIM and looks
//   like spoofing); the enquirer goes in Reply-To instead.
// - The body is plain text, so untrusted user input (name/message) carries no
//   HTML-injection risk. The enquirer email and category are already validated
//   in the contact route (no CR/LF), so Reply-To/subject are injection-safe.
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// In dev, if no verified domain is configured we fall back to Resend's shared
// test sender. Note: `onboarding@resend.dev` can only deliver to the email
// address that owns the Resend account — fine for local self-testing.
const EMAIL_FROM =
  process.env.EMAIL_FROM ?? "HNU Website <onboarding@resend.dev>";

export type ContactSubmissionEmail = {
  name: string;
  // "" when the enquirer gave a phone number instead (at least one of
  // email/phone is always present — the contact route enforces it).
  email: string;
  phone?: string | null;
  prefersPhone?: boolean;
  category: string;
  message: string;
};

export type SendResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string };

/**
 * Best-effort: notify the configured recipient of a new contact submission.
 * Never throws — returns a result so the caller can log without failing the
 * request (the submission is already persisted regardless of email delivery).
 *
 * With no RESEND_API_KEY configured this logs and no-ops, so the contact form
 * works locally and tests/CI make no network calls.
 */
export async function sendContactNotification(params: {
  recipientEmail: string;
  submission: ContactSubmissionEmail;
}): Promise<SendResult> {
  const { recipientEmail, submission } = params;

  if (!RESEND_API_KEY) {
    console.info(
      `[email] RESEND_API_KEY not set — skipping send. Would notify ${recipientEmail} of a "${submission.category}" enquiry from ${submission.email || submission.phone || "(no contact given)"}.`,
    );
    return { ok: true, skipped: true };
  }

  const resend = new Resend(RESEND_API_KEY);

  const subject = `New ${submission.category} — HNU website contact form`;
  const text = [
    "You have a new enquiry from the Human Nutrition Unit website contact form.",
    "",
    `Category: ${submission.category}`,
    `Name:     ${submission.name}`,
    `Email:    ${submission.email || "—"}`,
    `Phone:    ${submission.phone || "—"}`,
    ...(submission.prefersPhone ? ["", "Preferred contact: Phone"] : []),
    "",
    "Message:",
    submission.message,
    "",
    // Phone-only enquirers can't be replied to by email — point at the phone
    // number instead of a Reply-To that doesn't exist.
    submission.email
      ? `— Reply directly to this email to respond to ${submission.name}.`
      : `— Call or text ${submission.phone} to respond to ${submission.name}.`,
  ].join("\n");

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: recipientEmail,
      // Reply-To only when the enquirer gave an email (Resend accepts a send
      // without one).
      ...(submission.email ? { replyTo: submission.email } : {}),
      subject,
      text,
    });

    if (error) {
      console.error("[email] Resend returned an error:", error);
      return { ok: false, error: error.message ?? "Resend error" };
    }

    return { ok: true };
  } catch (err) {
    console.error("[email] Failed to send contact notification:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Unknown email error",
    };
  }
}
