import type { NextConfig } from "next";
import createMDX from "@next/mdx";

// Drapeau UNIQUE de l'export statique, posé par `npm run build:docs` et par lui seul.
// Absent en développement et en `npm run build` : les deux commandes existantes restent
// donc strictement inchangées, ce qui est la raison d'être de ce conditionnement.
const isStaticExport = process.env.DOCS_STATIC_EXPORT === "1";

// Sous-chemin de déploiement. GitHub Pages sert un dépôt de projet sous
// https://<compte>.github.io/<dépôt>/ : le basePath VAUT le nom du dépôt.
// Il est LU de l'environnement plutôt que calculé ici, parce que la même valeur doit
// être visible côté navigateur — d'où le préfixe NEXT_PUBLIC_, qui la fait inliner par
// SWC dans src/utils/url/withBasePath.js. Une seule source, deux consommateurs.
const basePath = isStaticExport
  ? (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "")
  : "";

const nextConfig: NextConfig = {
  // Active le React Compiler (stable depuis Next 16) : mémoïsation automatique
  // des composants/hooks à la compilation. Permet de supprimer les useMemo/
  // useCallback/React.memo manuels tout en préservant l'identité stable requise
  // (callback refs, handlers d'événements add/removeEventListener).
  reactCompiler: true,

  // Volontairement SANS 'mdx' : le contenu de la documentation vit dans docs/content/**
  // et est importé par la route attrape-tout de src/app/(docs)/, jamais posé comme
  // fichier de route. Élargir pageExtensions n'apporterait rien et ferait balayer
  // src/app/ à la recherche de .mdx qui ne s'y trouvent pas.
  pageExtensions: ["js", "jsx", "ts", "tsx"],

  ...(isStaticExport && {
    output: "export" as const,
    basePath,
    assetPrefix: basePath,
    // Pas d'optimiseur d'images sans serveur. ATTENTION : sous ce réglage, next/image
    // recopie le `src` TEL QUEL dans le HTML — il n'y ajoute pas le basePath, contrairement
    // à next/link (vérifié dans next/dist/shared/lib/get-img-props.js, `generateImgAttrs`).
    // D'où le passage de toutes les images locales par src/utils/url/withBasePath.js.
    images: { unoptimized: true },
    // Émet <route>/index.html plutôt que <route>.html : la seule forme que tout hôte
    // statique sert sans configuration. Divergence assumée avec le développement, où les
    // URL n'ont pas de barre oblique finale — <Link> normalise de lui-même.
    trailingSlash: true,
  }),
};

// Le greffon est donné sous forme SÉRIALISABLE (nom + options) et non par référence de
// fonction : sous Turbopack les options de loader traversent la frontière JS↔Rust, une
// fonction n'y survivrait pas.
//
// remark-frontmatter est le SEUL greffon, et son unique rôle est de faire disparaître le
// bloc `---` du document rendu (sans lui, il s'affiche à l'écran comme du texte). Il n'est
// PAS ce qui lit la métadonnée : scripts/build-docs-index.js relit le texte brut des .mdx
// et construit l'index indépendamment de cette chaîne de compilation.
const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-frontmatter", ["yaml"]]],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);
