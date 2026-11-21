import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import MobileGate from "./components/MobileGate";
import ProgressBar from "./components/ProgressBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "WilderLeague",
  description: "Fan-cast books, films, shows and entire fictional universes. Choose your actors, save your lineup and share your cast.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-white">
        <ProgressBar />
        <MobileGate />
        {children}
        {process.env.VERCEL === '1' && process.env.WILDERLEAGUE_PREVIEW !== '1' && <Analytics />}
      </body>
    </html>
  );
}