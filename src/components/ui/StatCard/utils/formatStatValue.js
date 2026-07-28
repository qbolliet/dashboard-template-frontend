/**
 * Format specification consumed by {@link formatStatValue}. Every field is optional;
 * omitting `f` entirely (nullish) returns the raw value untouched.
 *
 * @typedef {Object} FormatSpec
 * @property {('number'|'currency'|'percent')} [style] - Formatting mode. 'currency' delegates
 *   entirely to Intl.NumberFormat and returns early (prefix/suffix/unit are ignored on that
 *   branch). 'percent' does NOT use Intl's percent style (no ×100 multiplication): it formats
 *   the raw number and appends a ' %' suffix unless a custom `suffix` is provided.
 * @property {string} [currency] - ISO currency code used when style is 'currency' (default: 'EUR').
 * @property {string} [locale] - Intl locale (default: 'fr-FR', kept explicit so server and
 *   client render identically regardless of the runtime's environment locale).
 * @property {number} [decimals] - Sets both minimumFractionDigits and maximumFractionDigits.
 * @property {number} [minDecimals] - Overrides minimumFractionDigits after `decimals` is applied.
 * @property {number} [maxDecimals] - Overrides maximumFractionDigits after `decimals` is applied.
 * @property {boolean} [compact] - Uses Intl's 'compact' notation (e.g. 1.2M).
 * @property {string} [prefix] - Text prepended to the formatted number (ignored on the
 *   'currency' branch).
 * @property {string} [suffix] - Text appended to the formatted number (ignored on the
 *   'currency' branch). Takes precedence over the implicit ' %' / unit suffixes.
 * @property {string} [unit] - Appended as ' ' + unit when no suffix has already been set
 *   (i.e. no explicit `suffix` and style is not 'percent').
 */

/**
 * Formats a numeric value according to a FormatSpec (Intl.NumberFormat based), or via a
 * custom formatter function. Mirrors the design prototype's formatStatValue exactly so
 * <StatCard> and the future <Table> share identical numeric rendering.
 *
 * @param {number|string} value - Raw value to format. Strings accept French notation
 *   ('1 234,5' — spaces stripped, comma treated as decimal separator).
 * @param {FormatSpec|Function} [f] - A FormatSpec object, or a custom formatter fn(value)
 *   returning the display string directly. Nullish returns `value` unchanged.
 * @returns {number|string} The formatted value.
 */
export const formatStatValue = (value, f) => {
    if (f == null) return value;
    if (typeof f === 'function') return f(value);

    // Parsing tolérant : chaîne en notation française (espaces + virgule décimale)
    const raw = typeof value === 'number'
        ? value
        : parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
    if (isNaN(raw)) return String(value);

    const locale = f.locale || 'fr-FR';
    const opts = {};
    // decimals pose min ET max, puis minDecimals/maxDecimals surchargent individuellement
    if (f.decimals != null) {
        opts.minimumFractionDigits = f.decimals;
        opts.maximumFractionDigits = f.decimals;
    }
    if (f.minDecimals != null) opts.minimumFractionDigits = f.minDecimals;
    if (f.maxDecimals != null) opts.maximumFractionDigits = f.maxDecimals;
    if (f.compact) opts.notation = 'compact';

    if (f.style === 'currency') {
        // Retour direct : prefix/suffix/unit ignorés sur cette branche
        return new Intl.NumberFormat(locale, { style: 'currency', currency: f.currency || 'EUR', ...opts }).format(raw);
    }

    let s = new Intl.NumberFormat(locale, opts).format(raw);
    const prefix = f.prefix || '';
    let suffix = f.suffix || '';
    // Pourcentage : pas de style Intl 'percent' (pas de ×100), juste un suffixe ' %'
    if (f.style === 'percent' && !suffix) suffix = ' %';
    if (f.unit && !suffix) suffix = ' ' + f.unit;
    return prefix + s + suffix;
};

export default formatStatValue;
