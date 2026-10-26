import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const sizeMap = {
    sm: { icon: 32, text: 'text-lg', sub: 'text-[9px]' },
    md: { icon: 42, text: 'text-2xl', sub: 'text-[11px]' },
    lg: { icon: 56, text: 'text-3xl', sub: 'text-xs' },
    xl: { icon: 80, text: 'text-5xl', sub: 'text-sm' },
  };

  const dim = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Unique AH NYI Emblem (Gold & Pearl White) */}
      <div 
        className="relative flex items-center justify-center rounded-2xl p-1 shadow-lg transition-transform hover:scale-105"
        style={{
          width: dim.icon,
          height: dim.icon,
          background: 'linear-gradient(135deg, rgba(212,175,55,0.25) 0%, rgba(20,24,33,0.95) 100%)',
          border: '1.5px solid rgba(212, 175, 55, 0.45)',
          boxShadow: '0 4px 20px rgba(212, 175, 55, 0.2)'
        }}
      >
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="ahnyi_gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF1C5" />
              <stop offset="40%" stopColor="#F6D365" />
              <stop offset="75%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#AA771C" />
            </linearGradient>
            <radialGradient id="ahnyi_glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FFE29F" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#D4AF37" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Glowing central aura */}
          <circle cx="50" cy="50" r="42" fill="url(#ahnyi_glow)" />

          {/* Outer Royal Golden Arc Ring */}
          <circle 
            cx="50" 
            cy="50" 
            r="44" 
            stroke="url(#ahnyi_gold)" 
            strokeWidth="2.5" 
            strokeDasharray="8 4" 
            strokeLinecap="round" 
          />

          {/* Distinctive Stylized 'A' & 'NYI' Lotus-Flame Architecture */}
          <path 
            d="M50 14 L74 68 H61 L50 42 L39 68 H26 Z" 
            fill="url(#ahnyi_gold)" 
          />
          
          {/* Central Gem Diamond */}
          <path 
            d="M50 32 L58 44 L50 56 L42 44 Z" 
            fill="#FFFFFF" 
            opacity="0.95" 
          />

          {/* Horizon Arc Base */}
          <path 
            d="M22 78 C 36 86, 64 86, 78 78" 
            stroke="url(#ahnyi_gold)" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
          />

          {/* Crown Apex Sparkle */}
          <circle cx="50" cy="14" r="3" fill="#FFFFFF" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span 
              className={`font-black tracking-wider uppercase ${dim.text} gold-gradient-text`}
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              AH NYI
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37]/20 to-[#AA771C]/20 border border-[#D4AF37]/40 text-[#F6D365]">
              GOLD
            </span>
          </div>
          <span className={`text-gray-400 font-medium tracking-widest uppercase ${dim.sub}`}>
            Social Network
          </span>
        </div>
      )}
    </div>
  );
};
