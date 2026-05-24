/// <reference lib="webworker" />

import { createFont, woff2, type FontEditor } from "fonteditor-core";
import { deflate, inflate } from "pako";

type SupportedFontType = "ttf" | "otf" | "woff" | "woff2";

type CompressRequest = {
  id: string;
  buffer: ArrayBuffer;
  inputType: SupportedFontType;
  outputType: SupportedFontType;
  codePoints: number[];
};

type CompressResponse =
  | {
      id: string;
      type: "progress";
      message: "readingTables" | "initWoff2" | "generatingSubset";
    }
  | {
      id: string;
      type: "success";
      buffer: ArrayBuffer;
      missingCodePoints: number[];
      retainedGlyphCount: number;
    }
  | {
      id: string;
      type: "error";
      message: string;
    };

let woff2Ready: Promise<FontEditor.Woff2> | null = null;

const ctx: DedicatedWorkerGlobalScope = self as never;

ctx.onmessage = async (event: MessageEvent<CompressRequest>) => {
  const { id, buffer, inputType, outputType, codePoints } = event.data;

  try {
    postProgress(id, "readingTables");

    if (inputType === "woff2" || outputType === "woff2") {
      postProgress(id, "initWoff2");
      await ensureWoff2();
    }

    const font = createFont(buffer, {
      type: inputType,
      subset: codePoints,
      hinting: false,
      kerning: true,
      compound2simple: true,
      inflate: inflateTable,
    });
    const fontData = font.get();
    const retainedCodePoints = new Set(
      fontData.glyf.flatMap((glyph) => glyph.unicode ?? []),
    );
    const missingCodePoints = codePoints.filter(
      (codePoint) => !retainedCodePoints.has(codePoint),
    );

    postProgress(id, "generatingSubset");

    const output = font.write({
      type: outputType,
      hinting: false,
      kerning: true,
      toBuffer: false,
      deflate: deflateTable,
    });

    const outputBuffer = normalizeOutput(output);
    if (outputBuffer.byteLength === 0) {
      throw new Error("字体编码器返回了空文件，请尝试切换为 WOFF 或 TTF 输出。");
    }

    ctx.postMessage(
      {
        id,
        type: "success",
        buffer: outputBuffer,
        missingCodePoints,
        retainedGlyphCount: fontData.glyf.length,
      } satisfies CompressResponse,
      [outputBuffer],
    );
  } catch (error) {
    ctx.postMessage({
      id,
      type: "error",
      message: error instanceof Error ? error.message : "字体压缩失败",
    } satisfies CompressResponse);
  }
};

function postProgress(
  id: string,
  message: "readingTables" | "initWoff2" | "generatingSubset",
) {
  ctx.postMessage({
    id,
    type: "progress",
    message,
  } satisfies CompressResponse);
}

function ensureWoff2() {
  if (!woff2Ready) {
    const workerGlobal = ctx as DedicatedWorkerGlobalScope & {
      window?: DedicatedWorkerGlobalScope;
    };

    workerGlobal.window = workerGlobal;
    woff2Ready = woff2.init(`${ctx.location.origin}/woff2.wasm`);
  }

  return woff2Ready;
}

function inflateTable(data: number[]) {
  return Array.from(inflate(new Uint8Array(data)));
}

function deflateTable(data: number[]) {
  return Array.from(deflate(new Uint8Array(data)));
}

function normalizeOutput(output: FontEditor.FontOutput) {
  if (output instanceof ArrayBuffer) {
    return output;
  }

  if (ArrayBuffer.isView(output)) {
    const copy = new Uint8Array(output.byteLength);
    copy.set(new Uint8Array(output.buffer, output.byteOffset, output.byteLength));
    return copy.buffer;
  }

  throw new Error("当前输出格式暂不支持下载");
}
