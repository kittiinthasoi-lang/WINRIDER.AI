import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import type { ProfileCustomizationData } from '../components/ProfileCustomizerModal';

export type ProfileRole = 'customer' | 'driver' | 'merchant' | 'partner';

const roleCollection: Record<ProfileRole, string> = {
  customer: 'citizens',
  driver: 'knights',
  merchant: 'merchants',
  partner: 'partners',
};

export async function saveProfileCustomization(role: ProfileRole, profile: ProfileCustomizationData): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนบันทึกโปรไฟล์');

  const cleanProfile = {
    displayName: profile.displayName.trim(),
    bioStatus: profile.bioStatus.trim(),
    themeColor: profile.themeColor,
    bannerGlow: profile.bannerGlow,
    avatarUrl: profile.avatarUrl || '',
    avatarEmoji: profile.avatarEmoji || '',
    locationEnabled: profile.locationEnabled === true,
    ...(profile.locationEnabled === true && Number.isFinite(profile.latitude) && Number.isFinite(profile.longitude)
      ? { latitude: Number(profile.latitude), longitude: Number(profile.longitude), locationLabel: profile.locationLabel || 'ตำแหน่งปัจจุบัน' }
      : { latitude: null, longitude: null, locationLabel: '' }),
    updatedAt: serverTimestamp(),
  };

  // เก็บสำเนาหลักไว้ที่ users/{uid} เพื่อ AuthContext โหลดกลับทันทีหลังเข้าสู่ระบบ
  const userUpdate: Record<string, unknown> = {
    profileCustomization: cleanProfile,
    updatedAt: serverTimestamp(),
  };
  if (role === 'customer' || role === 'driver') {
    userUpdate.displayName = cleanProfile.displayName;
    userUpdate.avatarUrl = cleanProfile.avatarUrl;
    userUpdate.avatarEmoji = cleanProfile.avatarEmoji;
    userUpdate.bioStatus = cleanProfile.bioStatus;
    userUpdate.themeColor = cleanProfile.themeColor;
  }

  await Promise.all([
    setDoc(doc(db, 'users', user.uid), userUpdate, { merge: true }),
    setDoc(doc(db, roleCollection[role], user.uid), { profileCustomization: cleanProfile, updatedAt: serverTimestamp() }, { merge: true }),
  ]);
}

export async function loadProfileCustomization(role: ProfileRole): Promise<ProfileCustomizationData | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const roleSnapshot = await getDoc(doc(db, roleCollection[role], user.uid));
  const roleProfile = roleSnapshot.data()?.profileCustomization as ProfileCustomizationData | undefined;
  if (roleProfile?.displayName) return roleProfile;

  const userSnapshot = await getDoc(doc(db, 'users', user.uid));
  const userProfile = userSnapshot.data()?.profileCustomization as ProfileCustomizationData | undefined;
  return userProfile?.displayName ? userProfile : null;
}
