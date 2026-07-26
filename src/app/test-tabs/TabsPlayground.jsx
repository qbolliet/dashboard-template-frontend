'use client';

// =================================================================
// PAGE /test-tabs — DÉMONSTRATIONS INTERACTIVES (partie client)
// =================================================================
// Reprend les démos du prototype (design-system/project/ds/tabs.html) : spotlight
// à contexte partagé (graphique + tableau sur les mêmes données), playground
// piloté par un panneau de contrôles (équivalent du TweaksPanel du prototype),
// galerie des 3 variantes, barre à 9 onglets (défilement) et cas de vérification
// (disabled, keepMounted, mode contrôlé). Seul ce fichier est
// 'use client' : l'entête et les tableaux d'API restent dans page.js (serveur).

// Importation des modules
import { useState } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';
import {
  BellIcon, ChartIcon, CogIcon, DocIcon,
  GridIcon, PulseIcon, TableIcon, UsersIcon,
} from '@/components/icons';
import { Chart } from '@/features/chart';

// ── Données PARTAGÉES entre l'onglet graphique et l'onglet tableau ────────────
// Reprises À L'IDENTIQUE du prototype (tabs.html). Constante de module : la
// référence est stable, l'objet `shared` reste donc identique d'un rendu à l'autre.
const CA_TRIM = [
  { Trimestre: 'T1 2025', CA: 1180000, Croissance: 3.1 },
  { Trimestre: 'T2 2025', CA: 1245000, Croissance: 5.5 },
  { Trimestre: 'T3 2025', CA: 1322000, Croissance: 6.2 },
  { Trimestre: 'T4 2025', CA: 1410000, Croissance: 6.7 },
];

// Formateurs construits une seule fois (l'instanciation d'un Intl.NumberFormat
// est coûteuse) : chiffre d'affaires en euros compacts, croissance à 1 décimale.
const CA_FORMAT = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 2,
});
const GROWTH_FORMAT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// Variantes de la galerie : [valeur de la prop, légende] — reprises du prototype.
const VARIANTS = [
  ['underline', 'underline — souligné (défaut)'],
  ['pills', 'pills — piste segmentée'],
  ['enclosed', 'enclosed — onglets « dossier »'],
];

// Barre à 9 onglets : icône seulement sur trois d'entre eux (mélange libre).
const MANY_TABS = [
  ['s1', 'Synthèse', ChartIcon],
  ['s2', 'France', null],
  ['s3', 'Allemagne', null],
  ['s4', 'Zone euro', null],
  ['s5', 'Inflation', PulseIcon],
  ['s6', 'Chômage', null],
  ['s7', 'Balance commerciale', null],
  ['s8', 'Méthodologie', DocIcon],
  ['s9', 'Sources', null],
];

// ── Composants du panneau de contrôle (classes globales tp-ctrl-btn / ctrl-*) ──
// Même facture que le playground de /test-chart, pour rester homogène entre pages.

/** Group of exclusive buttons (radio). `options` = [{ value, label }]. */
const CtrlRadio = ({ label, options, value, onChange }) => (
  <div className="ctrl-group">
    <span className="ctrl-label">{label} :</span>
    {options.map((opt) => (
      <button
        key={String(opt.value)}
        type="button"
        className={value === opt.value ? 'tp-ctrl-btn tp-ctrl-btn--active' : 'tp-ctrl-btn'}
        onClick={() => onChange(opt.value)}>
        {opt.label}
      </button>
    ))}
  </div>
);

