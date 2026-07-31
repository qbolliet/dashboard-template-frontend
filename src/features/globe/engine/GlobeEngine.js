// Importation des modules
import * as THREE from 'three';

import {
  ATMO_FRAG,
  ATMO_VERT,
  EARTH_FRAG,
  EARTH_VERT,
  LINE_FRAG,
  LINE_VERT,
  SUN_DAY,
  SUN_NIGHT,
} from './shaders';
import { readGlobePalette } from './palette';
import { markerHtml } from '../components/GlobeMarkers/markerTemplate';
import { arcTooltipHtml, pointTooltipHtml } from '../components/GlobeTooltip/tooltipTemplates';

// ===== Globe — moteur Three.js =====
// Rendu réaliste jour/nuit, morphing globe ↔ planisphère, arcs, points overlay.
// Aucune dépendance React ici : le moteur est piloté par des setters explicites.

const PI = Math.PI;
const DEG = PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* ---- Constantes de cadrage caméra ---- */
// Distance caméra par défaut (celle que restaure resetZoom) et bornes de zoom.
const CAM_Z_DEFAULT = 3.4;
const CAM_Z_MIN = 2.1;
const CAM_Z_MAX = 6.6;
// Pas de zoom molette : facteur appliqué au deltaY de l'événement.
const WHEEL_ZOOM_STEP = 0.0016;
// Demi-angle vertical de champ (vFOV 42° / 2) — sert à borner la latitude en
// mode plan pour ne jamais dépasser les pôles.
const CAM_HALF_FOV = 21 * DEG;

/* ---- Constantes de mouvement ---- */
// Vitesse de la rotation automatique, en radians de longitude par seconde.
const AUTO_ROTATE_SPEED = 0.05;
// Vitesses d'interpolation exponentielle des transitions continues (par seconde).
const MORPH_LERP_SPEED = 4.5;   // globe ⇄ planisphère
const SUN_LERP_SPEED = 3.5;     // direction du soleil au changement de thème
const STAR_LERP_SPEED = 3.5;    // opacité du champ d'étoiles

/* ---- Constantes de cadrage géographique ---- */
// Centre initial de la vue : ~ Europe.
const INITIAL_CENTER_LON = 8 * DEG;
const INITIAL_CENTER_LAT = 30 * DEG;
// Latitude maximale atteignable en mode globe (évite de basculer sur les pôles).
const GLOBE_LAT_LIMIT = 84 * DEG;

// Couleur de travail REUTILISEE par _buildStars pour convertir sRGB -> lineaire :
// 1400 etoiles, une seule instance plutot que 1400 jetables.
const _starColor = new THREE.Color();

/* ---- Textures Terre auto-hébergées (jour, lumières nocturnes, spéculaire) ---- */
const TEX = {
  day: '/globe/earth-day.jpg',
  night: '/globe/earth-night.png',
  spec: '/globe/earth-specular.jpg',
};

