/** App shell and page metadata. */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DestinyAI — natal prediction agent",
  description:
    "Enter date, time, and place of birth. DestinyAI maps sidereal planets, stars, and dashas into past, present, and future guidance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
