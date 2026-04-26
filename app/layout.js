import "./globals.css";

export const metadata = {
  title: "EggBeater Dashboard",
  description: "Athlete tracking and weekly action board",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
