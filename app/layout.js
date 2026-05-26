import { Dancing_Script } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "./contexts/SettingsContext";

const dancingScript = Dancing_Script({
  weight: ['400', '700'],
  subsets: ["latin"],
  variable: "--font-cursive",
  display: 'swap',
});

export const metadata = {
  title: "吴现 · 无限",
  description: "枝生无限月，花满自然秋。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh" className={`${dancingScript.variable}`} suppressHydrationWarning>
      <body>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
