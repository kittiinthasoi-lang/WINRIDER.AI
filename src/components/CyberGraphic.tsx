import React from 'react';
import { WIN_IMAGES } from '../data/imageRegistry';

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
  '🏍': WIN_IMAGES.vehicles.adventure,
  '🏍️': WIN_IMAGES.vehicles.adventure,
  '🛵': WIN_IMAGES.vehicles.wave,
  '🚲': WIN_IMAGES.vehicles.ev,
  '🚗': WIN_IMAGES.vehicles.classic,
  '🏎': WIN_IMAGES.vehicles.sport,
  '🏎️': WIN_IMAGES.vehicles.sport,
  '🚘': WIN_IMAGES.vehicles.classic,
  '🚙': WIN_IMAGES.vehicles.adventure,
  '🛺': WIN_IMAGES.vehicles.pcx,
  '🚌': WIN_IMAGES.transit.train,
  '🚝': WIN_IMAGES.transit.train,
  '🚆': WIN_IMAGES.transit.train,
  '🚇': WIN_IMAGES.transit.train,
  '🚊': WIN_IMAGES.transit.train,
  '🚉': WIN_IMAGES.transit.train,
  '🚂': WIN_IMAGES.transit.train,
  '✈': WIN_IMAGES.transit.train,
  '✈️': WIN_IMAGES.transit.train,
  '🛫': WIN_IMAGES.transit.train,
  '🚢': WIN_IMAGES.transit.train,
  '🚤': WIN_IMAGES.transit.train,
  '🛸': WIN_IMAGES.vehicles.cyber,
  '🚁': WIN_IMAGES.vehicles.cyber,
  '🚀': WIN_IMAGES.vehicles.cyber,
  '🛣': WIN_IMAGES.vehicles.cyber,
  '🛣️': WIN_IMAGES.vehicles.cyber,
  '🚏': WIN_IMAGES.transit.train,
  '🚐': WIN_IMAGES.transit.train,

  // Delivery, Parcels, Tools & Tech
  '📦': WIN_IMAGES.cyber.expressParcel,
  '🚚': WIN_IMAGES.cyber.expressParcel,
  '⚡': WIN_IMAGES.cyber.expressParcel,
  '📬': WIN_IMAGES.cyber.expressParcel,
  '📮': WIN_IMAGES.cyber.expressParcel,
  '📱': WIN_IMAGES.cyber.expressParcel,
  '💻': WIN_IMAGES.cyber.expressParcel,
  '🔌': WIN_IMAGES.cyber.expressParcel,
  '🔋': WIN_IMAGES.cyber.expressParcel,
  '⚙': WIN_IMAGES.cyber.expressParcel,
  '⚙️': WIN_IMAGES.cyber.expressParcel,
  '🔧': WIN_IMAGES.cyber.expressParcel,
  '🛠': WIN_IMAGES.cyber.expressParcel,
  '🛠️': WIN_IMAGES.cyber.expressParcel,
  '🧰': WIN_IMAGES.cyber.expressParcel,
  '📡': WIN_IMAGES.cyber.expressParcel,
  '📹': WIN_IMAGES.cyber.expressParcel,
  '📷': WIN_IMAGES.cyber.expressParcel,
  '📸': WIN_IMAGES.cyber.expressParcel,
  '🎙': WIN_IMAGES.cyber.expressParcel,
  '🎙️': WIN_IMAGES.cyber.expressParcel,
  '🎛': WIN_IMAGES.cyber.expressParcel,
  '🎛️': WIN_IMAGES.cyber.expressParcel,
  '🔊': WIN_IMAGES.cyber.expressParcel,
  '🎧': WIN_IMAGES.cyber.expressParcel,
  '💡': WIN_IMAGES.cyber.expressParcel,
  '📄': WIN_IMAGES.cyber.expressParcel,
  '📝': WIN_IMAGES.cyber.expressParcel,
  '📜': WIN_IMAGES.cyber.expressParcel,
  '📒': WIN_IMAGES.cyber.expressParcel,
  '🧾': WIN_IMAGES.cyber.expressParcel,
  '✏': WIN_IMAGES.cyber.expressParcel,
  '✏️': WIN_IMAGES.cyber.expressParcel,
  '📏': WIN_IMAGES.cyber.expressParcel,
  '⏱': WIN_IMAGES.cyber.expressParcel,
  '⏱️': WIN_IMAGES.cyber.expressParcel,
  '⏰': WIN_IMAGES.cyber.expressParcel,
  '🕒': WIN_IMAGES.cyber.expressParcel,
  '⌚': WIN_IMAGES.armor.cyber,
  '🔍': WIN_IMAGES.appLogo,

  // Pets & Animals
  '🐶': WIN_IMAGES.petCare.service,
  '🐱': WIN_IMAGES.petCare.service,
  '🐾': WIN_IMAGES.petCare.service,
  '🐕': WIN_IMAGES.petCare.service,
  '🐩': WIN_IMAGES.petCare.service,
  '🐈': WIN_IMAGES.petCare.service,
  '🐰': WIN_IMAGES.petCare.service,
  '🦅': WIN_IMAGES.petCare.service,
  '🦁': WIN_IMAGES.appLogo,
  '🐅': WIN_IMAGES.petCare.service,
  '🦀': WIN_IMAGES.petCare.service,
  '🦐': WIN_IMAGES.petCare.service,
  '🐟': WIN_IMAGES.petCare.service,
  '🦮': WIN_IMAGES.petCare.service,
  '🦥': WIN_IMAGES.profiles.commuter,
  '🦈': WIN_IMAGES.petCare.service,
  '🐘': WIN_IMAGES.petCare.service,
  '🐝': WIN_IMAGES.petCare.service,
  '🦴': WIN_IMAGES.petCare.service,

  // Faith, Sacred, Temple & Mu
  '⛩': WIN_IMAGES.faith.muBuddy,
  '⛩️': WIN_IMAGES.faith.muBuddy,
  '🪔': WIN_IMAGES.faith.muBuddy,
  '🔮': WIN_IMAGES.faith.muBuddy,
  '🕉': WIN_IMAGES.faith.muBuddy,
  '🕉️': WIN_IMAGES.faith.muBuddy,
  '🙏': WIN_IMAGES.faith.muBuddy,
  '✨': WIN_IMAGES.faith.muBuddy,
  '🌸': WIN_IMAGES.faith.muBuddy,
  '🪷': WIN_IMAGES.faith.muBuddy,
  '🕌': WIN_IMAGES.faith.muBuddy,
  '⛪': WIN_IMAGES.faith.muBuddy,
  '☬': WIN_IMAGES.faith.muBuddy,
  '🏮': WIN_IMAGES.faith.muBuddy,
  '🕯': WIN_IMAGES.faith.muBuddy,
  '🕯️': WIN_IMAGES.faith.muBuddy,
  '🎆': WIN_IMAGES.faith.muBuddy,
  '🌌': WIN_IMAGES.faith.muBuddy,
  '🌟': WIN_IMAGES.faith.muBuddy,
  '📿': WIN_IMAGES.faith.muBuddy,
  '🛕': WIN_IMAGES.faith.muBuddy,
  '🧘': WIN_IMAGES.faith.muBuddy,
  '👹': WIN_IMAGES.faith.muBuddy,
  '👻': WIN_IMAGES.faith.muBuddy,

  // Drinks, Cafe & Lifestyle
  '☕': WIN_IMAGES.lifestyle.cafe,
  '🍵': WIN_IMAGES.lifestyle.cafe,
  '🍹': WIN_IMAGES.lifestyle.cafe,
  '🍺': WIN_IMAGES.lifestyle.cafe,
  '🍻': WIN_IMAGES.lifestyle.cafe,
  '🥂': WIN_IMAGES.lifestyle.cafe,
  '🍷': WIN_IMAGES.lifestyle.cafe,
  '🍸': WIN_IMAGES.lifestyle.cafe,
  '🥤': WIN_IMAGES.lifestyle.cafe,
  '🧊': WIN_IMAGES.lifestyle.cafe,
  '🌿': WIN_IMAGES.lifestyle.cafe,
  '🌅': WIN_IMAGES.lifestyle.cafe,
  '🌃': WIN_IMAGES.lifestyle.cafe,

  // Food, Street Market & Dishes
  '🍜': WIN_IMAGES.market.food,
  '🍲': WIN_IMAGES.market.food,
  '🌶': WIN_IMAGES.market.food,
  '🌶️': WIN_IMAGES.market.food,
  '🍪': WIN_IMAGES.market.cookie,
  '🥐': WIN_IMAGES.market.cookie,
  '🍔': WIN_IMAGES.market.food,
  '🍕': WIN_IMAGES.market.food,
  '🥗': WIN_IMAGES.market.food,
  '🍱': WIN_IMAGES.market.food,
  '🍛': WIN_IMAGES.market.food,
  '🥩': WIN_IMAGES.market.food,
  '🍗': WIN_IMAGES.market.food,
  '🍊': WIN_IMAGES.cyber.food,
  '🍽': WIN_IMAGES.market.food,
  '🍽️': WIN_IMAGES.market.food,
  '🥢': WIN_IMAGES.market.food,
  '🍫': WIN_IMAGES.market.cookie,
  '🥭': WIN_IMAGES.cyber.food,
  '🍎': WIN_IMAGES.cyber.food,
  '🧁': WIN_IMAGES.market.cookie,
  '🥟': WIN_IMAGES.market.food,
  '🥬': WIN_IMAGES.market.food,
  '🍞': WIN_IMAGES.market.cookie,
  '🍯': WIN_IMAGES.market.cookie,
  '🍳': WIN_IMAGES.market.food,
  '🥚': WIN_IMAGES.market.food,
  '🍰': WIN_IMAGES.market.cookie,

  // Spirit, Elderly, Medical & Hospitals
  '👵': WIN_IMAGES.faith.elderSupport,
  '🧓': WIN_IMAGES.faith.elderSupport,
  '🤲': WIN_IMAGES.faith.elderSupport,
  '🩺': WIN_IMAGES.emergency.hospital,
  '🏥': WIN_IMAGES.emergency.hospital,
  '💊': WIN_IMAGES.emergency.hospital,
  '🚑': WIN_IMAGES.emergency.ambulance,
  '❤': WIN_IMAGES.faith.elderSupport,
  '❤️': WIN_IMAGES.faith.elderSupport,
  '💖': WIN_IMAGES.faith.elderSupport,
  '💙': WIN_IMAGES.faith.elderSupport,
  '🩸': WIN_IMAGES.emergency.hospital,
  '💉': WIN_IMAGES.emergency.hospital,
  '🔬': WIN_IMAGES.emergency.hospital,
  '🚨': WIN_IMAGES.emergency.ambulance,
  '🚒': WIN_IMAGES.vehicles.cyber,
  '📞': WIN_IMAGES.faith.elderSupport,
  '😷': WIN_IMAGES.emergency.hospital,
  '♿': WIN_IMAGES.faith.elderSupport,
  '⚕': WIN_IMAGES.emergency.hospital,
  '⚕️': WIN_IMAGES.emergency.hospital,

  // Family, Citizens & People (Mapped to realistic person photography by gender)
  '👨‍👩‍👧': WIN_IMAGES.family.service,
  '🎒': WIN_IMAGES.family.service,
  '🏫': WIN_IMAGES.family.service,
  '🤝': WIN_IMAGES.family.service,
  '👶': WIN_IMAGES.profiles.passengerMale,
  '🧑‍🤝‍🧑': WIN_IMAGES.family.service,
  '👧': WIN_IMAGES.profiles.passengerFemale,
  '👦': WIN_IMAGES.profiles.passengerMale,
  '👨': WIN_IMAGES.profiles.passengerMale,
  '👩': WIN_IMAGES.profiles.passengerFemale,
  '👨‍🦰': WIN_IMAGES.profiles.driverMale,
  '👩‍🦰': WIN_IMAGES.profiles.driverFemale,
  '👨‍🦳': WIN_IMAGES.faith.elderSupport,
  '👩‍🦳': WIN_IMAGES.faith.elderSupport,
  '👨‍⚕️': WIN_IMAGES.profiles.driverMale,
  '👩‍⚕️': WIN_IMAGES.profiles.driverFemale,
  '👨‍🍳': WIN_IMAGES.profiles.merchant,
  '👩‍🍳': WIN_IMAGES.profiles.merchant,
  '👨‍🏫': WIN_IMAGES.family.service,
  '👩‍🏫': WIN_IMAGES.family.service,
  '👨‍🏭': WIN_IMAGES.profiles.driverMale,
  '👩‍🏭': WIN_IMAGES.profiles.driverFemale,
  '👨‍💼': WIN_IMAGES.profiles.partner,
  '👩‍💼': WIN_IMAGES.profiles.driverFemale,
  '👨‍🔧': WIN_IMAGES.profiles.driverMale,
  '👩‍🔧': WIN_IMAGES.profiles.driverFemale,
  '👨‍🔬': WIN_IMAGES.emergency.hospital,
  '👩‍🔬': WIN_IMAGES.emergency.hospital,
  '👨‍🎤': WIN_IMAGES.profiles.driverMale,
  '👩‍🎤': WIN_IMAGES.profiles.driverFemale,
  '🧔': WIN_IMAGES.profiles.driverMale,
  '🧔‍♂️': WIN_IMAGES.profiles.driverMale,
  '🧔‍♀️': WIN_IMAGES.profiles.driverFemale,
  '🤠': WIN_IMAGES.profiles.driverMale,
  '🧕': WIN_IMAGES.profiles.driverFemale,
  '👮': WIN_IMAGES.profiles.driverMale,
  '👮‍♂️': WIN_IMAGES.profiles.driverMale,
  '👮‍♀️': WIN_IMAGES.profiles.driverFemale,
  '🤴': WIN_IMAGES.profiles.driverMale,
  '👸': WIN_IMAGES.profiles.driverFemale,
  '🧙‍♂️': WIN_IMAGES.pillars.mubuddy,
  '🧙‍♀️': WIN_IMAGES.pillars.mubuddy,
  '🧘‍♂️': WIN_IMAGES.profiles.driverMale,
  '🧘‍♀️': WIN_IMAGES.profiles.driverFemale,
  '🎩': WIN_IMAGES.profiles.driverMale,
  '🧑': WIN_IMAGES.profiles.citizen,
  '👤': WIN_IMAGES.profiles.citizen,
  '👥': WIN_IMAGES.family.service,
  '🦰': WIN_IMAGES.profiles.passengerFemale,
  '👴': WIN_IMAGES.faith.elderSupport,
  '🎓': WIN_IMAGES.family.service,
  '🥋': WIN_IMAGES.armor.cyber,
  '🙋': WIN_IMAGES.profiles.passengerFemale,
  '💁': WIN_IMAGES.profiles.passengerFemale,
  '🧍': WIN_IMAGES.profiles.citizen,
  '🚶': WIN_IMAGES.profiles.citizen,
  '🏃': WIN_IMAGES.profiles.citizen,
  '🧑‍💼': WIN_IMAGES.profiles.partner,
  '🧑‍🔧': WIN_IMAGES.profiles.knight,
  '🧑‍🍳': WIN_IMAGES.profiles.merchant,
  '♂': WIN_IMAGES.profiles.passengerMale,
  '♀': WIN_IMAGES.profiles.passengerFemale,

  // Money, Baht, Economy
  '💰': WIN_IMAGES.cyber.coins,
  '🪙': WIN_IMAGES.cyber.coins,
  '💵': WIN_IMAGES.cyber.coins,
  '💳': WIN_IMAGES.cyber.coins,
  '🏦': WIN_IMAGES.cyber.coins,
  '💎': WIN_IMAGES.cyber.coins,
  '💸': WIN_IMAGES.cyber.coins,
  '💍': WIN_IMAGES.cyber.coins,
  '📈': WIN_IMAGES.cyber.coins,
  '📉': WIN_IMAGES.cyber.coins,

  // Sports, Arenas, Tickets, Music
  '🏟': WIN_IMAGES.cyber.arena,
  '🏟️': WIN_IMAGES.cyber.arena,
  '⚽': WIN_IMAGES.cyber.arena,
  '🥊': WIN_IMAGES.cyber.arena,
  '🏛': WIN_IMAGES.cyber.arena,
  '🏛️': WIN_IMAGES.cyber.arena,
  '🎡': WIN_IMAGES.cyber.arena,
  '🏙': WIN_IMAGES.cyber.arena,
  '🏙️': WIN_IMAGES.cyber.arena,
  '📍': WIN_IMAGES.cyber.arena,
  '🗺': WIN_IMAGES.cyber.arena,
  '🗺️': WIN_IMAGES.cyber.arena,
  '📚': WIN_IMAGES.cyber.arena,
  '🎤': WIN_IMAGES.transit.train,
  '🎵': WIN_IMAGES.transit.train,
  '🎶': WIN_IMAGES.transit.train,
  '🎸': WIN_IMAGES.transit.train,
  '🎟': WIN_IMAGES.transit.train,
  '🎟️': WIN_IMAGES.transit.train,
  '🎫': WIN_IMAGES.transit.train,
  '🎪': WIN_IMAGES.cyber.arena,
  '🎨': WIN_IMAGES.cyber.arena,
  '🎭': WIN_IMAGES.cyber.arena,
  '🎬': WIN_IMAGES.cyber.arena,
  '🎮': WIN_IMAGES.cyber.arena,
  '🎯': WIN_IMAGES.cyber.arena,
  '🎲': WIN_IMAGES.cyber.arena,
  '🏆': WIN_IMAGES.appLogo,
  '🎖': WIN_IMAGES.armor.cyber,
  '🎖️': WIN_IMAGES.armor.cyber,
  '🥇': WIN_IMAGES.armor.cyber,
  '🥈': WIN_IMAGES.armor.cyber,
  '🥉': WIN_IMAGES.armor.cyber,

  // Armor, Weapons, Badges & Protection
  '🛡': WIN_IMAGES.armor.cyber,
  '🛡️': WIN_IMAGES.armor.cyber,
  '⚔': WIN_IMAGES.armor.cyber,
  '⚔️': WIN_IMAGES.armor.cyber,
  '🪖': WIN_IMAGES.armor.cyber,
  '🧥': WIN_IMAGES.shop.stormJacket,
  '🧤': WIN_IMAGES.shop.glovesCarbon,
  '🦾': WIN_IMAGES.shop.spinalHarness,
  '🔒': WIN_IMAGES.armor.cyber,
  '🌧': WIN_IMAGES.armor.cyber,
  '🌧️': WIN_IMAGES.armor.cyber,
  '⛈': WIN_IMAGES.armor.cyber,
  '⛈️': WIN_IMAGES.armor.cyber,
  '💨': WIN_IMAGES.armor.cyber,
  '🌪': WIN_IMAGES.armor.cyber,
  '🌪️': WIN_IMAGES.armor.cyber,
  '🌊': WIN_IMAGES.armor.cyber,
  '🚩': WIN_IMAGES.armor.cyber,
  '🏁': WIN_IMAGES.armor.cyber,
  '🚦': WIN_IMAGES.armor.cyber,
  '📌': WIN_IMAGES.armor.cyber,
  '💺': WIN_IMAGES.armor.cyber,
  '☂': WIN_IMAGES.armor.cyber,
  '☂️': WIN_IMAGES.armor.cyber,
  '👢': WIN_IMAGES.armor.cyber,
  '👕': WIN_IMAGES.armor.cyber,
  '👗': WIN_IMAGES.armor.cyber,
  '👘': WIN_IMAGES.armor.cyber,
  '👜': WIN_IMAGES.profiles.merchant,
  '🧣': WIN_IMAGES.armor.cyber,
  '🕶': WIN_IMAGES.armor.cyber,
  '🕶️': WIN_IMAGES.armor.cyber,
  '👓': WIN_IMAGES.profiles.commuter,
  '🧪': WIN_IMAGES.armor.cyber,
  '🧳': WIN_IMAGES.cyber.expressParcel,
  '🧴': WIN_IMAGES.lifestyle.cafe,
  '🧶': WIN_IMAGES.cyber.food,
  '🤖': WIN_IMAGES.appLogo,
  '⭐': WIN_IMAGES.appLogo,
  '★': WIN_IMAGES.appLogo,
  '✦': WIN_IMAGES.appLogo,

  // Merchants & Venues
  '🏪': WIN_IMAGES.profiles.merchant,
  '🏬': WIN_IMAGES.profiles.merchant,
  '🛍': WIN_IMAGES.profiles.merchant,
  '🛍️': WIN_IMAGES.profiles.merchant,
  '🛒': WIN_IMAGES.profiles.merchant,
  '🏢': WIN_IMAGES.profiles.partner,
  '🏨': WIN_IMAGES.profiles.partner,
  '🏰': WIN_IMAGES.profiles.partner,
  '💼': WIN_IMAGES.profiles.partner,
  '🏡': WIN_IMAGES.profiles.partner,
  '🚪': WIN_IMAGES.profiles.partner,

  // Empire & Royalty
  '👑': WIN_IMAGES.appLogo,
  '🎉': WIN_IMAGES.appLogo,
  '🎁': WIN_IMAGES.appLogo,
  '✅': WIN_IMAGES.appLogo,
  '✓': WIN_IMAGES.appLogo,
  '🔔': WIN_IMAGES.appLogo,

  // Remaining UI & Environment Symbols
  '☀': WIN_IMAGES.lifestyle.cafe,
  '🌱': WIN_IMAGES.lifestyle.cafe,
  '🪴': WIN_IMAGES.lifestyle.cafe,
  '🌍': WIN_IMAGES.appLogo,
  '🌐': WIN_IMAGES.appLogo,
  '🏔': WIN_IMAGES.cyber.arena,
  '🏜': WIN_IMAGES.cyber.arena,
  '💬': WIN_IMAGES.shop.commIntercom,
  '💤': WIN_IMAGES.faith.elderSupport,
  '💧': WIN_IMAGES.faith.elderSupport,
  '🔴': WIN_IMAGES.appLogo,
  '🔵': WIN_IMAGES.appLogo,
  '🟡': WIN_IMAGES.appLogo,
  '🟢': WIN_IMAGES.appLogo,
  '🔸': WIN_IMAGES.appLogo,
  '🔹': WIN_IMAGES.appLogo,
  '🔲': WIN_IMAGES.armor.circuit,
  '➕': WIN_IMAGES.appLogo,
  '➔': WIN_IMAGES.transit.train,
  '➡': WIN_IMAGES.transit.train,
  '✕': WIN_IMAGES.appLogo,
  '📢': WIN_IMAGES.shop.commIntercom,
  '🗡': WIN_IMAGES.armor.cyber,
  '🖼': WIN_IMAGES.lifestyle.cafe,
  '🛋': WIN_IMAGES.lifestyle.cafe,
  '🤫': WIN_IMAGES.pillars.mubuddy,
  '💆': WIN_IMAGES.faith.elderSupport,
  '👟': WIN_IMAGES.shop.armorKneeguards,
  '⛽': WIN_IMAGES.vehicles.cyber,
  '⚠': WIN_IMAGES.emergency.ambulance,
  '⚖': WIN_IMAGES.appLogo,
  '⚓': WIN_IMAGES.transit.train,
  '🔄': WIN_IMAGES.transit.train,
  '📅': WIN_IMAGES.transit.train,
  '🇧🇩': WIN_IMAGES.transit.train,
  '🇪🇬': WIN_IMAGES.transit.train,
  '🇭🇮': WIN_IMAGES.transit.train,
  '🇹': WIN_IMAGES.transit.train,
};

