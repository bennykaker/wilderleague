import type { Metadata } from "next";
import MobileGate from "./components/MobileGate";
import "./globals.css";

// Replace ca-pub-0000000000000000 with your actual AdSense publisher ID
const ADSENSE_PUBLISHER_ID = 'ca-pub-9605271238285023'

export const metadata: Metadata = {
  title: "WilderLeague",
  description: "Fantasy movie casting leagues",
  other: {
    'google-adsense-account': 'ca-pub-9605271238285023',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-black text-white">
        <MobileGate />
        {children}
      </body>
    </html>
  );
}