import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app, isFirebaseActive } from "./firebase";

/**
 * Uploads a file to Firebase Storage.
 * Falls back to a local DataURL converter if Firebase Storage is inactive.
 */
export async function uploadFile(file: File, folderPath: string = "uploads"): Promise<string> {
  if (isFirebaseActive && app) {
    try {
      const storage = getStorage(app);
      const uniqueFileName = `${Date.now()}_${file.name}`;
      const fileRef = ref(storage, `${folderPath}/${uniqueFileName}`);
      
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error("Firebase Storage upload failed:", error);
      throw error;
    }
  } else {
    // Elegant fallback: converts the file to a Data URL (Base64)
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = (error) => {
        reject(new Error("Gagal membaca file lokal: " + error));
      };
      reader.readAsDataURL(file);
    });
  }
}
