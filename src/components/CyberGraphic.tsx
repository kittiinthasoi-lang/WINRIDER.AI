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
  // Vehicles & Rides (Mapped to generated high-res realistic vehicles)
  '🏍': '/images/ride_sport.jpg',
  '🏍️': '/images/ride_sport.jpg',
  '🛵': '/images/ride_standard.jpg',
  '🚲': '/images/ride_standard.jpg',
  '🚗': '/images/ride_classic.jpg',
  '🏎': '/images/ride_sport.jpg',
  '🏎️': '/images/ride_sport.jpg',
  '🚘': '/images/ride_classic.jpg',
  '🚙': '/images/ride_classic.jpg',
  '🛺': '/images/ride_standard.jpg',
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
  '🛸': '/images/cyber_vehicle.jpg',
  '🚁': '/images/cyber_vehicle.jpg',
  '🚀': '/images/cyber_vehicle.jpg',
  '🛣': '/images/cyber_vehicle.jpg',
  '🛣️': '/images/cyber_vehicle.jpg',
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
  '🦥': '/images/person_commuter.jpg',
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
  '🍜': '/images/street_market_food.jpg',
  '🍲': '/images/street_market_food.jpg',
  '🌶': '/images/street_market_food.jpg',
  '🌶️': '/images/street_market_food.jpg',
  '🍪': '/images/cookie_box.jpg',
  '🥐': '/images/cookie_box.jpg',
  '🍔': '/images/street_market_food.jpg',
  '🍕': '/images/street_market_food.jpg',
  '🥗': '/images/street_market_food.jpg',
  '🍱': '/images/street_market_food.jpg',
  '🍛': '/images/street_market_food.jpg',
  '🥩': '/images/street_market_food.jpg',
  '🍗': '/images/street_market_food.jpg',
  '🍊': '/images/cyber_food.jpg',
  '🍽': '/images/street_market_food.jpg',
  '🍽️': '/images/street_market_food.jpg',
  '🥢': '/images/street_market_food.jpg',
  '🍫': '/images/cookie_box.jpg',
  '🥭': '/images/cyber_food.jpg',
  '🍎': '/images/cyber_food.jpg',
  '🧁': '/images/cookie_box.jpg',
  '🥟': '/images/street_market_food.jpg',
  '🥬': '/images/street_market_food.jpg',
  '🍞': '/images/cookie_box.jpg',
  '🍯': '/images/cookie_box.jpg',
  '🍳': '/images/street_market_food.jpg',
  '🥚': '/images/street_market_food.jpg',
  '🍰': '/images/cookie_box.jpg',

  // Spirit, Elderly, Medical & Hospitals
  '👵': '/images/elderly_spirit.jpg',
  '🧓': '/images/elderly_spirit.jpg',
  '🤲': '/images/elderly_spirit.jpg',
  '🩺': '/images/hospital_clinic.jpg',
  '🏥': '/images/hospital_clinic.jpg',
  '💊': '/images/hospital_clinic.jpg',
  '🚑': '/images/ambulance_vehicle.jpg',
  '❤': '/images/elderly_spirit.jpg',
  '❤️': '/images/elderly_spirit.jpg',
  '💖': '/images/elderly_spirit.jpg',
  '💙': '/images/elderly_spirit.jpg',
  '🩸': '/images/hospital_clinic.jpg',
  '💉': '/images/hospital_clinic.jpg',
  '🔬': '/images/hospital_clinic.jpg',
  '🚨': '/images/ambulance_vehicle.jpg',
  '🚒': '/images/cyber_vehicle.jpg',
  '📞': '/images/elderly_spirit.jpg',
  '😷': '/images/hospital_clinic.jpg',
  '♿': '/images/elderly_spirit.jpg',
  '⚕': '/images/hospital_clinic.jpg',
  '⚕️': '/images/hospital_clinic.jpg',

  // Family, Citizens & People (Mapped to realistic person photography by gender)
  '👨‍👩‍👧': '/images/family_school.jpg',
  '🎒': '/images/family_school.jpg',
  '🏫': '/images/family_school.jpg',
  '🤝': '/images/family_school.jpg',
  '👶': '/images/avatar_passenger_male.jpg',
  '🧑‍🤝‍🧑': '/images/family_school.jpg',
  '👧': '/images/avatar_passenger_female.jpg',
  '👦': '/images/avatar_passenger_male.jpg',
  '👨': '/images/avatar_passenger_male.jpg',
  '👩': '/images/avatar_passenger_female.jpg',
  '👨‍🦰': '/images/avatar_driver_male.jpg',
  '👩‍🦰': '/images/avatar_driver_female.jpg',
  '👨‍🦳': '/images/elderly_spirit.jpg',
  '👩‍🦳': '/images/elderly_spirit.jpg',
  '👨‍⚕️': '/images/avatar_driver_male.jpg',
  '👩‍⚕️': '/images/avatar_driver_female.jpg',
  '👨‍🍳': '/images/avatar_merchant.jpg',
  '👩‍🍳': '/images/avatar_merchant.jpg',
  '👨‍🏫': '/images/family_school.jpg',
  '👩‍🏫': '/images/family_school.jpg',
  '👨‍🏭': '/images/avatar_driver_male.jpg',
  '👩‍🏭': '/images/avatar_driver_female.jpg',
  '👨‍💼': '/images/avatar_partner.jpg',
  '👩‍💼': '/images/avatar_driver_female.jpg',
  '👨‍🔧': '/images/avatar_driver_male.jpg',
  '👩‍🔧': '/images/avatar_driver_female.jpg',
  '👨‍🔬': '/images/hospital_clinic.jpg',
  '👩‍🔬': '/images/hospital_clinic.jpg',
  '👨‍🎤': '/images/avatar_driver_male.jpg',
  '👩‍🎤': '/images/avatar_driver_female.jpg',
  '🧔': '/images/avatar_driver_male.jpg',
  '🧔‍♂️': '/images/avatar_driver_male.jpg',
  '🧔‍♀️': '/images/avatar_driver_female.jpg',
  '🤠': '/images/avatar_driver_male.jpg',
  '🧕': '/images/avatar_driver_female.jpg',
  '👮': '/images/avatar_driver_male.jpg',
  '👮‍♂️': '/images/avatar_driver_male.jpg',
  '👮‍♀️': '/images/avatar_driver_female.jpg',
  '🤴': '/images/avatar_driver_male.jpg',
  '👸': '/images/avatar_driver_female.jpg',
  '🧙‍♂️': '/images/pillar_mubuddy.jpg',
  '🧙‍♀️': '/images/pillar_mubuddy.jpg',
  '🧘‍♂️': '/images/avatar_driver_male.jpg',
  '🧘‍♀️': '/images/avatar_driver_female.jpg',
  '🎩': '/images/avatar_driver_male.jpg',
  '🧑': '/images/avatar_citizen.jpg',
  '👤': '/images/avatar_citizen.jpg',
  '👥': '/images/family_school.jpg',
  '🦰': '/images/avatar_passenger_female.jpg',
  '👴': '/images/elderly_spirit.jpg',
  '🎓': '/images/family_school.jpg',
  '🥋': '/images/cyber_armor.jpg',
  '🙋': '/images/avatar_passenger_female.jpg',
  '💁': '/images/avatar_passenger_female.jpg',
  '🧍': '/images/avatar_citizen.jpg',
  '🚶': '/images/avatar_citizen.jpg',
  '🏃': '/images/avatar_citizen.jpg',
  '🧑‍💼': '/images/avatar_partner.jpg',
  '🧑‍🔧': '/images/avatar_knight.jpg',
  '🧑‍🍳': '/images/avatar_merchant.jpg',
  '♂': '/images/avatar_passenger_male.jpg',
  '♀': '/images/avatar_passenger_female.jpg',

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
  '👓': '/images/person_commuter.jpg',
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

  // Remaining UI & Environment Symbols
  '☀': '/images/lifestyle_cafe.jpg',
  '🌱': '/images/lifestyle_cafe.jpg',
  '🪴': '/images/lifestyle_cafe.jpg',
  '🌍': '/images/app_logo.jpg',
  '🌐': '/images/app_logo.jpg',
  '🏔': '/images/cyber_arena.jpg',
  '🏜': '/images/cyber_arena.jpg',
  '💬': '/images/shop_comm_intercom.jpg',
  '💤': '/images/elderly_spirit.jpg',
  '💧': '/images/elderly_spirit.jpg',
  '🔴': '/images/app_logo.jpg',
  '🔵': '/images/app_logo.jpg',
  '🟡': '/images/app_logo.jpg',
  '🟢': '/images/app_logo.jpg',
  '🔸': '/images/app_logo.jpg',
  '🔹': '/images/app_logo.jpg',
  '🔲': '/images/armor_circuit.jpg',
  '➕': '/images/app_logo.jpg',
  '➔': '/images/transit_train.jpg',
  '➡': '/images/transit_train.jpg',
  '✕': '/images/app_logo.jpg',
  '📢': '/images/shop_comm_intercom.jpg',
  '🗡': '/images/cyber_armor.jpg',
  '🖼': '/images/lifestyle_cafe.jpg',
  '🛋': '/images/lifestyle_cafe.jpg',
  '🤫': '/images/pillar_mubuddy.jpg',
  '💆': '/images/elderly_spirit.jpg',
  '👟': '/images/shop_armor_kneeguards.jpg',
  '⛽': '/images/cyber_vehicle.jpg',
  '⚠': '/images/ambulance_vehicle.jpg',
  '⚖': '/images/app_logo.jpg',
  '⚓': '/images/transit_train.jpg',
  '🔄': '/images/transit_train.jpg',
  '📅': '/images/transit_train.jpg',
  '🇧🇩': '/images/transit_train.jpg',
  '🇪🇬': '/images/transit_train.jpg',
  '🇭🇮': '/images/transit_train.jpg',
  '🇹': '/images/transit_train.jpg',
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

