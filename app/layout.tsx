import type { Metadata } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/geist-sans-variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://virtualkaksha.com"),
  title: { default: "VirtualKaksha", template: "%s | VirtualKaksha" },
  description: "Browse structured learning resources for Classes 6–12, read PDFs, bookmark material, and continue learning.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "VirtualKaksha",
    title: "VirtualKaksha",
    description: "Structured learning resources for Classes 6–12 across supported boards and exams.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await connection();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
