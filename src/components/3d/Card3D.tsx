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
      className={`relative rounded-2xl border border-slate-800/80 bg-[#131622] text-slate-200 
        shadow-[0_12px_32px_rgba(0,0,0,0.7),_inset_0_1px_0_rgba(255,255,255,0.08)] 
        transition-all duration-200 ease-out overflow-hidden
        ${
          hoverEffect
            ? 'hover:-translate-y-1 hover:border-slate-700 hover:shadow-[0_20px_42px_rgba(0,0,0,0.85),_inset_0_1px_0_rgba(255,255,255,0.12)]'
            : ''
        }
        ${onClick ? 'cursor-pointer active:translate-y-0 active:shadow-[0_6px_20px_rgba(0,0,0,0.8)]' : ''}
        ${className}`}
    >
      {/* Top metallic rim bevel line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent pointer-events-none" />
      {children}
    </div>
  );
};

