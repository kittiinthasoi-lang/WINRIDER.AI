import React from 'react';

export interface CyberGraphicProps {
  emoji?: string;
  src?: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  glowColor?: string;
  rounded?: string;
  inline?: boolean;
}

export const EMOJI_IMAGE_MAP: Record<string, string> = {
  // Vehicles & Rides
  '🏍': '/images/knight_ride.jpg',
  '🏍️': '/images/knight_ride.jpg',
  '🛵': '/images/knight_ride.jpg',
  '🚲': '/images/knight_ride.jpg',
  '🚗': '/images/knight_ride.jpg',
  '🏎': '/images/knight_ride.jpg',
  '🏎️': '/images/knight_ride.jpg',
  '🚌': '/images/transit_train.jpg',
  '🚝': '/images/transit_train.jpg',
  '🚆': '/images/transit_train.jpg',
  '🚇': '/images/transit_train.jpg',
  '🚊': '/images/transit_train.jpg',
  '🚉': '/images/transit_train.jpg',
  '🚂': '/images/transit_train.jpg',
  '✈': '/images/transit_train.jpg',
  '✈️': '/images/transit_train.jpg',
  '🛫': '/images/transit_train.jpg',
  '🚢': '/images/transit_train.jpg',
  '🚤': '/images/transit_train.jpg',
  '🛸': '/images/cyber_armor.jpg',
  '🚁': '/images/cyber_armor.jpg',
  '🚀': '/images/cyber_armor.jpg',
  '🛣': '/images/knight_ride.jpg',
  '🛣️': '/images/knight_ride.jpg',
  '🚏': '/images/transit_train.jpg',
  '🚐': '/images/transit_train.jpg',

  // Delivery, Parcels, Tools & Tech
  '📦': '/images/express_parcel.jpg',
  '🚚': '/images/express_parcel.jpg',
  '⚡': '/images/express_parcel.jpg',
  '📬': '/images/express_parcel.jpg',
  '📮': '/images/express_parcel.jpg',
  '📱': '/images/express_parcel.jpg',
  '💻': '/images/express_parcel.jpg',
  '🔌': '/images/express_parcel.jpg',
  '🔋': '/images/express_parcel.jpg',
  '⚙': '/images/express_parcel.jpg',
  '⚙️': '/images/express_parcel.jpg',
  '🔧': '/images/express_parcel.jpg',
  '🛠': '/images/express_parcel.jpg',
  '🛠️': '/images/express_parcel.jpg',
  '🧰': '/images/express_parcel.jpg',
  '📡': '/images/express_parcel.jpg',
  '📹': '/images/express_parcel.jpg',
  '📷': '/images/express_parcel.jpg',
  '📸': '/images/express_parcel.jpg',
  '🎙': '/images/express_parcel.jpg',
  '🎙️': '/images/express_parcel.jpg',
  '🎛': '/images/express_parcel.jpg',
  '🎛️': '/images/express_parcel.jpg',
  '🔊': '/images/express_parcel.jpg',
  '🎧': '/images/express_parcel.jpg',
  '💡': '/images/express_parcel.jpg',
  '📄': '/images/express_parcel.jpg',
  '📝': '/images/express_parcel.jpg',
  '📜': '/images/express_parcel.jpg',
  '📒': '/images/express_parcel.jpg',
  '🧾': '/images/express_parcel.jpg',
  '✏': '/images/express_parcel.jpg',
  '✏️': '/images/express_parcel.jpg',
  '📏': '/images/express_parcel.jpg',
  '⏱': '/images/express_parcel.jpg',
  '⏱️': '/images/express_parcel.jpg',
  '⏰': '/images/express_parcel.jpg',
  '🕒': '/images/express_parcel.jpg',
  '⌚': '/images/cyber_armor.jpg',
  '🔍': '/images/app_logo.jpg',

  // Pets & Animals
  '🐶': '/images/pet_care.jpg',
  '🐱': '/images/pet_care.jpg',
  '🐾': '/images/pet_care.jpg',
  '🐕': '/images/pet_care.jpg',
  '🐩': '/images/pet_care.jpg',
  '🐈': '/images/pet_care.jpg',
  '🐰': '/images/pet_care.jpg',
  '🦅': '/images/pet_care.jpg',
  '🦁': '/images/app_logo.jpg',
  '🐅': '/images/pet_care.jpg',
  '🦀': '/images/pet_care.jpg',
  '🦐': '/images/pet_care.jpg',
  '🐟': '/images/pet_care.jpg',
  '🦮': '/images/pet_care.jpg',
  '🦥': '/images/avatar_citizen.jpg',
  '🦈': '/images/pet_care.jpg',
  '🐘': '/images/pet_care.jpg',
  '🐝': '/images/pet_care.jpg',
  '🦴': '/images/pet_care.jpg',

  // Faith, Sacred, Temple & Mu
  '⛩': '/images/mu_buddy.jpg',
  '⛩️': '/images/mu_buddy.jpg',
  '🪔': '/images/mu_buddy.jpg',
  '🔮': '/images/mu_buddy.jpg',
  '🕉': '/images/mu_buddy.jpg',
  '🕉️': '/images/mu_buddy.jpg',
  '🙏': '/images/mu_buddy.jpg',
  '✨': '/images/mu_buddy.jpg',
  '🌸': '/images/mu_buddy.jpg',
  '🪷': '/images/mu_buddy.jpg',
  '🕌': '/images/mu_buddy.jpg',
  '⛪': '/images/mu_buddy.jpg',
  '☬': '/images/mu_buddy.jpg',
  '🏮': '/images/mu_buddy.jpg',
  '🕯': '/images/mu_buddy.jpg',
  '🕯️': '/images/mu_buddy.jpg',
  '🎆': '/images/mu_buddy.jpg',
  '🌌': '/images/mu_buddy.jpg',
  '🌟': '/images/mu_buddy.jpg',
  '📿': '/images/mu_buddy.jpg',
  '🛕': '/images/mu_buddy.jpg',
  '🧘': '/images/mu_buddy.jpg',
  '👹': '/images/mu_buddy.jpg',
  '👻': '/images/mu_buddy.jpg',

  // Drinks, Cafe & Lifestyle
  '☕': '/images/lifestyle_cafe.jpg',
  '🍵': '/images/lifestyle_cafe.jpg',
  '🍹': '/images/lifestyle_cafe.jpg',
  '🍺': '/images/lifestyle_cafe.jpg',
  '🍻': '/images/lifestyle_cafe.jpg',
  '🥂': '/images/lifestyle_cafe.jpg',
  '🍷': '/images/lifestyle_cafe.jpg',
  '🍸': '/images/lifestyle_cafe.jpg',
  '🥤': '/images/lifestyle_cafe.jpg',
  '🧊': '/images/lifestyle_cafe.jpg',
  '🌿': '/images/lifestyle_cafe.jpg',
  '🌅': '/images/lifestyle_cafe.jpg',
  '🌃': '/images/lifestyle_cafe.jpg',

  // Food, Street Market & Dishes
  '🍜': '/images/cyber_food.jpg',
  '🍲': '/images/cyber_food.jpg',
  '🌶': '/images/cyber_food.jpg',
  '🌶️': '/images/cyber_food.jpg',
  '🍪': '/images/cyber_food.jpg',
  '🥐': '/images/cyber_food.jpg',
  '🍔': '/images/cyber_food.jpg',
  '🍕': '/images/cyber_food.jpg',
  '🥗': '/images/cyber_food.jpg',
  '🍱': '/images/cyber_food.jpg',
  '🍛': '/images/cyber_food.jpg',
  '🥩': '/images/cyber_food.jpg',
  '🍗': '/images/cyber_food.jpg',
  '🍊': '/images/cyber_food.jpg',
  '🍽': '/images/cyber_food.jpg',
  '🍽️': '/images/cyber_food.jpg',
  '🥢': '/images/cyber_food.jpg',
  '🍫': '/images/cyber_food.jpg',
  '🥭': '/images/cyber_food.jpg',
  '🍎': '/images/cyber_food.jpg',
  '🧁': '/images/cyber_food.jpg',
  '🥟': '/images/cyber_food.jpg',
  '🥬': '/images/cyber_food.jpg',
  '🍞': '/images/cyber_food.jpg',
  '🍯': '/images/cyber_food.jpg',
  '🍳': '/images/cyber_food.jpg',
  '🥚': '/images/cyber_food.jpg',
  '🍰': '/images/cyber_food.jpg',

  // Spirit, Elderly, Medical & Hospitals
  '👵': '/images/elderly_spirit.jpg',
  '🧓': '/images/elderly_spirit.jpg',
  '🤲': '/images/elderly_spirit.jpg',
  '🩺': '/images/elderly_spirit.jpg',
  '🏥': '/images/elderly_spirit.jpg',
  '💊': '/images/elderly_spirit.jpg',
  '🚑': '/images/elderly_spirit.jpg',
  '❤': '/images/elderly_spirit.jpg',
  '❤️': '/images/elderly_spirit.jpg',
  '💖': '/images/elderly_spirit.jpg',
  '💙': '/images/elderly_spirit.jpg',
  '🩸': '/images/elderly_spirit.jpg',
  '💉': '/images/elderly_spirit.jpg',
  '🔬': '/images/elderly_spirit.jpg',
  '🚨': '/images/elderly_spirit.jpg',
  '🚒': '/images/elderly_spirit.jpg',
  '📞': '/images/elderly_spirit.jpg',
  '😷': '/images/elderly_spirit.jpg',
  '♿': '/images/elderly_spirit.jpg',
  '⚕': '/images/elderly_spirit.jpg',
  '⚕️': '/images/elderly_spirit.jpg',
  '💡': '/images/elderly_spirit.jpg',

  // Family, Citizens & People
  '👨‍👩‍👧': '/images/family_school.jpg',
  '🎒': '/images/family_school.jpg',
  '🏫': '/images/family_school.jpg',
  '🤝': '/images/family_school.jpg',
  '👶': '/images/family_school.jpg',
  '🧑‍🤝‍🧑': '/images/family_school.jpg',
  '👧': '/images/avatar_citizen.jpg',
  '👨': '/images/avatar_knight.jpg',
  '👩': '/images/avatar_citizen.jpg',
  '🧑': '/images/avatar_citizen.jpg',
  '👤': '/images/avatar_citizen.jpg',
  '👥': '/images/avatar_citizen.jpg',
  '🦰': '/images/avatar_citizen.jpg',
  '🧔': '/images/avatar_knight.jpg',
  '🤠': '/images/avatar_knight.jpg',
  '👴': '/images/elderly_spirit.jpg',
  '🎓': '/images/family_school.jpg',
  '🥋': '/images/cyber_armor.jpg',

  // Money, Baht, Economy
  '💰': '/images/cyber_coins.jpg',
  '🪙': '/images/cyber_coins.jpg',
  '💵': '/images/cyber_coins.jpg',
  '💳': '/images/cyber_coins.jpg',
  '🏦': '/images/cyber_coins.jpg',
  '💎': '/images/cyber_coins.jpg',
  '💸': '/images/cyber_coins.jpg',
  '💍': '/images/cyber_coins.jpg',
  '📈': '/images/cyber_coins.jpg',
  '📉': '/images/cyber_coins.jpg',

  // Sports, Arenas, Tickets, Music
  '🏟': '/images/cyber_arena.jpg',
  '🏟️': '/images/cyber_arena.jpg',
  '⚽': '/images/cyber_arena.jpg',
  '🥊': '/images/cyber_arena.jpg',
  '🏛': '/images/cyber_arena.jpg',
  '🏛️': '/images/cyber_arena.jpg',
  '🎡': '/images/cyber_arena.jpg',
  '🏙': '/images/cyber_arena.jpg',
  '🏙️': '/images/cyber_arena.jpg',
  '📍': '/images/cyber_arena.jpg',
  '🗺': '/images/cyber_arena.jpg',
  '🗺️': '/images/cyber_arena.jpg',
  '📚': '/images/cyber_arena.jpg',
  '🎤': '/images/transit_train.jpg',
  '🎵': '/images/transit_train.jpg',
  '🎶': '/images/transit_train.jpg',
  '🎸': '/images/transit_train.jpg',
  '🎟': '/images/transit_train.jpg',
  '🎟️': '/images/transit_train.jpg',
  '🎫': '/images/transit_train.jpg',
  '🎪': '/images/cyber_arena.jpg',
  '🎨': '/images/cyber_arena.jpg',
  '🎭': '/images/cyber_arena.jpg',
  '🎬': '/images/cyber_arena.jpg',
  '🎮': '/images/cyber_arena.jpg',
  '🎯': '/images/cyber_arena.jpg',
  '🎲': '/images/cyber_arena.jpg',
  '🏆': '/images/app_logo.jpg',
  '🎖': '/images/cyber_armor.jpg',
  '🎖️': '/images/cyber_armor.jpg',
  '🥇': '/images/cyber_armor.jpg',
  '🥈': '/images/cyber_armor.jpg',
  '🥉': '/images/cyber_armor.jpg',
  '🏃': '/images/cyber_arena.jpg',

  // Armor, Weapons, Badges & Protection
  '🛡': '/images/cyber_armor.jpg',
  '🛡️': '/images/cyber_armor.jpg',
  '⚔': '/images/cyber_armor.jpg',
  '⚔️': '/images/cyber_armor.jpg',
  '🪖': '/images/cyber_armor.jpg',
  '🧥': '/images/cyber_armor.jpg',
  '🧤': '/images/cyber_armor.jpg',
  '🦾': '/images/cyber_armor.jpg',
  '🔒': '/images/cyber_armor.jpg',
  '🌧': '/images/cyber_armor.jpg',
  '🌧️': '/images/cyber_armor.jpg',
  '⛈': '/images/cyber_armor.jpg',
  '⛈️': '/images/cyber_armor.jpg',
  '💨': '/images/cyber_armor.jpg',
  '🌪': '/images/cyber_armor.jpg',
  '🌪️': '/images/cyber_armor.jpg',
  '🌊': '/images/cyber_armor.jpg',
  '🚩': '/images/cyber_armor.jpg',
  '🏁': '/images/cyber_armor.jpg',
  '🚦': '/images/cyber_armor.jpg',
  '📌': '/images/cyber_armor.jpg',
  '💺': '/images/cyber_armor.jpg',
  '☂': '/images/cyber_armor.jpg',
  '☂️': '/images/cyber_armor.jpg',
  '👢': '/images/cyber_armor.jpg',
  '👕': '/images/cyber_armor.jpg',
  '👗': '/images/cyber_armor.jpg',
  '👘': '/images/cyber_armor.jpg',
  '👜': '/images/avatar_merchant.jpg',
  '🧣': '/images/cyber_armor.jpg',
  '🕶': '/images/cyber_armor.jpg',
  '🕶️': '/images/cyber_armor.jpg',
  '👓': '/images/avatar_citizen.jpg',
  '🧪': '/images/cyber_armor.jpg',
  '🧳': '/images/express_parcel.jpg',
  '🧴': '/images/lifestyle_cafe.jpg',
  '🧶': '/images/cyber_food.jpg',
  '🤖': '/images/app_logo.jpg',
  '⭐': '/images/app_logo.jpg',
  '★': '/images/app_logo.jpg',
  '✦': '/images/app_logo.jpg',

  // Merchants & Venues
  '🏪': '/images/avatar_merchant.jpg',
  '🏬': '/images/avatar_merchant.jpg',
  '🛍': '/images/avatar_merchant.jpg',
  '🛍️': '/images/avatar_merchant.jpg',
  '🛒': '/images/avatar_merchant.jpg',
  '🏢': '/images/avatar_partner.jpg',
  '🏨': '/images/avatar_partner.jpg',
  '🏰': '/images/avatar_partner.jpg',
  '💼': '/images/avatar_partner.jpg',
  '🏡': '/images/avatar_partner.jpg',
  '🚪': '/images/avatar_partner.jpg',

  // Empire & Royalty
  '👑': '/images/app_logo.jpg',
  '🎉': '/images/app_logo.jpg',
  '🎁': '/images/app_logo.jpg',
  '✅': '/images/app_logo.jpg',
  '✓': '/images/app_logo.jpg',
  '🔔': '/images/app_logo.jpg',
};

