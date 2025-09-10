import Link from 'next/link';
import Image from 'next/image';
import './Footer.scss';

const Footer = ({ copyrightText = '© Copyright' }) => {
  return (
    <footer className='footer'>
      {/* Logo de l'application */}
      <Link href="/" className="footer__logo">
          <Image src='/logo.svg' alt="Logo du site" className="logo" width={40} height={40} />
      </Link>
      {/* Copyright de l'application */}
      <p className="footer__copyright">
        {copyrightText}
      </p>
    </footer>
  );
};

export default Footer;