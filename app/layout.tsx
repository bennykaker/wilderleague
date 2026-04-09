import type { Metadata } from "next";
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
      </body>
    </html>
  );
}