/** Native <select>. `options` = [{ value, label }]. */
const CtrlSelect = ({ label, options, value, onChange }) => (
  <div className="ctrl-group">
    <label className="ctrl-label">{label} :</label>
    <select className="ctrl-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => (
        <option key={String(o.value)} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

/** Boolean toggle rendered as an on/off button. */
const CtrlToggle = ({ label, value, onChange }) => (
  <button
    type="button"
    className={value ? 'tp-ctrl-btn tp-ctrl-btn--active' : 'tp-ctrl-btn'}
    onClick={() => onChange(!value)}>
    {label}
  </button>
);

/** Section header of a demonstration block (title + monospace meta). */
const BlockHead = ({ title, meta }) => (
  <header className="tabs-block-head">
    <h2 className="tabs-block-title">{title}</h2>
    <span className="tabs-block-meta">{meta}</span>
  </header>
);

// ── Spotlight : le même jeu de données, deux lectures ────────────────────────

/**
 * Quarterly revenue table used by the "Tableau" tab of the shared-context demo.
 *
 * Local to this page on purpose: the site has no generic `<Table>` component yet
 * (the prototype used its own `<Table columns={…}>`), so the markup lives here and
 * is styled in page.scss. Move it out once a shared table component exists.
 *
 * @param {Object} props - Component props.
 * @param {Array<{Trimestre: string, CA: number, Croissance: number}>} props.data - Rows
 *   coming from the `shared` payload of `<Tabs>`.
 * @returns {JSX.Element} A semantic table of revenue and growth per quarter.
 */
const QuarterTable = ({ data }) => (
  <table className="quarter-table">
    <caption className="quarter-table-caption">Détail par trimestre</caption>
    <thead>
      <tr>
        <th scope="col">Trimestre</th>
        <th scope="col" className="quarter-table-num">Chiffre d&apos;affaires</th>
        <th scope="col" className="quarter-table-num">Croissance</th>
      </tr>
    </thead>
    <tbody>
      {data.map((row) => (
        <tr key={row.Trimestre}>
          <th scope="row">{row.Trimestre}</th>
          <td className="quarter-table-num">{CA_FORMAT.format(row.CA)}</td>
          <td className="quarter-table-num">{`${GROWTH_FORMAT.format(row.Croissance)} %`}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

/** Shared-context spotlight: a chart tab and a table tab reading the same rows. */
const SharedSpotlight = () => (
  <section className="tabs-block">
    <BlockHead title="Chiffre d'affaires 2025" meta="Tabs · shared={ data }" />
    <p className="tabs-block-note">
      Les deux onglets ci-dessous lisent <strong>le même jeu de données</strong>, exposé
      une seule fois via <code>shared</code>. L&apos;onglet <em>Graphique</em>{' '}
      le rend en barres, l&apos;onglet <em>Tableau</em> en lignes — mêmes chiffres,
      deux lectures.
    </p>
    <div className="demo-card">
      <Tabs defaultValue="graph" shared={{ data: CA_TRIM }}>
        <TabList>
          <Tab value="graph" icon={<ChartIcon />}>Graphique</Tab>
          <Tab value="table" icon={<TableIcon />}>Tableau</Tab>
        </TabList>
        <TabPanels>
          {/* Render-prop : le panneau reçoit le `shared` de <Tabs>. */}
          <TabPanel value="graph">
            {({ data }) => (
              <Chart
                data={data}
                x="Trimestre" y="CA"
                labels={{ y: "Chiffre d'affaires (€)" }}
                title="Évolution trimestrielle" />
            )}
          </TabPanel>
          <TabPanel value="table">
            {({ data }) => <QuarterTable data={data} />}
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </section>
);

// ── Galerie des variantes ────────────────────────────────────────────────────

/** One demo card per visual variant (underline / pills / enclosed). */
const VariantGallery = () => (
  <section className="tabs-block">
    <p className="tabs-block-note">
      Trois styles de barre pour la même composition : <code>underline</code> (défaut),{' '}
      <code>pills</code> et <code>enclosed</code>. Chaque démo porte les mêmes trois
      onglets, dont un avec pastille de compteur.
    </p>
    <div className="demo-stack">
      {VARIANTS.map(([variant, caption]) => (
        <article key={variant}>
          <p className="demo-caption">{caption}</p>
          <div className="demo-card">
            <Tabs defaultValue="a" variant={variant}>
              <TabList>
                <Tab value="a" icon={<GridIcon />}>Vue d&apos;ensemble</Tab>
                <Tab value="b" icon={<DocIcon />}>Documentation</Tab>
                <Tab value="c" icon={<BellIcon />} count="3" countLabel="alertes">Alertes</Tab>
              </TabList>
              <TabPanels>
                <TabPanel value="a">
                  <p className="panel-note">
                    Onglet « Vue d&apos;ensemble » — variante <strong>{variant}</strong>.
                  </p>
                </TabPanel>
                <TabPanel value="b">
                  <p className="panel-note">Onglet « Documentation ».</p>
                </TabPanel>
                <TabPanel value="c">
                  <p className="panel-note">
                    Onglet « Alertes » — la pastille indique 3 éléments.
                  </p>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </div>
        </article>
      ))}
    </div>
  </section>
);

// ── Nombre libre d'onglets ───────────────────────────────────────────────────

/** Nine tabs in a pills strip: exercises the horizontal scrolling of the track. */
const ManyTabs = () => (
  <section className="tabs-block">
    <p className="tabs-block-note">
      Une <code>&lt;TabList&gt;</code>{' '}
      gère autant d&apos;onglets que voulu : au-delà de la largeur, elle défile
      horizontalement. Certains onglets portent une icône, d&apos;autres non.
    </p>
    <div className="demo-card">
      <Tabs defaultValue="s1" variant="pills">
        <TabList>
          {MANY_TABS.map(([value, label, Icon]) => (
            <Tab key={value} value={value} icon={Icon ? <Icon /> : undefined}>{label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {MANY_TABS.map(([value]) => (
            <TabPanel key={value} value={value}>
              <p className="panel-note">
                Contenu de l&apos;onglet <code>{value}</code>. Faites défiler la barre pour
                atteindre les onglets suivants.
              </p>
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </div>
  </section>
);

// ── Cas de vérification ──────────────────────────────────────────────────────

/** Demo of `keepMounted`: the typed text survives a round-trip to another tab. */
const KeepMountedDemo = () => {
  const [draft, setDraft] = useState('');

  return (
    <Tabs defaultValue="brouillon" keepMounted variant="pills">
      <TabList>
        <Tab value="brouillon" icon={<DocIcon />}>Brouillon</Tab>
        <Tab value="apercu" icon={<GridIcon />}>Aperçu</Tab>
      </TabList>
      <TabPanels>
        <TabPanel value="brouillon">
          <label className="demo-field">
            <span className="demo-field-label">Note de travail</span>
            <input
              type="text"
              className="ctrl-text"
              value={draft}
              placeholder="Saisissez du texte…"
              onChange={(e) => setDraft(e.target.value)} />
          </label>
        </TabPanel>
        <TabPanel value="apercu">
          <p className="panel-note">
            Revenez sur « Brouillon » : la saisie est intacte — le panneau est resté monté
            (simplement <code>hidden</code>) grâce à <code>keepMounted</code>.
          </p>
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};

/** Three edge cases: disabled tab, keepMounted and controlled mode. */
const EdgeCases = () => {
  const [controlled, setControlled] = useState('jour');

  return (
    <section className="tabs-block">
      <p className="tabs-block-note">
        Trois comportements à éprouver : un onglet <code>disabled</code>, la persistance
        d&apos;un panneau via <code>keepMounted</code> et le mode contrôlé (<code>value</code> +{' '}
        <code>onChange</code>).
      </p>
      <div className="demo-stack">
        <article>
          <p className="demo-caption">disabled — onglet non sélectionnable, sauté au clavier</p>
          <div className="demo-card">
            <Tabs defaultValue="actifs">
              <TabList>
                <Tab value="actifs" icon={<UsersIcon />}>Membres actifs</Tab>
                <Tab value="invites" disabled>Invitations (indisponible)</Tab>
                <Tab value="roles" icon={<CogIcon />}>Rôles</Tab>
              </TabList>
              <TabPanels>
                <TabPanel value="actifs"><p className="panel-note">Membres ayant accès à cet espace.</p></TabPanel>
                <TabPanel value="invites"><p className="panel-note">Panneau inatteignable.</p></TabPanel>
                <TabPanel value="roles"><p className="panel-note">Rôles et permissions associés.</p></TabPanel>
              </TabPanels>
            </Tabs>
          </div>
        </article>

        <article>
          <p className="demo-caption">keepMounted — la saisie survit au changement d&apos;onglet</p>
          <div className="demo-card"><KeepMountedDemo /></div>
        </article>

        <article>
          <p className="demo-caption">
            value + onChange — mode contrôlé, onglet actif : <code>{controlled}</code>
          </p>
          <div className="demo-card">
            {/* Instance contrôlée par le parent : le state remonte ici pour la légende. */}
            <Tabs value={controlled} onChange={setControlled} variant="enclosed" accent="positive">
              <TabList>
                <Tab value="jour">Jour</Tab>
                <Tab value="semaine">Semaine</Tab>
                <Tab value="mois">Mois</Tab>
              </TabList>
              <TabPanels>
                <TabPanel value="jour"><p className="panel-note">Agrégation quotidienne.</p></TabPanel>
                <TabPanel value="semaine"><p className="panel-note">Agrégation hebdomadaire.</p></TabPanel>
                <TabPanel value="mois"><p className="panel-note">Agrégation mensuelle.</p></TabPanel>
              </TabPanels>
            </Tabs>
          </div>
        </article>
      </div>
    </section>
  );
};

const TabsPlayground = () => {
  // ── Panneau de contrôle (défauts alignés sur ceux du prototype) ──
  const [variant, setVariant] = useState('underline');
  const [size, setSize] = useState('md');
  const [align, setAlign] = useState('start');
  const [fitted, setFitted] = useState(false);
  const [showIcons, setShowIcons] = useState(true);
  const [accent, setAccent] = useState('primary');

  return (
    <div className="tabs-playground">
      {/* ── 1. Spotlight : contexte partagé ── */}
      <h2 className="tabs-section-label">Aperçu — contexte partagé</h2>
      <SharedSpotlight />

      {/* ── 2. Playground piloté par le panneau de contrôle ── */}
      <h2 className="tabs-section-label">Démo — playground</h2>
      <section className="tp-section">
        <div className="ctrl-row">
          <CtrlRadio
            label="Variante"
            options={[
              { value: 'underline', label: 'Underline' },
              { value: 'pills', label: 'Pills' },
              { value: 'enclosed', label: 'Enclosed' },
            ]}
            value={variant} onChange={setVariant} />
          <CtrlRadio
            label="Taille"
            options={[{ value: 'sm', label: 'sm' }, { value: 'md', label: 'md' }, { value: 'lg', label: 'lg' }]}
            value={size} onChange={setSize} />
        </div>

        <div className="ctrl-row">
          <CtrlRadio
            label="Alignement"
            options={[
              { value: 'start', label: 'Début' },
              { value: 'center', label: 'Centre' },
              { value: 'end', label: 'Fin' },
            ]}
            value={align} onChange={setAlign} />
          <CtrlSelect
            label="Accent"
            options={[
              { value: 'primary', label: 'Primary' },
              { value: 'positive', label: 'Positive' },
              { value: 'warning', label: 'Warning' },
              { value: 'negative', label: 'Negative' },
            ]}
            value={accent} onChange={setAccent} />
          <CtrlToggle label="Icônes" value={showIcons} onChange={setShowIcons} />
          <CtrlToggle label="Largeur égale (fitted)" value={fitted} onChange={setFitted} />
        </div>

        <p className="ctrl-hint">
          Ces contrôles pilotent les props <code>variant</code>, <code>size</code>,{' '}
          <code>align</code>, <code>fitted</code>, <code>accent</code>{' '}
          et l&apos;affichage des icônes de l&apos;instance ci-dessous — équivalent du
          panneau Tweaks du prototype.
        </p>

        <div className="demo-card">
          <Tabs
            defaultValue="apercu"
            variant={variant} size={size} align={align} fitted={fitted} accent={accent}>
            <TabList>
              <Tab value="apercu" icon={showIcons ? <GridIcon /> : undefined}>Aperçu</Tab>
              <Tab value="activite" icon={showIcons ? <PulseIcon /> : undefined} count="12">Activité</Tab>
              <Tab value="equipe" icon={showIcons ? <UsersIcon /> : undefined}>Équipe</Tab>
              <Tab value="reglages" icon={showIcons ? <CogIcon /> : undefined}>Réglages</Tab>
            </TabList>
            <TabPanels>
              <TabPanel value="apercu">
                <p className="panel-note">
                  Vue d&apos;ensemble du projet : indicateurs clés, dernières exécutions de
                  modèles et raccourcis. Utilisez le <strong>panneau de contrôle</strong>{' '}
                  ci-dessus pour changer la variante, la taille, l&apos;alignement et
                  l&apos;affichage des icônes.
                </p>
              </TabPanel>
              <TabPanel value="activite">
                <p className="panel-note">
                  Douze événements récents — commits, ré-entraînements, publications de jeux
                  de données. La pastille de compteur sur l&apos;onglet reflète ce nombre.
                </p>
              </TabPanel>
              <TabPanel value="equipe">
                <p className="panel-note">
                  Membres ayant accès à cet espace et leurs rôles respectifs.
                </p>
              </TabPanel>
              <TabPanel value="reglages">
                <p className="panel-note">
                  Paramètres de l&apos;espace de travail : visibilité, jetons d&apos;API,
                  intégrations.
                </p>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </div>
      </section>

      {/* ── 3. Galerie des variantes ── */}
      <h2 className="tabs-section-label">Démo — variantes</h2>
      <VariantGallery />

      {/* ── 4. Nombre libre d'onglets ── */}
      <h2 className="tabs-section-label">Démo — nombre libre d&apos;onglets</h2>
      <ManyTabs />

      {/* ── 5. Cas de vérification ── */}
      <h2 className="tabs-section-label">Cas de vérification</h2>
      <EdgeCases />
    </div>
  );
};

export default TabsPlayground;
