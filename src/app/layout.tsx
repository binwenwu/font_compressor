import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Font Compressor",
  description:
    "A browser-first font subsetter that keeps only the glyphs you need.",
  applicationName: "Font Compressor",
  keywords: [
    "font compressor",
    "font subsetter",
    "web font",
    "WOFF2",
    "字体压缩",
    "字体子集化",
  ],
  openGraph: {
    title: "Font Compressor",
    description:
      "Paste text, choose a font, and download a smaller browser-ready subset.",
    type: "website",
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
