"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  SearchCheck,
  Settings,
  Type,
  Upload,
  Zap,
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
    heroSubtitle: "只保留你需要的字形。",
    pasteText: "粘贴文字",
    chooseFont: "选择字体文件",
    uploadHint: "拖拽或点击上传",
    outputName: "输出名称",
    outputType: "输出格式",
    subsetOptions: "子集选项",
    includeLatin: "包含拉丁字符",
    includeNumbers: "包含数字",
    includeSymbols: "包含符号",
    includeCjkPunctuation: "中文标点",
    compress: "压缩字体",
    compressing: "压缩中",
    resultTitle: "预计结果",
    originalSize: "原始大小",
    compressedSize: "压缩后大小",
    glyphs: "字形数",
    retained: "保留字形",
    smaller: "更小",
    download: "下载字体",
    waitingDownload: "等待字体文件",
    previewTitle: "字体预览",
    original: "原字体",
    subset: "压缩后",
    chooseFontFile: "请选择字体文件",
    outputPrefix: "输出",
    missing: "缺失",
    noScripts: "无文字",
    inputAria: "需要保留的文字",
    formatHint: "TTF / OTF / WOFF / WOFF2",
    status: {
      waitingFont: "等待字体文件",
      fontReady: "字体文件已就绪",
      outputChanged: "输出格式已更新",
      optionsChanged: "子集选项已更新",
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
    heroSubtitle: "Keep only the glyphs you need.",
    pasteText: "Paste Text",
    chooseFont: "Choose Font File",
    uploadHint: "Drag & drop or click to upload",
    outputName: "Output Name",
    outputType: "Output Type",
    subsetOptions: "Subset Options",
    includeLatin: "Include Latin",
    includeNumbers: "Include Numbers",
    includeSymbols: "Include Symbols",
    includeCjkPunctuation: "CJK Punctuation",
    compress: "Compress Font",
    compressing: "Compressing",
    resultTitle: "Estimated Result",
    originalSize: "Original Size",
    compressedSize: "Compressed Size",
    glyphs: "Glyphs",
    retained: "Retained",
    smaller: "smaller",
    download: "Download Font",
    waitingDownload: "Waiting for font file",
    previewTitle: "Font Preview",
    original: "Original",
    subset: "Subset",
    chooseFontFile: "Choose a font file",
    outputPrefix: "Output",
    missing: "Missing",
    noScripts: "No scripts",
    inputAria: "Text to keep",
    formatHint: "TTF / OTF / WOFF / WOFF2",
    status: {
      waitingFont: "Waiting for font file",
      fontReady: "Font file ready",
      outputChanged: "Output format updated",
      optionsChanged: "Subset options updated",
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
      className="min-h-screen overflow-hidden bg-sky-pixel text-[color:var(--ink)]"
      data-app-ready="false"
      data-testid="font-compressor"
    >
      <div className="browser-shell">
        <header className="nav-strip">
          <div className="brand">
            <span className="brand-icon">F</span>
            <span>FONT</span>
            <span className="gold">COMPRESSOR</span>
          </div>
          <div className="language-switch" role="group" aria-label={t.languageSwitch}>
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
        </header>

        <section className="stage">
          <div className="cloud cloud-left" />
          <div className="cloud cloud-right" />
          <div className="coin coin-one" />
          <div className="coin coin-two" />

          <div className="hero-title">
            <h1>FONT COMPRESSOR</h1>
            <p>{t.heroSubtitle}</p>
          </div>

          <div className="tool-grid">
            <section className="pixel-panel text-panel">
              <div className="panel-label">
                <Type size={16} />
                {t.pasteText}
              </div>
              <textarea
                value={text}
                onChange={(event) => handleTextChange(event.target.value)}
                spellCheck={false}
                aria-label={t.inputAria}
              />
              <div className="panel-meta">
                <span>
                  {codePoints.length} {t.glyphs}
                </span>
                <span>{scriptSummary || t.noScripts}</span>
              </div>
            </section>

            <section className="pixel-panel controls-panel">
              <div className="panel-label">
                <FileText size={16} />
                {t.chooseFont}
              </div>
              <button
                className={`drop-zone ${isDragging ? "is-dragging" : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                type="button"
              >
                <Upload size={24} />
                <span>{fontFile ? fontFile.name : t.uploadHint}</span>
                <small>
                  {fontFile && inputType
                    ? `${inputType.toUpperCase()} • ${formatBytes(fontFile.size)}`
                    : t.formatHint}
                </small>
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

              <div className="field-row two-col">
                <label htmlFor="output-type">{t.outputType}</label>
                <select
                  id="output-type"
                  value={outputType}
                  onChange={(event) => updateOutputType(event.target.value as SupportedFontType)}
                >
                  {outputTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="option-box">
                <div className="option-title">
                  <Settings size={16} />
                  {t.subsetOptions}
                </div>
                <div className="option-grid">
                  <label>
                    <input
                      checked={options.latin}
                      onChange={() => toggleOption("latin")}
                      type="checkbox"
                    />
                    {t.includeLatin}
                  </label>
                  <label>
                    <input
                      checked={options.numbers}
                      onChange={() => toggleOption("numbers")}
                      type="checkbox"
                    />
                    {t.includeNumbers}
                  </label>
                  <label>
                    <input
                      checked={options.symbols}
                      onChange={() => toggleOption("symbols")}
                      type="checkbox"
                    />
                    {t.includeSymbols}
                  </label>
                  <label>
                    <input
                      checked={options.cjkPunctuation}
                      onChange={() => toggleOption("cjkPunctuation")}
                      type="checkbox"
                    />
                    {t.includeCjkPunctuation}
                  </label>
                </div>
              </div>
            </section>

            <aside className="pixel-panel result-panel">
              <button
                className="compress-button"
                disabled={isCompressing || !fontFile || codePoints.length === 0}
                onClick={compressFont}
                aria-busy={isCompressing}
                type="button"
              >
                <Zap size={22} />
                {isCompressing ? t.compressing : t.compress}
              </button>

              <div className="result-box">
                <div className="result-title">{t.resultTitle}</div>
                <dl>
                  <div>
                    <dt>{t.originalSize}</dt>
                    <dd>{fontFile ? formatBytes(fontFile.size) : "--"}</dd>
                  </div>
                  <div>
                    <dt>{t.compressedSize}</dt>
                    <dd>{result ? formatBytes(result.outputSize) : "--"}</dd>
                  </div>
                  <div>
                    <dt>{t.glyphs}</dt>
                    <dd>{codePoints.length}</dd>
                  </div>
                  <div>
                    <dt>{t.retained}</dt>
                    <dd>{result ? result.retainedGlyphCount : "--"}</dd>
                  </div>
                </dl>
                {result ? (
                  <div className="success-note">
                    {result.isVerified ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    {result.isVerified ? `${reduction}% ${t.smaller}` : result.validationMessage}
                  </div>
                ) : null}
                {result?.missingCodePoints.length ? (
                  <div className="missing-note">
                    {t.missing} {result.missingCodePoints.length}:{" "}
                    {codePointsToText(result.missingCodePoints)}
                  </div>
                ) : null}
              </div>

              {result ? (
                <a className="download-button" href={result.url} download={result.fileName}>
                  <Download size={20} />
                  {t.download}
                </a>
              ) : null}

              <div className="status-line">{t.status[statusKey]}</div>
              {error ? (
                <div className="error-line">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              ) : null}
            </aside>
          </div>

          <section className="pixel-panel preview-panel">
            <div className="panel-label">
              <SearchCheck size={16} />
              {t.previewTitle}
            </div>
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
                title={result ? result.fileName : `${t.outputPrefix} ${outputType.toUpperCase()}`}
              />
            </div>
          </section>

          <div className="ground">
            <div className="ground-top" />
          </div>
        </section>
      </div>
    </main>
  );
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
        <span>{label}</span>
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
