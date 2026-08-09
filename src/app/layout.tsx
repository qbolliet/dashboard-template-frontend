import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.scss";
import ThemeProvider from '@/features/theme/providers/ThemeProvider';
import siteConfig from '@config/site.config.json';
import { resolveLocalized } from '@/utils/i18n/resolveLocalized';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';
import { withBasePath } from '@/utils/url/withBasePath';
import SWRProvider from './providers';

// =================================================================
// LAYOUT RACINE — coquille commune aux DEUX surfaces du dépôt
// =================================================================
// Depuis P4.2 le dépôt sert deux choses à des racines différentes, et ce layout ne
// contient donc plus que ce qu'elles partagent réellement : le document, les polices,
// les scripts d'amorçage et les providers.
//
//   src/app/(docs)/  → le site de DOCUMENTATION, à la racine ('/'), avec son propre
//                      chrome (barre supérieure, sidebar de sections, sommaire).
//                      MONOLINGUE, en français : c'est la documentation du template,
//                      pas un livrable du consommateur (décision de P5.4).
//   src/app/(site)/  → l'APPLICATION de démonstration, sous /demo/<langue>, avec
//                      <Header> et <Footer> — qui vivent dans demo/[locale]/layout.jsx.
//
// Aucun <main> ici : chaque branche pose le sien (cf. les en-têtes des deux layouts).

const DEFAULT_LOCALE = siteConfig.site.defaultLocale;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Métadonnées dérivées du manifeste : le titre et la description du site s'éditent dans
// config/site.config.json, pas ici. Elles sont rendues dans la langue par DÉFAUT — ce
// layout est au-dessus du segment [locale] et ne peut pas la connaître. Les pages
// localisées surchargent leur propre titre et leur propre description.
// `template` s'applique aux segments enfants uniquement (jamais à ce layout) : les pages
// générées n'ont donc qu'à renvoyer le nom de leur nœud, le suffixe du site est ajouté ici
// et nulle part ailleurs. Une page qui veut son titre verbatim utilise `title: { absolute }`.
const siteTitle = resolveLocalized(siteConfig.site.title, DEFAULT_LOCALE, DEFAULT_LOCALE);

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: `%s — ${siteTitle}`,
  },
  description: resolveLocalized(siteConfig.site.description, DEFAULT_LOCALE, DEFAULT_LOCALE),
};

// Script anti-FOUC (pattern no-flash de next-themes) : exécuté de façon synchrone dans le
// <head>, AVANT le premier paint et l'hydratation React. Il résout le thème (localStorage puis
// préférence système) et pose data-theme sur <html> pour éviter tout flash clair → sombre.
// ThemeProvider relira ensuite cet attribut comme source unique de vérité.
// Inline et sans URL : le sous-chemin de déploiement (basePath) ne peut donc pas le casser.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

// Correction de <html lang> AVANT LE PREMIER PAINT, pour les pages localisées.
//
// Le problème qu'il résout : `lang` est un attribut de <html>, et <html> est rendu par ce
// layout — qui est au-dessus du segment [locale] et ne peut donc pas lire la langue
// (`rootParams()` existe en Next 16 mais force le rendu dynamique, incompatible avec
// `output: 'export'`). Le HTML servi porte donc `lang="fr"` même sur /demo/en.
//
// Deux remèdes se complètent, et aucun ne suffit seul :
//   • le layout de langue pose `lang={locale}` sur son propre élément racine. Le HTML
//     SERVI est alors correct au sens de WCAG 3.1.2 (langue d'un passage), ce qui suffit
//     aux technologies d'assistance et aux moteurs ;
//   • ce script relit la langue dans l'URL et corrige `document.documentElement.lang`
//     avant le premier paint, pour que le document entier soit cohérent à l'exécution
//     (WCAG 3.1.1, langue de la page).
// LocaleProvider prend ensuite le relais pour les navigations CLIENTES, que ce script ne
// rejoue pas.
//
// À NE PAS RECOPIER TEL QUEL dans un projet dérivé : ce détour n'existe que parce que ce
// dépôt héberge deux surfaces. Un consommateur qui supprime le site de documentation
// place [locale] en premier segment, son layout de langue DEVIENT le layout racine, et
// `<html lang={locale}>` s'écrit directement. Voir le guide « Internationalisation ».
//
// Le préfixe est calculé avec withBasePath : `location.pathname` porte le sous-chemin de
// DÉPLOIEMENT (/<dépôt> sur GitHub Pages), que /demo seul ne reconnaîtrait pas. L'oubli
// serait invisible en local, où le préfixe est vide — le mode de défaillance habituel de
// l'export statique.
const localePrefixSegments = withBasePath(DEMO_BASE_PATH).split('/').filter(Boolean);
const localeInitScript = `(function(){try{var b=${JSON.stringify(localePrefixSegments)};var l=${JSON.stringify(siteConfig.site.locales)};var p=location.pathname.split('/').filter(Boolean);if(p.slice(0,b.length).join('/')!==b.join('/'))return;var c=p[b.length];if(l.indexOf(c)>-1){document.documentElement.lang=c;}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // suppressHydrationWarning : les scripts d'amorçage posent data-theme et lang sur
  // <html> avant l'hydratation ; React doit ignorer ces divergences d'attribut sur cet
  // élément.
  return (
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script dangerouslySetInnerHTML={{ __html: localeInitScript }} />
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