/**
 * Returns matching vehicle image for 3 dream ride categories:
 * - standard: รถทั่วไป Standard (Wave, PCX, Grand Filano, etc.)
 * - sport: รถสายสปอร์ต Sport (Ducati Panigale, BMW S1000RR, etc.)
 * - classic: รถสายคลาสสิค Classic (Harley-Davidson, Fat Boy, etc.)
 */
export function getDreamRideImage(categoryOrVehicle?: any): string {
  if (!categoryOrVehicle) return '/images/cyber_vehicle.jpg';
  if (typeof categoryOrVehicle === 'object') {
    if (categoryOrVehicle.imageUrl) return categoryOrVehicle.imageUrl;
    const cat = categoryOrVehicle.category;
    if (cat === 'standard') return '/images/ride_standard.jpg';
    if (cat === 'sport') return '/images/ride_sport.jpg';
    if (cat === 'classic') return '/images/ride_classic.jpg';
  } else if (typeof categoryOrVehicle === 'string') {
    const c = categoryOrVehicle.toLowerCase().trim();
    if (c === 'standard' || c.includes('standard') || c.includes('ทั่วไป')) return '/images/ride_standard.jpg';
    if (c === 'sport' || c.includes('sport') || c.includes('สปอร์ต') || c.includes('ซูเปอร์')) return '/images/ride_sport.jpg';
    if (c === 'classic' || c.includes('classic') || c.includes('คลาสสิค') || c.includes('ครุยเซอร์')) return '/images/ride_classic.jpg';
    if (c === 'all' || c.includes('all') || c.includes('ทั้งหมด')) return '/images/cyber_vehicle.jpg';
  }
  return '/images/ride_standard.jpg';
}

