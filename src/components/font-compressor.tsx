"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  CircleDot,
  Download,
  FileText,
  FileType,
  Gauge,
  Languages,
  Layers2,
  Loader2,
  SearchCheck,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Type,
  Upload,
  WandSparkles,
  Zap,
} from "lucide-react";
import {
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type ReactNode,
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
  detectScripts,
  formatBytes,
  getCssFontFormat,
  getCodePoints,
  inferFontType,
  sizeReduction,
  type ScriptSummary,
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
  "你好，世界！字体压缩让网页更快！\nThe quick brown fox jumps over the lazy dog.\n0123456789 !@#$%^&*()_+";

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

  const appRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const jobIdRef = useRef(0);
  const previewIdRef = useRef(0);
  const loadedFontFacesRef = useRef<FontFace[]>([]);
  const didLoadLanguageRef = useRef(false);

  const codePoints = useMemo(() => getCodePoints(text, options), [options, text]);
  const scripts = useMemo(() => detectScripts(text), [text]);
  const reduction = result ? sizeReduction(result.originalSize, result.outputSize) : 0;
  const previewText = useMemo(() => getPreviewText(text), [text]);
  const t = copy[lang];
  const scriptSummary = formatScripts(scripts, lang);
  const progressIndex = getProgressIndex(statusKey);
  const progressPercent = getProgressPercent(statusKey, result);
  const statusTone = getStatusTone(statusKey, Boolean(error), Boolean(result?.isVerified));
  const topbarStatusLabel = getTopbarStatusLabel(statusKey, statusTone, Boolean(fontFile), lang);
  const canCompress = !isCompressing && Boolean(fontFile) && codePoints.length > 0;
  const outputFormatLabel = outputType.toUpperCase();
  const optionItems: Array<{ key: keyof SubsetOptions; label: string }> = [
    { key: "latin", label: t.includeLatin },
    { key: "numbers", label: t.includeNumbers },
    { key: "symbols", label: t.includeSymbols },
    { key: "cjkPunctuation", label: t.includeCjkPunctuation },
  ];
  const metricItems = [
    {
      label: t.originalSize,
      value: fontFile ? formatBytes(fontFile.size) : "--",
    },
    {
      label: t.compressedSize,
      value: result ? formatBytes(result.outputSize) : "--",
    },
    {
      label: t.savings,
      value: result ? `${reduction}%` : "--",
    },
    {
      label: t.retained,
      value: result ? String(result.retainedGlyphCount) : "--",
    },
  ];

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

      gsap.from(".workspace-panel", {
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

    const file = event.dataTransfer.files[0];
    if (file) {
      selectFile(file);
    }
  };

  const updateOutputType = (nextType: SupportedFontType) => {
    setOutputType(nextType);
    setOutputName(fontFile ? createOutputName(fontFile.name, nextType) : `font-subset.${nextType}`);
    setResult(null);
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
    if (fontFile) {
      setStatusKey("optionsChanged");
    }
  };

  const handleTextChange = (nextText: string) => {
    setText(nextText);
    setResult(null);
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

  return (
    <main
      ref={appRef}
      className="font-app"
      data-app-ready="false"
      data-testid="font-compressor"
    >
      <div className="browser-shell">
        <div className="ambient-layer">
          <TypeOrbitScene glyphs={previewText} isActive={isCompressing || Boolean(result)} />
        </div>

        <header className="topbar motion-item">
          <div className="brand">
            <span className="brand-icon">F</span>
            <span className="brand-copy">
              <strong>FONT COMPRESSOR</strong>
              <small>{t.labLabel}</small>
            </span>
          </div>

          <div className="topbar-actions">
            <span className="status-pill" data-tone={statusTone}>
              {statusTone === "busy" ? <Loader2 size={15} /> : <CircleDot size={15} />}
              {topbarStatusLabel}
            </span>
            <div className="language-switch" role="group" aria-label={t.languageSwitch}>
              <Languages size={16} aria-hidden="true" />
              <button
                aria-pressed={lang === "zh"}
                className={lang === "zh" ? "is-active" : ""}
                onClick={() => setLang("zh")}
                type="button"
              >
                {t.zh}
              </button>
              <button
                aria-pressed={lang === "en"}
                className={lang === "en" ? "is-active" : ""}
                onClick={() => setLang("en")}
                type="button"
              >
                {t.en}
              </button>
            </div>
          </div>
        </header>

        <section className="stage">
          <div className="hero-panel motion-item">
            <div>
              <span className="eyebrow">
                <Sparkles size={16} />
                {t.labLabel}
              </span>
              <h1>FONT COMPRESSOR</h1>
              <p>{t.heroSubtitle}</p>
            </div>
            <div className="hero-metrics" aria-label={t.textProfile}>
              <MetricCompact label={t.glyphs} value={String(codePoints.length)} />
              <MetricCompact label={t.scripts} value={scriptSummary || t.noScripts} />
              <MetricCompact label={t.format} value={outputFormatLabel} />
            </div>
          </div>

          <div className="workspace">
            <section className="workspace-panel text-panel">
              <PanelHeader icon={<Type size={18} />} title={t.pasteText} meta={t.textProfile} />
              <textarea
                value={text}
                onChange={(event) => handleTextChange(event.target.value)}
                spellCheck={false}
                aria-label={t.inputAria}
              />
              <div className="panel-meta">
                <span>
                  <ScanDot /> {codePoints.length} {t.glyphs}
                </span>
                <span>{scriptSummary || t.noScripts}</span>
              </div>
            </section>

            <section className="workspace-panel controls-panel">
              <PanelHeader icon={<FileText size={18} />} title={t.chooseFont} meta={t.outputSettings} />

              <button
                className={`drop-zone ${isDragging ? "is-dragging" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                type="button"
              >
                <span className="drop-icon">
                  <Upload size={22} />
                </span>
                <span className="drop-copy">
                  <strong>{fontFile ? fontFile.name : t.uploadHint}</strong>
                  <small>
                    {fontFile && inputType
                      ? `${t.selectedFile} ${inputType.toUpperCase()} · ${formatBytes(fontFile.size)}`
                      : t.formatHint}
                  </small>
                </span>
              </button>
              <input
                ref={fileInputRef}
                className="sr-only"
                type="file"
                accept=".ttf,.otf,.woff,.woff2,font/*"
                onChange={handleFileChange}
              />

              <div className="field-row">
                <label htmlFor="output-name">{t.outputName}</label>
                <input
                  id="output-name"
                  value={outputName}
                  onChange={(event) => setOutputName(event.target.value)}
                />
              </div>

              <div className="mode-field">
                <span>{t.outputType}</span>
                <div className="format-switch" role="radiogroup" aria-label={t.outputType}>
                  {outputTypes.map((type) => (
                    <button
                      key={type}
                      aria-checked={outputType === type}
                      className={outputType === type ? "is-active" : ""}
                      onClick={() => updateOutputType(type)}
                      role="radio"
                      type="button"
                    >
                      <FileType size={15} />
                      {type.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="option-box">
                <div className="option-title">
                  <SlidersHorizontal size={16} />
                  {t.subsetOptions}
                </div>
                <div className="option-grid">
                  {optionItems.map((item) => (
                    <label key={item.key} className="toggle-row">
                      <input
                        checked={options[item.key]}
                        onChange={() => toggleOption(item.key)}
                        type="checkbox"
                      />
                      <span aria-hidden="true" />
                      {item.label}
                    </label>
                  ))}
                </div>
              </div>
            </section>

            <aside className="workspace-panel result-panel">
              <PanelHeader icon={<Gauge size={18} />} title={t.resultTitle} meta={t.process} />

              <button
                className="compress-button"
                disabled={!canCompress}
                onClick={compressFont}
                aria-busy={isCompressing}
                type="button"
              >
                {isCompressing ? <Loader2 size={20} /> : <Zap size={20} />}
                {isCompressing ? t.compressing : t.compress}
              </button>

              <div
                className="progress-track"
                style={{ "--progress": `${progressPercent}%` } as CSSProperties}
              >
                <span />
              </div>

              <ol className="pipeline" aria-label={t.process}>
                {[
                  t.steps.prepare,
                  t.steps.subset,
                  t.steps.verify,
                  t.steps.export,
                ].map((label, index) => (
                  <li
                    key={label}
                    className={
                      index < progressIndex
                        ? "is-complete"
                        : index === progressIndex
                          ? "is-current"
                          : ""
                    }
                  >
                    <span>{index + 1}</span>
                    {label}
                  </li>
                ))}
              </ol>

              <dl className="result-box">
                {metricItems.map((item) => (
                  <div key={item.label} className="result-metric result-animate">
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>

              {result ? (
                <div className="success-note result-animate">
                  {result.isVerified ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                  <span>{result.isVerified ? `${reduction}% ${t.smaller}` : result.validationMessage}</span>
                </div>
              ) : (
                <div className="idle-note">
                  <Archive size={17} />
                  {t.waitingDownload}
                </div>
              )}

              {result?.missingCodePoints.length ? (
                <div className="missing-note result-animate">
                  {t.missing} {result.missingCodePoints.length}:{" "}
                  {codePointsToText(result.missingCodePoints)}
                </div>
              ) : null}

              {result ? (
                <a className="download-button result-animate" href={result.url} download={result.fileName}>
                  <Download size={20} />
                  {t.download}
                </a>
              ) : null}

              <div className="status-line" data-tone={statusTone}>
                {statusTone === "success" ? <CheckCircle2 size={16} /> : <Settings size={16} />}
                {t.status[statusKey]}
              </div>
              {error ? (
                <div className="error-line">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              ) : null}
            </aside>
          </div>

          <section className="workspace-panel preview-panel">
            <PanelHeader icon={<SearchCheck size={18} />} title={t.previewTitle} meta={t.specimen} />
            <div className="preview-grid">
              <FontPreviewCard
                label={t.original}
                message={
                  sourcePreview
                    ? getPreviewMessage(sourcePreview.messageKey, lang, sourcePreview.customMessage)
                    : t.preview.noFont
                }
                previewText={previewText}
                sampleFamily={
                  sourcePreview?.status === "ready" ? sourcePreview.family : undefined
                }
                title={sourcePreview?.fileName ?? t.chooseFontFile}
              />
              <FontPreviewCard
                label={t.subset}
                message={result?.validationMessage ?? t.preview.waitingSubset}
                previewText={previewText}
                sampleFamily={result?.isVerified ? result.fontFamily : undefined}
                title={result ? result.fileName : `${t.outputPrefix} ${outputFormatLabel}`}
              />
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function PanelHeader({
  icon,
  meta,
  title,
}: {
  icon: ReactNode;
  meta: string;
  title: string;
}) {
  return (
    <div className="panel-header">
      <span className="panel-icon">{icon}</span>
      <div>
        <h2>{title}</h2>
        <small>{meta}</small>
      </div>
    </div>
  );
}

function MetricCompact({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-compact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ScanDot() {
  return <WandSparkles size={15} aria-hidden="true" />;
}

function FontPreviewCard({
  label,
  message,
  previewText,
  sampleFamily,
  title,
}: {
  label: string;
  message: string;
  previewText: string;
  sampleFamily?: string;
  title: string;
}) {
  return (
    <article className="preview-card">
      <div className="preview-head">
        <span>
          <Layers2 size={16} />
          {label}
        </span>
        <small>{message}</small>
      </div>
      <div className="preview-file">{title}</div>
      <p
        className="preview-sample"
        style={sampleFamily ? { fontFamily: `"${sampleFamily}", sans-serif` } : undefined}
      >
        {previewText}
      </p>
    </article>
  );
}

function getPreviewText(text: string) {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed ? collapsed.slice(0, 96) : "Font Compressor 12345 你好，世界！";
}

function formatScripts(scripts: ScriptSummary[], lang: Lang) {
  const labels = copy[lang].scriptLabels as Record<string, string>;
  return scripts
    .map((script) => `${labels[script.label] ?? script.label} ${script.count}`)
    .join(" / ");
}

function getPreviewMessage(key: PreviewMessageKey, lang: Lang, customMessage?: string) {
  return customMessage ?? copy[lang].preview[key];
}

function getProgressIndex(statusKey: StatusKey) {
  if (statusKey === "doneVerified" || statusKey === "donePreviewFailed") {
    return 3;
  }

  if (statusKey === "verifyingOutput") {
    return 2;
  }

  if (
    statusKey === "readingFile" ||
    statusKey === "readingTables" ||
    statusKey === "initWoff2" ||
    statusKey === "generatingSubset"
  ) {
    return 1;
  }

  return 0;
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

function getTopbarStatusLabel(
  statusKey: StatusKey,
  statusTone: string,
  hasFont: boolean,
  lang: Lang,
) {
  const localized = copy[lang];

  if (statusTone === "busy" || statusTone === "error") {
    return localized.status[statusKey];
  }

  if (statusTone === "success") {
    return localized.ready;
  }

  return hasFont ? localized.ready : localized.waitingFile;
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
