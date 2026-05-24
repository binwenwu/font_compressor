import { expect, test } from "@playwright/test";
import { access } from "node:fs/promises";

const sampleText = "Font Compressor keeps glyphs 12345";

const fontCandidates = [
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/System/Library/Fonts/Supplemental/Helvetica.ttf",
  "/System/Library/Fonts/Symbol.ttf",
  "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
  "/Library/Fonts/Arial.ttf",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
  "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
];

test("uploads a font, creates a subset, and downloads a non-empty file", async ({
  page,
}) => {
  const fontPath = await findFontFixture();

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.getByTestId("font-compressor")).toHaveAttribute(
    "data-app-ready",
    "true",
  );
  await expect(page.getByRole("heading", { name: "FONT COMPRESSOR" })).toBeVisible();

  await page.getByLabel("需要保留的文字").fill(sampleText);
  await page.locator('input[type="file"]').setInputFiles(fontPath);

  await expect(page.getByText("字体预览已就绪").first()).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole("button", { name: /压缩字体/ }).click();
  await expect(page.getByText(/压缩完成/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("缺失")).toHaveCount(0);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "下载字体" }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const downloadedBytes = await readStreamSize(stream);

  expect(download.suggestedFilename()).toMatch(/\.(woff2|woff|ttf)$/);
  expect(downloadedBytes).toBeGreaterThan(0);
});

test("switches the interface between Chinese and English", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("font-compressor")).toHaveAttribute(
    "data-app-ready",
    "true",
  );
  const app = page.getByTestId("font-compressor");

  await expect(app.getByText("粘贴文字")).toBeVisible();
  await app.getByRole("button", { name: "EN" }).click();
  await expect(app.getByText("Paste Text")).toBeVisible();
  await expect(app.getByRole("button", { name: /Compress Font/ })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem("font-compressor-language")),
    )
    .toBe("en");

  await page.reload();
  await expect(app.getByText("Paste Text")).toBeVisible();

  await app.getByRole("button", { name: "中文" }).click();
  await expect(app.getByText("粘贴文字")).toBeVisible();
});

test("keeps the interface inside one browser viewport without page scrolling", async ({
  page,
}) => {
  const viewports = [
    { width: 2048, height: 1126 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
  ];

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.getByTestId("font-compressor")).toHaveAttribute(
      "data-app-ready",
      "true",
    );

    const metrics = await page.evaluate(() => {
      const shell = document.querySelector(".browser-shell");
      const panels = Array.from(
        document.querySelectorAll(".controls-panel, .result-panel"),
      );

      return {
        documentHeight: document.documentElement.scrollHeight,
        documentWidth: document.documentElement.scrollWidth,
        viewportHeight: document.documentElement.clientHeight,
        viewportWidth: document.documentElement.clientWidth,
        shellRect: shell?.getBoundingClientRect().toJSON(),
        overflowingPanels: panels
          .filter((panel) => panel.scrollHeight > panel.clientHeight + 1)
          .map((panel) => panel.className),
      };
    });

    expect(metrics.documentHeight).toBe(metrics.viewportHeight);
    expect(metrics.documentWidth).toBe(metrics.viewportWidth);
    expect(metrics.shellRect).toMatchObject({
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
    });
    expect(metrics.overflowingPanels).toEqual([]);
  }
});

async function findFontFixture() {
  for (const fontPath of fontCandidates) {
    try {
      await access(fontPath);
      return fontPath;
    } catch {
      // Keep looking for a system font on the current platform.
    }
  }

  throw new Error("No local font fixture found for Playwright verification.");
}

async function readStreamSize(stream: NodeJS.ReadableStream | null) {
  if (!stream) {
    throw new Error("Download stream was not available.");
  }

  let total = 0;

  for await (const chunk of stream) {
    total += Buffer.byteLength(chunk);
  }

  return total;
}
