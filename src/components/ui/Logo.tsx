import React from 'react';
import logo from '../../spillrix-logo.png';

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

  return (
    <div className="flex items-center space-x-2">
      <img src={logo} alt="Spillrix Logo" className={className} />
      <span className="text-xl font-semibold text-gray-800 dark:text-white">Spillrix Distribution</span>
    </div>
  );
};

export default Logo;
