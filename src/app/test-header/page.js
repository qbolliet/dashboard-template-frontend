'use client';

import React from 'react';
import Header from '../../features/header/components/Header/Header';
import ThemeProvider from '../../features/theme/providers/ThemeProvider';
import navigationData from '../../../config/navigation_new.json';

/**
 * Test page for the header component.
 * Uses navigation_new.json for testing different navigation structures.
 * 
 * @returns {JSX.Element} The rendered test page
 */
export default function TestHeaderPage() {
    /**
     * Handle navigation item clicks.
     * 
     * @param {Object} item - The clicked navigation item
     */
    const handleNavigationClick = (item) => {
        console.log('Navigation item clicked:', item);
        // Ici vous pourriez ajouter de la logique personnalisée
        // comme des analytics, notifications, etc.
    };

    return (
        <ThemeProvider>
            <div className="test-page">
                {/* Header avec les données de navigation_new.json */}
                <Header 
                    navigationData={navigationData.main_menu}
                    onNavigationItemClick={handleNavigationClick}
                />
                
                {/* Contenu de test pour voir le header en action */}
                <main className="test-content">
                    <div className="container">
                        <h1>Page de test du Header</h1>
                        <p>
                            Cette page utilise le fichier <code>navigation_new.json</code> pour tester 
                            le composant Header avec différentes structures de navigation.
                        </p>
                        
                        <div className="test-sections">
                            <section className="test-section">
                                <h2>Fonctionnalités testées</h2>
                                <ul>
                                    <li>✅ Navigation avec données en props</li>
                                    <li>✅ Menu mobile responsive</li>
                                    <li>✅ Dropdowns multi-niveaux</li>
                                    <li>✅ Barre de recherche avec suggestions</li>
                                    <li>✅ Toggle de thème clair/sombre</li>
                                    <li>✅ Accessibilité (ARIA, navigation clavier)</li>
                                </ul>
                            </section>
                            
                            <section className="test-section">
                                <h2>Structure de navigation testée</h2>
                                <pre className="code-block">
                                    {JSON.stringify(navigationData.architecture, null, 2)}
                                </pre>
                            </section>
                            
                            <section className="test-section">
                                <h2>Instructions de test</h2>
                                <ol>
                                    <li>Testez le menu mobile en redimensionnant la fenêtre</li>
                                    <li>Cliquez sur les éléments avec sous-menus</li>
                                    <li>Testez la barre de recherche avec du texte</li>
                                    <li>Basculez entre les thèmes clair/sombre</li>
                                    <li>Vérifiez la navigation avec le clavier (Tab, Entrée, Échap)</li>
                                </ol>
                            </section>
                        </div>
                    </div>
                </main>
            </div>
            
            <style jsx>{`
                .test-page {
                    min-height: 100vh;
                    background-color: var(--bg-color, #ffffff);
                    color: var(--text-color, #333333);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .test-content {
                    padding: 2rem 0;
                }
                
                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 1rem;
                }
                
                h1 {
                    color: var(--heading-color, #1a1a1a);
                    margin-bottom: 1rem;
                }
                
                .test-sections {
                    display: grid;
                    gap: 2rem;
                    margin-top: 2rem;
                }
                
                .test-section {
                    background: var(--card-bg, #f8f9fa);
                    padding: 1.5rem;
                    border-radius: 8px;
                    border: 1px solid var(--border-color, #e5e5e5);
                }
                
                .test-section h2 {
                    color: var(--heading-color, #1a1a1a);
                    margin-bottom: 1rem;
                    font-size: 1.25rem;
                }
                
                .test-section ul,
                .test-section ol {
                    margin: 0;
                    padding-left: 1.5rem;
                }
                
                .test-section li {
                    margin-bottom: 0.5rem;
                }
                
                .code-block {
                    background: var(--code-bg, #f1f3f4);
                    padding: 1rem;
                    border-radius: 4px;
                    overflow-x: auto;
                    font-size: 0.875rem;
                    border: 1px solid var(--border-color, #e5e5e5);
                }
                
                code {
                    background: var(--code-bg, #f1f3f4);
                    padding: 0.2rem 0.4rem;
                    border-radius: 3px;
                    font-size: 0.875rem;
                }
                
                /* Variables CSS pour les thèmes */
                :root {
                    --bg-color: #ffffff;
                    --text-color: #333333;
                    --heading-color: #1a1a1a;
                    --card-bg: #f8f9fa;
                    --border-color: #e5e5e5;
                    --code-bg: #f1f3f4;
                }
                
                [data-theme="dark"] {
                    --bg-color: #1a1a1a;
                    --text-color: #e5e5e5;
                    --heading-color: #ffffff;
                    --card-bg: #2d2d2d;
                    --border-color: #404040;
                    --code-bg: #262626;
                }
                
                @media (max-width: 768px) {
                    .container {
                        padding: 0 0.75rem;
                    }
                    
                    .test-content {
                        padding: 1rem 0;
                    }
                    
                    .test-section {
                        padding: 1rem;
                    }
                }
            `}</style>
        </ThemeProvider>
    );
}