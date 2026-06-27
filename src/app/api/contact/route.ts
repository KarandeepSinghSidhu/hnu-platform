// Public contact-form endpoint: POST validates and persists an enquiry, then
// best-effort emails the admin-configured recipient for its inquiry type.
// Unauthenticated, so it carries its own defences — silent bot traps (honeypot +
// time-trap), two rate limiters (by IP and by contact handle), strict input
// validation, and category validation against the ContactRecipient table.
// Returns 201 on success/bot, 400 on bad input, 500 on unexpected failure;
// email-delivery failures are logged but never fail the request.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { sendContactNotification } from "@/lib/email";
import {
  asTrimmedString,
  isValidEmail,
  isValidPhone,
  normalizePhone,
  sanitizePhone,
} from "@/lib/validation";

// Inquiry types are admin-managed ContactRecipient rows — the recipient
// lookup below doubles as the category validation (no hardcoded allow-list).

const MIN_FORM_FILL_MS = 3000;
const MAX_NAME_LENGTH = 120;
const MAX_MESSAGE_LENGTH = 5000;
const MIN_MESSAGE_LENGTH = 10;
const MAX_URLS_IN_MESSAGE = 3;
const URL_REGEX = /https?:\/\/|www\./gi;

function countUrlsLike(text: string) {
  const matches = text.match(URL_REGEX);
  return matches ? matches.length : 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const name = asTrimmedString(body?.name);
    const email = asTrimmedString(body?.email);
    // Canonical phone: whitespace collapsed to single spaces (no CR/LF), so the
    // value we store and drop into the notification email body is injection-safe
    // while staying human-readable. Validation/rate-limit key off normalizePhone.
    const phone = sanitizePhone(asTrimmedString(body?.phone));
    // Only meaningful when both contact channels were given (the form shows
    // the checkbox only then) — never trust it without a phone to prefer.
    const prefersPhone = body?.prefersPhone === true && phone !== "";
    const category = asTrimmedString(body?.category);
    const message = asTrimmedString(body?.message);
    const honeypot = asTrimmedString(body?.honeypot);
    const elapsedMs =
      typeof body?.elapsedMs === "number" && Number.isFinite(body.elapsedMs)
        ? body.elapsedMs
        : 0;

    // Bot honeypot: silently accept (don't leak that we filter it).
    if (honeypot) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    // Bot time-trap: a real user takes >3s to fill the form.
    if (elapsedMs < MIN_FORM_FILL_MS) {
      return NextResponse.json({ ok: true }, { status: 201 });
    }

    const ip = getClientIp(request);
    const ipRateLimit = checkRateLimit(`ip:${ip}`);

    if (!ipRateLimit.allowed) {
      return rateLimitResponse(
        ipRateLimit,
        "Too many submissions. Please try again later.",
      );
    }

    if (!name || !category || !message) {
      return NextResponse.json(
        { error: "name, category, and message are required." },
        { status: 400 },
      );
    }

    // Either/or: the enquirer chooses their contact channel — at least one of
    // email/phone must be present, and whichever is given must be valid.
    if (!email && !phone) {
      return NextResponse.json(
        { error: "Provide an email address or a phone number." },
        { status: 400 },
      );
    }

    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `name must be ${MAX_NAME_LENGTH} characters or fewer.` },
        { status: 400 },
      );
    }

    if (email && !isValidEmail(email)) {
      return NextResponse.json(
        { error: "email must be a valid email address." },
        { status: 400 },
      );
    }

    if (phone && !isValidPhone(phone)) {
      return NextResponse.json(
        { error: "phone must be a valid phone number." },
        { status: 400 },
      );
    }

    if (message.length < MIN_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          error: `message must be at least ${MIN_MESSAGE_LENGTH} characters.`,
        },
        { status: 400 },
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          error: `message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
        },
        { status: 400 },
      );
    }

    if (countUrlsLike(message) > MAX_URLS_IN_MESSAGE) {
      return NextResponse.json(
        { error: "Please remove some links from your message." },
        { status: 400 },
      );
    }

    // Second limiter keyed on the contact handle. Phone-only submissions key
    // on the normalised phone number — keying them all on email:"" would give
    // every phone-only sender one shared bucket.
    const contactRateLimit = checkRateLimit(
      email ? `email:${email.toLowerCase()}` : `phone:${normalizePhone(phone)}`,
    );
    if (!contactRateLimit.allowed) {
      return rateLimitResponse(
        contactRateLimit,
        "Too many submissions. Please try again later.",
      );
    }

    // The single source of truth for inquiry types: an unknown category means
    // the client sent something the admin never configured (400, not 500),
    // and an archived one means the type was removed from the form.
    const recipient = await prisma.contactRecipient.findUnique({
      where: { category },
    });

    if (!recipient) {
      return NextResponse.json(
        { error: "category must be one of the allowed values." },
        { status: 400 },
      );
    }

    if (recipient.isArchived) {
      return NextResponse.json(
        { error: "This inquiry type is no longer available." },
        { status: 400 },
      );
    }

    await prisma.contactSubmission.create({
      data: {
        name,
        email,
        phone: phone || null,
        prefersPhone,
        category,
        message,
      },
    });

    // Best-effort: email the configured recipient. The submission is already
    // saved (it shows in the admin console regardless), so a delivery failure
    // must not fail the request — log it and move on.
    const emailResult = await sendContactNotification({
      recipientEmail: recipient.email,
      submission: { name, email, phone: phone || null, prefersPhone, category, message },
    }).catch((err) => {
      console.error("Contact notification email threw (non-fatal):", err);
      return { ok: false as const, error: "threw" };
    });

    if (!emailResult.ok) {
      console.error(
        `Contact notification email not delivered for "${category}" enquiry from ${email || phone}.`,
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("POST /api/contact failed:", error);
    return NextResponse.json(
      { error: "Failed to process contact submission." },
      { status: 500 },
    );
  }
}

