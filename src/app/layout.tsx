import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.scss";
import ThemeProvider from '@/features/theme/providers/ThemeProvider';
import siteConfig from '@config/site.config.json';
import SWRProvider from './providers';

// =================================================================
// LAYOUT RACINE — coquille commune aux DEUX surfaces du dépôt
// =================================================================
// Depuis P4.2 le dépôt sert deux choses à des racines différentes, et ce layout ne
// contient donc plus que ce qu'elles partagent réellement : le document, les polices,
// le script anti-FOUC et les providers.
//
//   src/app/(docs)/  → le site de DOCUMENTATION, à la racine ('/'), avec son propre
//                      chrome (barre supérieure, sidebar de sections, sommaire).
//   src/app/(site)/  → l'APPLICATION de démonstration, sous /demo, avec <Header> et
//                      <Footer> — qui vivent désormais dans (site)/layout.jsx.
//
// Aucun <main> ici : chaque branche pose le sien (cf. les en-têtes des deux layouts).

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
// Inline et sans URL : le sous-chemin de déploiement (basePath) ne peut donc pas le casser.
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
            {children}
          </ThemeProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
