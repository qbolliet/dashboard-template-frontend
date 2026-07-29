// Importation des modules
import { Vector3 } from 'three';

/**
 * GLSL programs and sun directions powering the globe engine.
 *
 * Three programs cooperate: the earth surface (day/night blend + globe⇄plane
 * morph + east/west tiling), the additive fresnel atmosphere and the flow arcs.
 * Every shader shares the same `uMorph` convention: 0 = flat map, 1 = globe.
 */

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
      vec3 dayC   = texture2D(uDay,   vUv).rgb;
      vec3 lights = texture2D(uNight, vUv).rgb;
      // Côté nuit : Terre très sombre teintée bleu + lumières des villes émissives
      vec3 nightC = dayC * vec3(0.05, 0.06, 0.10) + lights * vec3(1.25, 1.05, 0.62) * 1.5;
      // Léger renforcement du relief côté jour
      float lit = 0.80 + 0.24 * clamp(sun, 0.0, 1.0);
      col = mix(nightC, dayC * lit, dayF);
      // Reflet spéculaire du soleil sur les océans (spec map claire sur l'eau)
      float ocean = texture2D(uSpec, vUv).r;
      vec3 V = normalize(vViewDir);
      vec3 H = normalize(L + V);
      float spec = pow(max(dot(N, H), 0.0), 30.0) * ocean * dayF;
      col += vec3(0.80, 0.88, 1.0) * spec * 0.32;
    } else {
      vec2 g = abs(fract(vUv * vec2(12.0, 6.0)) - 0.5);
      float grid = smoothstep(0.46, 0.5, max(g.x, g.y));
      vec3 basef = mix(uFallback, uFallback * 1.5, grid);
      col = basef * mix(0.28, 1.0, dayF);
    }
    gl_FragColor = vec4(col, 1.0);
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
  uniform vec3 uColor;
  uniform float uMorph;
  varying vec3 vNormal;
  void main(){
    float intensity = pow(0.72 - dot(vNormal, vec3(0.0,0.0,1.0)), 3.0);
    gl_FragColor = vec4(uColor, 1.0) * intensity * uMorph;
  }`;

/* ---- Shaders : arcs (position = lon,lat,elev) ---- */
// Sommet : même mapping globe/plan que la Terre, uShift repliant chaque flux
// sur la tuile la plus proche du centre courant.
export const LINE_VERT = `
  uniform float uMorph;
  uniform float uShift;
  attribute float aT;
  varying float vT;
  const float PI = 3.141592653589793;
  void main(){
    vT = aT;
    float lon = position.x;
    float lat = position.y;
    float elev = position.z;
    vec3 sph = vec3(cos(lat)*sin(lon), sin(lat), cos(lat)*cos(lon)) * (1.0 + elev);
    vec3 pla = vec3(lon + uShift, lat + elev * 1.7, elev * 0.6);
    vec3 pos = mix(pla, sph, uMorph);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }`;
// Fragment : dégradé statique le long du flux, tête de comète animée en mode
// dynamique, renforcement au survol.
export const LINE_FRAG = `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uDynamic;
  uniform float uSpeed;
  uniform float uPhase;
  uniform float uHover;
  varying float vT;
  void main(){
    float base = 0.34 + 0.55 * vT;          // dégradé origine -> destination (plus visible)
    float head = fract(vT - uTime * uSpeed + uPhase);
    float comet = smoothstep(0.0, 0.16, head) * (1.0 - smoothstep(0.16, 0.34, head));
    float a = mix(base, max(base * 0.55, comet * 1.7), uDynamic);
    // survol : renforce l'opacité et éclaircit vers le blanc
    a *= mix(1.0, 1.9, uHover);
    vec3 col = mix(uColor, vec3(1.0), uHover * 0.35);
    gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uOpacity);
  }`;
