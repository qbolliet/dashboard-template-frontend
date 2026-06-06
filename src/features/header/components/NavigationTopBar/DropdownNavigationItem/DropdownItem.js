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
 * @param {string} itemClass - CSS class for the wrapping `<li>`.
 * @param {string} linkClass - CSS class for the `<Link>` (the `--active` modifier is derived from it).
 * @returns {JSX.Element} The rendered dropdown leaf item.
 */
const DropdownItem = ({ href, name, isActive, onItemClick, itemClass, linkClass }) => {
    // Classe du lien + modifieur actif dérivé du nom de classe fourni (ex. nav-dropdown__sublink--active)
    const linkClasses = [linkClass, isActive && `${linkClass}--active`]
        .filter(Boolean)
        .join(' ');

    return (
        <li className={itemClass}>
            <Link
                href={href}
                className={linkClasses}
                onClick={onItemClick}
                aria-current={isActive ? 'page' : undefined}
            >
                {name}
            </Link>
        </li>
    );
};

export default DropdownItem;
