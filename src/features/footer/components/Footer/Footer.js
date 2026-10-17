import Link from 'next/link';
import Image from 'next/image';
import { withBasePath } from '@/utils/url/withBasePath';
import { mergeLabels } from '@/utils/i18n/mergeLabels';
import './Footer.scss';

// Défauts français, surchargeables par la prop `labels` (cf. src/utils/i18n/mergeLabels.js).
const DEFAULT_LABELS = {
  logoAlt: 'Logo du site',
};

/**
 * Site footer: logo linking back to the application root, plus a copyright line.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.copyrightText='© Copyright'] - Copyright line.
 * @param {string} [props.homeHref='/'] - Destination of the logo link. Defaults to the
 *   site root, which is what a third party installing this item on its own
 *   expects; this repository mounts its demo application under /demo/<locale> and
 *   therefore passes that value from `src/app/(site)/demo/[locale]/layout.jsx`.
 * @param {Object} [props.labels] - Wording overrides, merged over the French defaults.
 *   Key: `logoAlt`.
 * @returns {JSX.Element} The rendered footer.
 */
const Footer = ({ copyrightText = '© Copyright', homeHref = '/', labels: labelOverrides }) => {
  const labels = mergeLabels(DEFAULT_LABELS, labelOverrides);

  return (
    <footer className='footer'>
      {/* Logo de l'application */}
      <Link href={homeHref} className="footer__logo">
          <Image src={withBasePath('/logo.svg')} alt={labels.logoAlt} className="logo" width={40} height={40} />
      </Link>
      {/* Copyright de l'application */}
      <p className="footer__copyright">
        {copyrightText}
      </p>
    </footer>
  );
};

export default Footer;