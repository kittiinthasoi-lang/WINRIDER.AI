import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export async function compressImage(file: File, maxDimension = 1200, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context not available'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Image compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadKycDocument(uid: string, docType: string, file: File): Promise<string> {
  // 1. Compress image to max 1200px, quality 0.7
  const compressedBlob = await compressImage(file, 1200, 0.7);

  try {
    const storageRef = ref(storage, `kyc/${uid}/${docType}.jpg`);
    await uploadBytes(storageRef, compressedBlob, {
      contentType: 'image/jpeg',
    });
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (err) {
    console.warn(`Firebase Storage upload warning for ${docType}, falling back gracefully:`, err);
    // Return base64 data URL as bulletproof fallback if storage bucket permissions are pending
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(compressedBlob);
    });
  }
}

export async function uploadProfileImage(uid: string, role: string, file: File): Promise<string> {
  const compressedBlob = await compressImage(file, 800, 0.78);
  try {
    const storageRef = ref(storage, `profiles/${uid}/${role}-${Date.now()}.jpg`);
    await uploadBytes(storageRef, compressedBlob, { contentType: 'image/jpeg' });
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.warn('Profile image upload failed; using compressed inline image:', error);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านรูปโปรไฟล์ได้'));
      reader.readAsDataURL(compressedBlob);
    });
  }
}


export async function uploadProductImage(uid: string, file: File): Promise<string> {
  const compressedBlob = await compressImage(file, 1600, 0.82);
  const storageRef = ref(storage, `products/${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`);
  await uploadBytes(storageRef, compressedBlob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}


export async function uploadServiceCompletionPhoto(uid: string, orderId: string, file: File): Promise<string> {
  const compressedBlob = await compressImage(file, 1400, 0.78);
  const storageRef = ref(storage, `service-completion/${uid}/${orderId}-${Date.now()}.jpg`);
  await uploadBytes(storageRef, compressedBlob, { contentType: 'image/jpeg' });
  return getDownloadURL(storageRef);
}
