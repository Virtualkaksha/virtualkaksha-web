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
  title: {
    default: "CBSE Class 6–12 Notes, NCERT Solutions and Tests | VirtualKaksha",
    template: "%s | VirtualKaksha",
  },
  description:
    "Free CBSE notes, NCERT solutions, videos and 30-question practice tests for Classes 6 to 12 Maths, Science, Physics and Chemistry.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "VirtualKaksha",
    title: "CBSE Class 6–12 Notes, NCERT Solutions and Tests",
    description:
      "Free CBSE notes, NCERT solutions, videos and practice tests for Classes 6 to 12.",
    images: [{ url: "/brand/virtualkaksha-logo.png", alt: "VirtualKaksha" }],
  },
  twitter: {
    card: "summary",
    title: "CBSE Class 6–12 Notes | VirtualKaksha",
    description: "Notes, NCERT solutions and practice tests for CBSE Classes 6 to 12.",
  },
  icons: {
    icon: "/brand/virtualkaksha-logo.png",
    apple: "/apple-touch-icon.png",
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
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: "VirtualKaksha",
              url: "https://virtualkaksha.com",
              email: "support@virtualkaksha.com",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Noida",
                addressRegion: "Uttar Pradesh",
                addressCountry: "IN",
              },
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
