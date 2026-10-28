// Importation des modules
import { Vector3 } from 'three';
import { PLANE_DEPTH, PLANE_LIFT } from './arcGeometry';

/**
 * GLSL programs and sun directions powering the globe engine.
 *
 * Three programs cooperate: the earth surface (day/night blend + globe⇄plane
 * morph + east/west tiling), the additive fresnel atmosphere and the flows
 * (constant-width screen-space ribbon, with an arrow head in the `arrow` variant).
 * Every shader shares the same `uMorph` convention: 0 = flat map, 1 = globe.
 */

/* ---- Correction de gain gamma -> linéaire ---- */
// Le pipeline est désormais géré : les textures de couleur sont décodées en
// linéaire par le matériel et `<colorspace_fragment>` réencode la sortie en
// sRGB. Toutes les constantes ci-dessous ont pourtant été réglées à l'œil sur
// le prototype r128, qui multipliait des valeurs GAMMA. Un gain `g` d'alors
// vaut `g^2.4` ici. La démonstration tient en deux lignes : dans la partie
// puissance de la courbe sRGB, encode(x) = 1.055·x^(1/2.4) − 0.055 et
// decode(v) = ((v + 0.055)/1.055)^2.4, donc
//   encode(decode(v) · k) = k^(1/2.4)·(v + 0.055) − 0.055,
// dont le coefficient de v vaut g si et seulement si k = g^2.4.
//
// C'est la PUISSANCE PURE, surtout pas la fonction de transfert sRGB complète :
// celle-ci porte le décalage +0.055, négligeable près de 1 mais dominant dans
// les valeurs sombres — mesuré, il rougissait la face nuit.
//
// Corollaire, et c'est la limite de G() : la démonstration suppose que la
// SORTIE tombe dans la partie puissance de la courbe. Quand elle tombe sous le
// genou (< 0.0031308), l'encodage devient une simple multiplication par 12.92,
// un gain y est identique dans les deux espaces, et G() ne doit surtout pas
// être appliqué. Aucun exposant unique ne couvre les deux régimes : G() est
// donc réservé aux termes de la face JOUR, cf. la face nuit plus bas.
//
// Écrire les constantes sous G() plutôt que pré-calculées garde la valeur du
// prototype lisible dans le source.
const GAMMA_PARS = `
  float G(float g){ return pow(g, 2.4); }
  vec3 G3(vec3 g){ return pow(g, vec3(2.4)); }
`;

// Direction du soleil selon le thème : de face (jour) ou derrière (nuit).
export const SUN_DAY = new Vector3(0.45, 0.28, 1.0).normalize();
export const SUN_NIGHT = new Vector3(-0.55, 0.22, -0.92).normalize();

/* ---- Shaders : Terre ---- */
// Sommet : conversion uv -> (lon,lat), interpolation entre position plane
// (décalée de aShift pour le tuilage) et position sphérique selon uMorph.
export const EARTH_VERT = `
  uniform float uMorph;
  attribute float aShift;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying float vShift;
  const float PI = 3.141592653589793;
  void main(){
    vUv = uv;
    vShift = aShift;
    float lon = (uv.x - 0.5) * 2.0 * PI;
    float lat = (uv.y - 0.5) * PI;
    vec3 sph = vec3(cos(lat)*sin(lon), sin(lat), cos(lat)*cos(lon));
    vec3 pla = vec3(lon + aShift, lat, 0.0);
    vec3 pos = mix(pla, sph, uMorph);
    vec3 nrm = normalize(mix(vec3(0.0,0.0,1.0), sph, uMorph));
    vNormalW = normalize(mat3(modelMatrix) * nrm);
    vec4 wp = modelMatrix * vec4(pos, 1.0);
    vViewDir = cameraPosition - wp.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }`;
