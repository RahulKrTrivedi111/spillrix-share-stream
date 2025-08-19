import { Music } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-3xl'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className={`${sizeClasses[size]} bg-gradient-to-br from-primary to-primary-glow rounded-xl flex items-center justify-center shadow-lg`}>
          <Music className={`${size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-4 w-4' : 'h-3 w-3'} text-white`} />
        </div>
        <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-primary-glow/20 rounded-xl blur-sm -z-10" />
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`${textSizeClasses[size]} font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent`}>
            Spillrix
          </span>
          {size !== 'sm' && (
            <span className="text-xs text-muted-foreground -mt-1">Distribution</span>
          )}
        </div>
      )}
    </div>
  );
}