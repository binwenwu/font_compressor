export type SupportedFontType = "ttf" | "otf" | "woff" | "woff2";

export type SubsetOptions = {
  latin: boolean;
  numbers: boolean;
  symbols: boolean;
  cjkPunctuation: boolean;
};

export type ScriptSummary = {
  label: string;
  count: number;
};

const fontTypes = new Set<SupportedFontType>(["ttf", "otf", "woff", "woff2"]);

const extraRanges: Record<keyof SubsetOptions, number[][]> = {
  latin: [
    [0x0020, 0x007e],
    [0x00a0, 0x00ff],
  ],
  numbers: [[0x0030, 0x0039]],
  symbols: [
    [0x0020, 0x002f],
    [0x003a, 0x0040],
    [0x005b, 0x0060],
    [0x007b, 0x007e],
  ],
  cjkPunctuation: [[0x3000, 0x303f]],
};

export function inferFontType(fileName: string): SupportedFontType | null {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (!extension || !fontTypes.has(extension as SupportedFontType)) {
    return null;
  }

  return extension as SupportedFontType;
}

export function createOutputName(fileName: string, outputType: SupportedFontType) {
  const cleanName = fileName.replace(/\.[^.]+$/, "");
  return `${cleanName || "font"}-subset.${outputType}`;
}

export function getCodePoints(text: string, options: SubsetOptions) {
  const codePoints = new Set<number>();

  for (const char of Array.from(text)) {
    const codePoint = char.codePointAt(0);
    if (typeof codePoint === "number") {
      codePoints.add(codePoint);
    }
  }

  for (const [key, enabled] of Object.entries(options) as [
    keyof SubsetOptions,
    boolean,
  ][]) {
    if (!enabled) {
      continue;
    }

    for (const [start, end] of extraRanges[key]) {
      for (let codePoint = start; codePoint <= end; codePoint += 1) {
        codePoints.add(codePoint);
      }
    }
  }

  return Array.from(codePoints).sort((a, b) => a - b);
}

export function detectScripts(text: string): ScriptSummary[] {
  const buckets = new Map<string, number>();

  for (const char of Array.from(text)) {
    const codePoint = char.codePointAt(0);
    if (typeof codePoint !== "number") {
      continue;
    }

    const label = getScriptLabel(codePoint);
    buckets.set(label, (buckets.get(label) ?? 0) + 1);
  }

  return Array.from(buckets.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

export function sizeReduction(originalSize: number, outputSize: number) {
  if (!originalSize || !outputSize || outputSize >= originalSize) {
    return 0;
  }

  return Math.round((1 - outputSize / originalSize) * 1000) / 10;
}

export function codePointsToText(codePoints: number[], limit = 12) {
  return codePoints
    .slice(0, limit)
    .map((codePoint) => String.fromCodePoint(codePoint))
    .join("");
}

export function getCssFontFormat(type: SupportedFontType) {
  if (type === "woff2" || type === "woff") {
    return type;
  }

  if (type === "otf") {
    return "opentype";
  }

  return "truetype";
}

function getScriptLabel(codePoint: number) {
  if (codePoint >= 0x4e00 && codePoint <= 0x9fff) {
    return "CJK";
  }

  if (codePoint >= 0x3040 && codePoint <= 0x30ff) {
    return "Kana";
  }

  if (codePoint >= 0xac00 && codePoint <= 0xd7af) {
    return "Hangul";
  }

  if (codePoint >= 0x0000 && codePoint <= 0x007f) {
    return "Latin";
  }

  if (codePoint >= 0x0080 && codePoint <= 0x024f) {
    return "Latin Extended";
  }

  if (codePoint >= 0x3000 && codePoint <= 0x303f) {
    return "CJK Symbols";
  }

  return "Other";
}
