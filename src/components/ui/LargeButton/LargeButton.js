import React from 'react';
import Link from 'next/link';
import './LargeButton.scss';

/**
 * Large circular button component with hover effects
 * 
 * @param {Object} props - Component props
 * @param {string} props.href - Navigation link URL
 * @param {string} props.text - Button text content
 * @param {string} [props.className] - Additional CSS classes
 * @param {Object} [props.style] - Inline styles
 */
const LargeButton = ({ 
  href, 
  text, 
  className = '', 
  style = {},
  ...props 
}) => {
  return (
    <Link 
      href={href} 
      className={`large-button ${className}`}
      style={style}
      {...props}
    >
      {text}
    </Link>
  );
};

export default LargeButton;