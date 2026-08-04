import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.scss";
import Header from '@/features/header/components/Header/Header';
import ThemeProvider from '@/features/theme/providers/ThemeProvider';
import navigationData from '@config/navigation_new.json';
import Footer from '@/features/footer/components/Footer/Footer';
import SWRProvider from './providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dashboard Template",
  description:
    "Template de tableau de bord pour visualiser des modèles statistiques et de prédiction.",
};

// Script anti-FOUC (pattern no-flash de next-themes) : exécuté de façon synchrone dans le
// <head>, AVANT le premier paint et l'hydratation React. Il résout le thème (localStorage puis
// préférence système) et pose data-theme sur <html> pour éviter tout flash clair → sombre.
// ThemeProvider relira ensuite cet attribut comme source unique de vérité.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // suppressHydrationWarning : le script anti-FOUC pose data-theme sur <html> avant
  // l'hydratation ; React doit ignorer cette divergence d'attribut sur cet élément.
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SWRProvider>
          <ThemeProvider>
            {/* Header avec les données de navigation_new.json (JSON sérialisable passé au client) */}
            <Header
                navigationData={navigationData.main_menu}
                navigationType='sidebar' //'sidebar'//'topbar'
                useSwitcher={false} //false //true
            />
            {children}
            <Footer copyrightText="© 2025 Dashboard Template" />
          </ThemeProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