export function getCyberImageUrl(emojiOrSrc?: string): string {
  if (!emojiOrSrc) return WIN_IMAGES.appLogo;
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

  return WIN_IMAGES.appLogo;
}

/**
 * Returns matching vehicle image for 3 dream ride categories:
 * - standard: รถทั่วไป Standard (Wave, PCX, Grand Filano, etc.)
 * - sport: รถสายสปอร์ต Sport (Ducati Panigale, BMW S1000RR, etc.)
 * - classic: รถสายคลาสสิค Classic (Harley-Davidson, Fat Boy, etc.)
 */
export function getDreamRideImage(categoryOrVehicle?: any): string {
  if (!categoryOrVehicle) return WIN_IMAGES.vehicles.cyber;
  if (typeof categoryOrVehicle === 'object') {
    if (categoryOrVehicle.imageUrl) return categoryOrVehicle.imageUrl;
    const cat = categoryOrVehicle.category;
    if (cat === 'standard') return WIN_IMAGES.vehicles.standard;
    if (cat === 'sport') return WIN_IMAGES.vehicles.sport;
    if (cat === 'classic') return WIN_IMAGES.vehicles.classic;
  } else if (typeof categoryOrVehicle === 'string') {
    const c = categoryOrVehicle.toLowerCase().trim();
    if (c === 'standard' || c.includes('standard') || c.includes('ทั่วไป')) return WIN_IMAGES.vehicles.standard;
    if (c === 'sport' || c.includes('sport') || c.includes('สปอร์ต') || c.includes('ซูเปอร์')) return WIN_IMAGES.vehicles.sport;
    if (c === 'classic' || c.includes('classic') || c.includes('คลาสสิค') || c.includes('ครุยเซอร์')) return WIN_IMAGES.vehicles.classic;
    if (c === 'all' || c.includes('all') || c.includes('ทั้งหมด')) return WIN_IMAGES.vehicles.cyber;
  }
  return WIN_IMAGES.vehicles.standard;
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
          (e.currentTarget as HTMLImageElement).src = WIN_IMAGES.vehicles.cyber;
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
  src = WIN_IMAGES.profiles.commuter,
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
  const resolvedSrc = src || (emoji ? getCyberImageUrl(emoji) : WIN_IMAGES.appLogo);
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
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = WIN_IMAGES.appLogo;
        }}
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
