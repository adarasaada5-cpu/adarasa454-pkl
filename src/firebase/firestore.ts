import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db, isFirebaseActive } from "./firebase";

/**
 * Generic helper to add a document to a Firestore collection.
 */
export async function addDocument(collectionPath: string, data: any): Promise<any> {
  if (isFirebaseActive && db) {
    try {
      const colRef = collection(db, collectionPath);
      const docRef = await addDoc(colRef, {
        ...data,
        createdAt: new Date().toISOString(),
        serverTime: serverTimestamp(),
      });
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error(`Error adding document to ${collectionPath}:`, error);
      throw error;
    }
  } else {
    // Local fallback
    const mockId = `doc_${Date.now()}`;
    const stored = localStorage.getItem(`pkl_mock_${collectionPath}`);
    const list = stored ? JSON.parse(stored) : [];
    const newDoc = { id: mockId, ...data, createdAt: new Date().toISOString() };
    list.unshift(newDoc);
    localStorage.setItem(`pkl_mock_${collectionPath}`, JSON.stringify(list));
    return newDoc;
  }
}

/**
 * Generic helper to retrieve all documents from a Firestore collection.
 */
export async function fetchDocuments(collectionPath: string, filterField?: string, filterValue?: any): Promise<any[]> {
  if (isFirebaseActive && db) {
    try {
      let q = query(collection(db, collectionPath));
      if (filterField && filterValue !== undefined) {
        q = query(collection(db, collectionPath), where(filterField, "==", filterValue));
      }
      const querySnapshot = await getDocs(q);
      const docsList: any[] = [];
      querySnapshot.forEach((docSnap) => {
        docsList.push({ id: docSnap.id, ...docSnap.data() });
      });
      return docsList;
    } catch (error) {
      console.error(`Error fetching documents from ${collectionPath}:`, error);
      return [];
    }
  } else {
    // Local fallback
    const stored = localStorage.getItem(`pkl_mock_${collectionPath}`);
    const list = stored ? JSON.parse(stored) : [];
    if (filterField && filterValue !== undefined) {
      return list.filter((item: any) => item[filterField] === filterValue);
    }
    return list;
  }
}

/**
 * Generic helper to update a document in a Firestore collection.
 */
export async function updateDocument(collectionPath: string, docId: string, data: any): Promise<void> {
  if (isFirebaseActive && db) {
    try {
      const docRef = doc(db, collectionPath, docId);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error(`Error updating document ${docId} in ${collectionPath}:`, error);
      throw error;
    }
  } else {
    // Local fallback
    const stored = localStorage.getItem(`pkl_mock_${collectionPath}`);
    if (stored) {
      const list = JSON.parse(stored);
      const idx = list.findIndex((item: any) => item.id === docId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data };
        localStorage.setItem(`pkl_mock_${collectionPath}`, JSON.stringify(list));
      }
    }
  }
}

/**
 * Generic helper to delete a document from a Firestore collection.
 */
export async function deleteDocument(collectionPath: string, docId: string): Promise<void> {
  if (isFirebaseActive && db) {
    try {
      const docRef = doc(db, collectionPath, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document ${docId} from ${collectionPath}:`, error);
      throw error;
    }
  } else {
    // Local fallback
    const stored = localStorage.getItem(`pkl_mock_${collectionPath}`);
    if (stored) {
      const list = JSON.parse(stored);
      const filtered = list.filter((item: any) => item.id !== docId);
      localStorage.setItem(`pkl_mock_${collectionPath}`, JSON.stringify(filtered));
    }
  }
}