// Fragment : mélange jour/nuit piloté par le terminateur, reflet spéculaire
// océanique, et repli « grille » si les textures ne sont pas chargées.
export const EARTH_FRAG = `
  precision highp float;
  ${GAMMA_PARS}
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uSpec;
  uniform vec3 uSun;
  uniform float uHasTex;
  uniform vec3 uFallback;
  uniform float uMorph;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  varying float vShift;
  void main(){
    // copies tuilees (vShift != 0) : visibles seulement en mode plan, sinon on jette
    if (abs(vShift) > 0.5 && uMorph > 0.12) discard;
    vec3 N = normalize(vNormalW);
    vec3 L = normalize(uSun);
    float sun = dot(N, L);
    // Terminateur jour/nuit doux
    float dayF = smoothstep(-0.12, 0.30, sun);
    vec3 col;
    if (uHasTex > 0.5) {
      // uDay / uNight sont decodees sRGB -> LINEAIRE par le materiel (colorSpace
      // pose a l'attachement), et la sortie est reencodee en fin de shader. Les
      // gains ci-dessous s'appliquent donc en espace LINEAIRE, alors que le
      // prototype r128 les appliquait sur des valeurs gamma. G() retablit
      // l'equivalence : pour un gain g applique a une valeur v, on veut
      // encode(lin(v) * G(g)) == g * v (cf. la demonstration en tete de fichier,
      // ainsi que la limite qui exclut la face nuit juste en dessous).
      vec3 dayC   = texture2D(uDay,   vUv).rgb;
      vec3 lights = texture2D(uNight, vUv).rgb;
      // Côté nuit : Terre très sombre teintée bleu + lumières des villes émissives.
      // Ces deux gains-ci ne passent PAS par G(), et c'est mesuré, pas un oubli :
      // la face nuit sort presque entièrement sous le genou de la courbe sRGB
      // (0.0031308), là où l'encodage est une simple multiplication par 12.92.
      // Un gain y est donc rigoureusement le même en gamma et en linéaire. Les
      // corriger assombrissait l'océan nocturne jusqu'au noir pur tout en
      // doublant le halo des lumières faibles — soit exactement la perte de
      // contraste ville/océan que ce portage doit éviter.
      vec3 nightC = dayC * vec3(0.05, 0.06, 0.10)
                  + lights * vec3(1.25, 1.05, 0.62) * 1.5;
      // Léger renforcement du relief côté jour
      float lit = G(0.80 + 0.24 * clamp(sun, 0.0, 1.0));
      col = mix(nightC, dayC * lit, dayF);
      // Reflet spéculaire du soleil sur les océans (spec map claire sur l'eau).
      // uSpec reste en espace lineaire (masque, pas une couleur) : ocean se lit
      // donc tel quel, seul le terme ADDITIF passe par G3.
      float ocean = texture2D(uSpec, vUv).r;
      vec3 V = normalize(vViewDir);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 30.0) * ocean * dayF;
      col += G3(vec3(0.80, 0.88, 1.0) * spec * 0.32);
    } else {
      vec2 g = abs(fract(vUv * vec2(12.0, 6.0)) - 0.5);
      float grid = smoothstep(0.46, 0.5, max(g.x, g.y));
      // uFallback arrive deja en lineaire (converti par palette.js) : seuls les
      // GAINS appliques dessus demandent la correction.
      vec3 basef = mix(uFallback, uFallback * G(1.5), grid);
      col = basef * G(mix(0.28, 1.0, dayF));
    }
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }`;

