import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.scss";
import Header from '@/features/header/components/Header/Header';
import ThemeProvider from '@/features/theme/providers/ThemeProvider';
import siteConfig from '@config/site.config.json';
import Footer from '@/features/footer/components/Footer/Footer';
import SWRProvider from './providers';
import { resolveNavigationTree } from '@/utils/navigation/resolveNavigationTree';

// Les `path` du manifeste sont relatifs à leur parent : on les résout en chemins
// absolus ICI, une seule fois et au niveau module (pas par rendu). C'est la seule
// frontière où cette concaténation a lieu — toute la navigation en aval, et la
// route attrape-tout, ne manipulent plus que des chemins absolus.
const navigationTree = resolveNavigationTree(siteConfig.navigation.tree);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Métadonnées dérivées du manifeste : le titre et la description du site s'éditent dans
// config/site.config.json, pas ici.
// `template` s'applique aux segments enfants uniquement (jamais à ce layout) : les pages
// générées n'ont donc qu'à renvoyer le nom de leur nœud, le suffixe du site est ajouté ici
// et nulle part ailleurs. Une page qui veut son titre verbatim utilise `title: { absolute }`.
export const metadata: Metadata = {
  title: {
    default: siteConfig.site.title,
    template: `%s — ${siteConfig.site.title}`,
  },
  description: siteConfig.site.description,
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
    <html lang={siteConfig.site.locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SWRProvider>
          <ThemeProvider>
            {/* Header piloté par config/site.config.json : disposition, sélecteur et arbre
                de navigation viennent tous du manifeste (JSON sérialisable passé au client) */}
            <Header
                navigationData={navigationTree}
                navigationType={siteConfig.navigation.type}
                useSwitcher={siteConfig.navigation.useSwitcher}
            />
            {children}
            <Footer copyrightText="© 2025 Dashboard Template" />
          </ThemeProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
