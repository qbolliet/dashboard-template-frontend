import React from 'react';
import './CardGrid.scss';

/**
 * Responsive card grid. Cards share the row width equally (perRow mode)
 * or fill the available width with a minimum card width (auto mode).
 *
 * @param {Object} props - Component props
 * @param {number} [props.perRow=3] - Cards per row; each card gets an equal share (1fr).
 *   Consumers wanting their own breakpoint steps override the `--card-grid-columns`
 *   custom property rather than this prop.
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
  // --card-grid-per-row n'est que l'ENTRÉE du calcul : la feuille de style en dérive
  // --card-grid-columns, seul token réellement consommé par grid-template-columns. C'est
  // ce dernier que les media queries et les consommateurs surchargent — un style inline
  // l'emporterait sur toute règle de feuille de style, l'indirection contourne le problème
  // (cf. le palier mobile de CardGrid.scss et les paliers de LinkCardsSection.scss).
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

  // Children.toArray plutôt que Children.map : ce dernier invoque son callback pour les
  // enfants null / false, ce qui produirait une cellule <li> vide par carte omise
  // conditionnellement (`{cond && <Card/>}`) et laisserait un trou dans la grille.
  // toArray les écarte et assigne une clé à chaque enfant restant.
  const cells = React.Children.toArray(children);

  return (
    <ul className={classNames} role="list" style={vars} {...rest}>
      {/* Une cellule de grille par enfant : la carte s'étire dans son <li>.
          role="listitem" explicite : le <li> est passé en display: grid par la feuille de
          style, ce qui lui fait perdre son rôle implicite sur certains lecteurs d'écran. */}
      {cells.map((child, index) => (
        // child.key est posée par toArray sur les éléments ; repli sur l'index pour les
        // enfants primitifs (chaîne, nombre), auxquels toArray n'attribue pas de clé.
        <li key={child.key ?? index} role="listitem">{child}</li>
      ))}
    </ul>
  );
};

export default CardGrid;