/* ---- Shaders : atmosphère (fresnel additif, s'estompe en mode plan) ---- */
// Sommet : normale transformée en espace monde, seule donnée utile au fresnel.
export const ATMO_VERT = `
  varying vec3 vNormal;
  void main(){
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;
// Fragment : halo d'autant plus intense que la normale s'éloigne de l'axe
// caméra, multiplié par uMorph pour disparaître en planisphère.
export const ATMO_FRAG = `
  precision highp float;
  ${GAMMA_PARS}
  uniform vec3 uColor;
  uniform float uMorph;
  varying vec3 vNormal;
  void main(){
    float intensity = pow(0.72 - dot(vNormal, vec3(0.0,0.0,1.0)), 3.0);
    float k = intensity * uMorph;
    // Le mélange additif opère sur la sortie DÉJÀ réencodée (le blending est un
    // étage matériel, en aval du shader) : l'apport vaut rgb_sRGB * alpha, et
    // l'alpha ne traverse pas colorspace_fragment. Seul le rgb doit donc être
    // pré-corrigé — G(k) sur la couleur, k nu sur l'alpha — pour retrouver
    // exactement l'apport uColor * k² du prototype. Appliquer G aux deux (ou
    // laisser k nu sur les deux) épaissit visiblement le halo.
    gl_FragColor = vec4(uColor * G(k), k);
    #include <colorspace_fragment>
  }`;

/* ---- Shaders : flèches de flux (position = lon,lat,elev) ---- */
// Un flux = un RUBAN d'épaisseur constante À L'ÉCRAN + une POINTE triangulaire à
// destination, dans une seule géométrie (aKind : 0 ruban, 1 pointe, cf.
// arcGeometry.js). Hors variante "arrow", la pointe reste dans la géométrie mais
// uHeadScale vaut 0 : ses trois sommets se confondent et ne couvrent aucun pixel. Pas de Line2/LineMaterial : ils ignorent le morph et le
// tuilage. Le ruban s'élargit donc ici, en espace écran, APRÈS le morph.
//
// Même mapping globe/plan que la Terre. Deux décalages de tuile s'y ajoutent,
// et ils ne jouent pas le même rôle :
//   - uShift (uniforme, par arc) replie le flux ENTIER sur la tuile la plus
//     proche du centre courant, à partir de sa longitude médiane ;
//   - aShift (attribut, par sommet) est le tuilage proprement dit, exactement
//     comme aShift sur la Terre (cf. _buildEarth) : trois copies à -2PI, 0, +2PI.
// Sans la seconde, un arc restait un corps rigide confiné à UNE tuile alors que
// les pastilles, elles, se replient chacune sur la tuile la plus proche : dès
// qu'une extrémité dépassait une demi-tuile du centre, le trait et la pastille
// de sa destination s'affichaient à une tuile complète l'un de l'autre.
//
// Les largeurs sont en PIXELS CSS et uResolution vaut la taille CSS du cadre :
// le passage px -> NDC ne dépend donc pas du devicePixelRatio.
export const ARC_VERT = `
  uniform float uMorph;
  uniform float uShift;
  uniform vec2 uResolution;
  uniform float uWidth;
  uniform float uHover;
  uniform float uHeadLen;
  uniform float uHeadWid;
  uniform float uHeadScale;
  uniform vec3 uHeadTip;
  uniform vec3 uHeadBase;
  attribute vec3 aPrev;
  attribute vec3 aNext;
  attribute float aSide;
  attribute float aT;
  attribute float aKind;
  attribute float aShift;
  attribute float aDist;
  varying float vT;
  varying float vShift;
  varying float vDist;
  varying float vKind;
  // (lon, lat, elev) -> clip space, morph et tuilage compris. Même formule que
  // GlobeEngine._updateArcLengths, qui mesure la longueur écran sur CPU.
  vec4 toClip(vec3 p){
    vec3 sph = vec3(cos(p.y)*sin(p.x), sin(p.y), cos(p.y)*cos(p.x)) * (1.0 + p.z);
    vec3 pla = vec3(p.x + uShift + aShift, p.y + p.z * ${PLANE_LIFT.toFixed(3)}, p.z * ${PLANE_DEPTH.toFixed(3)});
    return projectionMatrix * modelViewMatrix * vec4(mix(pla, sph, uMorph), 1.0);
  }
  // clip -> pixels CSS, origine au centre du cadre.
  vec2 toPx(vec4 c){ return c.xy / c.w * 0.5 * uResolution; }
  // Direction écran a -> b ; repli horizontal si les deux points se confondent
  // (arc vu par la tranche), plutôt qu'un normalize(0) qui rendrait NaN.
  vec2 dirPx(vec2 a, vec2 b){
    vec2 d = b - a;
    float l = length(d);
    return l > 1e-4 ? d / l : vec2(1.0, 0.0);
  }
  void main(){
    vT = aT;
    vShift = aShift;
    vDist = aDist;
    vKind = aKind;
    // Survol : le trait (et sa pointe) s'épaississent de moitié.
    float w = uWidth * mix(1.0, 1.5, uHover);
    vec4 clip;
    vec2 off;
    if (aKind < 0.5) {
      // Ruban : décalage perpendiculaire à la tangente écran (voisins projetés).
      clip = toClip(position);
      vec2 d = dirPx(toPx(toClip(aPrev)), toPx(toClip(aNext)));
      off = vec2(-d.y, d.x) * aSide * 0.5 * w;
    } else {
      // Pointe : posée sur uHeadTip (au bord de la pastille de destination) et
      // orientée depuis uHeadBase (une longueur de pointe plus tôt sur le trait),
      // deux points recalculés par frame sur CPU (_updateArcLengths). Longueur et
      // largeur proportionnelles au trait, réduites par uHeadScale quand l'arc est
      // plus court à l'écran que la pointe elle-même.
      clip = toClip(uHeadTip);
      vec2 d = dirPx(toPx(toClip(uHeadBase)), toPx(clip));
      float L = uHeadLen * w * uHeadScale;
      float W = uHeadWid * w * uHeadScale;
      off = abs(aSide) < 0.5 ? vec2(0.0) : (-d * L + vec2(-d.y, d.x) * aSide * 0.5 * W);
    }
    clip.xy += off / (0.5 * uResolution) * clip.w;
    gl_Position = clip;
  }`;
// Fragment, commun aux trois variantes (arrow, line, glow) : rejet des copies
// tuilées, coupe du ruban à la base de la pointe (sans effet hors variante
// "arrow", uCut y est hors d'atteinte), pointillés réguliers à l'écran, puis
// la couleur selon la variante :
//   - arrow / line : couleur pleine (aucun dégradé, aucun éclaircissement),
//     comète réduite à une modulation d'opacité, atténuation des autres flux au
//     survol ;
//   - glow (define ARC_GLOW, fusion ADDITIVE) : le rendu décoratif d'avant les
//     flèches — dégradé de luminosité de l'origine vers la destination, comète
//     lumineuse, éclaircissement vers le blanc au survol.
export const ARC_FRAG = `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uDimmed;
  uniform float uAnyHover;
  uniform float uHover;
  uniform float uTime;
  uniform float uDynamic;
  uniform float uSpeed;
  uniform float uPhase;
  uniform float uMorph;
  uniform float uCut;
  uniform vec4 uDash;
  uniform float uDashPeriod;
  varying float vT;
  varying float vShift;
  varying float vDist;
  varying float vKind;
  void main(){
    // Copies tuilees (vShift != 0) : visibles seulement en mode plan, sinon on
    // jette — meme regle et meme seuil que EARTH_FRAG. En mode globe la position
    // spherique IGNORE le decalage de tuile, donc les trois copies se
    // superposent exactement : semi-transparentes (ou additives en "glow"),
    // elles s'empileraient en un trait plus opaque qu'en mode plan.
    if (abs(vShift) > 0.5 && uMorph > 0.12) discard;
    if (vKind < 0.5) {
      // Coupe du ruban a la base de la pointe (distance ecran calculee sur CPU).
      if (vDist > uCut) discard;
      // Pointilles : vDist est la distance ECRAN depuis l'origine (px CSS),
      // recalculee par frame sur CPU -> periode reguliere quels que soient le
      // mode, le zoom et la position sur le globe. uDash = (tiret, vide, tiret,
      // vide) ; periode nulle = trait plein. La pointe reste toujours pleine.
      if (uDashPeriod > 0.0) {
        float p = mod(vDist, uDashPeriod);
        float e1 = uDash.x + uDash.y;
        bool on = p < uDash.x || (p >= e1 && p < e1 + uDash.z);
        if (!on) discard;
      }
    }
    // Comete : bosse qui parcourt le trait, de l'origine vers la destination.
    float head = fract(vT - uTime * uSpeed + uPhase);
    float comet = smoothstep(0.0, 0.16, head) * (1.0 - smoothstep(0.16, 0.34, head));
    // Survol d'un autre flux (ou d'une autre modalite de la legende) : celui-ci
    // s'attenue.
    float dim = mix(1.0, uDimmed, uAnyHover * (1.0 - uHover));
  #ifdef ARC_GLOW
    // Degrade origine -> destination : il donne le sens du flux sans pointe.
    float base = 0.34 + 0.55 * vT;
    float a = mix(base, max(base * 0.55, comet * 1.7), uDynamic);
    // Survol : renforce l'opacite et eclaircit vers le blanc.
    a *= mix(1.0, 1.9, uHover);
    vec3 col = mix(uColor, vec3(1.0), uHover * 0.35);
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uOpacity * dim);
  #else
    float a = uOpacity * dim;
    // Comete : simple modulation d'opacite le long du trait (fusion normale).
    if (vKind < 0.5) a *= mix(1.0, 0.45 + 0.55 * comet, uDynamic);
    gl_FragColor = vec4(uColor, a);
  #endif
    #include <colorspace_fragment>
  }`;
