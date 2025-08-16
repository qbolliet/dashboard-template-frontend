'use client';

import React from 'react';
import Link from 'next/link';
import './Footer.scss';

/**
 * Footer component with logo and copyright information.
 * Simple footer design matching the old component structure.
 * 
 * @param {string} copyrightText - Optional custom copyright text
 * @returns {JSX.Element} The rendered footer component
 */
const Footer = ({ copyrightText = "© 2024 Inspection Générale des Finances" }) => {
    return (
        <footer className="footer">
            <Link href="/" className="footer__logo">
                <img src="/logo.svg" alt="website logo" />
            </Link>
            <p className="footer__copyright">
                {copyrightText}
            </p>
        </footer>
    );
};

export default Footer;