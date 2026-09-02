import React from 'react';
import { Crown, Sparkles, Zap, Shield, Star } from 'lucide-react';

interface NeonProfileAvatarProps {
  level: number;
  emoji: string;
  role: 'driver' | 'passenger' | 'merchant';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  customBadge?: string;
  className?: string;
}

export const NeonProfileAvatar: React.FC<NeonProfileAvatarProps> = ({
  level,
  emoji,
  role,
  size = 'lg',
  customBadge,
  className = ''
}) => {
  // Intensity scales dynamically with level (0.3 at lv 1 up to 1.0 at lv 100)
  const normalizedLevel = Math.max(1, Math.min(100, level));
  const intensity = Math.min(1, Math.max(0.3, normalizedLevel / 100));
  const isGodTier = normalizedLevel >= 100;
  const isGrandTier = normalizedLevel >= 80;
  const isMasterTier = normalizedLevel >= 50;
  const isAdeptTier = normalizedLevel >= 20;

  // Determine CSS Tier Class
  const tierClass = isGodTier 
    ? 'neon-tier-100' 
    : isGrandTier 
    ? 'neon-tier-4' 
    : isMasterTier 
    ? 'neon-tier-3' 
    : isAdeptTier 
    ? 'neon-tier-2' 
    : 'neon-tier-1';

  // Role CSS Class
  const roleClass = `neon-role-${role}`;

  // Colors per role
  const roleGlow = role === 'driver' 
    ? { primary: '#00D2FF', secondary: '#FFD700', tertiary: '#3B82F6', title: 'WIN KNIGHT' }
    : role === 'passenger'
    ? { primary: '#00F0FF', secondary: '#10B981', tertiary: '#A855F7', title: 'CITIZEN' }
    : { primary: '#FFD700', secondary: '#F59E0B', tertiary: '#10B981', title: 'AURA MERCHANT' };

  // Calculate dynamic multi-layered neon glow shadows based on level (Reduced by 50%)
  const blur1 = Math.round((12 + intensity * 35) * 0.5);
  const blur2 = Math.round((20 + intensity * 55) * 0.5);
  const blur3 = Math.round((32 + intensity * 85) * 0.5);
  const spread1 = Math.round((2 + intensity * 12) * 0.5);
  const spread2 = Math.round((4 + intensity * 24) * 0.5);

  const dynamicBoxShadow = isGodTier
    ? `0 0 ${blur1}px ${spread1}px rgba(0, 210, 255, 0.5), 0 0 ${blur2}px ${spread2}px rgba(255, 215, 0, 0.5), 0 0 ${blur3}px ${spread2 + 6}px rgba(0, 210, 255, 0.45), inset 0 0 11px rgba(255, 215, 0, 0.5)`
    : isGrandTier
    ? `0 0 ${blur1}px ${spread1}px rgba(0, 210, 255, 0.45), 0 0 ${blur2}px ${spread2}px rgba(255, 215, 0, 0.35), 0 0 ${blur3}px rgba(0, 210, 255, 0.3), inset 0 0 8px rgba(0, 210, 255, 0.35)`
    : isMasterTier
    ? `0 0 ${blur1}px ${spread1}px rgba(0, 210, 255, 0.4), 0 0 ${blur2}px rgba(0, 210, 255, 0.3), inset 0 0 5px rgba(0, 210, 255, 0.25)`
    : `0 0 ${blur1}px rgba(0, 210, 255, 0.28), inset 0 0 3px rgba(0, 210, 255, 0.15)`;

  // Dimensions
  const sizeClasses = {
    sm: 'w-10 h-10 text-xl',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-3xl',
    xl: 'w-24 h-24 text-4xl'
  }[size];

  const containerSizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-24 h-24'
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center select-none ${roleClass} ${className}`}>
      {/* GODLIKE AURA PULSE BACKGROUND FOR LEVEL 100+ */}
      {isGodTier && (
        <div className="neon-backdrop-aura" />
      )}

      {/* GRAND TIER AURA FOR LEVEL 60+ (50% REDUCED OPACITY) */}
      {isGrandTier && !isGodTier && (
        <div 
          className="absolute -inset-2 rounded-2xl opacity-35 blur-md pointer-events-none animate-pulse"
          style={{
            background: `radial-gradient(circle, ${roleGlow.primary} 0%, ${roleGlow.secondary} 60%, transparent 80%)`,
          }}
        />
      )}

      {/* ROTATING NEON CONIC BORDER RING FOR HIGH LEVELS (50% REDUCED OPACITY) */}
      {normalizedLevel >= 25 && (
        <div 
          className="neon-conic-spin"
          style={{
            animationDuration: isGodTier ? '3s' : isGrandTier ? '5s' : '8s',
            opacity: Math.min(0.55, 0.28 + intensity * 0.25)
          }}
        />
      )}

      {/* MAIN NEON AVATAR CONTAINER */}
      <div 
        className={`relative ${containerSizes} rounded-2xl p-0.5 transition-all duration-700 flex items-center justify-center neon-border-base ${tierClass}`}
        style={{
          boxShadow: dynamicBoxShadow,
          background: isGodTier
            ? `linear-gradient(135deg, ${roleGlow.secondary}, #FFFFFF, ${roleGlow.primary})`
            : isGrandTier
            ? `linear-gradient(135deg, ${roleGlow.primary}, ${roleGlow.secondary})`
            : isMasterTier
            ? `linear-gradient(135deg, ${roleGlow.primary}, #3B82F6)`
            : `linear-gradient(135deg, rgba(0,210,255,0.7), rgba(59,130,246,0.5))`
        }}
      >
        {/* INNER AVATAR DARK CORE */}
        <div className={`w-full h-full bg-gradient-to-br from-[#0A1633] via-[#070D1E] to-[#030611] rounded-[14px] flex items-center justify-center relative overflow-hidden`}>
          {/* Inner ambient glow (50% reduced opacity) */}
          <div 
            className="absolute inset-0 mix-blend-screen pointer-events-none"
            style={{
              opacity: 0.18 + intensity * 0.22,
              background: `radial-gradient(circle at 50% 30%, ${roleGlow.primary}, transparent 70%)`
            }}
          />

          {/* Avatar Emoji */}
          <span className="relative z-10 filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] transform transition-transform hover:scale-110">
            {emoji}
          </span>

          {/* Godlike particle sparkles overlay (50% reduced opacity) */}
          {isGodTier && (
            <div className="absolute inset-0 bg-gradient-to-t from-[#FFD700]/15 via-transparent to-[#00D2FF]/15 animate-pulse pointer-events-none" />
          )}
        </div>
      </div>

      {/* TOP CROWN FOR GOD-TIER (LV 100) */}
      {isGodTier && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#FFD700] via-amber-300 to-[#00D2FF] text-slate-950 font-black text-[9px] shadow-[0_0_9px_#FFD700] border border-white z-20 animate-bounce whitespace-nowrap">
          <Crown className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
          <span>SOVEREIGN MAX LV.100</span>
        </div>
      )}

      {/* BOTTOM LEVEL BADGE WITH DYNAMIC GLOW (50% REDUCED SHADOW) */}
      <div 
        className={`absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full font-mono font-black text-[10px] flex items-center gap-1 z-20 shadow-md border whitespace-nowrap ${
          isGodTier
            ? 'bg-gradient-to-r from-[#FFD700] via-amber-300 to-cyan-400 text-slate-950 border-white shadow-[0_0_11px_#FFD700]'
            : isGrandTier
            ? 'bg-[#FFD700] text-slate-950 border-[#070D1E] shadow-[0_0_7px_#FFD700]'
            : isMasterTier
            ? 'bg-[#00D2FF] text-slate-950 border-[#070D1E] shadow-[0_0_5px_#00D2FF]'
            : 'bg-slate-900 text-cyan-300 border-cyan-500/50 shadow-[0_0_3px_rgba(0,210,255,0.25)]'
        }`}
      >
        {isGodTier ? <Sparkles className="w-3 h-3 fill-slate-950 text-slate-950 animate-spin" /> : null}
        <span>{customBadge || `LV.${normalizedLevel}`}</span>
      </div>
    </div>
  );
};
