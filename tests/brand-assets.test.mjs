import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ANZA_ARCH_LOGO_PATHS,
  ANZA_ARCH_VIEWBOX,
  ANZA_BRAND_COLORS,
} from "../apps/web/src/lib/brand-mark.ts";

const root = resolve(import.meta.dirname, "..");

function readRepoFile(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

test("brand-mark exports canonical Open-Page Arch SVG geometry and palette", () => {
  assert.equal(ANZA_ARCH_VIEWBOX, "0 0 48 48");
  assert.ok(ANZA_ARCH_LOGO_PATHS.leftSweep.length > 10);
  assert.ok(ANZA_ARCH_LOGO_PATHS.innerFold.length > 10);
  assert.ok(ANZA_ARCH_LOGO_PATHS.rightWing.length > 10);
  assert.equal(ANZA_BRAND_COLORS.ink, "#13110F");
  assert.equal(ANZA_BRAND_COLORS.paper, "#F6F2E9");
  assert.equal(ANZA_BRAND_COLORS.accent, "#F06A24");
});

test("public SVG brand assets use Open-Page Arch paths and remove legacy ANZABOOKS text", () => {
  const svgFiles = [
    "apps/web/public/icon.svg",
    "apps/web/public/logo-mark.svg",
    "apps/web/public/logo.svg",
    "apps/web/public/logo-dark.svg",
  ];
  const forbidden = ["M13 51V17", "M8 40V14", "M18 10H30", "ANZABOOKS"];

  for (const file of svgFiles) {
    const content = readRepoFile(file);
    assert.match(
      content,
      /<svg[^>]*>[\s\S]*<\/svg>/,
      `${file} must be valid SVG`,
    );
    assert.ok(
      content.includes(ANZA_ARCH_LOGO_PATHS.leftSweep),
      `${file} missing leftSweep path`,
    );
    assert.ok(
      content.includes(ANZA_ARCH_LOGO_PATHS.innerFold),
      `${file} missing innerFold path`,
    );
    assert.ok(
      content.includes(ANZA_ARCH_LOGO_PATHS.rightWing),
      `${file} missing rightWing path`,
    );
    for (const legacy of forbidden) {
      assert.ok(
        !content.includes(legacy),
        `${file} still contains legacy token: ${legacy}`,
      );
    }
  }
});

test("icon.svg renders Manila tile (#F6F2E9) with Deep Ink and Tangerine Arch mark", () => {
  const iconSvg = readRepoFile("apps/web/public/icon.svg");
  assert.ok(iconSvg.includes('fill="#F6F2E9"'));
  assert.ok(iconSvg.includes('fill="#13110F"'));
  assert.ok(iconSvg.includes('fill="#F06A24"'));
});

test("BookCover, OG preview, Canvas renderer, and DESIGN.md consume the new Open-Page Arch brand mark", () => {
  const bookCover = readRepoFile(
    "apps/web/src/features/books/components/book-cover.tsx",
  );
  assert.ok(!bookCover.includes("M14 50V16"));
  assert.ok(!bookCover.includes("M25 11.5H38"));
  assert.ok(bookCover.includes("AnzaLogoMark"));

  const ogPreview = readRepoFile(
    "apps/web/src/features/books/book-preview.server.ts",
  );
  assert.ok(ogPreview.includes("ANZA_ARCH_LOGO_PATHS"));

  const postOgPreview = readRepoFile(
    "apps/web/src/features/share/post-preview-svg.ts",
  );
  assert.ok(postOgPreview.includes("ANZA_ARCH_LOGO_PATHS"));

  const canvasRenderer = readRepoFile(
    "apps/web/src/features/share/canvas-renderer.ts",
  );
  assert.ok(canvasRenderer.includes("ANZA_ARCH_LOGO_PATHS"));

  const designDoc = readRepoFile("DESIGN.md");
  assert.ok(!designDoc.includes("Monogram pilar buku Manila"));
  assert.ok(!designDoc.includes("pita huruf B"));
});
