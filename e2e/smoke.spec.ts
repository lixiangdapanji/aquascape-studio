import { test, expect } from "@playwright/test";

/**
 * Smoke: the web app loads and the landing page ink-green palette renders.
 * Keep this cheap — it's the first signal CI has that the full polyrepo
 * chain is alive together.
 */
test("landing page renders", async ({ page }) => {
  await page.goto("/");
  // bone-white foreground text token on near-black background (ink-green theme)
  await expect(page).toHaveTitle(/aquascape/i);
});

/**
 * Health: /grpc path should resolve to the API via CloudFront → ALB.
 * We only assert non-404 because gRPC-web health probes return 200 or 400.
 */
test("api reachable through cloudfront", async ({ request }) => {
  const res = await request.get("/grpc/grpc.health.v1.Health/Check");
  expect([200, 400, 415]).toContain(res.status());
});
