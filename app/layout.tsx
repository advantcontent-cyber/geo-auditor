import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEO Auditor — AMN",
  description:
    "GEO Visibility Intelligence for Hospitality. See whether your hotel appears in ChatGPT, Perplexity, and Google AI Overviews.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-grid min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
