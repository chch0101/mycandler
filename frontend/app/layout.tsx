import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyCandler",
  description: "나만의 스마트 캘린더",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
