import React from 'react';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className = '',
  onClick,
  hoverEffect = true,
}) => {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl border border-white/5 bg-[#08080a]/95 text-gray-200 
        shadow-[0_12px_36px_rgba(0,0,0,0.85)] transition-all duration-300 ease-out
        ${
          hoverEffect
            ? 'hover:-translate-y-1.5 hover:border-white/20 hover:shadow-[0_22px_45px_rgba(0,0,0,0.95),0_0_25px_rgba(59,130,246,0.12)] hover:bg-[#0c0c10]'
            : ''
        }
        ${onClick ? 'cursor-pointer active:translate-y-0 active:shadow-[0_6px_20px_rgba(0,0,0,0.9)]' : ''}
        ${className}`}
    >
      {/* Immersive top rim highlight gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent rounded-t-2xl pointer-events-none" />
      {children}
    </div>
  );
};