class GlobeEngine {
  /**
   * Framework-agnostic Three.js globe renderer. Owns the WebGL canvas, the DOM
   * point overlay and the tooltip inside `container`. No React, no theme
   * observation: the host drives it through explicit setters.
   *
   * @param {HTMLElement} container - Positioned element the engine renders into.
   * @param {object} [opts] - Engine options, all frozen at construction.
   * @param {Array<{id: string, label: string, lat: number, lon: number,
   *   value?: number, sub?: string}>} [opts.points] - Points to place.
   * @param {Array<{from: string, to: string, value?: number}>} [opts.arcs] - Flows
   *   between point ids; `value` ∈ [0,1] drives opacity and comet speed.
   * @param {'globe'|'plane'} [opts.mode='globe'] - Initial projection.
   * @param {boolean} [opts.autoRotate=true] - Slow permanent rotation of the globe
   *   and of the star field (both are ambient motion, driven by this single switch).
   * @param {boolean} [opts.wheelZoom=true] - Wheel zoom enabled.
   * @param {boolean} [opts.showPoints=true] - Point overlay visible.
   * @param {boolean} [opts.showArcs=true] - Flow arcs visible.
   * @param {boolean} [opts.tooltips=true] - Hover tooltips enabled.
   * @param {boolean} [opts.arcsDynamic=true] - Animated (comet) arcs.
   * @param {?function(Object): string} [opts.iconFor] - Inline SVG for a badge.
   * @param {?function(Object): string} [opts.colorFor] - CSS colour of a badge.
   * @param {?function(Object): number} [opts.sizeFor] - Badge diameter in px.
   * @param {?function(Object): string} [opts.tooltipFor] - Point tooltip HTML.
   * @param {boolean} [opts.initialDark=false] - Theme at construction; later
   *   changes come exclusively through setTheme().
   * @param {{day: string, night: string, spec: string}} [opts.textures] - Texture
   *   URL overrides (defaults to the self-hosted /globe/earth-* assets).
   * @param {?function(GlobeEngine): void} [opts.onReady] - Called once the scene
   *   is built and the render loop started.
   */
  constructor(container, opts = {}) {
    // Cache de chargement partage entre toutes les instances. Ce que le cache
    // mutualise, c'est l'HTMLImageElement stocke par ImageLoader (cle
    // `image:<url>`), PAS l'objet Texture : TextureLoader.load() cree une
    // Texture neuve a chaque appel et se contente d'y brancher l'image. Chaque
    // globe garde donc SA Texture — texture.dispose() ne touche jamais celle
    // d'un autre globe de la page. Compromis assume : le cache economise le
    // telechargement et le decodage des 3 images (~1,5 Mo) pour les instances
    // suivantes, mais pas l'upload GPU, qui reste par instance et par contexte
    // WebGL (une texture GL ne se partage pas entre contextes). L'image decodee
    // reste en memoire JS jusqu'a la fin de la session : cout borne a 3 entrees.
    THREE.Cache.enabled = true;

    this.c = container;
    this.o = Object.assign({
      points: [], arcs: [], mode: 'globe',
      autoRotate: true, wheelZoom: true, showPoints: true, showArcs: true,
      tooltips: true, arcsDynamic: true, iconFor: null, colorFor: null, sizeFor: null, tooltipFor: null,
      initialDark: false, textures: null,
    }, opts);
    // Chemins de textures : défauts auto-hébergés, surchargeables par option.
    this.tex = Object.assign({}, TEX, this.o.textures || {});

    // état géographique partagé (préservé entre globe/plan)
    this.centerLon = INITIAL_CENTER_LON;
    this.centerLat = INITIAL_CENTER_LAT;
    this.camZ = CAM_Z_DEFAULT;
    this.morph = this.o.mode === 'plane' ? 0 : 1;
    this.morphTarget = this.morph;
    // Thème injecté par l'hôte (aucune lecture du DOM ici) : seul setTheme le change.
    this.dark = !!this.o.initialDark;
    // sunMix : 0 = jour (thème clair) ... 1 = nuit (thème sombre)
    this.sunTarget = this.dark ? 1 : 0; this.sunMix = this.sunTarget;
    this.starTarget = this.dark ? 1 : 0.28; this.starOpacity = this.starTarget;

    this.raf = null; this.time = 0; this.lastT = performance.now();
    this.markers = []; this.hovered = null;
    this._sunVec = new THREE.Vector3();
    // Vecteurs de travail REUTILISES, jamais realloues : les deux chemins chauds
    // (positionnement des pastilles par frame, test de survol des arcs par
    // mousemove) projetaient chacun ~4 Vector3 neufs par element et par passage.
    // Deux jeux DISJOINTS, un par chemin : ils ne s'entrelacent pas aujourd'hui
    // (boucle rAF d'un cote, dispatch d'evenement de l'autre), mais les partager
    // n'economiserait que trois objets et laisserait un piege durable.
    this._vSph = new THREE.Vector3();      // INTERNE a _localAt — aucun appelant ne doit le passer en `out`
    this._vLocal = new THREE.Vector3();    // _updateMarkers : sortie de _localAt
    this._vWorld = new THREE.Vector3();    // _updateMarkers : position monde, projetee EN PLACE
    this._vNrm = new THREE.Vector3();      // _updateMarkers : normale tournee (face visible)
    this._vHitLocal = new THREE.Vector3(); // _onHoverMove : sortie de _localAt
    this._vHitProj = new THREE.Vector3();  // _onHoverMove : projection ecran
    this._vHitNrm = new THREE.Vector3();   // _onHoverMove : normale tournee (culling face arriere)
    // Registre des ressources GPU a liberer au dispose() : geometries, materiaux
    // et textures. Un tableau alimente au fil des _build* plutot qu'un
    // scene.traverse() a la destruction, car tout n'est pas atteignable depuis
    // le graphe de scene (les textures ne vivent que dans les uniforms, et la
    // geometrie source de la Terre est deja liberee a la construction).
    this._disposables = [];
    this._disposed = false;
    this._initScene();
    this._buildStars();
    this._buildLights();
    this._buildEarth();
    this._buildArcs();
    this._buildMarkers();
    this._bindEvents();
    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);
    if (this.o.onReady) this.o.onReady(this);
  }

  // Renderer, caméra, group porteur et couches DOM (overlay de points, tooltip).
  _initScene() {
    const c = this.c;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // `outputColorSpace` reste à son défaut (SRGBColorSpace) : le mélange se fait
    // en espace linéaire et la sortie est réencodée en sRGB par
    // `<colorspace_fragment>`, inclus explicitement en fin de chacun de nos trois
    // fragment shaders (three ne l'injecte pas dans un ShaderMaterial custom).
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(c.clientWidth, c.clientHeight);
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'globe-canvas';
    c.appendChild(this.canvas);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, c.clientWidth / c.clientHeight, 0.1, 100);
    this.camera.position.set(0, 0, this.camZ);

    this.group = new THREE.Group();       // porte Terre + arcs
    this.group.rotation.order = 'YXZ';
    this.scene.add(this.group);

    // overlay DOM pour points + tooltips
    this.overlay = document.createElement('div');
    this.overlay.className = 'globe-overlay';
    c.appendChild(this.overlay);
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'globe-tooltip';
    this.tooltip.style.opacity = '0';
    c.appendChild(this.tooltip);
  }

  // Champ d'étoiles — sphère lointaine, plus dense/lumineuse en mode nuit.
  _buildStars() {
    const N = 1400;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // point aléatoire sur une grande sphère
      const u = Math.random() * 2 - 1, th = Math.random() * 2 * PI;
      const r = 42, s = Math.sqrt(1 - u * u);
      pos[i * 3] = r * s * Math.cos(th);
      pos[i * 3 + 1] = r * u;
      pos[i * 3 + 2] = r * s * Math.sin(th);
      // teinte légèrement variable (blanc bleuté -> blanc chaud)
      const t = Math.random();
      const b = 0.65 + 0.35 * Math.random();
      // Ces teintes ont ete choisies a l'oeil comme des valeurs sRGB. Or
      // PointsMaterial est un materiau NATIF : son shader contient deja
      // `<colorspace_fragment>` et considere l'attribut `color` comme etant dans
      // l'espace de travail (lineaire). Les deposer brutes ferait donc un champ
      // d'etoiles nettement plus lumineux — on les convertit une fois ici, a la
      // construction, avec la fonction de transfert de three elle-meme.
      _starColor.setRGB(b * (0.85 + 0.15 * t), b * 0.95, b * (0.95 + 0.05 * (1 - t)), THREE.SRGBColorSpace);
      col[i * 3] = _starColor.r;
      col[i * 3 + 1] = _starColor.g;
      col[i * 3 + 2] = _starColor.b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.starMat = new THREE.PointsMaterial({
      size: 0.26, sizeAttenuation: true, vertexColors: true,
      transparent: true, opacity: this.starOpacity, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.stars = new THREE.Points(g, this.starMat);
    this._disposables.push(g, this.starMat);
    this.scene.add(this.stars);
  }

  // Lumières temps réel.
  // `dir` suit le soleil ; `fill` reste côté caméra pour toujours révéler le volume.
  _buildLights() {
    this.ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.dir = new THREE.DirectionalLight(0xffffff, 0.6);
    this.fill = new THREE.DirectionalLight(0xffffff, 0.7);
    this.fill.position.set(0.4, 0.7, 1.2);
    this.scene.add(this.ambient, this.dir, this.fill);
  }

  _buildEarth() {
    const pal = readGlobePalette(this.c);
    // Terre tuilee horizontalement (5 copies) -> defilement est/ouest infini en mode plan.
    // Une seule grille source (PlaneGeometry) est recopiee 5 fois dans un meme
    // buffer : chaque copie porte un attribut aShift (multiple de 2*PI) que le
    // vertex shader ajoute a la longitude, et que le fragment shader utilise
    // pour jeter les copies laterales des que l'on repasse en globe.
    const base = new THREE.PlaneGeometry(1, 1, 180, 90);
    const bPos = base.attributes.position.array, bUv = base.attributes.uv.array;
    const bIdx = base.index.array, nv = base.attributes.position.count;
    const copies = [-2, -1, 0, 1, 2];
    const pos = new Float32Array(nv * copies.length * 3);
    const uv = new Float32Array(nv * copies.length * 2);
    const sh = new Float32Array(nv * copies.length);
    const idx = [];
    copies.forEach((kc, ci) => {
      // voff : decalage de la copie courante dans le buffer de sommets ; les
      // indices de la grille source sont recopies tels quels, decales de voff.
      const voff = ci * nv;
      for (let i = 0; i < nv; i++) {
        pos[(voff + i) * 3] = bPos[i * 3];
        pos[(voff + i) * 3 + 1] = bPos[i * 3 + 1];
        pos[(voff + i) * 3 + 2] = bPos[i * 3 + 2];
        uv[(voff + i) * 2] = bUv[i * 2];
        uv[(voff + i) * 2 + 1] = bUv[i * 2 + 1];
        sh[voff + i] = kc * 2 * PI;
      }
      for (let j = 0; j < bIdx.length; j++) idx.push(bIdx[j] + voff);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('aShift', new THREE.BufferAttribute(sh, 1));
    geo.setIndex(idx);
    base.dispose();
    this._sunVec.copy(SUN_DAY).lerp(SUN_NIGHT, this.sunMix).normalize();
    this.earthMat = new THREE.ShaderMaterial({
      uniforms: {
        uDay: { value: null }, uNight: { value: null }, uSpec: { value: null },
        uMorph: { value: this.morph },
        uHasTex: { value: 0 }, uFallback: { value: pal.fallback.clone() },
        uSun: { value: this._sunVec.clone() },
      },
      vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, side: THREE.DoubleSide,
    });
    this._disposables.push(geo, this.earthMat);
    this.earth = new THREE.Mesh(geo, this.earthMat);
    this.earth.frustumCulled = false;   // positions calculees dans le shader (tuilage) -> pas de culling
    this.group.add(this.earth);

    // atmosphère (sphère légèrement plus grande, backside)
    const atmoGeo = new THREE.SphereGeometry(1.16, 64, 48);
    this.atmoMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: pal.atmo.clone() }, uMorph: { value: this.morph } },
      vertexShader: ATMO_VERT, fragmentShader: ATMO_FRAG,
      side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
    });
    this._disposables.push(atmoGeo, this.atmoMat);
    this.atmo = new THREE.Mesh(atmoGeo, this.atmoMat);
    this.scene.add(this.atmo);   // hors group : reste centrée, glow d'ambiance

    // textures — servies depuis /public (même origine), repli « grille » du
    // shader (uHasTex) conservé si un chargement échoue.
    const loader = new THREE.TextureLoader();
    let loaded = 0;
    // Branchement d'une texture sur le materiau de la Terre. Le chargement etant
    // asynchrone, il peut aboutir APRES dispose() : dans ce cas on libere la
    // texture sur place et on n'y touche plus, sinon elle re-epinglerait en
    // memoire un materiau (et son contexte) qu'on vient de detruire.
    // Enregistrement dans _disposables ICI : c'est le seul instant ou la
    // texture existe et ou le moteur est encore vivant.
    // `srgb` : la texture porte-t-elle une COULEUR (donc encodee en sRGB) ou une
    // DONNEE ? Poser colorSpace = SRGBColorSpace fait choisir a three le format
    // interne SRGB8_ALPHA8, et le decodage sRGB -> lineaire devient materiel : il
    // s'applique donc aussi a nos texture2D() de shader custom, que three ne
    // decore d'aucun chunk de decodage.
    const attach = (name, t, srgb) => {
      if (this._disposed) { t.dispose(); return false; }
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      this._disposables.push(t);
      this.earthMat.uniforms[name].value = t;
      return true;
    };
    const done = () => { if (++loaded >= 2) this.earthMat.uniforms.uHasTex.value = 1; };
    loader.load(this.tex.day, (t) => { if (attach('uDay', t, true)) done(); }, undefined, () => {});
    loader.load(this.tex.night, (t) => { if (attach('uNight', t, true)) done(); }, undefined, () => {});
    // La carte speculaire est un MASQUE (on n'en lit que le canal .r comme
    // proportion d'ocean), pas une couleur : la decoder en sRGB fausserait la
    // ponderation du reflet. Elle reste donc en espace lineaire.
    loader.load(this.tex.spec, (t) => { attach('uSpec', t, false); }, undefined, () => {});
  }

  _buildArcs() {
    const pal = readGlobePalette(this.c);
    this.arcGroup = new THREE.Group();
    this.group.add(this.arcGroup);
    this.arcMats = [];
    this.arcHit = [];
    const byId = {}; this.o.points.forEach(p => byId[p.id] = p);

    (this.o.arcs || []).forEach((arc, i) => {
      const a = byId[arc.from], b = byId[arc.to];
      if (!a || !b) return;
      const { geo, pts, midLon } = this._arcGeometry(a, b, arc.value);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uMorph: { value: this.morph }, uColor: { value: pal.arc.clone() },
          uOpacity: { value: 0.5 + 0.5 * (arc.value ?? 0.5) }, uTime: { value: 0 },
          uDynamic: { value: this.o.arcsDynamic ? 1 : 0 }, uSpeed: { value: 0.32 + 0.14 * (arc.value ?? 0.5) },
          uPhase: { value: (i * 0.37) % 1 }, uHover: { value: 0 }, uShift: { value: 0 },
        },
        vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
        transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      this.arcMats.push(mat);
      this._disposables.push(geo, mat);
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;   // decale dans le shader (uShift) -> pas de culling
      this.arcGroup.add(line);
      // midLon vient de la geometrie DEROULEE, jamais de la moyenne des
      // longitudes brutes : pour Tokyo (139.69) -> San Francisco (-122.42) cette
      // moyenne donnerait 8.6 deg (quelque part en Europe) au lieu de -171 deg,
      // et _loop replierait l'arc sur une tuile ou ne sont pas ses extremites.
      // `shift` : miroir JS du uniform uShift, reecrit a chaque frame par _loop et
      // relu par _onHoverMove. Initialise a 0 (et non undefined) : le survol peut
      // etre interroge avant la premiere frame rendue.
      this.arcHit.push({ mat, arc, a, b, pts, midLon, shift: 0 });
    });
    this.arcGroup.visible = this.o.showArcs;
  }

  // Geometrie d'un arc : grand cercle echantillonne (slerp) + elevation en
  // cloche ; les sommets portent (lon, lat, elev), le shader se charge du
  // passage globe/plan.
  _arcGeometry(a, b, value) {
    const S = 72;
    const v1 = this._unit(a.lon * DEG, a.lat * DEG);
    const v2 = this._unit(b.lon * DEG, b.lat * DEG);
    const ang = Math.acos(clamp(v1.dot(v2), -1, 1));
    const height = 0.14 + 0.30 * clamp(ang / PI, 0, 1) + 0.10 * (value ?? 0.5);
    const pos = new Float32Array(S * 3), ts = new Float32Array(S);
    const pts = [];
    // Longitude DEROULEE (unwrapped), accumulee d'un echantillon au suivant, et
    // longitude de l'echantillon median qui servira de reference de tuile.
    let lon = 0, midLon = 0;
    const mid = S >> 1;
    for (let i = 0; i < S; i++) {
      const t = i / (S - 1);
      const p = this._slerp(v1, v2, t, ang);
      const lat = Math.asin(clamp(p.y, -1, 1));
      // atan2 replie dans ]-PI, PI] : un arc franchissant l'antimeridien (Tokyo
      // -> San Francisco) y saute de +3.14 a -3.14 entre deux echantillons
      // voisins. On n'accumule donc que l'ECART LE PLUS COURT (_wrapPi) pour
      // obtenir une suite continue, quitte a sortir de ]-PI, PI] : LINE_VERT
      // consomme cette valeur telle quelle (lon + uShift) et une marche de 2PI
      // y ferait balayer toute la largeur de l'ecran a un segment.
      const raw = Math.atan2(p.x, p.z);
      lon = i === 0 ? raw : lon + this._wrapPi(raw - lon);
      if (i === mid) midLon = lon;
      const elev = Math.sin(PI * t) * height;
      pos[i * 3] = lon; pos[i * 3 + 1] = lat; pos[i * 3 + 2] = elev;
      ts[i] = t;
      // Echantillons pour le survol. `u` est le vecteur unitaire du point, deja
      // calcule par le slerp : le figer ici epargne a _onHoverMove une
      // allocation et quatre appels trigonometriques par echantillon et par
      // mousemove (18 echantillons x 13 arcs, a plus de 100 evenements/s).
      // La longitude poussee est la DEROULEE, la meme que celle des sommets :
      // avec la brute, le survol se replierait sur une autre tuile que le rendu.
      if (i % 4 === 0) pts.push({ lon, lat, elev, u: p.clone() });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(ts, 1));
    // midLon reste DEROULEE (non repliee dans ]-PI, PI]) : _loop en deduit
    // uShift par `2PI * round((centerLon - midLon) / 2PI)`, et le shader rend
    // l'arc en `lon + uShift`. Replier midLon de 2PI*k decalerait uShift du
    // meme 2PI*k sans toucher aux sommets -> l'arc partirait une tuile plus
    // loin. Le `round` accepte n'importe quelle amplitude, aucun repli requis.
    return { geo: g, pts, midLon };
  }

  // Vecteur unitaire de la sphere pour un couple (lon, lat) en radians.
  // `out` omis => NOUVEAU vecteur, et ce chemin allouant est PORTEUR, pas un
  // confort : _arcGeometry garde ses deux extremites v1 et v2 vivantes pendant
  // toute sa boucle de 72 echantillons et les passe a _slerp. Si cet appel
  // renvoyait une instance partagee, v1 === v2, l'angle tomberait a 0 et TOUS
  // les arcs s'effondreraient en un point.
  _unit(lon, lat, out = null) {
    return (out ?? new THREE.Vector3())
      .set(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
  }
  // Interpolation spherique entre deux directions, angle deja connu.
  _slerp(v1, v2, t, ang) {
    if (ang < 1e-4) return v1.clone();
    const s = Math.sin(ang);
    const a = Math.sin((1 - t) * ang) / s, b = Math.sin(t * ang) / s;
    return new THREE.Vector3(v1.x * a + v2.x * b, v1.y * a + v2.y * b, v1.z * a + v2.z * b).normalize();
  }

  // Repliement d'un angle dans ]-PI, PI] : ramene un ecart de longitude sur le
  // tour le plus court, base du defilement est/ouest infini.
  _wrapPi(x) { const T = 2 * PI; return x - T * Math.round(x / T); }

  // position locale (avant transform du group) d'un point (lon,lat,elev) selon morph.
  // Meme mapping que LINE_VERT pour rester coherent avec les arcs / pastilles :
  // sph = position sur la sphere de rayon 1+elev, p = position plane, et l'on
  // interpole lineairement entre les deux selon m.
  // `out` omis => nouveau vecteur (cf. _unit). `this._vSph` est le SEUL scratch
  // interne de cette methode : aucun appelant ne doit le passer en `out`, sinon
  // la position spherique et la position plane s'ecraseraient mutuellement.
  // `shift` : decalage de tuile IMPOSE, en radians. Un point isole (pastille) se
  // replie tout seul sur la tuile la plus proche du centre, mais un ARC est un
  // corps rigide que le shader translate d'un uShift unique calcule sur son
  // milieu. Les echantillons de survol doivent donc recevoir CE decalage-la,
  // sinon ceux qui debordent d'une demi-tuile se replieraient chacun de leur
  // cote et la zone sensible se detacherait du trait affiche.
  _localAt(lon, lat, elev, m, out = null, shift = null) {
    const s = this._unit(lon, lat, this._vSph).multiplyScalar(1 + elev);
    // longitude repliee sur la tuile la plus proche du centre -> defilement infini en plan
    const plon = shift === null ? this.centerLon + this._wrapPi(lon - this.centerLon) : lon + shift;
    return (out ?? new THREE.Vector3()).set(plon, lat + elev * 1.7, elev * 0.6).lerp(s, m);
  }

  _buildMarkers() {
    // Reconstruction DESTRUCTIVE de l'overlay : une pastille peut etre survolee a cet
    // instant (bascule de theme sous le curseur). Detacher l'element ne declenche pas de
    // `mouseleave` fiable ; sans ce _hideTip(), la tooltip resterait figee a opacity 1
    // (plus aucune pastille vivante ne satisfait `this._tipEl === el` dans _updateMarkers,
    // donc rien ne la repositionne ni ne la masque) et `this.hovered`, reste non nul,
    // tuerait le survol des ARCS pour toute la session (_onHoverMove sort immediatement).
    this._hideTip();
    this.overlay.innerHTML = '';
    this.markers = [];
    const pal = readGlobePalette(this.c);
    // Pastilles plates, entierement pilotables : colorFor / iconFor / sizeFor.
    this.o.points.forEach((p) => {
      const el = document.createElement('div');
      el.className = 'globe-marker globe-marker--flat';
      const color = this.o.colorFor ? this.o.colorFor(p) : pal.accent;
      const icon = this.o.iconFor ? this.o.iconFor(p) : null;
      // `--d` n'est posé QUE si l'hôte fournit sizeFor : à défaut, le repli CSS
      // `var(--d, var(--globe-marker-size))` (GlobeMarkers.scss) doit rester
      // libre de jouer son rôle. Poser systématiquement une valeur inline ici
      // — même recopiée du token — rendrait --globe-marker-size invisible du
      // navigateur : une déclaration inline gagne toujours sur un var() de repli.
      if (this.o.sizeFor) el.style.setProperty('--d', this.o.sizeFor(p) + 'px');
      // Couleur posee par le CSSOM et non interpolee dans un attribut style :
      // l'API refuse nativement toute evasion d'attribut, et les deux <span>
      // enfants heritent de --c (custom property => heritee par defaut).
      el.style.setProperty('--c', color);
      // Pastille invisible tant que _updateMarkers ne l'a pas placee. Sans cela,
      // une reconstruction (setTheme) pendant que le moteur est EN PAUSE (globe
      // hors ecran) laisserait les 13 pastilles empilees en haut-gauche du cadre
      // a pleine opacite jusqu'a la reprise de la boucle.
      el.style.opacity = '0';
      el.innerHTML = markerHtml({ icon });
      el.addEventListener('mouseenter', () => this._showTip(p, el));
      el.addEventListener('mouseleave', () => this._hideTip());
      this.overlay.appendChild(el);
      const lon = p.lon * DEG, lat = p.lat * DEG;
      this.markers.push({
        el, p, lon, lat,
        // Vecteur unitaire FIGE : lon/lat d'un point ne changent jamais apres le
        // montage (donnees capturees au premier rendu, cf. useGlobeEngine), donc
        // le recalculer par frame ne faisait qu'allouer et refaire quatre appels
        // trigonometriques pour un resultat constant.
        sph: this._unit(lon, lat),
        // Derniere valeur ECRITE de chaque style garde-fou (cf. _updateMarkers).
        last: { o: '', pe: '', z: '' },
      });
    });
    this._applyPointVisibility();
  }

  // Tooltip de point : contenu de l'hote (tooltipFor) ou template par defaut.
  _showTip(p, el) {
    if (!this.o.tooltips || !this.o.showPoints) return;
    this._clearArcHover();
    this.hovered = p;
    const html = this.o.tooltipFor ? this.o.tooltipFor(p) : pointTooltipHtml(p);
    this.tooltip.className = 'globe-tooltip';
    this.tooltip.innerHTML = html;
    this.tooltip.style.opacity = '1';
    el.classList.add('is-hover');
    this._tipEl = el;
  }
  _hideTip() {
    this.hovered = null;
    if (this._tipEl) { this._tipEl.classList.remove('is-hover'); this._tipEl = null; }
    // Un arc peut rester survolé sous la pastille : on ne masque qu'à défaut.
    if (!this._arcHover) this.tooltip.style.opacity = '0';
  }

  /* ---- Survol des arcs : détection en espace écran + tooltip style Chart ---- */
  // Aucun raycasting : chaque echantillon d'arc est projete en pixels puis
  // compare a la position souris ; l'arc le plus proche sous le seuil gagne.
  // Bien moins couteux qu'un raycast sur des lignes, et coherent avec le
  // rendu (positions calculees dans le shader, invisibles du raycaster).
  _onHoverMove(e) {
    if (this._dragging) return;
    if (!this.o.showArcs || !this.o.tooltips || this.hovered) return;
    // Coordonnees LOCALES au canvas fournies par l'evenement lui-meme : plus de
    // getBoundingClientRect(), qui forcait un calcul de layout a CHAQUE
    // mousemove (100+/s). L'ecoute est posee sur le canvas, qui remplit le stage
    // sans bordure ni padding et reste toujours la cible (les pastilles vivent
    // dans un overlay FRERE, jamais dans le canvas) : offsetX/Y valent donc
    // exactement clientX/Y - rect.left/top, dans le repere de this.c.client*
    // utilise plus bas. Bonus : contrairement au rect, ce repere n'est pas
    // affecte par un ancetre `transform: scale()`, et rien ne peut le perimer.
    const mx = e.offsetX, my = e.offsetY;
    const W = this.c.clientWidth, H = this.c.clientHeight, m = this.morph;
    let best = null, bestD = 10;   // seuil px
    for (const hit of this.arcHit) {
      for (const s of hit.pts) {
        // culling face arrière en mode globe
        if (m > 0.5) {
          const nrm = this._vHitNrm.copy(s.u).applyQuaternion(this.group.quaternion);
          if (nrm.z < -0.05) continue;
        }
        this._localAt(s.lon, s.lat, s.elev, m, this._vHitLocal, hit.shift);
        const proj = this._vHitProj.copy(this._vHitLocal)
          .applyMatrix4(this.group.matrixWorld).project(this.camera);
        if (proj.z > 1) continue;
        // coordonnees NDC -> pixels du conteneur
        const sx = (proj.x * 0.5 + 0.5) * W, sy = (-proj.y * 0.5 + 0.5) * H;
        const d = Math.hypot(sx - mx, sy - my);
        if (d < bestD) { bestD = d; best = hit; }
      }
    }
    if (best) this._showArcTip(best, mx, my);
    else this._clearArcHover();
  }

  // Affichage/deplacement de la tooltip d'arc : contenu recree seulement au
  // changement d'arc survole, la position suit la souris a chaque mouvement.
  _showArcTip(hit, mx, my) {
    if (this._arcHover !== hit) {
      this._clearArcHover();
      this._arcHover = hit;
      hit.mat.uniforms.uHover.value = 1;
      this.tooltip.className = 'globe-tooltip globe-tooltip--arc';
      this.tooltip.innerHTML = arcTooltipHtml(hit.arc, hit.a, hit.b);
      this.tooltip.style.opacity = '1';
    }
    this.tooltip.style.transform =
      `translate(-50%,-100%) translate(${mx.toFixed(1)}px,${(my - 14).toFixed(1)}px)`;
  }
  _clearArcHover() {
    if (this._arcHover) { this._arcHover.mat.uniforms.uHover.value = 0; this._arcHover = null; }
    // Symetrique de _hideTip : une pastille survolee garde la main sur la tooltip.
    if (!this._tipEl) this.tooltip.style.opacity = '0';
  }

  _bindEvents() {
    const el = this.canvas;
    // Drag : deplacement du centre geographique, sensibilite proportionnelle au
    // zoom (plus on est pres, plus le geste est fin).
    let dragging = false, px = 0, py = 0;
    const down = (e) => { dragging = true; this._dragging = true; px = e.clientX ?? e.touches[0].clientX; py = e.clientY ?? e.touches[0].clientY; };
    const move = (e) => {
      if (!dragging) return;
      const x = e.clientX ?? e.touches[0].clientX, y = e.clientY ?? e.touches[0].clientY;
      const dx = x - px, dy = y - py; px = x; py = y;
      const k = 0.005 * (this.camZ / CAM_Z_DEFAULT);
      this.centerLon -= dx * k;
      this.centerLat = clamp(this.centerLat + dy * k, -GLOBE_LAT_LIMIT, GLOBE_LAT_LIMIT);
    };
    const up = () => { dragging = false; this._dragging = false; };
    el.addEventListener('mousedown', down); window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    el.addEventListener('touchstart', down, { passive: true }); el.addEventListener('touchmove', move, { passive: true }); el.addEventListener('touchend', up);
    this._hoverMove = (e) => this._onHoverMove(e);
    this._hoverLeave = () => this._clearArcHover();
    el.addEventListener('mousemove', this._hoverMove);
    el.addEventListener('mouseleave', this._hoverLeave);
    this._wheel = (e) => {
      if (!this.o.wheelZoom) return;
      e.preventDefault();
      this.camZ = clamp(this.camZ + e.deltaY * WHEEL_ZOOM_STEP, CAM_Z_MIN, CAM_Z_MAX);
    };
    el.addEventListener('wheel', this._wheel, { passive: false });

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(this.c);

    // Mise en pause hors ecran : une page peut monter plusieurs globes (six sur
    // /test-globe), et chacun rendait en continu une Terre tuilee 180x90 meme
    // completement hors du viewport. `rootMargin` redemarre la boucle un peu
    // avant l'entree en vue, pour que la premiere frame visible soit deja a jour.
    // Onglet cache : inutile d'ecouter `visibilitychange`, le navigateur suspend
    // deja requestAnimationFrame de lui-meme.
    this._io = new IntersectionObserver((entries) => {
      if (entries[entries.length - 1].isIntersecting) this._resume(); else this._pause();
    }, { rootMargin: '200px 0px' });
    this._io.observe(this.c);

    this._downFns = { down, move, up };
  }

  // Suspension de la boucle de rendu quand le cadre quitte le viewport (pilote
  // par l'IntersectionObserver de _bindEvents). `this.raf === null` EST l'etat
  // « en pause » : pas de second drapeau a tenir synchronise.
  _pause() {
    if (this.raf === null) return;
    cancelAnimationFrame(this.raf);
    this.raf = null;
    // Le halo pulse des pastilles est une animation CSS, sur le thread
    // compositeur : couper la boucle JS ne l'arrete pas (cf. GlobeMarkers.scss).
    this.overlay.classList.add('is-paused');
  }
  _resume() {
    if (this._disposed || this.raf !== null) return;
    this.overlay.classList.remove('is-paused');
    // Recalage de l'horloge. Le clamp `dt <= 0.05` de _loop bornait deja le saut
    // (2,5 mrad de longitude apres 30 s de pause, invisible), mais on repart
    // ainsi d'un delta honnete plutot que d'un delta tronque. `this.time`, lui,
    // n'est PAS recale : les cometes des flux reprennent leur phase la ou elles
    // s'etaient arretees, ce qui est exactement le comportement voulu.
    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this._loop);
  }

  _loop() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastT) / 1000); this.lastT = now; this.time += dt;

    // rotation lente permanente
    if (this.o.autoRotate) this.centerLon -= dt * AUTO_ROTATE_SPEED;
    // wrap lon
    if (this.centerLon > PI) this.centerLon -= 2 * PI;
    if (this.centerLon < -PI) this.centerLon += 2 * PI;

    // interpolations douces (morph, soleil, étoiles)
    this.morph += (this.morphTarget - this.morph) * clamp(dt * MORPH_LERP_SPEED, 0, 1);
    this.sunMix += (this.sunTarget - this.sunMix) * clamp(dt * SUN_LERP_SPEED, 0, 1);
    this.starOpacity += (this.starTarget - this.starOpacity) * clamp(dt * STAR_LERP_SPEED, 0, 1);
    const m = this.morph;

    // Blocage vertical : en plan, on ne peut pas depasser les poles (limite selon le zoom).
    // vFOV/2 = 21 deg -> demi-hauteur visible au plan z=0 = camZ * tan(21).
    // La limite interpole entre cette contrainte de cadrage (plan) et la limite
    // fixe du globe, pour que le passage d'un mode a l'autre reste continu.
    const halfH = this.camZ * Math.tan(CAM_HALF_FOV);
    const planeLatLimit = Math.max(0, PI / 2 - halfH);
    const latLimit = lerp(planeLatLimit, GLOBE_LAT_LIMIT, m);
    this.centerLat = clamp(this.centerLat, -latLimit, latLimit);

    // transform du group : rotation (globe) <-> translation (plan)
    this.group.rotation.x = this.centerLat * m;
    this.group.rotation.y = -this.centerLon * m;
    this.group.position.x = -this.centerLon * (1 - m);
    this.group.position.y = -this.centerLat * (1 - m);

    this.camera.position.z = this.camZ;

    // direction du soleil (thème) -> earth + lumière temps réel
    this._sunVec.copy(SUN_DAY).lerp(SUN_NIGHT, this.sunMix).normalize();
    this.earthMat.uniforms.uSun.value.copy(this._sunVec);
    if (this.dir) this.dir.position.copy(this._sunVec).multiplyScalar(6);

    // etoiles — masquees en mode plan (multipliees par le morph)
    if (this.starMat) this.starMat.opacity = this.starOpacity * this.morph;
    // Derive du champ d'etoiles : meme interrupteur que la rotation permanente.
    // Les deux sont du mouvement AMBIANT, declenche par aucun geste — « rotation
    // figee » doit figer la scene entiere, et la degradation « mouvements
    // reduits » de l'hote n'a ainsi qu'un seul levier a actionner.
    if (this.stars && this.o.autoRotate) this.stars.rotation.y += dt * 0.006;

    // uniforms
    this.earthMat.uniforms.uMorph.value = m;
    this.atmoMat.uniforms.uMorph.value = m;
    this.arcMats.forEach(mt => { mt.uniforms.uMorph.value = m; mt.uniforms.uTime.value = this.time; });
    // arcs : chaque flux replie sur la tuile la plus proche du centre (defilement infini)
    this.arcHit.forEach(hit => {
      // midLon est DEROULEE et peut sortir de ]-PI, PI] : `round` s'en accommode
      // sans repli prealable, et c'est justement ce qu'il faut — le shader rend
      // `lon + uShift`, donc uShift doit compenser la longitude REELLE des
      // sommets, pas sa version repliee.
      hit.shift = 2 * PI * Math.round((this.centerLon - hit.midLon) / (2 * PI));
      hit.mat.uniforms.uShift.value = hit.shift;
    });

    this.group.updateMatrixWorld(true);
    this._updateMarkers(m);
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this._loop);
  }

  // Positionnement par frame des pastilles DOM : projection ecran, fondu selon
  // la face visible en globe, echelle selon la distance camera.
  _updateMarkers(m) {
    if (!this.o.showPoints) return;
    const W = this.c.clientWidth, H = this.c.clientHeight;
    const q = this.group.quaternion;
    const cam = this.camera.position;
    for (const mk of this.markers) {
      const { el, last } = mk;
      this._localAt(mk.lon, mk.lat, 0, m, this._vLocal);
      const world = this._vWorld.copy(this._vLocal).applyMatrix4(this.group.matrixWorld);
      // Distance camera AVANT la projection : `project()` mute le vecteur en
      // place, et c'est justement ce qui evite d'en cloner un second par frame.
      const dist = world.distanceTo(cam);
      const proj = world.project(this.camera);
      const sx = (proj.x * 0.5 + 0.5) * W, sy = (-proj.y * 0.5 + 0.5) * H;
      // visibilité face avant (globe)
      const nrm = this._vNrm.copy(mk.sph).applyQuaternion(q);
      const front = clamp((nrm.z + 0.25) / 0.4, 0, 1);
      const vis = lerp(1, front, m);
      const scale = clamp(2.6 / dist, 0.55, 1.5);
      const behind = proj.z > 1;
      // `transform` est ecrit sans garde-fou : il faudrait de toute facon
      // construire le litteral (3 toFixed) pour pouvoir le comparer, et il
      // change a presque chaque frame (rotation, lerps de morph et de zoom).
      el.style.transform = `translate(-50%,-50%) translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      // Les trois suivants, eux, sont souvent identiques d'une frame a l'autre :
      // on ne les reecrit qu'au changement. Une ecriture identique n'est pas
      // gratuite (le moteur CSS parse la valeur avant de comparer le resultat).
      // Toutes les valeurs comparees sont des CHAINES, y compris le '0' de la
      // branche `behind` — sinon la comparaison ne matcherait jamais.
      const o = behind ? '0' : vis.toFixed(2);
      if (o !== last.o) { el.style.opacity = o; last.o = o; }
      const pe = (this.o.tooltips && vis > 0.5 && !behind) ? 'auto' : 'none';
      if (pe !== last.pe) { el.style.pointerEvents = pe; last.pe = pe; }
      // Tri en profondeur d'avant en arriere, CONFINE au contexte d'empilement
      // du stage (`isolation: isolate`, cf. Globe.scss) : plus besoin de l'offset
      // de 1000 qui faisait concourir les pastilles avec l'echelle --z-* de la
      // page. Borne a 0 pour qu'une pastille `behind` (proj.z > 1, donc valeur
      // negative) ne bascule pas SOUS le canvas — invisible de toute facon, mais
      // piegeux a relire.
      const z = String(Math.max(0, Math.round((1 - proj.z) * 1000)));
      if (z !== last.z) { el.style.zIndex = z; last.z = z; }
      if (this._tipEl === el) {
        this.tooltip.style.transform = `translate(-50%,-100%) translate(${sx.toFixed(1)}px,${(sy - 22).toFixed(1)}px)`;
      }
    }
  }

  // Affichage/masquage de l'overlay complet (une seule bascule CSS).
  _applyPointVisibility() {
    const show = this.o.showPoints;
    this.overlay.style.display = show ? 'block' : 'none';
    if (!show) this._hideTip();
  }

  /* ---- API publique ---- */

  /**
   * Sets the projection; the morph is animated (center and zoom preserved).
   *
   * @param {'globe'|'plane'} mode - Target projection.
   * @returns {void}
   */
  setMode(mode) { this.o.mode = mode; this.morphTarget = mode === 'plane' ? 0 : 1; }

  /**
   * Switches between globe and flat map.
   *
   * @returns {'globe'|'plane'} The new mode.
   */
  toggleMode() { this.setMode(this.o.mode === 'globe' ? 'plane' : 'globe'); return this.o.mode; }

  /**
   * Enables or disables the slow permanent rotation — of the globe AND of the star
   * field, the two ambient motions of the scene. Off means nothing drifts on its
   * own any more, which is what a reduced-motion host expects from this switch.
   *
   * @param {boolean} b - Rotation enabled.
   * @returns {void}
   */
  setAutoRotate(b) { this.o.autoRotate = b; }

  /**
   * Enables or disables wheel zoom on the canvas.
   *
   * @param {boolean} b - Wheel zoom enabled.
   * @returns {void}
   */
  setWheelZoom(b) { this.o.wheelZoom = b; }

  /**
   * Restores the default camera distance.
   *
   * @returns {void}
   */
  resetZoom() { this.camZ = CAM_Z_DEFAULT; }

  /**
   * Shows or hides the DOM point overlay.
   *
   * @param {boolean} b - Points visible.
   * @returns {void}
   */
  setShowPoints(b) { this.o.showPoints = b; this._applyPointVisibility(); }

  /**
   * Shows or hides the flow arcs.
   *
   * @param {boolean} b - Arcs visible.
   * @returns {void}
   */
  setShowArcs(b) { this.o.showArcs = b; this.arcGroup.visible = b; if (!b) this._clearArcHover(); }

  /**
   * Enables or disables hover tooltips (points and arcs).
   *
   * @param {boolean} b - Tooltips enabled.
   * @returns {void}
   */
  setTooltips(b) { this.o.tooltips = b; if (!b) { this._hideTip(); this._clearArcHover(); } }

  /**
   * Switches the arcs between animated comets and a static gradient.
   *
   * @param {boolean} b - Animated arcs.
   * @returns {void}
   */
  setArcsDynamic(b) { this.o.arcsDynamic = b; this.arcMats.forEach(m => m.uniforms.uDynamic.value = b ? 1 : 0); }

  /**
   * Applies a theme change: animates the sun direction and the star field, and
   * re-reads the `--globe-*` tokens (their `[data-theme]` variants carry the
   * dark palette) before repainting the point badges.
   *
   * @param {boolean} dark - Dark theme active.
   * @returns {void}
   */
  setTheme(dark) {
    this.dark = dark;
    this.sunTarget = dark ? 1 : 0;
    this.starTarget = dark ? 1 : 0.28;
    const pal = readGlobePalette(this.c);
    this.atmoMat.uniforms.uColor.value.copy(pal.atmo);
    this.earthMat.uniforms.uFallback.value.copy(pal.fallback);
    this.arcMats.forEach(m => m.uniforms.uColor.value.copy(pal.arc));
    this._buildMarkers();
  }

  /**
   * Resizes the renderer and camera to the container. Already called
   * automatically by the internal ResizeObserver.
   *
   * @returns {void}
   */
  resize() {
    const w = this.c.clientWidth, h = this.c.clientHeight;
    if (!w || !h) return;
    // Aucun rendu force ici : setSize() vide le buffer de dessin, donc un moteur
    // EN PAUSE affiche un canvas blanc jusqu'a sa reprise — invisible, puisqu'il
    // faut etre a plus de 200 px hors du viewport pour etre en pause, et
    // _resume() programme une frame. Dessiner ici couterait au contraire une
    // scene complete a chaque tick du ResizeObserver pendant un redimensionnement.
    this.renderer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  /**
   * Returns the current toggle state, mirroring the host's toolbar state.
   *
   * @returns {{mode: string, autoRotate: boolean, wheelZoom: boolean,
   *   showPoints: boolean, showArcs: boolean, tooltips: boolean,
   *   arcsDynamic: boolean}}
   */
  getState() {
    const o = this.o;
    return {
      mode: o.mode, autoRotate: o.autoRotate, wheelZoom: o.wheelZoom,
      showPoints: o.showPoints, showArcs: o.showArcs, tooltips: o.tooltips, arcsDynamic: o.arcsDynamic,
    };
  }

  /**
   * Releases everything the engine created or subscribed to: render loop,
   * ResizeObserver, window and canvas listeners, every GPU resource (geometries,
   * materials, textures), the WebGL context itself and the injected DOM.
   *
   * Idempotent: safe to call twice (React StrictMode double-mounts in dev), and
   * texture loads still in flight resolve into a no-op once it has run.
   *
   * @returns {void}
   */
  dispose() {
    // Idempotence : useGlobeEngine appelle dispose() depuis un nettoyage
    // d'effet, double en StrictMode. Un second passage re-libererait des
    // ressources deja detruites et re-perdrait un contexte deja rendu.
    if (this._disposed) return;
    this._disposed = true;
    // `this.raf === null` = moteur deja en pause (cf. _pause) : rien a annuler.
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
    if (this._ro) this._ro.disconnect();
    // disconnect() jette aussi les enregistrements deja en file : aucune reprise
    // ne peut etre livree apres coup (et _resume() garde `_disposed` de toute facon).
    if (this._io) this._io.disconnect();
    // Ecoutes globales du drag (posees sur window pour suivre la souris hors canvas).
    window.removeEventListener('mousemove', this._downFns.move);
    window.removeEventListener('mouseup', this._downFns.up);
    // Ecoutes du canvas : drag souris/tactile, survol des arcs, molette.
    this.canvas.removeEventListener('mousedown', this._downFns.down);
    this.canvas.removeEventListener('touchstart', this._downFns.down);
    this.canvas.removeEventListener('touchmove', this._downFns.move);
    this.canvas.removeEventListener('touchend', this._downFns.up);
    this.canvas.removeEventListener('mousemove', this._hoverMove);
    this.canvas.removeEventListener('mouseleave', this._hoverLeave);
    this.canvas.removeEventListener('wheel', this._wheel);
    // Ressources GPU : sans ce passage, renderer.dispose() seul laisse les
    // geometries (~82k sommets pour la Terre tuilee), les ShaderMaterial et les
    // textures alloues, et le contexte WebGL vivant. Au bout de quelques
    // navigations, Chrome atteint son plafond (~16 contextes) et perd
    // d'autorite les plus anciens : les globes encore montes deviennent noirs.
    this._disposables.forEach(r => r.dispose());
    this._disposables.length = 0;
    this.renderer.dispose();
    // forceContextLoss() rend le contexte au navigateur IMMEDIATEMENT, sans
    // attendre le ramassage du canvas par le GC.
    this.renderer.forceContextLoss();
    // DOM injecte : canvas WebGL, overlay des pastilles, tooltip.
    if (this.c.contains(this.canvas)) this.c.removeChild(this.canvas);
    if (this.c.contains(this.overlay)) this.c.removeChild(this.overlay);
    if (this.c.contains(this.tooltip)) this.c.removeChild(this.tooltip);
  }
}

export default GlobeEngine;
