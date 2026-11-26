import { expect, test } from "@playwright/test";
import { ANZA_ARCH_LOGO_PATHS } from "../apps/web/src/lib/brand-mark";
import { fitsWidth } from "./helpers";

test.describe("AnzaBook Open-Page Arch Brand Assets", () => {
  test("serves all public brand SVGs with Open-Page Arch geometry", async ({
    request,
  }) => {
    for (const path of [
      "/icon.svg",
      "/logo-mark.svg",
      "/logo.svg",
      "/logo-dark.svg",
    ]) {
      const res = await request.get(path);
      expect(res.status(), `${path} status`).toBe(200);
      expect(res.headers()["content-type"]).toContain("image/svg+xml");

      const svg = await res.text();
      expect(svg).toContain(ANZA_ARCH_LOGO_PATHS.leftSweep);
      expect(svg).toContain(ANZA_ARCH_LOGO_PATHS.innerFold);
      expect(svg).toContain(ANZA_ARCH_LOGO_PATHS.rightWing);
      expect(svg).not.toContain("M13 51V17");
      expect(svg).not.toContain("M8 40V14");
      expect(svg).not.toContain("ANZABOOKS");
    }
  });

  test("renders Open-Page Arch logo in preloader, header Brand, BookCover, and OG preview without overflow", async ({
    page,
    request,
  }) => {
    const ogRes = await request.get(
      "/book-preview/revolusi-cetak-kedaulatan-membaca",
    );
    expect(ogRes.status()).toBe(200);
    expect(ogRes.headers()["content-type"]).toBe("image/png");
    const ogBytes = await ogRes.body();
    expect(ogBytes.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    expect(ogBytes.byteLength).toBeGreaterThan(5000);

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");

    const preloader = page.getByRole("dialog", {
      name: "Prapemuat Literasi AnzaBook",
    });
    if (await preloader.isVisible()) {
      const preloaderMark = preloader.locator('[data-brand-mark="anza-arch"]');
      await expect(preloaderMark).toBeVisible();
      await page.getByTestId("skip-preloader").click();
      await expect(preloader).toHaveCount(0);
    }

    await expect(
      page.getByRole("heading", { name: /Aksara Tanpa Penjara Pikiran/i }),
    ).toBeVisible();

    const headerLogo = page
      .locator('header [data-brand-mark="anza-arch"]')
      .first();
    await expect(headerLogo).toBeVisible();

    const coverMark = page
      .locator('[data-book-cover] [data-brand-mark="anza-arch"]')
      .first();
    await expect(coverMark).toBeVisible();
    expect(await fitsWidth(page)).toBe(true);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(headerLogo).toBeVisible();
    expect(await fitsWidth(page)).toBe(true);
  });
});
