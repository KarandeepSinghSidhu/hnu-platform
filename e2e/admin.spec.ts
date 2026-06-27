import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

/**
 * Functional smoke tests for the admin console.
 *
 * Unlike `visual-parity.spec.ts` (pixel screenshots of the public site), these
 * assert *behaviour*, not appearance — so they stay stable while the admin UI
 * keeps changing. They guard the things that genuinely break in integration:
 * the auth gate, and that each main screen still loads and renders its key
 * controls after the page-builder / publications / media churn.
 *
 * Read-only by design: no create/edit/delete, so they never pollute the dev DB
 * or flake on leftover state. (Mutation round-trips can be added later.)
 *
 * Desktop only — the admin console is built for desktop widths; the mobile
 * project would exercise a different (collapsed) layout, so we skip it there.
 */

// The server (next start/dev) reads ADMIN_PASSWORD from .env(.local); Playwright
// doesn't auto-load those, and dotenv isn't a dependency — so resolve it the
// same way the app does, falling back to parsing the env files.
function resolveAdminPassword(): string | undefined {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  for (const file of [".env.local", ".env"]) {
    try {
      const text = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      const match = text.match(/^\s*ADMIN_PASSWORD\s*=\s*(.*)\s*$/m);
      if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    } catch {
      // file may not exist; try the next one
    }
  }
  return undefined;
}

const ADMIN_PASSWORD = resolveAdminPassword();
// Treat the .env.example placeholder as "not set" — otherwise a fresh copy that
// never changed `ADMIN_PASSWORD="change-me"` would run the authenticated suite
// and fail confusingly against a password the server never accepted.
const USABLE_ADMIN_PASSWORD =
  ADMIN_PASSWORD && ADMIN_PASSWORD !== "change-me" ? ADMIN_PASSWORD : undefined;

async function login(page: import("@playwright/test").Page) {
  if (!USABLE_ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_PASSWORD is required to log in (set a real value in env or .env.local).",
    );
  }
  await page.goto("/admin/login");
  await page.locator('input[type="password"]').fill(USABLE_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // Success lands on the dashboard (the default post-login target).
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

// The admin console is a desktop tool — skip the mobile project.
test.beforeEach(async ({ viewport }) => {
  test.skip(
    (viewport?.width ?? 9999) < 1000,
    "Admin console is verified at desktop widths only",
  );
});

test.describe("admin auth gate", () => {
  test("an unauthenticated admin page redirects to the login screen", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login\?next=/);
  });

  test("an unauthenticated admin API call is rejected with 401", async ({
    request,
  }) => {
    const res = await request.get("/api/admin/studies");
    expect(res.status()).toBe(401);
  });

  test("the login screen shows a password field and Sign in button", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("heading", { name: "Admin Console" })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("a wrong password does not let you in", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator('input[type="password"]').fill("definitely-not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    // Stays on the login screen; the dashboard never appears.
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
  });
});

test.describe("admin console (authenticated)", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !USABLE_ADMIN_PASSWORD,
      "ADMIN_PASSWORD not set or still the .env.example placeholder (change-me) — skipping authenticated checks",
    );
    await login(page);
  });

  test("the dashboard loads with its overview cards", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    // Stat cards link to the main sections.
    await expect(page.getByRole("link", { name: /Studies/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Publications/ }).first()).toBeVisible();
  });

  test("the Pages list shows editable pages and hides the studies page", async ({
    page,
  }) => {
    await page.goto("/admin/pages");
    await expect(page.getByRole("heading", { name: "Pages", exact: true })).toBeVisible();
    // Collaborations is editable as a normal page.
    await expect(page.getByRole("link", { name: /Collaborations/ })).toBeVisible();
    // The "Our Studies" page (slug `studies`) is intentionally hidden from this list.
    await expect(page.locator('a[href="/admin/pages/studies"]')).toHaveCount(0);
  });

  test("the page editor opens the add-block menu without clipping", async ({
    page,
  }) => {
    await page.goto("/admin/pages/home");
    // Publish / History controls are present.
    await expect(page.getByRole("button", { name: "History" })).toBeVisible();
    // The add-block popover lists block types (rendered in a portal, not clipped).
    await page.getByRole("button", { name: "+ Add block" }).first().click();
    await expect(page.getByRole("button", { name: "Section heading" })).toBeVisible();
  });

  test("the Publications screen loads with its review controls", async ({
    page,
  }) => {
    await page.goto("/admin/publications");
    await expect(page.getByRole("button", { name: /Sync from ORCID/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pending", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Approved", exact: true })).toBeVisible();
  });

  test("the Media library loads its grid", async ({ page }) => {
    await page.goto("/admin/media");
    await expect(page.getByRole("heading", { name: "Media library" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Upload images/ })).toBeVisible();
  });
});
