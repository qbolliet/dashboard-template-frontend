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
   * @param {boolean} [opts.autoRotate=true] - Slow permanent rotation.
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
    // Fidélité couleur : le prototype tourne sur three r128, dont le pipeline est
    // entièrement linéaire (ni décodage sRGB des textures, ni conversion de
    // sortie). Depuis r152 la gestion des couleurs est active par défaut ;
    // la laisser assombrirait visiblement la Terre par rapport au prototype.
    THREE.ColorManagement.enabled = false;

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
    // Pendant de ColorManagement.enabled = false : sortie linéaire, sans
    // conversion sRGB — le pipeline couleur reste celui du prototype (r128).
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
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
      col[i * 3] = b * (0.85 + 0.15 * t);
      col[i * 3 + 1] = b * 0.95;
      col[i * 3 + 2] = b * (0.95 + 0.05 * (1 - t));
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
    this.atmo = new THREE.Mesh(atmoGeo, this.atmoMat);
    this.scene.add(this.atmo);   // hors group : reste centrée, glow d'ambiance

    // textures — servies depuis /public (même origine), repli « grille » du
    // shader (uHasTex) conservé si un chargement échoue.
    const loader = new THREE.TextureLoader();
    let loaded = 0;
    const done = () => { if (++loaded >= 2) this.earthMat.uniforms.uHasTex.value = 1; };
    loader.load(this.tex.day, (t) => { this.earthMat.uniforms.uDay.value = t; done(); }, undefined, () => {});
    loader.load(this.tex.night, (t) => { this.earthMat.uniforms.uNight.value = t; done(); }, undefined, () => {});
    loader.load(this.tex.spec, (t) => { this.earthMat.uniforms.uSpec.value = t; }, undefined, () => {});
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
      const { geo, pts } = this._arcGeometry(a, b, arc.value);
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
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;   // decale dans le shader (uShift) -> pas de culling
      this.arcGroup.add(line);
      this.arcHit.push({ mat, arc, a, b, pts, midLon: ((a.lon + b.lon) / 2) * DEG });
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
    for (let i = 0; i < S; i++) {
      const t = i / (S - 1);
      const p = this._slerp(v1, v2, t, ang);
      const lat = Math.asin(clamp(p.y, -1, 1));
      const lon = Math.atan2(p.x, p.z);
      const elev = Math.sin(PI * t) * height;
      pos[i * 3] = lon; pos[i * 3 + 1] = lat; pos[i * 3 + 2] = elev;
      ts[i] = t;
      if (i % 4 === 0) pts.push({ lon, lat, elev });   // échantillons pour le survol
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(ts, 1));
    return { geo: g, pts };
  }

  // Vecteur unitaire de la sphere pour un couple (lon, lat) en radians.
  _unit(lon, lat) {
    return new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
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
  _localAt(lon, lat, elev, m) {
    const s = this._unit(lon, lat).multiplyScalar(1 + elev);
    // longitude repliee sur la tuile la plus proche du centre -> defilement infini en plan
    const plon = this.centerLon + this._wrapPi(lon - this.centerLon);
    const p = new THREE.Vector3(plon, lat + elev * 1.7, elev * 0.6);
    return p.lerp(s, m);
  }

  _buildMarkers() {
    this.overlay.innerHTML = '';
    this.markers = [];
    const pal = readGlobePalette(this.c);
    // Pastilles plates, entierement pilotables : colorFor / iconFor / sizeFor.
    this.o.points.forEach((p) => {
      const el = document.createElement('div');
      el.className = 'globe-marker globe-marker--flat';
      const color = this.o.colorFor ? this.o.colorFor(p) : pal.accent;
      const icon = this.o.iconFor ? this.o.iconFor(p) : null;
      const size = this.o.sizeFor ? this.o.sizeFor(p) : 22;
      el.style.setProperty('--d', size + 'px');
      // Couleur posee par le CSSOM et non interpolee dans un attribut style :
      // l'API refuse nativement toute evasion d'attribut, et les deux <span>
      // enfants heritent de --c (custom property => heritee par defaut).
      el.style.setProperty('--c', color);
      el.innerHTML = markerHtml({ icon });
      el.addEventListener('mouseenter', () => this._showTip(p, el));
      el.addEventListener('mouseleave', () => this._hideTip());
      this.overlay.appendChild(el);
      this.markers.push({ el, p });
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
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const W = this.c.clientWidth, H = this.c.clientHeight, m = this.morph;
    let best = null, bestD = 10;   // seuil px
    for (const hit of this.arcHit) {
      let hovered = false;
      for (const s of hit.pts) {
        const local = this._localAt(s.lon, s.lat, s.elev, m);
        // culling face arrière en mode globe
        if (m > 0.5) {
          const nrm = this._unit(s.lon, s.lat).applyQuaternion(this.group.quaternion);
          if (nrm.z < -0.05) continue;
        }
        const world = local.clone().applyMatrix4(this.group.matrixWorld);
        const proj = world.project(this.camera);
        if (proj.z > 1) continue;
        // coordonnees NDC -> pixels du conteneur
        const sx = (proj.x * 0.5 + 0.5) * W, sy = (-proj.y * 0.5 + 0.5) * H;
        const d = Math.hypot(sx - mx, sy - my);
        if (d < bestD) { bestD = d; best = hit; hovered = true; }
      }
      void hovered;
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
    let dragging = false, px = 0, py = 0, moved = 0;
    const down = (e) => { dragging = true; this._dragging = true; moved = 0; px = e.clientX ?? e.touches[0].clientX; py = e.clientY ?? e.touches[0].clientY; };
    const move = (e) => {
      if (!dragging) return;
      const x = e.clientX ?? e.touches[0].clientX, y = e.clientY ?? e.touches[0].clientY;
      const dx = x - px, dy = y - py; px = x; py = y; moved += Math.abs(dx) + Math.abs(dy);
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
    this._downFns = { down, move, up };
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
    if (this.stars) this.stars.rotation.y += dt * 0.006;

    // uniforms
    this.earthMat.uniforms.uMorph.value = m;
    this.atmoMat.uniforms.uMorph.value = m;
    this.arcMats.forEach(mt => { mt.uniforms.uMorph.value = m; mt.uniforms.uTime.value = this.time; });
    // arcs : chaque flux replie sur la tuile la plus proche du centre (defilement infini)
    this.arcHit.forEach(hit => {
      hit.mat.uniforms.uShift.value = 2 * PI * Math.round((this.centerLon - hit.midLon) / (2 * PI));
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
      const { p, el } = mk;
      const lon = p.lon * DEG, lat = p.lat * DEG;
      const sph = new THREE.Vector3(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon));
      const local = this._localAt(lon, lat, 0, m);
      const world = local.clone().applyMatrix4(this.group.matrixWorld);
      const proj = world.clone().project(this.camera);
      const sx = (proj.x * 0.5 + 0.5) * W, sy = (-proj.y * 0.5 + 0.5) * H;
      // visibilité face avant (globe)
      const nrm = sph.clone().applyQuaternion(q);
      const front = clamp((nrm.z + 0.25) / 0.4, 0, 1);
      const vis = lerp(1, front, m);
      const dist = world.distanceTo(cam);
      const scale = clamp(2.6 / dist, 0.55, 1.5);
      const behind = proj.z > 1;
      el.style.transform = `translate(-50%,-50%) translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) scale(${scale.toFixed(3)})`;
      el.style.opacity = behind ? 0 : vis.toFixed(2);
      el.style.pointerEvents = (this.o.tooltips && vis > 0.5 && !behind) ? 'auto' : 'none';
      el.style.zIndex = String(1000 + Math.round((1 - proj.z) * 1000));
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
   * Enables or disables the slow permanent rotation.
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
   * ResizeObserver, window and canvas listeners, WebGL context and injected DOM.
   *
   * @returns {void}
   */
  dispose() {
    cancelAnimationFrame(this.raf);
    if (this._ro) this._ro.disconnect();
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
    this.renderer.dispose();
    // DOM injecte : canvas WebGL, overlay des pastilles, tooltip.
    if (this.c.contains(this.canvas)) this.c.removeChild(this.canvas);
    if (this.c.contains(this.overlay)) this.c.removeChild(this.overlay);
    if (this.c.contains(this.tooltip)) this.c.removeChild(this.tooltip);
  }
}

export default GlobeEngine;
