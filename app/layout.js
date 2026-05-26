import { Noto_Serif_SC, Dancing_Script } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "./contexts/SettingsContext";

const notoSerifSC = Noto_Serif_SC({
  weight: ['200', '400', '600', '900'],
  subsets: ["latin"],
  variable: "--font-noto-serif-sc",
  display: 'swap',
});

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
    <html lang="zh" className={`${notoSerifSC.variable} ${dancingScript.variable}`} suppressHydrationWarning>
      <body>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
