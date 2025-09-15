# Navigation Sidebar - Usage Example

This document demonstrates how to use the new NavigationSideBar component with your existing navigation data.

## Basic Usage

### 1. Sidebar Mode (instead of TopBar)

```jsx
import Header from '@/features/header/components/Header/Header';
import navigationData from '@/config/navigation_new2.json';

function App() {
    return (
        <Header
            navigationData={navigationData.main_menu}
            navigationType="sidebar"
            useSwitcher={false}
            onNavigationItemClick={(item) => {
                console.log('Clicked:', item);
                // Handle navigation
            }}
        />
    );
}
```

### 2. Sidebar with Switcher (First level as switcher)

```jsx
import Header from '@/features/header/components/Header/Header';
import navigationData from '@/config/navigation_new2.json';

function App() {
    return (
        <Header
            navigationData={navigationData.main_menu}
            navigationType="sidebar"
            useSwitcher={true} // First level (Synthèse/Détail) goes in switcher
            currentPageTitle="Dashboard" // Optional custom title
            onNavigationItemClick={(item) => {
                console.log('Navigation to:', item);
                // Handle navigation
            }}
        />
    );
}
```

### 3. Traditional TopBar Mode (existing behavior)

```jsx
import Header from '@/features/header/components/Header/Header';
import navigationData from '@/config/navigation_new2.json';

function App() {
    return (
        <Header
            navigationData={navigationData.main_menu}
            navigationType="topbar" // or omit (default)
            onNavigationItemClick={(item) => {
                console.log('Clicked:', item);
                // Handle navigation
            }}
        />
    );
}
```

## Navigation Data Structure

The sidebar works with your existing `navigation_new2.json` structure:

```json
{
  "main_menu": [
    {
      "id": "synthese",
      "name": "Synthèse",
      "path": "/synthese",
      "type": "home",
      "icon": "/icons/synthese.svg", // Optional - shows in collapsed mode
      "children": [
        {
          "id": "comptabilite_nationale",
          "name": "Comptabilité Nationale",
          "path": "synthese/comptabilite-nationale",
          "type": "indicator_group",
          "children": [
            {
              "id": "pib",
              "name": "PIB",
              "path": "synthese/comptabilite-nationale/pib",
              "type": "indicator"
            }
          ]
        }
      ]
    }
  ]
}
```

## Key Features

### ✅ **Fixed Issues**
- **Header Positioning**: Header and content now properly shift right when sidebar opens (like shadcn examples)
- **Chevron Click Behavior**: Clicking chevron toggles dropdown instead of navigating to page
- **Smart Icon Handling**: Sidebar hides completely when collapsed if no icons are defined

### Icon Support
- Add `"icon": "/path/to/icon.svg"` to navigation items
- Icons display when sidebar is collapsed (64px width)
- **NEW**: When no icons exist in navigation data, collapsed sidebar disappears completely (0px width)
- Falls back gracefully if some items have icons and others don't

### Switcher Mode
- When `useSwitcher={true}`, first level items become switcher options
- Navigation starts from the second level
- Automatically navigates to first available path when switching

### Collapsible Behavior
- **Fixed**: Sidebar can be collapsed to show only icons (when icons exist)
- **Fixed**: When no icons exist, sidebar hides completely when collapsed
- SidebarTrigger in header controls open/close state
- Tooltips show on collapsed items (desktop only)

### Navigation Interaction
- **Fixed**: Clicking on group/item text navigates to page (if path exists)
- **Fixed**: Clicking on chevron arrow toggles dropdown (doesn't navigate)
- Separate click handlers for main content vs chevron

### Current Page Display
- Header shows current page title as breadcrumb
- Automatically determined from navigation data and current path
- Can be overridden with `currentPageTitle` prop

## Responsive Behavior

- **Desktop**: Full sidebar with collapsible functionality
- **Tablet**: Narrower sidebar, adjusted paddings
- **Mobile**: Overlay mode with backdrop, full-width when open

## CSS Classes for Customization

The components use your existing design system:
- HSL color variables from `colors.scss`
- Spacing from `typography.scss`
- Breakpoints from `breakpoints.scss`

Key CSS classes for styling overrides:
- `.navigation-sidebar` - Main sidebar container
- `.sidebar-switcher` - Switcher component
- `.sidebar-menu` - Navigation menu container
- `.sidebar-group` - Collapsible navigation groups
- `.sidebar-item` - Individual navigation items