import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { generatePromptPayQRDataUrl, generateBankAccountQRDataUrl } from '../utils/promptpay';

export type PaymentReceiverType = 'citizen_phone' | 'national_id' | 'merchant_tax_id' | 'e_wallet' | 'bank_account';
export type PaymentProfileStatus = 'pending_review' | 'verified' | 'needs_correction' | 'suspended';

export interface PaymentProfile {
  userId: string;
  role: 'knight' | 'citizen' | 'merchant' | 'partner';
  accountName: string; // ชื่อบัญชี / ชื่อ-นามสกุล / ชื่อร้านค้า
  receiverType: PaymentReceiverType;
  promptPayId: string; // หมายเลขพร้อมเพย์ (10 หลัก เบอร์โทร, 13 หลัก บัตร ปชช / Tax ID, 15 หลัก e-Wallet)
  bankName?: string; // ธนาคาร
  qrCodeDataUrl?: string; // Base64 PromptPay QR สร้างจาก EMVCo จริง
  bankSlipQrUrl?: string | null; // รูปภาพ QR จากแอปธนาคาร
  status: PaymentProfileStatus;
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_STORAGE_KEY_PREFIX = 'winrider_payment_profile_';

/**
 * ดึงข้อมูลช่องทางรับเงินของผู้ใช้
 */
export async function getPaymentProfile(userId: string): Promise<PaymentProfile | null> {
  if (!userId) return null;

  try {
    const docRef = doc(db, 'payment_profiles', userId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as PaymentProfile;
      try {
        localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(data));
      } catch {
        // ignore storage errors
      }
      return data;
    }
  } catch (err) {
    console.warn('Unable to load payment profile from Firestore, checking local cache:', err);
  }

  // Fallback to local cache if offline or unauthenticated
  try {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    if (cached) {
      return JSON.parse(cached) as PaymentProfile;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * บันทึกหรือแก้ไขช่องทางรับเงิน
 * กฎเหล็ก: เมื่อแก้ไขข้อมูล จะถูกเปลี่ยนสถานะเป็น 'pending_review' (รอตรวจสอบ) เสมอ
 * และผู้ใช้ทั่วไปไม่สามารถอนุมัติช่องทางรับเงินของตนเองได้
 */
export async function savePaymentProfile(params: {
  userId: string;
  role: 'knight' | 'citizen' | 'merchant' | 'partner';
  accountName: string;
  receiverType: PaymentReceiverType;
  promptPayId: string;
  bankName?: string;
  bankSlipQrUrl?: string | null;
}): Promise<PaymentProfile> {
  const { userId, role, accountName, receiverType, promptPayId, bankName, bankSlipQrUrl } = params;

  if (!userId) {
    throw new Error('กรุณาระบุรหัสผู้ใช้ (User ID)');
  }
  if (!accountName.trim()) {
    throw new Error('กรุณากรอกชื่อบัญชี / ชื่อผู้รับเงิน');
  }
    const cleanPromptPay = promptPayId.replace(/[^0-9]/g, '');

  if (receiverType === 'bank_account') {
    if (!cleanPromptPay || cleanPromptPay.length < 10 || cleanPromptPay.length > 15) {
      throw new Error('กรุณากรอกเลขบัญชีธนาคารให้ถูกต้อง (10-15 หลัก)');
    }
    if (!bankName?.trim()) {
      throw new Error('กรุณาระบุชื่อธนาคาร');
    }
  } else {
    if (!cleanPromptPay || cleanPromptPay.length < 9) {
      throw new Error('กรุณากรอกหมายเลข PromptPay ให้ถูกต้อง (เบอร์โทร 10 หลัก หรือเลขบัตร/นิติบุคคล 13 หลัก)');
    }
  }

    // สร้าง QR: PromptPay (EMVCo) หรือ ข้อมูลบัญชีธนาคาร แล้วแต่ receiverType
  const realQrDataUrl = receiverType === 'bank_account'
    ? await generateBankAccountQRDataUrl({
        bankName: bankName!.trim(),
        accountNumber: cleanPromptPay,
        accountName: accountName.trim(),
      })
    : await generatePromptPayQRDataUrl(cleanPromptPay);

  const now = new Date().toISOString();
  const existing = await getPaymentProfile(userId);

  const profileData: PaymentProfile = {
    userId,
    role,
    accountName: accountName.trim(),
    receiverType,
    promptPayId: cleanPromptPay,
    bankName: bankName?.trim() || '',
    qrCodeDataUrl: realQrDataUrl,
    bankSlipQrUrl: bankSlipQrUrl !== undefined ? bankSlipQrUrl : (existing?.bankSlipQrUrl || null),
    status: 'pending_review', // กลับไปรอตรวจสอบอัตโนมัติเสมอ!
    reviewNotes: existing?.status === 'needs_correction' ? 'แก้ไขข้อมูลแล้ว รอ Super Admin ตรวจสอบใหม่อีกครั้ง' : '',
    reviewedBy: '',
    reviewedAt: '',
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  try {
    const docRef = doc(db, 'payment_profiles', userId);
    await setDoc(docRef, profileData, { merge: true });
  } catch (err: any) {
    console.warn('Firestore write failed, persisting to local cache:', err);
  }

  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(profileData));
  } catch {
    // ignore
  }

  return profileData;
}

/**
 * สร้าง QR PromptPay จริงตามยอดเงินที่ระบุ (Dynamic Amount)
 */
export async function generateDynamicPromptPayQR(promptPayId: string, amountBaht?: number): Promise<string> {
  const clean = promptPayId.replace(/[^0-9]/g, '');
  if (!clean) throw new Error('ไม่พบหมายเลข PromptPay');
  return await generatePromptPayQRDataUrl(clean, amountBaht && amountBaht > 0 ? amountBaht : undefined);
}

/**
 * อัปโหลดรูปภาพ QR จากแอปธนาคาร
 */
export async function uploadBankQrImage(file: File, userId: string): Promise<string> {
  if (!file) throw new Error('ไม่พบไฟล์ที่เลือก');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WEBP เท่านั้น');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('ขนาดไฟล์ต้องไม่เกิน 5 MB');
  }

  // พยายามอัปโหลดขึ้น Firebase Storage
  try {
    const cleanFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const storageRef = ref(storage, `payment_qr/${userId}/${cleanFileName}`);
    const snapshot = await uploadBytes(storageRef, file, {
      contentType: file.type,
      customMetadata: { userId, uploadedAt: new Date().toISOString() }
    });
    return await getDownloadURL(snapshot.ref);
  } catch (storageErr) {
    console.warn('Storage upload error, using FileReader Base64 fallback:', storageErr);
    // Fallback เป็น Data URL กรณี storage offline หรือไม่อนุญาต
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      reader.readAsDataURL(file);
    });
  }
}

