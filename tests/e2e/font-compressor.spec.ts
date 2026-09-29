import { expect, test } from "@playwright/test";
import { access, mkdir } from "node:fs/promises";

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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("留下字形。卸下重量。");

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

  await expect(app.getByLabel("需要保留的文字")).toBeVisible();
  await app.getByRole("button", { name: "EN" }).click();
  await expect(app.getByLabel("Text to keep")).toBeVisible();
  await expect(app.getByRole("button", { name: /Compress Font/ })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem("font-compressor-language")),
    )
    .toBe("en");

  await page.reload();
  await expect(app.getByLabel("Text to keep")).toBeVisible();

  await app.getByRole("button", { name: "中文" }).click();
  await expect(app.getByLabel("需要保留的文字")).toBeVisible();
});

test("keeps essential controls visible without document scrolling at every layout", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  const viewports = [
    { width: 2560, height: 1440 },
    { width: 1920, height: 1080 },
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 1024, height: 768 },
    { width: 834, height: 1194 },
    { width: 800, height: 600 },
    { width: 390, height: 844 },
    { width: 375, height: 667 },
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 1024, height: 500 },
    { width: 360, height: 360 },
  ];
  await mkdir("test-results/design", { recursive: true });
  for (const viewport of viewports) {
    await test.step(`${viewport.width} × ${viewport.height}`, async () => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      await expect(page.getByTestId("font-compressor")).toHaveAttribute("data-app-ready", "true");
      await expect(page.getByRole("button", { name: "压缩字体", exact: true })).toBeInViewport({ ratio: 1 });
      await expect(page.getByLabel("需要保留的文字")).toBeInViewport({ ratio: 1 });
      const assertNoOverflow = async () => {
        const metrics = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          panelOverflow: Array.from(document.querySelectorAll(".workbench, .settings-pane, .input-pane"))
            .filter((element) => element.clientHeight > 0 && element.scrollHeight > element.clientHeight + 2)
            .map((element) => ({ className: element.className, height: element.clientHeight, scroll: element.scrollHeight })),
        }));
        expect(metrics.width).toBe(metrics.viewportWidth);
        expect(metrics.height).toBe(metrics.viewportHeight);
        expect(metrics.panelOverflow).toEqual([]);
      };
      await assertNoOverflow();
      if (viewport.width <= 800 || viewport.height <= 680) {
        await page.getByRole("button", { name: "设置", exact: true }).click();
        await expect(page.getByLabel("输出名称").first()).toBeInViewport({ ratio: 1 });
        await expect(page.getByLabel("中文标点").first()).toBeInViewport({ ratio: 1 });
        await assertNoOverflow();
        await page.getByRole("button", { name: "预览", exact: true }).click();
        await expect(page.locator(".mobile-preview")).toBeVisible();
        await assertNoOverflow();
        await page.getByRole("button", { name: "输入", exact: true }).click();
      }
      if ([1440, 390, 844, 1024, 320, 360].includes(viewport.width)) {
        await page.screenshot({ path: `test-results/design/viewport-${viewport.width}x${viewport.height}.png`, animations: "disabled" });
      }
    });
  }
  expect(browserErrors).toEqual([]);
});

test("keeps compact settings and completed download in the same viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("需要保留的文字").fill(sampleText);
  await page.locator('input[type="file"]').setInputFiles(await findFontFixture());
  await page.getByRole("button", { name: "设置", exact: true }).click();
  await page.getByRole("button", { name: "TTF", exact: true }).click();
  await page.getByLabel("输出名称").first().fill("my-small-font.ttf");
  await page.getByLabel("数字", { exact: true }).first().check();
  await page.getByRole("button", { name: "压缩字体", exact: true }).click();
  await expect(page.getByText(/压缩完成/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole("link", { name: "下载字体" })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("link", { name: "下载字体" })).toHaveAttribute("download", "my-small-font.ttf");
  await expect(page.locator(".mobile-preview")).toBeVisible();
  await page.getByRole("button", { name: "输入", exact: true }).click();
  await expect(page.getByLabel("需要保留的文字")).toBeInViewport({ ratio: 1 });
  await page.getByLabel("需要保留的文字").fill("Changed text 123");
  await expect(page.getByRole("link", { name: "下载字体" })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("edits advanced settings and closes the dialog with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.getByRole("button", { name: "保留规则与文件名" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("输出名称").fill("custom-font.woff2");
  await dialog.getByLabel("中文标点").check();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("button", { name: "保留规则与文件名" })).toBeFocused();
  await page.getByRole("button", { name: "保留规则与文件名" }).click();
  await expect(dialog.getByLabel("中文标点")).toBeChecked();
  await expect(dialog.getByLabel("输出名称")).toHaveValue("custom-font.woff2");
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
