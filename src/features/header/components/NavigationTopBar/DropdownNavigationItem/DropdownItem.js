import React from 'react';
import Link from 'next/link';

/**
 * Leaf item of a dropdown (a single navigation link).
 * Reused at both levels of the dropdown (flat list and group sub-items), à la
 * SidebarItem: the caller passes the wrapper and link class names so the same
 * component covers `__item`/`__link` and `__subitem`/`__sublink`.
 *
 * @param {string} href - Destination path of the link.
 * @param {string} name - Display label.
 * @param {boolean} isActive - Whether this link targets the current page.
 * @param {Function} onItemClick - Click handler (closes the dropdown).
 * @param {string} itemClass - Prefixed class for the wrapping `<li>` (role .nav-item is prepended).
 * @param {string} linkClass - Prefixed class for the `<Link>` (role .nav-link.nav-link--leaf is
 *   prepended ; the `--active` modifier is derived from this prefixed class).
 * @returns {JSX.Element} The rendered dropdown leaf item.
 */
const DropdownItem = ({ href, name, isActive, onItemClick, itemClass, linkClass }) => {
    // <li> : rôle .nav-item + préfixe composant
    const liClasses = ['nav-item', itemClass].filter(Boolean).join(' ');

    // Lien : rôle .nav-link + facette feuille + préfixe + modifieur actif (ex. topbar-link--active)
    const linkClasses = [
        'nav-link',
        'nav-link--leaf',
        linkClass,
        isActive && `${linkClass}--active`
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <li className={liClasses}>
            <Link
                href={href}
                className={linkClasses}
                onClick={onItemClick}
                aria-current={isActive ? 'page' : undefined}
            >
                <span className="nav-text topbar-text">{name}</span>
            </Link>
        </li>
    );
};

export default DropdownItem;
