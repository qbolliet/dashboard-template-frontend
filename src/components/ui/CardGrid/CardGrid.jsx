import React from 'react';
import './CardGrid.scss';

/**
 * Responsive card grid. Cards share the row width equally (perRow mode)
 * or fill the available width with a minimum card width (auto mode).
 *
 * @param {Object} props - Component props
 * @param {number} [props.perRow=3] - Cards per row; each card gets an equal share (1fr).
 * @param {boolean} [props.auto=false] - Ignore perRow: auto-fill with minWidth per card.
 * @param {string} [props.minWidth] - Minimum card width in auto mode (CSS length, e.g. '15rem').
 * @param {string} [props.gap] - Gap override (CSS length or token, e.g. 'var(--spacing-lg)').
 * @param {string} [props.className] - Additional CSS classes.
 * @param {Object} [props.style] - Inline style merged after the grid variables.
 * @param {React.ReactNode} props.children - Cards; each child is wrapped in an <li> grid cell.
 */
const CardGrid = ({
  perRow = 3,
  auto = false,
  minWidth,
  gap,
  className = '',
  style,
  children,
  ...rest
}) => {
  // Variables posées en inline : uniquement celles que le mode courant pilote, afin de
  // laisser les autres à la valeur de _tokens.scss (et donc surchargeables en CSS).
  //
  // ⚠️ Une custom property inline l'emporte sur toute règle de feuille de style, media
  // query comprise : un consommateur qui veut faire varier le nombre de colonnes selon le
  // palier doit redéclarer `grid-template-columns` (cf. LinkCardsSection.scss), pas
  // surcharger --card-grid-per-row. Les tokens NON posés ici (gap en particulier, tant que
  // la prop `gap` n'est pas fournie) restent, eux, surchargeables normalement.
  const vars = {
    ...(auto
      ? minWidth && { '--card-grid-min-width': minWidth }
      : { '--card-grid-per-row': perRow }),
    ...(gap && { '--card-grid-gap': gap }),
    ...style,
  };

  // Assemblage des classes : variante auto puis classes du consommateur
  const classNames = ['card-grid', auto && 'card-grid--auto', className]
    .filter(Boolean)
    .join(' ');

  return (
    <ul className={classNames} role="list" style={vars} {...rest}>
      {/* Une cellule de grille par enfant : la carte s'étire dans son <li> */}
      {React.Children.map(children, (child) => (
        <li>{child}</li>
      ))}
    </ul>
  );
};

export default CardGrid;
