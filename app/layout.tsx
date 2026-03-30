import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

// Replace ca-pub-0000000000000000 with your actual AdSense publisher ID
const ADSENSE_PUBLISHER_ID = 'ca-pub-0000000000000000'

export const metadata: Metadata = {
  title: "WilderLeague",
  description: "Fantasy movie casting leagues",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        {children}
        <Script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}