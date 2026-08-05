import Link from 'next/link';
import Image from 'next/image';
import { withBasePath } from '@/utils/url/withBasePath';
import './Footer.scss';

/**
 * Site footer: logo linking back to the application root, plus a copyright line.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.copyrightText='© Copyright'] - Copyright line.
 * @param {string} [props.homeHref='/'] - Destination of the logo link. Defaults to the
 *   site root, which is what a third party installing this item from the registry
 *   expects; this repository mounts its demo application under /demo and therefore
 *   passes that value from `src/app/(site)/layout.jsx`.
 * @returns {JSX.Element} The rendered footer.
 */
const Footer = ({ copyrightText = '© Copyright', homeHref = '/' }) => {
  return (
    <footer className='footer'>
      {/* Logo de l'application */}
      <Link href={homeHref} className="footer__logo">
          <Image src={withBasePath('/logo.svg')} alt="Logo du site" className="logo" width={40} height={40} />
      </Link>
      {/* Copyright de l'application */}
      <p className="footer__copyright">
        {copyrightText}
      </p>
    </footer>
  );
};

export default Footer;