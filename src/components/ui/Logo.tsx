import React from 'react';
import logo from '/public/Untitled design (5).png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  let className = 'h-8 w-auto';
  if (size === 'sm') {
    className = 'h-6 w-auto';
  } else if (size === 'lg') {
    className = 'h-10 w-auto';
  }

  return <img src={logo} alt="Spillrix Logo" className={className} />;
};

export default Logo;
