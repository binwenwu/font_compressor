# Font Compressor

一个浏览器优先的字体子集化工具。粘贴需要保留的文字，选择字体文件，然后生成只包含目标字形的压缩字体文件。

## 项目截图

![Font Compressor web interface](https://cdn.jsdelivr.net/gh/binwenwu/picgo_02/img/20260524184540785.png)

## 当前阶段

- Next.js + TypeScript 网页项目已搭建完成
- 旧版 Python/PyQt 实现已归档到 `legacy-python/`
- 字体处理在浏览器 Web Worker 中运行
- 字体文件只在本地浏览器处理，不上传到服务器
- 支持输入格式：TTF、OTF、WOFF、WOFF2
- 支持输出格式：WOFF2、WOFF、TTF
- `WOFF2` 编码依赖 `public/woff2.wasm`
- 支持中文 / English 界面切换，并记住上次选择
- 支持原字体和压缩字体预览
- 压缩后会验证生成字体是否能被浏览器加载
- 压缩结果会显示保留字形数量和缺失字符提示

## 本地开发

建议使用 Node.js `20.19.0` 或更高版本。

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

## 验证

```bash
npm run verify
```

`verify` 会依次执行 lint、生产构建、Playwright 端到端测试和依赖安全检查。

## 部署

这个项目可以直接部署到 Vercel。默认构建命令：

```bash
npm run build
```

输出由 Next.js 处理，不需要额外后端服务。

推荐设置：

- Framework Preset: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: 留空，交给 Next.js / Vercel 自动处理
- Environment Variables: 无必需项

`vercel.json` 已为 `public/woff2.wasm` 配置 `application/wasm` 和长期缓存头。

## 注意事项

- 浏览器会在本地加载和解析字体，超大字体可能需要更长处理时间。
- 如果某个字体输出 WOFF2 失败，可以先切换为 WOFF 或 TTF 输出。
- 部分字体缺少用户粘贴的字形时，结果区会显示缺失字符提示。