/**
 * ดึงรายการช่องทางรับเงินทั้งหมดสำหรับ Super Admin
 */
export async function getAllPaymentProfiles(): Promise<PaymentProfile[]> {
  try {
    const colRef = collection(db, 'payment_profiles');
    const q = query(colRef, orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    
    return snap.docs.map(d => d.data() as PaymentProfile);
  } catch (err) {
    console.warn('getAllPaymentProfiles Firestore error, fallback:', err);
    // Scan local storage for any profiles cached
    const profiles: PaymentProfile[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCAL_STORAGE_KEY_PREFIX)) {
        try {
          const val = JSON.parse(localStorage.getItem(key) || '{}');
          if (val.userId && val.promptPayId) {
            profiles.push(val);
          }
        } catch {
          // ignore
        }
      }
    }
    return profiles;
  }
}

/**
 * อัปเดตสถานะการอนุมัติ (Super Admin เท่านั้น)
 */
export async function updatePaymentProfileStatus(
  userId: string,
  status: PaymentProfileStatus,
  reviewNotes: string = '',
  reviewerEmail: string = ''
): Promise<void> {
  const currentEmail = reviewerEmail || auth.currentUser?.email || 'kittiinthasoi@gmail.com';
  const now = new Date().toISOString();

  const updates: Partial<PaymentProfile> = {
    status,
    reviewNotes: reviewNotes.trim(),
    reviewedBy: currentEmail,
    reviewedAt: now,
    updatedAt: now
  };

  try {
    const docRef = doc(db, 'payment_profiles', userId);
    await updateDoc(docRef, updates);
  } catch (err) {
    console.warn('Firestore updateDoc failed, fallback to local cache:', err);
  }

  // Update local cache
  try {
    const cached = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      Object.assign(parsed, updates);
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(parsed));
    }
  } catch {
    // ignore
  }
}
