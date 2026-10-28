import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import MobileGate from "./components/MobileGate";
import ProgressBar from "./components/ProgressBar";
import "./globals.css";

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
        <ProgressBar />
        <MobileGate />
        {children}
        {process.env.WILDERLEAGUE_PREVIEW !== '1' && <Analytics />}
      </body>
    </html>
  );
}