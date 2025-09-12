import React from 'react';
import logo from '../assets/spillrix-logo.jpg';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const Logo: React.FC<LogoProps> = ({ size = 'md' }) => {
  let className = 'h-10 w-auto object-contain'; // Made slightly bigger (h-10 instead of h-8)
  if (size === 'sm') {
    className = 'h-8 w-auto object-contain'; // Made slightly bigger (h-8 instead of h-6)
  } else if (size === 'lg') {
    className = 'h-12 w-auto object-contain'; // Made slightly bigger (h-12 instead of h-10)
  }

  return (
    <div className="flex items-center justify-center">
      <img 
        src={logo} 
        alt="Spillrix Distribution" 
        className={className}
        style={{ filter: 'brightness(1.1)' }} // Slight brightness boost for better visibility
      />
    </div>
  );
};

export default Logo;
