import { Dancing_Script } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "./contexts/SettingsContext";

const dancingScript = Dancing_Script({
  weight: ['400', '700'],
  subsets: ["latin"],
  variable: "--font-cursive",
  display: 'swap',
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
    <html lang="zh-CN" className={`${dancingScript.variable} dark`} suppressHydrationWarning>
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
