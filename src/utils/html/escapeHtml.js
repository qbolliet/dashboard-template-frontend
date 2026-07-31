// =================================================================
// ESCAPE HTML — neutralisation des données injectées dans une chaîne HTML
// =================================================================
// Toute feature qui construit du balisage par interpolation puis l'injecte via
// innerHTML doit faire passer ses DONNÉES par cet échappeur : la donnée affichée
// par ce template vient d'une base via l'API GraphQL, elle est donc non fiable
// par construction. Il vit dans la couche transverse src/utils/ car le besoin
// n'a rien de spécifique à une feature (globe aujourd'hui, tout gabarit demain),
// et src/components/ ne peut pas dépendre de src/features/.
//
// Ce n'est PAS un assainisseur (sanitizer) : il ne filtre pas du HTML pour n'en
// garder que les balises inoffensives, il rend le texte entièrement inerte. Pour
// du HTML volontaire (SVG d'icône, gabarit de tooltip fourni par l'intégrateur),
// la responsabilité reste à l'appelant — cf. les docstrings de Globe.jsx.

// Table des cinq caractères significatifs en HTML. Les guillemets simples ET
// doubles y figurent pour couvrir aussi le contexte ATTRIBUT (attr="…" comme
// attr='…'), pas seulement le contexte contenu.
const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes a value so it can be safely interpolated into an HTML string.
 *
 * Escapes the five significant characters `& < > " '`, which makes the result
 * inert both as element content and inside a quoted attribute. Non-string
 * inputs are coerced (numbers, booleans, dates…); `null` and `undefined` yield
 * an empty string rather than the literal "null"/"undefined".
 *
 * Not a sanitizer: it does not preserve any markup. Never use it on HTML that
 * is meant to be rendered as markup.
 *
 * @param {*} value - Untrusted value to render as text.
 * @returns {string} HTML-safe string.
 */
export const escapeHtml = (value) => {
  // Valeurs absentes : chaîne vide, pour ne jamais afficher "null"/"undefined".
  if (value == null) return '';
  // Remplacement en UNE passe : les entités produites contiennent un '&', qui
  // serait re-échappé (&amp;lt;) si l'on enchaînait cinq replace successifs.
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
};
