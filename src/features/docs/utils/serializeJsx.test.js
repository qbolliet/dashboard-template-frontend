import { describe, it, expect } from 'vitest';
import { serializeJsx, unwrapExpr, defaultsOf } from './serializeJsx';
import * as languageSwitcher from '@docs/playgrounds/language-switcher.jsx';
import * as tabs from '@docs/playgrounds/tabs.jsx';

// =================================================================
// COHÉRENCE CODE GÉNÉRÉ ↔ APERÇU des playgrounds
// =================================================================
// Le dispositif tient sur une promesse (cf. ComponentPlayground.jsx) : on sérialise
// exactement ce qu'on rend. Ces tests la vérifient pour les deux playgrounds dont une
// molette de DÉMONSTRATION pilotait l'aperçu sans jamais atteindre le code généré.

/** Mimics ComponentPlayground: derive props, then serialize the way it does. */
const generate = (schema, overrides = {}) => {
    const values = { ...defaultsOf(schema.controls), ...overrides };
    const derive = schema.toProps ?? ((current) => current);
    const props = derive(values);
    const defaults = derive(defaultsOf(schema.controls));

    return { code: serializeJsx(schema.scaffold, props, defaults), rendered: unwrapExpr(props) };
};

describe('playground language-switcher', () => {
    it('writes no `languages` at the default count', () => {
        const { code } = generate(languageSwitcher);
        expect(code).not.toContain('languages');
    });

    it('reflects a smaller count in the code AND in the rendered list', () => {
        const { code, rendered } = generate(languageSwitcher, { languageCount: 3 });

        expect(rendered.languages.map((language) => language.code)).toEqual(['fr', 'en', 'es']);
        expect(code).toContain('languages={[');
        expect(code).toContain("{ code: 'es', country: 'ES', name: 'Español' }");
        expect(code).not.toContain("code: 'de'");
    });

    it('goes past the eight default languages when the control allows it', () => {
        const max = languageSwitcher.controls.languageCount.max;
        expect(max).toBeGreaterThan(8);

        const { code, rendered } = generate(languageSwitcher, { languageCount: max });
        expect(rendered.languages).toHaveLength(max);
        expect(code.match(/code: '/g)).toHaveLength(max);
    });

    it('keeps the rendered list and the generated list identical', () => {
        const { code, rendered } = generate(languageSwitcher, { languageCount: 10 });
        for (const { code: language } of rendered.languages) expect(code).toContain(`code: '${language}'`);
    });

    it('forwards the other controls as plain props', () => {
        const { code } = generate(languageSwitcher, { menuAlign: 'right', compact: true });
        expect(code).toContain('menuAlign="right"');
        expect(code).toMatch(/\bcompact\b/);
    });
});

describe('playground tabs', () => {
    it('adds the icons to the code when « Icônes » is on', () => {
        const { code } = generate(tabs, { showIcons: true });

        expect(code).toContain("import { GridIcon, PulseIcon, UsersIcon, CogIcon } from '@/components/icons';");
        expect(code).toContain('<Tab value="apercu" icon={<GridIcon />}>Aperçu</Tab>');
        expect(code).toContain('icon={<CogIcon />}');
    });

    it('leaves the icons out of the code when « Icônes » is off', () => {
        const { code } = generate(tabs, { showIcons: false });

        expect(code).not.toContain('icon');
        expect(code).not.toContain('@/components/icons');
        expect(code).toContain('<Tab value="apercu">Aperçu</Tab>');
    });

    it('lists in the code the same tabs the preview renders', () => {
        const { code } = generate(tabs, { showIcons: false });
        for (const tab of ['apercu', 'activite', 'equipe', 'reglages']) expect(code).toContain(`value="${tab}"`);
    });

    it('never writes the demonstration knob as an attribute of <Tabs>', () => {
        expect(generate(tabs, { showIcons: true }).code).not.toContain('showIcons');
    });
});
