import { test, expect, type Page } from "@playwright/test";

// Visual-parity baseline for the public site. These screenshots are the
// contract that the page-builder enhancements must not change unless a visual
// change is the explicit point of a PR (then re-baseline with --update-snapshots
// and call it out in the PR). Baselines are platform-specific (e.g. -darwin);
// regenerate on the same OS where they were captured.
const PUBLIC_ROUTES = [
  { name: "home", path: "/" },
  { name: "about", path: "/about" },
  { name: "research", path: "/research" },
  { name: "team", path: "/team" },
  { name: "contact", path: "/contact" },
  { name: "collaborations", path: "/collaborations" },
  { name: "collaborations-academic", path: "/collaborations/academic" },
  { name: "collaborations-industry", path: "/collaborations/industry" },
  { name: "study-ferdinand", path: "/studies/ferdinand" },
] as const;

// Scroll the full page to trigger lazy-loaded images/sections, then return to
// the top and wait for web fonts so the screenshot is fully rendered.
async function settlePage(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let total = 0;
        const distance = window.innerHeight;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          total += distance;
          if (total >= document.body.scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 60);
      }),
  );
  await page.evaluate(() => document.fonts.ready);
  // Wait for every image to finish loading/decoding so lazy-loaded images don't
  // race the screenshot (a load race shows up as a diff in the image region).
  await page.evaluate(async () => {
    // `complete` is true once an image's load attempt finished — whether it
    // succeeded or errored. Only wait on in-flight images, and cap the wait so a
    // single stalled request (e.g. a marquee logo) can never time out the test;
    // Playwright's screenshot stabilization covers any remaining settling.
    const images = Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
      ),
    );
    const cap = new Promise<void>((resolve) => setTimeout(resolve, 8000));
    await Promise.race([images, cap]);
  });
}

test.describe("public site visual parity", () => {
  for (const route of PUBLIC_ROUTES) {
    test(route.name, async ({ page }) => {
      await page.goto(route.path, { waitUntil: "load" });
      await settlePage(page);
      await expect(page).toHaveScreenshot(`${route.name}.png`, {
        fullPage: true,
        animations: "disabled",
        // Embeds (autoplaying YouTube on /about, Google Maps on /contact) and
        // the auto-rotating Updates carousel on the homepage paint
        // non-deterministic pixels; mask them so only our markup is compared.
        mask: [
          page.locator("iframe"),
          page.locator('[data-testid="updates-carousel"]'),
        ],
      });
    });
  }
});
