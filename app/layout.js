import { Cormorant_Garamond, Dancing_Script } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "./contexts/SettingsContext";

const cormorantGaramond = Cormorant_Garamond({
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-serif-en",
  display: "swap",
});

const dancingScript = Dancing_Script({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-cursive",
  display: "swap",
  preload: false,
});

const KINGHWA_OLDSONG_CSS =
  "https://cdn.jsdelivr.net/npm/@chinese-fonts/jhlst@3.0.0/dist/%E4%BA%AC%E8%8F%AF%E8%80%81%E5%AE%8B%E4%BD%93v2_002/result.css";

const initPreferencesScript = `(function(){try{var r=document.documentElement;var t=localStorage.getItem('app-theme');if(t==='light'){r.classList.remove('dark');}else{r.classList.add('dark');}var l=localStorage.getItem('app-lang');r.lang=(l==='zh-CN'||l==='zh-TW'||l==='en')?l:'zh-CN';}catch(e){}})();`;

export const metadata = {
  metadataBase: new URL("https://fengyue-yj.github.io"),
  title: "吴现 · 无限",
  description: "枝生无限月，花满自然秋。",
  openGraph: {
    title: "吴现 · 无限",
    description: "枝生无限月，花满自然秋。",
    type: "website",
    url: "/wuxian/",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="zh-CN"
      className={`${cormorantGaramond.variable} ${dancingScript.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href={KINGHWA_OLDSONG_CSS} />
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
