/**
 * WINRIDER.AI — Central Image Registry
 *
 * All production images that live under /public/images are declared here.
 * Public assets are served by Vite from the root path, so registry values
 * intentionally use /images/... URLs.
 *
 * Keep UI components from inventing image paths. Add/replace assets here
 * when the real file exists in public/images.
 */

export type WinImageKey =
  | 'appLogo'
  | 'pillars'
  | 'armor'
  | 'vehicles'
  | 'emergency'
  | 'faith'
  | 'family'
  | 'petCare'
  | 'lifestyle'
  | 'market'
  | 'profiles'
  | 'shop'
  | 'transit'
  | 'cyber';

export const WIN_IMAGES = {
  appLogo: '/images/app_logo.jpg',

  pillars: {
    knight: '/images/pillar_knight.jpg',
    express: '/images/pillar_express.jpg',
    petcare: '/images/pillar_petcare.jpg',
    mubuddy: '/images/pillar_mubuddy.jpg',
    lifestyle: '/images/pillar_lifestyle.jpg',
    spirit: '/images/pillar_spirit.jpg',
    family: '/images/pillar_family.jpg',
    link: '/images/pillar_link.jpg',
  },

  armor: {
    standard: '/images/armor_standard.jpg',
    circuit: '/images/armor_circuit.jpg',
    lightning: '/images/armor_lightning.jpg',
    goldentree: '/images/armor_goldentree.jpg',
    cyber: '/images/cyber_armor.jpg',
  },

  vehicles: {
    standard: '/images/ride_standard.jpg',
    sport: '/images/ride_sport.jpg',
    classic: '/images/ride_classic.jpg',
    adventure: '/images/garage_adventure.jpg',
    wave: '/images/garage_wave.jpg',
    ev: '/images/garage_ev.jpg',
    pcx: '/images/garage_pcx.jpg',
    cyber: '/images/cyber_vehicle.jpg',
    ambulance: '/images/ambulance_vehicle.jpg',
  },

  emergency: {
    hospital: '/images/hospital_clinic.jpg',
    ambulance: '/images/ambulance_vehicle.jpg',
  },

  faith: {
    header: '/images/religious-faith-header.svg',
    religion: '/images/faith_religion.jpg',
    muBuddy: '/images/mu_buddy.jpg',
  },

  family: {
    service: '/images/family_school.jpg',
  },

  petCare: {
    service: '/images/pet_care.jpg',
  },

  lifestyle: {
    cafe: '/images/lifestyle_cafe.jpg',
  },

  market: {
    food: '/images/street_market_food.jpg',
    cookie: '/images/cookie_box.jpg',
  },

  profiles: {
    citizen: '/images/avatar_citizen.jpg',
    passengerFemale: '/images/avatar_passenger_female.jpg',
    passengerMale: '/images/avatar_passenger_male.jpg',
    knight: '/images/avatar_knight.jpg',
    driverFemale: '/images/avatar_driver_female.jpg',
    driverMale: '/images/avatar_driver_male.jpg',
    merchant: '/images/avatar_merchant.jpg',
    partner: '/images/avatar_partner.jpg',
    commuter: '/images/person_commuter.jpg',
  },

  shop: {
    armorKneeguards: '/images/shop_armor_kneeguards.jpg',
    commIntercom: '/images/shop_comm_intercom.jpg',
    cyberUmbrella: '/images/shop_cyber_umbrella.jpg',
    glovesCarbon: '/images/shop_gloves_carbon.jpg',
    petPod: '/images/shop_pet_pod.jpg',
    phoneMount: '/images/shop_phone_mount.jpg',
    spinalHarness: '/images/shop_spinal_harness.jpg',
    stormJacket: '/images/shop_storm_jacket.jpg',
    thermalBox: '/images/shop_thermal_box.jpg',
  },

  transit: {
    train: '/images/transit_train.jpg',
  },

  cyber: {
    arena: '/images/cyber_arena.jpg',
    food: '/images/cyber_food.jpg',
    coins: '/images/cyber_coins.jpg',
    voiceHeader: '/images/voice-command-header.svg',
    voice: '/images/voice_command.jpg',
    expressParcel: '/images/express_parcel.jpg',
  },
} as const;

export type WinImagePath =
  | typeof WIN_IMAGES.appLogo
  | (typeof WIN_IMAGES.pillars)[keyof typeof WIN_IMAGES.pillars]
  | (typeof WIN_IMAGES.armor)[keyof typeof WIN_IMAGES.armor]
  | (typeof WIN_IMAGES.vehicles)[keyof typeof WIN_IMAGES.vehicles]
  | (typeof WIN_IMAGES.emergency)[keyof typeof WIN_IMAGES.emergency]
  | (typeof WIN_IMAGES.faith)[keyof typeof WIN_IMAGES.faith]
  | (typeof WIN_IMAGES.family)[keyof typeof WIN_IMAGES.family]
  | (typeof WIN_IMAGES.petCare)[keyof typeof WIN_IMAGES.petCare]
  | (typeof WIN_IMAGES.lifestyle)[keyof typeof WIN_IMAGES.lifestyle]
  | (typeof WIN_IMAGES.market)[keyof typeof WIN_IMAGES.market]
  | (typeof WIN_IMAGES.profiles)[keyof typeof WIN_IMAGES.profiles]
  | (typeof WIN_IMAGES.shop)[keyof typeof WIN_IMAGES.shop]
  | (typeof WIN_IMAGES.transit)[keyof typeof WIN_IMAGES.transit]
  | (typeof WIN_IMAGES.cyber)[keyof typeof WIN_IMAGES.cyber];

export const getWinImage = (path?: string | null): string => {
  if (!path) return WIN_IMAGES.appLogo;
  return path;
};
