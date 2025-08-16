'use client';

import React from 'react';
import Header from '../../features/header/components/Header/Header';
import Footer from '../../features/footer/components/Footer/Footer';
import CardsSection from '../../features/cards/components/CardsSection/CardsSection';
import { ThemeProvider } from '../../features/theme/providers/ThemeProvider';
import navigationData from '../../../config/navigation_new.json';
import cardsData from '../../../config/cards.json';

/**
 * Test page to verify all migrated components work correctly.
 * Displays header, cards section, and footer with the new components.
 * 
 * @returns {JSX.Element} The rendered test page
 */
const ComponentsTestPage = () => {
    return (
        <ThemeProvider>
            <div className="min-h-screen flex flex-col">
                {/* Header avec navigation */}
                <Header 
                    navigationData={navigationData.navigationData}
                    onNavigationItemClick={(path) => console.log('Navigation vers:', path)}
                />
                
                {/* Contenu principal */}
                <main className="flex-1 container mx-auto py-8">
                    <h1 className="fs-800 fw-600 text-center mb-8">
                        Test des Composants Migrés
                    </h1>
                    
                    <p className="fs-400 text-center mb-12 max-w-2xl mx-auto">
                        Cette page teste tous les composants migrés des anciennes versions React 
                        vers cette nouvelle implémentation Next.js. Vérifiez que la navigation, 
                        les cartes et le thème fonctionnent correctement.
                    </p>
                    
                    {/* Section des cartes */}
                    <CardsSection 
                        cardsData={cardsData.cards}
                        cardsPerRow={3}
                    />
                </main>
                
                {/* Footer */}
                <Footer />
            </div>
        </ThemeProvider>
    );
};

export default ComponentsTestPage;