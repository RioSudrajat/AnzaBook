import { expect, test } from "@playwright/test";
import { fitsWidth, signUp } from "./helpers";

const slug = "madilog-tan-malaka";

test("larger type reflows the book and a corner drag turns the spread", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await signUp(page.request);
  await page.goto(`/read/${slug}?chapter=1`);
  await page.getByRole("button", { name: "Slide" }).click();
  const counter = page.getByText(/^Page \d+ of \d+$/);
  await expect(counter).toBeVisible();
  const before = Number((await counter.innerText()).split(" of ")[1]);
  const leaves = page.locator(".reader-spread-paper .reader-leaf:visible");
  await expect(leaves).toHaveCount(2);
  const opening = leaves.first().locator("p").first();
  await expect(opening).toContainText("Selama berabad-abad");

  const settings = page.getByRole("button", {
    name: "Pengaturan Tipografi dan Tampilan",
  });
  await settings.click();
  for (let i = 0; i < 8; i++)
    await page.getByRole("button", { name: "A+", exact: true }).click();
  await expect
    .poll(async () => Number((await counter.innerText()).split(" of ")[1]))
    .toBeGreaterThan(before);
  await expect(opening).toContainText("Selama berabad-abad");
  expect(
    await leaves.evaluateAll((pages) =>
      pages.every((leaf) => leaf.scrollHeight <= leaf.clientHeight + 1),
    ),
  ).toBe(true);
  await settings.click();

  const corner = page.getByRole("button", { name: "Balik lembar berikutnya" });
  await expect(corner).toBeVisible();
  const box = (await corner.boundingBox())!;
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 35, y - 24, { steps: 4 });
  await expect(page.locator("[data-reader-fold] path")).toHaveAttribute(
    "d",
    /Q/,
  );
  await page.mouse.up();
  await expect(page.locator("[data-reader-fold]")).toHaveCount(0);
  await expect(counter).toHaveText(/^Page 1 of \d+$/);

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 280, y - 90, { steps: 8 });
  await expect(page.locator("[data-reader-fold]")).toBeVisible();
  const arriving = await leaves.first().innerText();
  const reverse = page.locator("[data-reader-fold-back] .reader-leaf");
  await expect(reverse).toHaveText(arriving);
  const heldTransform = await reverse.evaluate(
    (leaf) => getComputedStyle(leaf.parentElement!).transform,
  );
  expect(heldTransform).toMatch(/^matrix\(/);
  await page.mouse.move(x - 400, y - 110, { steps: 4 });
  await expect
    .poll(() =>
      reverse.evaluate(
        (leaf) => getComputedStyle(leaf.parentElement!).transform,
      ),
    )
    .not.toBe(heldTransform);
  await page.mouse.up();
  await expect(counter).toHaveText(/^Page 2 of \d+$/);
  await expect(leaves.first()).toHaveText(arriving);
  await expect(leaves.first()).toHaveCSS(
    "background-color",
    "rgb(250, 246, 238)",
  );
  const desktopTotal = Number((await counter.innerText()).split(" of ")[1]);

  await page.setViewportSize({ width: 390, height: 780 });
  await expect.poll(() => fitsWidth(page)).toBe(true);
  await expect(leaves).toHaveCount(1);
  await expect
    .poll(async () => Number((await counter.innerText()).split(" of ")[1]))
    .toBeGreaterThan(desktopTotal);
  const next = page.getByRole("button", { name: "Halaman selanjutnya" });
  await expect(next).toBeEnabled();
  const reflowed = await counter.innerText();
  const mobileCorner = (await corner.boundingBox())!;
  const mobileX = mobileCorner.x + mobileCorner.width / 2;
  const mobileY = mobileCorner.y + mobileCorner.height / 2;
  await page.mouse.move(mobileX, mobileY);
  await page.mouse.down();
  await page.mouse.move(mobileX - 55, mobileY - 20, { steps: 4 });
  await expect(reverse).toHaveText(await leaves.first().innerText());
  await page.mouse.up();
  await expect(reverse).toHaveCount(0);
  await expect(counter).toHaveText(reflowed);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await next.click();
  await expect(counter).not.toHaveText(reflowed);
  await page.keyboard.press("ArrowLeft");
  await expect(counter).toHaveText(reflowed);
  await expect(page.locator("[data-reader-fold]")).toHaveCount(0);
});

test("book sharing uses a public catalog link with a server-rendered PNG preview", async ({
  page,
  request,
}) => {
  const catalog = await request.get(`/books/${slug}`);
  expect(catalog.ok()).toBeTruthy();
  const html = await catalog.text();
  const image = html.match(/<meta property="og:image" content="([^"]+)"/);
  expect(image?.[1]).toMatch(/^https?:\/\//);
  const preview = await request.get(image![1]);
  expect(preview.headers()["content-type"]).toBe("image/png");
  expect((await preview.body()).subarray(0, 8)).toEqual(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  );

  await signUp(page.request);
  await page.goto(`/read/${slug}`);
  const share = page.getByRole("button", { name: "Bagikan tautan buku" });
  await share.click();
  const dialog = page.getByRole("dialog", { name: "Bagikan buku" });
  await expect(
    dialog.getByRole("textbox", { name: "Tautan buku" }),
  ).toHaveValue(`${new URL(page.url()).origin}/books/${slug}`);
  await expect(dialog.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
    "href",
    /wa\.me/,
  );
  await expect
    .poll(() =>
      dialog
        .getByRole("img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(1200);
  await page.keyboard.press("Escape");
  await expect(share).toBeFocused();
});
