"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronDown,
  CircleDot,
  FileType,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Settings2,
  Upload,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TypeOrbitScene } from "@/components/type-orbit-scene";
import {
  createOutputName,
  codePointsToText,
  formatBytes,
  getCssFontFormat,
  getCodePoints,
  inferFontType,
  sizeReduction,
  type SubsetOptions,
  type SupportedFontType,
} from "@/lib/font-model";

gsap.registerPlugin(useGSAP);

type WorkerResponse =
  | {
      id: string;
      type: "progress";
      message: StatusKey;
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

type CompressionResult = {
  url: string;
  fileName: string;
  fontFamily: string;
  fontType: SupportedFontType;
  isVerified: boolean;
  missingCodePoints: number[];
  originalSize: number;
  outputSize: number;
  retainedGlyphCount: number;
  validationMessage: string;
};

type SourcePreview = {
  url: string;
  family: string;
  fileName: string;
  fontType: SupportedFontType;
  status: "loading" | "ready" | "failed";
  messageKey: PreviewMessageKey;
  customMessage?: string;
};

type Lang = "zh" | "en";

type StatusKey =
  | "waitingFont"
  | "fontReady"
  | "outputChanged"
  | "optionsChanged"
  | "textChanged"
  | "readingFile"
  | "readingTables"
  | "initWoff2"
  | "generatingSubset"
  | "verifyingOutput"
  | "doneVerified"
  | "donePreviewFailed"
  | "failed";

type PreviewMessageKey =
  | "noFont"
  | "loadingSource"
  | "previewReady"
  | "sourcePreviewFailed"
  | "waitingSubset"
  | "outputPreviewFailed";

const copy = {
  zh: {
    languageSwitch: "语言切换",
    zh: "中文",
    en: "EN",
    labLabel: "字体子集工作台",
    heroSubtitle: "只保留你需要的字形。",
    pasteText: "粘贴文字",
    chooseFont: "选择字体文件",
    uploadHint: "拖拽或点击上传",
    outputName: "输出名称",
    outputType: "输出格式",
    subsetOptions: "保留规则",
    includeLatin: "拉丁字符",
    includeNumbers: "数字",
    includeSymbols: "符号",
    includeCjkPunctuation: "中文标点",
    compress: "压缩字体",
    compressing: "压缩中",
    resultTitle: "压缩结果",
    originalSize: "原始大小",
    compressedSize: "压缩后",
    glyphs: "字形",
    retained: "保留字形",
    smaller: "更小",
    download: "下载字体",
    waitingDownload: "等待输出",
    previewTitle: "字体预览",
    original: "原字体",
    subset: "压缩后",
    chooseFontFile: "请选择字体文件",
    outputPrefix: "输出",
    missing: "缺失",
    noScripts: "无文字",
    inputAria: "需要保留的文字",
    formatHint: "TTF / OTF / WOFF / WOFF2",
    textProfile: "文本概况",
    selectedFile: "已载入",
    waitingFile: "等待字体",
    outputSettings: "输出设置",
    process: "处理进度",
    verification: "验证",
    ready: "就绪",
    savings: "压缩率",
    specimen: "字样",
    scripts: "文字系统",
    format: "格式",
    status: {
      waitingFont: "等待字体文件",
      fontReady: "字体文件已就绪",
      outputChanged: "输出格式已更新",
      optionsChanged: "保留规则已更新",
      textChanged: "文字已更新",
      readingFile: "正在读取文件",
      readingTables: "正在读取字体表",
      initWoff2: "正在初始化 WOFF2 编码器",
      generatingSubset: "正在生成字体子集",
      verifyingOutput: "正在验证输出字体",
      doneVerified: "压缩完成，字体可加载",
      donePreviewFailed: "压缩完成，但预览验证失败",
      failed: "压缩失败",
    },
    steps: {
      prepare: "准备",
      subset: "子集化",
      verify: "验证",
      export: "导出",
    },
    preview: {
      noFont: "未选择字体",
      loadingSource: "正在加载原字体",
      previewReady: "字体预览已就绪",
      sourcePreviewFailed: "原字体预览加载失败",
      waitingSubset: "等待压缩",
      outputPreviewFailed: "输出预览验证失败",
    },
    errors: {
      unsupported: "请选择 TTF、OTF、WOFF 或 WOFF2 字体文件。",
      noFont: "请先选择一个字体文件。",
      noText: "请先粘贴需要保留的文字。",
      genericCompress: "字体压缩失败。",
      workerError: "字体处理线程发生错误。",
      previewUnsupported: "当前浏览器不支持字体预览",
      previewNotConfirmed: "字体已生成，但浏览器未确认可用",
      outputUnsupported: "当前输出格式暂不支持下载",
    },
    scriptLabels: {
      CJK: "中文",
      Kana: "假名",
      Hangul: "韩文",
      Latin: "拉丁",
      "Latin Extended": "扩展拉丁",
      "CJK Symbols": "中文符号",
      Other: "其他",
    },
  },
  en: {
    languageSwitch: "Language",
    zh: "中文",
    en: "EN",
    labLabel: "Font subset studio",
    heroSubtitle: "Keep only the glyphs you need.",
    pasteText: "Paste Text",
    chooseFont: "Choose Font File",
    uploadHint: "Drag & drop or click to upload",
    outputName: "Output Name",
    outputType: "Output Type",
    subsetOptions: "Keep Rules",
    includeLatin: "Latin",
    includeNumbers: "Numbers",
    includeSymbols: "Symbols",
    includeCjkPunctuation: "CJK Punctuation",
    compress: "Compress Font",
    compressing: "Compressing",
    resultTitle: "Compression Result",
    originalSize: "Original",
    compressedSize: "Compressed",
    glyphs: "Glyphs",
    retained: "Retained",
    smaller: "smaller",
    download: "Download Font",
    waitingDownload: "Waiting",
    previewTitle: "Font Preview",
    original: "Original",
    subset: "Subset",
    chooseFontFile: "Choose a font file",
    outputPrefix: "Output",
    missing: "Missing",
    noScripts: "No scripts",
    inputAria: "Text to keep",
    formatHint: "TTF / OTF / WOFF / WOFF2",
    textProfile: "Text Profile",
    selectedFile: "Loaded",
    waitingFile: "Waiting",
    outputSettings: "Output",
    process: "Process",
    verification: "Verification",
    ready: "Ready",
    savings: "Savings",
    specimen: "Specimen",
    scripts: "Scripts",
    format: "Format",
    status: {
      waitingFont: "Waiting for font file",
      fontReady: "Font file ready",
      outputChanged: "Output format updated",
      optionsChanged: "Keep rules updated",
      textChanged: "Text updated",
      readingFile: "Reading file",
      readingTables: "Reading font tables",
      initWoff2: "Initializing WOFF2 encoder",
      generatingSubset: "Generating font subset",
      verifyingOutput: "Verifying output font",
      doneVerified: "Compression complete, font loaded",
      donePreviewFailed: "Compression complete, preview failed",
      failed: "Compression failed",
    },
    steps: {
      prepare: "Prepare",
      subset: "Subset",
      verify: "Verify",
      export: "Export",
    },
    preview: {
      noFont: "No font",
      loadingSource: "Loading original font",
      previewReady: "Font preview ready",
      sourcePreviewFailed: "Original preview failed",
      waitingSubset: "Waiting",
      outputPreviewFailed: "Output preview failed",
    },
    errors: {
      unsupported: "Please choose a TTF, OTF, WOFF, or WOFF2 font file.",
      noFont: "Choose a font file first.",
      noText: "Paste the text you want to keep first.",
      genericCompress: "Font compression failed.",
      workerError: "The font worker failed.",
      previewUnsupported: "This browser does not support font previews",
      previewNotConfirmed: "The font was generated, but the browser did not confirm it",
      outputUnsupported: "This output format is not available for download",
    },
    scriptLabels: {
      CJK: "CJK",
      Kana: "Kana",
      Hangul: "Hangul",
      Latin: "Latin",
      "Latin Extended": "Latin Extended",
      "CJK Symbols": "CJK Symbols",
      Other: "Other",
    },
  },
} as const;

const sampleText =
  "山川有形，文字有意。\nLess weight. Same character.";

const defaultOptions: SubsetOptions = {
  latin: false,
  numbers: false,
  symbols: false,
  cjkPunctuation: false,
};

const outputTypes: SupportedFontType[] = ["woff2", "woff", "ttf"];
const languageStorageKey = "font-compressor-language";

export function FontCompressor() {
  const [lang, setLang] = useState<Lang>("zh");
  const [text, setText] = useState(sampleText);
  const [fontFile, setFontFile] = useState<File | null>(null);
  const [inputType, setInputType] = useState<SupportedFontType | null>(null);
  const [outputType, setOutputType] = useState<SupportedFontType>("woff2");
  const [outputName, setOutputName] = useState("font-subset.woff2");
  const [options, setOptions] = useState<SubsetOptions>(defaultOptions);
  const [isDragging, setIsDragging] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [statusKey, setStatusKey] = useState<StatusKey>("waitingFont");
  const [error, setError] = useState("");
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [sourcePreview, setSourcePreview] = useState<SourcePreview | null>(null);
  const [previewMode, setPreviewMode] = useState<"original" | "subset">("original");
  const [mobileStep, setMobileStep] = useState<"input" | "settings" | "preview">("input");
  const settingsRef = useRef<HTMLDialogElement>(null);

  const appRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const jobIdRef = useRef(0);
  const previewIdRef = useRef(0);
  const loadedFontFacesRef = useRef<FontFace[]>([]);
  const didLoadLanguageRef = useRef(false);

  const codePoints = useMemo(() => getCodePoints(text, options), [options, text]);
  const reduction = result ? sizeReduction(result.originalSize, result.outputSize) : 0;
  const previewText = useMemo(() => getPreviewText(text), [text]);
  const t = copy[lang];
  const progressPercent = getProgressPercent(statusKey, result);
  const statusTone = getStatusTone(statusKey, Boolean(error), Boolean(result?.isVerified));
  const canCompress = !isCompressing && Boolean(fontFile) && codePoints.length > 0;
  const optionItems: Array<{ key: keyof SubsetOptions; label: string }> = [
    { key: "latin", label: t.includeLatin },
    { key: "numbers", label: t.includeNumbers },
    { key: "symbols", label: t.includeSymbols },
    { key: "cjkPunctuation", label: t.includeCjkPunctuation },
  ];
  const ui = studioCopy[lang];
  const activeFamily = previewMode === "subset"
    ? result?.isVerified ? result.fontFamily : undefined
    : sourcePreview?.status === "ready" ? sourcePreview.family : undefined;
  const activePreviewMessage = previewMode === "subset"
    ? result?.validationMessage ?? t.preview.waitingSubset
    : sourcePreview
      ? getPreviewMessage(sourcePreview.messageKey, lang, sourcePreview.customMessage)
      : "";
  const specimen = fontFile
    ? Array.from(text.replace(/\s/g, "")).slice(0, 3).join("") || "Aa"
    : "Aa";


  useGSAP(
    () => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      gsap.from(".motion-item", {
        autoAlpha: 0,
        y: reduceMotion ? 0 : 18,
        duration: reduceMotion ? 0 : 0.7,
        ease: "power3.out",
        stagger: 0.055,
      });

      gsap.from(".studio-enter", {
        autoAlpha: 0,
        y: reduceMotion ? 0 : 22,
        duration: reduceMotion ? 0 : 0.72,
        ease: "power3.out",
        stagger: 0.06,
        delay: reduceMotion ? 0 : 0.1,
      });
    },
    { scope: appRef },
  );

  useGSAP(
    () => {
      if (!result) {
        return;
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      gsap.from(".result-animate", {
        autoAlpha: 0,
        y: reduceMotion ? 0 : 12,
        scale: reduceMotion ? 1 : 0.98,
        duration: reduceMotion ? 0 : 0.45,
        ease: "power2.out",
        stagger: 0.04,
      });
    },
    { dependencies: [result?.url], scope: appRef },
  );

  useEffect(() => {
    appRef.current?.setAttribute("data-app-ready", "true");
  }, []);

  useEffect(() => {
    const storedLang = window.localStorage.getItem(languageStorageKey);
    if (storedLang === "zh" || storedLang === "en") {
      const frameId = window.requestAnimationFrame(() => {
        didLoadLanguageRef.current = true;
        setLang(storedLang);
      });

      return () => window.cancelAnimationFrame(frameId);
    }

    didLoadLanguageRef.current = true;
  }, []);

  useEffect(() => {
    if (!didLoadLanguageRef.current) {
      return;
    }

    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    window.localStorage.setItem(languageStorageKey, lang);
  }, [lang]);

  useEffect(() => {
    const loadedFontFaces = loadedFontFacesRef.current;

    return () => {
      workerRef.current?.terminate();
      for (const fontFace of loadedFontFaces) {
        document.fonts.delete(fontFace);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (result?.url) {
        URL.revokeObjectURL(result.url);
      }
    };
  }, [result?.url]);

  useEffect(() => {
    return () => {
      if (sourcePreview?.url) {
        URL.revokeObjectURL(sourcePreview.url);
      }
    };
  }, [sourcePreview?.url]);

  const selectFile = useCallback(
    (file: File) => {
      const detectedType = inferFontType(file.name);

      if (!detectedType) {
        setError(t.errors.unsupported);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      previewIdRef.current += 1;
      const previewFamily = `FontCompressorSource-${previewIdRef.current}`;

      setFontFile(file);
      setInputType(detectedType);
      setOutputName(createOutputName(file.name, outputType));
      setStatusKey("fontReady");
      setError("");
      setResult(null);
      setPreviewMode("original");
      setSourcePreview({
        url: previewUrl,
        family: previewFamily,
        fileName: file.name,
        fontType: detectedType,
        status: "loading",
        messageKey: "loadingSource",
      });

      loadPreviewFont(previewFamily, previewUrl, detectedType, loadedFontFacesRef, lang)
        .then((message) => {
          setSourcePreview((current) =>
            current?.family === previewFamily
              ? {
                  ...current,
                  status: "ready",
                  messageKey: message,
                }
              : current,
          );
        })
        .catch((previewError) => {
          setSourcePreview((current) =>
            current?.family === previewFamily
              ? {
                  ...current,
                  status: "failed",
                  messageKey: "sourcePreviewFailed",
                  customMessage:
                    previewError instanceof Error
                      ? previewError.message
                      : t.preview.sourcePreviewFailed,
                }
              : current,
          );
        });
    },
    [lang, outputType, t.errors.unsupported, t.preview.sourcePreviewFailed],
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      selectFile(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (isCompressing) return;

    const file = event.dataTransfer.files[0];
    if (file) {
      selectFile(file);
    }
  };

  const updateOutputType = (nextType: SupportedFontType) => {
    setOutputType(nextType);
    setOutputName(fontFile ? createOutputName(fontFile.name, nextType) : `font-subset.${nextType}`);
    setResult(null);
    setPreviewMode("original");
    if (fontFile) {
      setStatusKey("outputChanged");
    }
  };

  const toggleOption = (key: keyof SubsetOptions) => {
    setOptions((current) => ({
      ...current,
      [key]: !current[key],
    }));
    setResult(null);
    setPreviewMode("original");
    if (fontFile) {
      setStatusKey("optionsChanged");
    }
  };

  const handleTextChange = (nextText: string) => {
    setText(nextText);
    setResult(null);
    setPreviewMode("original");
    if (fontFile) {
      setStatusKey("textChanged");
    }
  };

  const compressFont = async () => {
    if (!fontFile || !inputType) {
      setError(t.errors.noFont);
      return;
    }

    if (codePoints.length === 0) {
      setError(t.errors.noText);
      return;
    }

    if (isCompressing) return;

    setIsCompressing(true);
    setError("");
    setStatusKey("readingFile");

    try {
      const buffer = await fontFile.arrayBuffer();
      const compressed = await runWorker({
        buffer,
        inputType,
        outputType,
        codePoints,
      });
      const fileName = normalizeOutputName(outputName, outputType);
      const resultFamily = `FontCompressorSubset-${jobIdRef.current}`;
      const blob = new Blob([compressed.buffer], {
        type: getMimeType(outputType),
      });
      const url = URL.createObjectURL(blob);
      setStatusKey("verifyingOutput");
      const validation = await validatePreviewFont(
        resultFamily,
        url,
        outputType,
        loadedFontFacesRef,
        lang,
      );

      setResult((current) => {
        if (current?.url) {
          URL.revokeObjectURL(current.url);
        }

        return {
          url,
          fileName,
          fontFamily: resultFamily,
          fontType: outputType,
          isVerified: validation.ok,
          missingCodePoints: compressed.missingCodePoints,
          originalSize: fontFile.size,
          outputSize: compressed.buffer.byteLength,
          retainedGlyphCount: compressed.retainedGlyphCount,
          validationMessage: validation.message,
        };
      });
      setStatusKey(validation.ok ? "doneVerified" : "donePreviewFailed");
      setPreviewMode("subset");
      setMobileStep("preview");
    } catch (workerError) {
      setError(
        getFriendlyError(
          workerError instanceof Error ? workerError.message : t.errors.genericCompress,
          outputType,
          lang,
        ),
      );
      setStatusKey("failed");
    } finally {
      setIsCompressing(false);
    }
  };

  const runWorker = (payload: {
    buffer: ArrayBuffer;
    inputType: SupportedFontType;
    outputType: SupportedFontType;
    codePoints: number[];
  }) => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL("../workers/font-compressor.worker.ts", import.meta.url),
        { type: "module" },
      );
    }

    const worker = workerRef.current;
    const id = String((jobIdRef.current += 1));

    return new Promise<{
      buffer: ArrayBuffer;
      missingCodePoints: number[];
      retainedGlyphCount: number;
    }>((resolve, reject) => {
      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id !== id) {
          return;
        }

        if (event.data.type === "progress") {
          setStatusKey(event.data.message);
          return;
        }

        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);

        if (event.data.type === "success") {
          resolve({
            buffer: event.data.buffer,
            missingCodePoints: event.data.missingCodePoints,
            retainedGlyphCount: event.data.retainedGlyphCount,
          });
          return;
        }

        reject(new Error(event.data.message));
      };

      const handleError = (event: ErrorEvent) => {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
        reject(new Error(event.message || t.errors.workerError));
      };

      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);
      worker.postMessage({ id, ...payload }, [payload.buffer]);
    });
  };

  const renderPreview = (compact = false) => (
    <div className={compact ? "specimen-content is-compact" : "specimen-content"}>
      <div
        className={`live-specimen${fontFile ? " has-font" : ""}`}
        style={activeFamily ? { fontFamily: `"${activeFamily}", serif` } : undefined}
        aria-label={previewMode === "subset" ? t.subset : t.original}
      >
        <span>{specimen}</span>
        {!fontFile && <span className="specimen-cjk">字</span>}
      </div>
      {fontFile && (
        <div className="preview-caption">
          <p style={activeFamily ? { fontFamily: `"${activeFamily}", serif` } : undefined}>
            {previewText}
          </p>
          <span title={activePreviewMessage}>{activePreviewMessage}</span>
        </div>
      )}
    </div>
  );

  const previewTabs = (
    <div className="preview-tabs" role="group" aria-label={t.previewTitle}>
      {(["original", "subset"] as const).map((mode) => (
        <button
          type="button"
          key={mode}
          aria-pressed={previewMode === mode}
          disabled={mode === "subset" && !result}
          onClick={() => setPreviewMode(mode)}
        >
          <span className="tab-specimen" aria-hidden="true">Aa</span>
          {t[mode]}
        </button>
      ))}
    </div>
  );

  const settingsFields = (suffix: string) => (
    <div className="settings-fields">
      <div className="name-field">
        <label htmlFor={`output-name-${suffix}`}>{t.outputName}</label>
        <input
          id={`output-name-${suffix}`}
          value={outputName}
          onChange={(event) => {
            setOutputName(event.target.value);
            if (result) {
              setResult((current) => current ? { ...current, fileName: normalizeOutputName(event.target.value, outputType) } : null);
            }
          }}
          disabled={isCompressing}
        />
      </div>
      <fieldset className="keep-rules" disabled={isCompressing}>
        <legend>{t.subsetOptions}</legend>
        <div className="rules-grid">
          {optionItems.map((item) => (
            <label key={item.key}>
              <input
                type="checkbox"
                checked={options[item.key]}
                onChange={() => toggleOption(item.key)}
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );

  return (
    <main
      ref={appRef}
      className="font-app"
      data-app-ready="false"
      data-testid="font-compressor"
      data-mobile-step={mobileStep}
      data-busy={isCompressing}
    >
      <div className="browser-shell">
        <header className="topbar motion-item">
          <Link className="brand" href="/" aria-label="Font Compressor">
            <span className="brand-icon" aria-hidden="true">F</span>
            <span>FONT COMPRESSOR</span>
          </Link>
          <div className="topbar-actions">
            <span className="local-badge"><CircleDot size={13} />{ui.local}</span>
            <div className="language-switch" role="group" aria-label={t.languageSwitch}>
              <button type="button" aria-pressed={lang === "zh"} onClick={() => setLang("zh")}>{t.zh}</button>
              <button type="button" aria-pressed={lang === "en"} onClick={() => setLang("en")}>{t.en}</button>
            </div>
          </div>
        </header>

        <nav className="mobile-steps" aria-label={ui.workspace}>
          {(["input", "settings", "preview"] as const).map((step, index) => (
            <button
              type="button"
              key={step}
              aria-current={mobileStep === step ? "step" : undefined}
              onClick={() => setMobileStep(step)}
            >
              <span aria-hidden="true">0{index + 1}</span>{ui[step]}
            </button>
          ))}
        </nav>

        <section className="studio-layout" aria-label={ui.workspace}>
          <section className="specimen-panel" aria-label={t.previewTitle}>
            <div className="hero-copy motion-item">
              <h1>{ui.titleFirst}<br />{ui.titleSecond}</h1>
              <p>{ui.subtitle}</p>
            </div>
            <div className="specimen-stage studio-enter">
              <TypeOrbitScene isActive={isCompressing} />
              {renderPreview()}
            </div>
            <div className="specimen-footer motion-item">
              {previewTabs}
              {fontFile && <span className="preview-filename" title={previewMode === "subset" ? result?.fileName : fontFile.name}>{previewMode === "subset" ? result?.fileName : fontFile.name}</span>}
            </div>
          </section>

          <section className="workbench" aria-label={ui.start}>
            <h2 className="workbench-title motion-item">{ui.start}</h2>
            <div className="workbench-body studio-enter">
              <div className="input-pane">
                <button
                  className={`drop-zone${isDragging ? " is-dragging" : ""}${fontFile ? " has-file" : ""}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  disabled={isCompressing}
                  type="button"
                >
                  {fontFile ? <FileType size={27} strokeWidth={1.6} /> : <Upload size={28} strokeWidth={1.6} />}
                  <span className="drop-copy">
                    <strong>{fontFile ? fontFile.name : ui.upload}</strong>
                    <small>{fontFile ? `${formatBytes(fontFile.size)} · ${ui.changeFont}` : t.formatHint}</small>
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  className="sr-only"
                  aria-label={t.chooseFontFile}
                  type="file"
                  accept=".ttf,.otf,.woff,.woff2,font/*"
                  onChange={handleFileChange}
                  disabled={isCompressing}
                  tabIndex={-1}
                />
                <div className="text-editor">
                  <label htmlFor="subset-text">{t.inputAria}</label>
                  <textarea
                    id="subset-text"
                    value={text}
                    onChange={(event) => handleTextChange(event.target.value)}
                    disabled={isCompressing}
                    spellCheck={false}
                    placeholder={ui.textPlaceholder}
                    aria-describedby="text-count"
                  />
                  <div className="editor-meta" id="text-count">
                    <span>{ui.uniqueGlyphs}</span>
                    <span>{codePoints.length} {t.glyphs}</span>
                  </div>
                </div>
              </div>

              <div className="settings-pane">
                <fieldset className="format-field" disabled={isCompressing}>
                  <legend>{t.outputType}</legend>
                  <div className="format-switch" role="group" aria-label={t.outputType}>
                    {outputTypes.map((type) => (
                      <button
                        type="button"
                        key={type}
                        aria-pressed={outputType === type}
                        onClick={() => updateOutputType(type)}
                        disabled={isCompressing}
                      >{type.toUpperCase()}</button>
                    ))}
                  </div>
                </fieldset>
                <button className="settings-trigger" type="button" onClick={() => settingsRef.current?.showModal()}>
                  <Settings2 size={17} /><span>{ui.moreSettings}</span><ChevronDown size={17} />
                </button>
                <div className="mobile-settings">{settingsFields("mobile")}</div>
              </div>

              <div className="mobile-preview">
                <h3>{t.previewTitle}</h3>
                <div className="mobile-specimen-stage">
                  <TypeOrbitScene isActive={isCompressing} />
                  {renderPreview(true)}
                </div>
                {previewTabs}
              </div>
            </div>

            <div className="action-area motion-item">
              {result && !isCompressing && (
                <div className="result-summary result-animate" aria-label={t.resultTitle}>
                  <div><span>{t.originalSize}</span><strong>{formatBytes(result.originalSize)}</strong></div>
                  <ArrowRight size={15} aria-hidden="true" />
                  <div><span>{t.compressedSize}</span><strong>{formatBytes(result.outputSize)}</strong></div>
                  <div className="savings"><span>{t.savings}</span><strong>{reduction}%</strong></div>
                </div>
              )}
              {isCompressing && (
                <div className="compression-progress" role="progressbar" aria-label={t.process} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
                  <span style={{ width: `${progressPercent}%` }} />
                </div>
              )}
              <div className="primary-actions">
                {result && !isCompressing ? (
                  <>
                    <a className="primary-button" href={result.url} download={result.fileName}><ArrowDownToLine size={19} />{t.download}<ArrowRight className="button-arrow" size={21} /></a>
                    <button
                      className="retry-button"
                      type="button"
                      onClick={() => {
                        setResult(null);
                        setPreviewMode("original");
                        setMobileStep("input");
                        setStatusKey("fontReady");
                      }}
                      aria-label={ui.editAgain}
                      title={ui.editAgain}
                    ><RotateCcw size={19} /></button>
                  </>
                ) : (
                  <button className="primary-button" type="button" onClick={compressFont} disabled={!canCompress} aria-busy={isCompressing}>
                    {isCompressing && <Loader2 className="spinner" size={19} />}
                    {isCompressing ? t.compressing : t.compress}
                    {!isCompressing && <ArrowRight className="button-arrow" size={21} />}
                  </button>
                )}
              </div>
              <p className="privacy-note"><LockKeyhole size={13} />{ui.privacy}</p>
            </div>

            <footer className="workbench-status" data-tone={statusTone}>
              <div className="status-message" role={error ? "alert" : "status"} aria-live="polite">
                {error ? <AlertTriangle size={16} /> : result?.isVerified ? <Check size={16} /> : isCompressing ? <Loader2 className="spinner" size={16} /> : <ArrowDownToLine size={16} />}
                <span title={error || t.status[statusKey]}>{error || (fontFile ? t.status[statusKey] : ui.idle)}</span>
              </div>
              {result && result.missingCodePoints.length > 0 && (
                <p className="missing-note" title={codePointsToText(result.missingCodePoints)}>
                  {t.missing} {result.missingCodePoints.length} {t.glyphs}：{codePointsToText(result.missingCodePoints).slice(0, 28)}
                </p>
              )}
            </footer>
          </section>
        </section>
      </div>

      <dialog ref={settingsRef} className="settings-dialog" aria-labelledby="settings-title" onClick={(event) => { if (event.target === event.currentTarget) settingsRef.current?.close(); }}>
        <div className="dialog-surface">
          <header><h2 id="settings-title">{ui.moreSettings}</h2><button type="button" onClick={() => settingsRef.current?.close()} aria-label={ui.close}><X size={20} /></button></header>
          {settingsFields("dialog")}
          <button className="dialog-done" type="button" onClick={() => settingsRef.current?.close()}>{ui.done}<Check size={17} /></button>
        </div>
      </dialog>
    </main>
  );
}

const studioCopy = {
  zh: {
    local: "本地处理",
    titleFirst: "留下字形。",
    titleSecond: "卸下重量。",
    subtitle: "只保留你需要的文字。",
    start: "开始精简字体",
    upload: "选择或拖入字体文件",
    changeFont: "点击更换字体",
    textPlaceholder: "粘贴需要保留的文字…",
    uniqueGlyphs: "去重后",
    moreSettings: "保留规则与文件名",
    privacy: "字体文件不会上传，本地处理",
    idle: "就绪后，一键下载",
    editAgain: "继续编辑",
    input: "输入",
    settings: "设置",
    preview: "预览",
    workspace: "字体压缩工作台",
    close: "关闭设置",
    done: "完成",
  },
  en: {
    local: "On your device",
    titleFirst: "Keep the type.",
    titleSecond: "Lose the weight.",
    subtitle: "Only the characters you need.",
    start: "Make your font lighter",
    upload: "Choose a font or drop it here",
    changeFont: "Click to replace",
    textPlaceholder: "Paste the characters you want to keep…",
    uniqueGlyphs: "Unique characters",
    moreSettings: "Keep rules & filename",
    privacy: "Your fonts stay on your device",
    idle: "Ready when you are. Download in a click.",
    editAgain: "Continue editing",
    input: "Input",
    settings: "Settings",
    preview: "Preview",
    workspace: "Font compression workspace",
    close: "Close settings",
    done: "Done",
  },
} as const;

function getPreviewText(text: string) {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed ? collapsed.slice(0, 96) : "Font Compressor 12345 你好，世界！";
}

function getPreviewMessage(key: PreviewMessageKey, lang: Lang, customMessage?: string) {
  return customMessage ?? copy[lang].preview[key];
}

function getProgressPercent(statusKey: StatusKey, result: CompressionResult | null) {
  if (statusKey === "failed") {
    return 100;
  }

  if (result || statusKey === "doneVerified" || statusKey === "donePreviewFailed") {
    return 100;
  }

  if (statusKey === "verifyingOutput") {
    return 78;
  }

  if (statusKey === "generatingSubset") {
    return 62;
  }

  if (statusKey === "readingTables" || statusKey === "initWoff2") {
    return 42;
  }

  if (statusKey === "readingFile") {
    return 22;
  }

  return statusKey === "waitingFont" ? 6 : 14;
}

function getStatusTone(statusKey: StatusKey, hasError: boolean, isVerified: boolean) {
  if (hasError || statusKey === "failed" || statusKey === "donePreviewFailed") {
    return "error";
  }

  if (isVerified || statusKey === "doneVerified") {
    return "success";
  }

  if (
    statusKey === "readingFile" ||
    statusKey === "readingTables" ||
    statusKey === "initWoff2" ||
    statusKey === "generatingSubset" ||
    statusKey === "verifyingOutput"
  ) {
    return "busy";
  }

  return "ready";
}

async function loadPreviewFont(
  family: string,
  url: string,
  type: SupportedFontType,
  loadedFontFaces: { current: FontFace[] },
  lang: Lang,
): Promise<PreviewMessageKey> {
  if (!("FontFace" in window)) {
    throw new Error(copy[lang].errors.previewUnsupported);
  }

  const fontFace = new FontFace(
    family,
    `url("${url}") format("${getCssFontFormat(type)}")`,
    { display: "swap" },
  );

  await fontFace.load();
  document.fonts.add(fontFace);
  loadedFontFaces.current.push(fontFace);

  if (!document.fonts.check(`18px "${family}"`)) {
    throw new Error(copy[lang].errors.previewNotConfirmed);
  }

  return "previewReady";
}

async function validatePreviewFont(
  family: string,
  url: string,
  type: SupportedFontType,
  loadedFontFaces: { current: FontFace[] },
  lang: Lang,
) {
  try {
    const messageKey = await loadPreviewFont(family, url, type, loadedFontFaces, lang);
    return {
      ok: true,
      message: copy[lang].preview[messageKey],
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : copy[lang].preview.outputPreviewFailed,
    };
  }
}

function getFriendlyError(message: string, outputType: SupportedFontType, lang: Lang) {
  const localized = copy[lang];

  if (message.includes("空文件")) {
    return lang === "zh"
      ? message
      : "The encoder returned an empty file. Try WOFF or TTF output.";
  }

  if (message.includes("woff2") || message.includes("WOFF2")) {
    return lang === "zh"
      ? `WOFF2 编码失败，请先尝试切换为 WOFF 或 TTF 输出。原始错误：${message}`
      : `WOFF2 encoding failed. Try WOFF or TTF output first. Original error: ${message}`;
  }

  if (message.includes("not support font type")) {
    return lang === "zh"
      ? "当前字体格式无法解析，请确认文件是标准 TTF、OTF、WOFF 或 WOFF2。"
      : "This font format could not be parsed. Please confirm it is a standard TTF, OTF, WOFF, or WOFF2 file.";
  }

  if (outputType === "woff2") {
    return lang === "zh"
      ? `${message}。如果这个字体比较复杂，可以先尝试输出 WOFF。`
      : `${message}. If this font is complex, try WOFF output first.`;
  }

  return message || localized.errors.genericCompress;
}

function normalizeOutputName(fileName: string, outputType: SupportedFontType) {
  const fallback = `font-subset.${outputType}`;
  const trimmed = fileName.trim() || fallback;

  if (trimmed.toLowerCase().endsWith(`.${outputType}`)) {
    return trimmed;
  }

  return `${trimmed.replace(/\.[^.]+$/, "")}.${outputType}`;
}

function getMimeType(type: SupportedFontType) {
  if (type === "woff2") {
    return "font/woff2";
  }

  if (type === "woff") {
    return "font/woff";
  }

  return "font/ttf";
}
