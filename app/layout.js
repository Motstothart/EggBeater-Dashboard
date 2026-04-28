import { Cinzel, IM_Fell_English } from "next/font/google";
import "./globals.css";

const headingFont = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const bodyFont = IM_Fell_English({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "EggBeater Dashboard",
  description: "Athlete tracking and weekly action board",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}
