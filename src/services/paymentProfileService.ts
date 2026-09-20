import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import type { UserRole } from '../types/auth';

export type PaymentVerificationStatus = 'not_configured' | 'pending' | 'verified' | 'rejected' | 'suspended';

export interface PaymentReceiverProfile {
  userId: string;
  role: UserRole;
  receiverType: 'individual' | 'business';
  accountName: string;
  promptPayType: 'mobile' | 'national_id' | 'tax_id' | 'e_wallet';
  promptPayId: string;
  promptPayMasked: string;
  qrImageUrl?: string;
  verificationStatus: PaymentVerificationStatus;
  rejectionReason?: string;
  payoutsEnabled: boolean;
  consentAccepted: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
  reviewedAt?: unknown;
  reviewedBy?: string;
}

const digitsOnly = (value: string) => value.replace(/\D/g, '');

export function maskPaymentId(value: string): string {
  const digits = digitsOnly(value);
  if (digits.length <= 4) return '*'.repeat(digits.length);
  return `${digits.slice(0, 2)}${'*'.repeat(Math.max(4, digits.length - 6))}${digits.slice(-4)}`;
}

export function validatePaymentId(type: PaymentReceiverProfile['promptPayType'], value: string): string {
  const digits = digitsOnly(value);
  if (type === 'mobile' && digits.length !== 10) throw new Error('เบอร์ PromptPay ต้องมี 10 หลัก');
  if ((type === 'national_id' || type === 'tax_id') && digits.length !== 13) throw new Error('เลขบัตร/เลขผู้เสียภาษีต้องมี 13 หลัก');
  if (type === 'e_wallet' && (digits.length < 10 || digits.length > 15)) throw new Error('หมายเลข e-Wallet ไม่ถูกต้อง');
  return digits;
}

export async function getMyPaymentProfile(): Promise<PaymentReceiverProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const snapshot = await getDoc(doc(db, 'payment_profiles', user.uid));
  return snapshot.exists() ? snapshot.data() as PaymentReceiverProfile : null;
}

export async function saveMyPaymentProfile(input: Pick<PaymentReceiverProfile,
  'role' | 'receiverType' | 'accountName' | 'promptPayType' | 'promptPayId' | 'consentAccepted'
> & { qrFile?: File | null }): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('กรุณาเข้าสู่ระบบก่อนตั้งค่ารับเงิน');
  if (!input.accountName.trim()) throw new Error('กรุณาระบุชื่อบัญชีผู้รับเงิน');
  if (!input.consentAccepted) throw new Error('กรุณายืนยันว่าบัญชีรับเงินเป็นของคุณหรือองค์กรที่คุณมีอำนาจจัดการ');

  const promptPayId = validatePaymentId(input.promptPayType, input.promptPayId);
  const existing = await getMyPaymentProfile();
  let qrImageUrl = existing?.qrImageUrl || '';
  if (input.qrFile) {
    if (!input.qrFile.type.startsWith('image/')) throw new Error('รองรับเฉพาะไฟล์รูปภาพ QR');
    if (input.qrFile.size > 5 * 1024 * 1024) throw new Error('รูป QR ต้องมีขนาดไม่เกิน 5 MB');
    const extension = input.qrFile.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'png';
    const qrRef = ref(storage, `payment-qr/${user.uid}/receiver-qr.${extension}`);
    await uploadBytes(qrRef, input.qrFile, { contentType: input.qrFile.type });
    qrImageUrl = await getDownloadURL(qrRef);
  }

  await setDoc(doc(db, 'payment_profiles', user.uid), {
    userId: user.uid,
    role: input.role,
    receiverType: input.receiverType,
    accountName: input.accountName.trim(),
    promptPayType: input.promptPayType,
    promptPayId,
    promptPayMasked: maskPaymentId(promptPayId),
    qrImageUrl,
    verificationStatus: 'pending',
    rejectionReason: '',
    payoutsEnabled: false,
    consentAccepted: true,
    createdAt: existing?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function listPaymentProfilesForAdmin(): Promise<PaymentReceiverProfile[]> {
  const snapshot = await getDocs(query(collection(db, 'payment_profiles'), orderBy('updatedAt', 'desc')));
  return snapshot.docs.map((item) => item.data() as PaymentReceiverProfile);
}

export async function reviewPaymentProfile(userId: string, status: 'verified' | 'rejected' | 'suspended', reason = ''): Promise<void> {
  const admin = auth.currentUser;
  if (!admin) throw new Error('กรุณาเข้าสู่ระบบ Super Admin');
  await updateDoc(doc(db, 'payment_profiles', userId), {
    verificationStatus: status,
    payoutsEnabled: status === 'verified',
    rejectionReason: status === 'verified' ? '' : reason.trim(),
    reviewedAt: serverTimestamp(),
    reviewedBy: admin.uid,
    updatedAt: serverTimestamp(),
  });
}
