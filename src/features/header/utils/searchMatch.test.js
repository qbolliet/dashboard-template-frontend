import { describe, it, expect } from 'vitest';
import { breadcrumbText, fold, scoreEntry, splitQuery, FIELD_WEIGHTS } from './searchMatch';

// Entrée d'index de référence, dans la forme exacte qu'écrit
// scripts/build-search-index.js.
const entry = (overrides = {}) => ({
    title: 'PIB',
    path: '/demo/fr/comptabilite-nationale/france/pib',
    type: 'indicator',
    description: '',
    keywords: [],
    breadcrumb: ['Comptabilité Nationale', 'France'],
    ...overrides,
});

/** Runs a raw query against one entry, as the component does. */
const match = (query, indexEntry = entry()) => scoreEntry(indexEntry, splitQuery(query));

describe('fold', () => {
    it('strips diacritics and case without changing the length', () => {
        expect(fold('Comptabilité')).toBe('comptabilite');
        expect(fold('Comptabilité')).toHaveLength('Comptabilité'.length);
    });
});

describe('splitQuery', () => {
    it('splits on spaces, apostrophes and hyphens', () => {
        expect(splitQuery("l'emploi non-salarié")).toEqual(['l', 'emploi', 'non', 'salarie']);
    });

    it('drops repeated terms so they cannot count twice', () => {
        expect(splitQuery('pib pib')).toEqual(['pib']);
    });

    it('yields nothing for a query made of punctuation only', () => {
        expect(splitQuery('  —  ')).toEqual([]);
    });
});

describe('scoreEntry — appariement', () => {
    it('matches a term against the title', () => {
        expect(match('pib')).not.toBeNull();
    });

    it('matches by word prefix, not by whole word only', () => {
        expect(match('consomm', entry({ title: 'Consommation' }))).not.toBeNull();
    });

    it('does not match in the middle of a word', () => {
        expect(match('sommation', entry({ title: 'Consommation' }))).toBeNull();
    });

    it('finds terms spread across two different fields — the regression that motivated all this', () => {
        expect(match('pib france')).not.toBeNull();
    });

    it('requires EVERY term to be found', () => {
        expect(match('pib allemagne')).toBeNull();
    });

    it('ignores diacritics on both sides', () => {
        expect(match('comptabilite')).not.toBeNull();
        expect(match('COMPTABILITÉ')).not.toBeNull();
    });

    it('matches through an elision, the article counting as its own token', () => {
        const page = entry({ title: "L'emploi" });
        expect(match('emploi', page)).not.toBeNull();
        expect(match("l'emploi", page)).not.toBeNull();
    });

    it('matches a component of a hyphenated name', () => {
        expect(match('rhone', entry({ title: 'Bouches-du-Rhône' }))).not.toBeNull();
    });

    it('matches a keyword that is never displayed', () => {
        expect(match('gdp', entry({ keywords: ['GDP', 'gross domestic product'] }))).not.toBeNull();
    });

    it('matches the description', () => {
        expect(match('volume', entry({ description: 'Produit intérieur brut, en volume.' }))).not.toBeNull();
    });

    it('rejects an empty query rather than returning every entry', () => {
        expect(match('')).toBeNull();
    });
});

describe('scoreEntry — score', () => {
    it('ranks a title hit above a description hit', () => {
        const inTitle = match('produit', entry({ title: 'Produit' }));
        const inDescription = match('produit', entry({ title: 'PIB', description: 'Produit intérieur' }));

        expect(inTitle.score).toBeGreaterThan(inDescription.score);
    });

    it('orders the field weights title > keywords > breadcrumb > description', () => {
        const { title, keywords, breadcrumb, description } = FIELD_WEIGHTS;
        expect(title).toBeGreaterThan(keywords);
        expect(keywords).toBeGreaterThan(breadcrumb);
        expect(breadcrumb).toBeGreaterThan(description);
    });

    it('rewards a whole word over a mere prefix', () => {
        const whole = match('pib', entry({ title: 'PIB' }));
        const prefix = match('pib', entry({ title: 'PIBOU' }));

        expect(whole.score).toBeGreaterThan(prefix.score);
    });

    it('rewards a field that starts with the term', () => {
        const atStart = match('brut', entry({ title: 'Brut national' }));
        const inside = match('brut', entry({ title: 'Produit brut' }));

        expect(atStart.score).toBeGreaterThan(inside.score);
    });

    it('scores each term in its own best field', () => {
        // « pib » vaut un titre, « france » un fil d'Ariane : le total est la somme des
        // deux, et non deux fois le meilleur des deux.
        const both = match('pib france');
        const titleOnly = match('pib');

        expect(both.score).toBeGreaterThan(titleOnly.score);
    });
});

describe('scoreEntry — surlignage', () => {
    it('locates the fragment on the ORIGINAL string, accents included', () => {
        const page = entry({ title: 'Comptabilité Nationale' });
        const [range] = match('nationale', page).ranges.title;

        expect(page.title.slice(range.start, range.end)).toBe('Nationale');
    });

    it('highlights only the typed prefix, not the whole word', () => {
        const page = entry({ title: 'Consommation' });
        const [range] = match('conso', page).ranges.title;

        expect(page.title.slice(range.start, range.end)).toBe('Conso');
    });

    it('highlights every occurrence of a term in a field', () => {
        const page = entry({ title: 'PIB', description: 'Le PIB, ou PIB en volume.' });
        expect(match('pib', page).ranges.description).toHaveLength(2);
    });

    it('merges the ranges of two overlapping terms into one', () => {
        const page = entry({ title: 'Consommation' });
        expect(match('conso consommation', page).ranges.title).toHaveLength(1);
    });

    it('locates a fragment inside the joined breadcrumb', () => {
        const page = entry();
        const [range] = match('france', page).ranges.breadcrumb;

        expect(breadcrumbText(page).slice(range.start, range.end)).toBe('France');
    });

    it('leaves untouched fields out of the ranges', () => {
        expect(match('pib').ranges.description).toBeUndefined();
    });
});

describe('breadcrumbText', () => {
    it('joins the trail with a visible separator', () => {
        expect(breadcrumbText(entry())).toBe('Comptabilité Nationale › France');
    });

    it('is empty for a root-level page', () => {
        expect(breadcrumbText(entry({ breadcrumb: [] }))).toBe('');
        expect(breadcrumbText({ title: 'Accueil' })).toBe('');
    });
});
