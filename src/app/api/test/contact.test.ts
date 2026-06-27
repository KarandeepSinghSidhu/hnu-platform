import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mockPrisma = vi.hoisted(() => ({
  contactSubmission: {
    create: vi.fn(),
  },
  contactRecipient: {
    findUnique: vi.fn(),
  },
}));

const mockSendContactNotification = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

const mockCheckRateLimit = vi.hoisted(() => vi.fn(() => ({ allowed: true })));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: mockCheckRateLimit,
}));

vi.mock("@/lib/email", () => ({
  sendContactNotification: mockSendContactNotification,
}));

import { POST as postContact } from "@/app/api/contact/route";

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function buildValidPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Alice",
    email: "alice@example.com",
    category: "General Enquiry",
    message: "Hello there, this is valid.",
    elapsedMs: 5000,
    ...overrides,
  };
}

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendContactNotification.mockResolvedValue({ ok: true });
  });

  it("returns 400 for a category with no ContactRecipient row", async () => {
    mockPrisma.contactRecipient.findUnique.mockResolvedValueOnce(null);
    const response = await postContact(
      buildRequest(
        buildValidPayload({
          category: "Invalid",
        }),
      ),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "category must be one of the allowed values.",
    });
    expect(mockPrisma.contactSubmission.create).not.toHaveBeenCalled();
  });

  it("returns 400 for an archived inquiry type", async () => {
    mockPrisma.contactRecipient.findUnique.mockResolvedValueOnce({
      category: "General Enquiry",
      email: "general@example.com",
      isArchived: true,
    });
    const response = await postContact(buildRequest(buildValidPayload()));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "This inquiry type is no longer available.",
    });
    expect(mockPrisma.contactSubmission.create).not.toHaveBeenCalled();
  });

  it("accepts any category an active ContactRecipient row exists for", async () => {
    // Admin-created type that never appeared in any hardcoded list.
    mockPrisma.contactRecipient.findUnique.mockResolvedValueOnce({
      category: "Media Enquiry",
      email: "media@example.com",
      isArchived: false,
    });
    mockPrisma.contactSubmission.create.mockResolvedValueOnce({});
    const response = await postContact(
      buildRequest(buildValidPayload({ category: "Media Enquiry" })),
    );
    expect(response.status).toBe(201);
    expect(mockPrisma.contactSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ category: "Media Enquiry" }),
    });
  });

  it("returns 201 and stores submission on valid payload", async () => {
    mockPrisma.contactRecipient.findUnique.mockResolvedValueOnce({
      category: "General Enquiry",
      email: "general@example.com",
    });
    mockPrisma.contactSubmission.create.mockResolvedValueOnce({});

    const response = await postContact(
      buildRequest(buildValidPayload()),
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mockPrisma.contactSubmission.create).toHaveBeenCalledWith({
      data: {
        name: "Alice",
        email: "alice@example.com",
        phone: null,
        prefersPhone: false,
        category: "General Enquiry",
        message: "Hello there, this is valid.",
      },
    });
    expect(mockSendContactNotification).toHaveBeenCalledWith({
      recipientEmail: "general@example.com",
      submission: {
        name: "Alice",
        email: "alice@example.com",
        phone: null,
        prefersPhone: false,
        category: "General Enquiry",
        message: "Hello there, this is valid.",
      },
    });
  });

  it("accepts a phone-only submission (email stored as empty string)", async () => {
    mockPrisma.contactRecipient.findUnique.mockResolvedValueOnce({
      category: "General Enquiry",
      email: "general@example.com",
    });
    mockPrisma.contactSubmission.create.mockResolvedValueOnce({});

    const response = await postContact(
      buildRequest(
        buildValidPayload({ email: "", phone: "+64 21 123 4567" }),
      ),
    );
    expect(response.status).toBe(201);
    expect(mockPrisma.contactSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "",
        phone: "+64 21 123 4567",
        prefersPhone: false,
      }),
    });
    // Phone-only senders are rate-limited by phone, not a shared email:"" key.
    expect(mockCheckRateLimit).toHaveBeenCalledWith("phone:+64211234567");
  });

  it("collapses whitespace/newlines in the stored & emailed phone (no CR/LF survives)", async () => {
    mockPrisma.contactRecipient.findUnique.mockResolvedValueOnce({
      category: "General Enquiry",
      email: "general@example.com",
    });
    mockPrisma.contactSubmission.create.mockResolvedValueOnce({});

    // A phone with embedded newlines passes validation (normalize strips \s),
    // so without sanitising the stored/emailed value the newline would survive.
    const response = await postContact(
      buildRequest(
        buildValidPayload({ email: "", phone: "021\n123\n4567" }),
      ),
    );
    expect(response.status).toBe(201);
    const storedPhone =
      mockPrisma.contactSubmission.create.mock.calls[0][0].data.phone;
    expect(storedPhone).toBe("021 123 4567");
    expect(storedPhone).not.toMatch(/[\r\n]/);
    // The notification email receives the same sanitised value.
    expect(mockSendContactNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        submission: expect.objectContaining({ phone: "021 123 4567" }),
      }),
    );
    // Rate-limit key is still the digits-only normalised form.
    expect(mockCheckRateLimit).toHaveBeenCalledWith("phone:0211234567");
  });

  it("returns 400 when neither email nor phone is given", async () => {
    const response = await postContact(
      buildRequest(buildValidPayload({ email: "", phone: "" })),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Provide an email address or a phone number.",
    });
    expect(mockPrisma.contactSubmission.create).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid phone number", async () => {
    const response = await postContact(
      buildRequest(buildValidPayload({ phone: "not-a-phone" })),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "phone must be a valid phone number.",
    });
  });

  it("persists prefersPhone when both channels are given", async () => {
    mockPrisma.contactRecipient.findUnique.mockResolvedValueOnce({
      category: "General Enquiry",
      email: "general@example.com",
    });
    mockPrisma.contactSubmission.create.mockResolvedValueOnce({});

    const response = await postContact(
      buildRequest(
        buildValidPayload({ phone: "021 123 4567", prefersPhone: true }),
      ),
    );
    expect(response.status).toBe(201);
    expect(mockPrisma.contactSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "alice@example.com",
        phone: "021 123 4567",
        prefersPhone: true,
      }),
    });
  });

  it("ignores prefersPhone without a phone number to prefer", async () => {
    mockPrisma.contactRecipient.findUnique.mockResolvedValueOnce({
      category: "General Enquiry",
      email: "general@example.com",
    });
    mockPrisma.contactSubmission.create.mockResolvedValueOnce({});

    const response = await postContact(
      buildRequest(buildValidPayload({ prefersPhone: true })),
    );
    expect(response.status).toBe(201);
    expect(mockPrisma.contactSubmission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ phone: null, prefersPhone: false }),
    });
  });

  it("returns 201 even when the notification email fails", async () => {
    mockPrisma.contactRecipient.findUnique.mockResolvedValueOnce({
      category: "General Enquiry",
      email: "general@example.com",
    });
    mockPrisma.contactSubmission.create.mockResolvedValueOnce({});
    mockSendContactNotification.mockRejectedValueOnce(new Error("mail down"));

    const response = await postContact(buildRequest(buildValidPayload()));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mockPrisma.contactSubmission.create).toHaveBeenCalled();
  });

  it("silently accepts when elapsedMs is missing", async () => {
    const response = await postContact(
      buildRequest(
        buildValidPayload({
          elapsedMs: undefined,
        }),
      ),
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mockPrisma.contactSubmission.create).not.toHaveBeenCalled();
  });

  it("returns 400 when name is too long", async () => {
    const response = await postContact(
      buildRequest(
        buildValidPayload({
          name: "A".repeat(121),
        }),
      ),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "name must be 120 characters or fewer.",
    });
  });

  it("returns 400 when message is too short", async () => {
    const response = await postContact(
      buildRequest(
        buildValidPayload({
          message: "short",
        }),
      ),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "message must be at least 10 characters.",
    });
  });

  it("returns 400 when message has too many URLs", async () => {
    const response = await postContact(
      buildRequest(
        buildValidPayload({
          message:
            "https://a.com https://b.com https://c.com https://d.com this has links",
        }),
      ),
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Please remove some links from your message.",
    });
  });
});