export function getCyberImageUrl(emojiOrSrc?: string): string {
  if (!emojiOrSrc) return '/images/app_logo.jpg';
  if (emojiOrSrc.startsWith('/') || emojiOrSrc.startsWith('http')) {
    return emojiOrSrc;
  }
  
  const trimmed = emojiOrSrc.trim();
  if (EMOJI_IMAGE_MAP[trimmed]) {
    return EMOJI_IMAGE_MAP[trimmed];
  }

  // Check if any key is contained in string
  for (const [emKey, imgVal] of Object.entries(EMOJI_IMAGE_MAP)) {
    if (trimmed.includes(emKey)) {
      return imgVal;
    }
  }

  return '/images/app_logo.jpg';
}

const SIZE_MAP: Record<string, string> = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
  '2xl': 'w-16 h-16',
};

export const CyberGraphic: React.FC<CyberGraphicProps> = ({
  emoji,
  src,
  alt = 'Cyber Graphic',
  size = 'md',
  className = '',
  glowColor,
  rounded = 'rounded-xl',
  inline = false,
}) => {
  const resolvedSrc = src || (emoji ? getCyberImageUrl(emoji) : '/images/app_logo.jpg');
  const sizeClass = typeof size === 'string' ? (SIZE_MAP[size] || 'w-8 h-8') : '';
  const customDimStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : {};

  return (
    <span
      className={`${inline ? 'inline-flex align-middle mx-1' : 'inline-flex'} items-center justify-center overflow-hidden flex-shrink-0 border border-white/20 shadow-md ${sizeClass} ${rounded} ${className}`}
      style={{
        ...customDimStyle,
        boxShadow: glowColor ? `0 0 12px ${glowColor}` : undefined,
      }}
    >
      <img
        src={resolvedSrc}
        alt={alt}
        className="w-full h-full object-cover select-none pointer-events-none"
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    </span>
  );
};

export const CyberIcon: React.FC<{
  icon?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  glowColor?: string;
  rounded?: string;
}> = ({ icon, size = 'sm', className = '', glowColor, rounded = 'rounded-lg' }) => {
  return (
    <CyberGraphic
      emoji={icon}
      size={size}
      className={className}
      glowColor={glowColor}
      rounded={rounded}
    />
  );
};

/**
 * CyberText replaces any emoji in a text string with an inline <CyberGraphic /> image.
 */
export const CyberText: React.FC<{
  children: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}> = ({ children, size = 'xs', className = '' }) => {
  if (typeof children !== 'string') return <span className={className}>{children}</span>;

  // Regex pattern matching emojis
  const emojiRegex = /([\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}])/u;
  const parts = children.split(emojiRegex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (emojiRegex.test(part)) {
          return (
            <CyberGraphic
              key={index}
              emoji={part}
              size={size}
              inline
              rounded="rounded-md"
            />
          );
        }
        return part;
      })}
    </span>
  );
};
