'use client';
// Importation des modules
import React from 'react';
import SidebarGroup from '../SidebarGroup/SidebarGroup';
import SidebarItem from '../SidebarItem/SidebarItem';

/**
 * Dispatcher for a single navigation node in the sidebar.
 * Renders a collapsible group when the node has children, otherwise a simple item.
 * Centralizes the group/item decision shared by SidebarMenu and SidebarGroup.
 *
 * @param {Object} item - Navigation item data
 * @param {Function} onItemClick - Callback when a navigation item is clicked
 * @param {number} level - Current nesting level
 * @returns {JSX.Element} A SidebarGroup or a SidebarItem
 */
const SidebarNode = ({
    item,
    onItemClick,
    level = 0
}) => {
    // Un nœud est un groupe dès qu'il possède des enfants ; sinon c'est un item simple.
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const Component = hasChildren ? SidebarGroup : SidebarItem;

    return (
        <Component item={item} onItemClick={onItemClick} level={level} />
    );
};

export default SidebarNode;
