import {
  Dancing_Script,
  Inter,
  Newsreader,
  Noto_Sans_SC,
  Noto_Serif_SC,
} from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "./contexts/SettingsContext";

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif-en",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans-en",
  display: "swap",
});

const notoSerifSC = Noto_Serif_SC({
  subsets: ["latin"],
  variable: "--font-serif-zh",
  display: "swap",
});

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  variable: "--font-sans-zh",
  display: "swap",
});

const dancingScript = Dancing_Script({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-cursive",
  display: "swap",
});

const initPreferencesScript = `(function(){try{var r=document.documentElement;var t=localStorage.getItem('app-theme');if(t==='light'){r.classList.remove('dark');}else{r.classList.add('dark');}var l=localStorage.getItem('app-lang');r.lang=(l==='zh-CN'||l==='zh-TW'||l==='en')?l:'zh-CN';}catch(e){}})();`;

export const metadata = {
  metadataBase: new URL("https://Fengyue-Yj.github.io"),
  title: "吴现 · 无限",
  description: "枝生无限月，花满自然秋。",
  openGraph: {
    title: "吴现 · 无限",
    description: "枝生无限月，花满自然秋。",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="zh-CN"
      className={`${newsreader.variable} ${inter.variable} ${notoSerifSC.variable} ${notoSansSC.variable} ${dancingScript.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: initPreferencesScript }} />
      </head>
      <body>
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