/**
 * Dedicated Dream Ride Vehicle Image Component replacing all emojis
 */
export const DreamRideVehicleImage: React.FC<{
  vehicle?: any;
  category?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  glowColor?: string;
  rounded?: string;
}> = ({
  vehicle,
  category,
  size = 'md',
  className = '',
  glowColor,
  rounded = 'rounded-2xl',
}) => {
  const resolvedCategory = category || vehicle?.category || 'standard';
  const resolvedSrc = vehicle?.imageUrl || getDreamRideImage(vehicle || resolvedCategory);
  const sizeClass = typeof size === 'string' ? (SIZE_MAP[size] || 'w-12 h-12') : '';
  const customDim = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : {};

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/20 shadow-lg bg-black/60 ${sizeClass} ${rounded} ${className}`}
      style={{
        ...customDim,
        boxShadow: glowColor ? `0 0 15px ${glowColor}` : undefined,
      }}
    >
      <img
        src={resolvedSrc}
        alt={vehicle?.thaiName || vehicle?.name || 'Dream Ride'}
        className="w-full h-full object-cover select-none pointer-events-none transition-transform hover:scale-110 duration-300"
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = '/images/cyber_vehicle.jpg';
        }}
      />
    </div>
  );
};

/**
 * Dedicated Person Image Component replacing all person emojis
 */
export const CyberPersonAvatar: React.FC<{
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  className?: string;
  glowColor?: string;
  rounded?: string;
  src?: string;
}> = ({
  size = 'md',
  className = '',
  glowColor = '#00D2FF',
  rounded = 'rounded-full',
  src = '/images/person_commuter.jpg',
}) => {
  const sizeClass = typeof size === 'string' ? (SIZE_MAP[size] || 'w-10 h-10') : '';
  const customDim = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : {};

  return (
    <div
      className={`relative inline-flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-cyan-400/50 bg-black/60 shadow-md ${sizeClass} ${rounded} ${className}`}
      style={{
        ...customDim,
        boxShadow: `0 0 10px ${glowColor}40`,
      }}
    >
      <img
        src={src}
        alt="Person User"
        className="w-full h-full object-cover select-none pointer-events-none"
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    </div>
  );
};

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
