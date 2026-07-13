import { db, auth, isFirebaseActive as originalIsFirebaseActive } from "../firebase/config";
import { onAuthStateChanged } from "firebase/auth";

let isFirestoreBroken = false;
let isFirebaseActive = false;

if (originalIsFirebaseActive && auth) {
  onAuthStateChanged(auth, (user) => {
    isFirebaseActive = originalIsFirebaseActive && user !== null && !isFirestoreBroken;
  });
}

function markFirestoreBroken() {
  if (!isFirestoreBroken) {
    isFirestoreBroken = true;
    isFirebaseActive = false;
    console.warn("⚠️ Firestore is currently unreachable or permission was denied. Switching to local-first backup database!");
  }
}
import {
  JurnalEntry,
  KehadiranEntry,
  TempatPkl,
  JournalStatus,
  AttendanceStatus,
  UserProfile,
  UserRole,
  PenilaianPkl,
  SchoolSettings,
  AuditLog,
  TeacherNote,
  SystemNotification,
  MonitoringEntry
} from "../models/types";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

// Global firestore error handling to conform with guidelines
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  markFirestoreBroken();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: localStorage.getItem("pkl_current_user")
        ? JSON.parse(localStorage.getItem("pkl_current_user")!).uid
        : "unknown",
      email: localStorage.getItem("pkl_current_user")
        ? JSON.parse(localStorage.getItem("pkl_current_user")!).email
        : "unknown",
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial placements to seed
const DEFAULT_PLACEMENTS: TempatPkl[] = [
  {
    id: "p1",
    nama: "Dinas Kominfo Kabupaten Ngada",
    alamat: "Jl. Soekarno-Hatta No. 4, Bajawa",
    pimpinan: "Athanasius M. Djogo, S.Kom",
    kuota: 4,
  },
  {
    id: "p2",
    nama: "Telkom Indonesia Bajawa",
    alamat: "Jl. Gajah Mada No. 12, Bajawa",
    pimpinan: "Robertus Gani",
    kuota: 2,
  },
  {
    id: "p3",
    nama: "Sanjaya Motor Bajawa",
    alamat: "Jl. Trans Flores, Bajawa",
    pimpinan: "Yosef Sanjaya",
    kuota: 5,
  },
  {
    id: "p4",
    nama: "Bank NTT Kantor Cabang Bajawa",
    alamat: "Jl. Achmad Yani No. 8, Bajawa",
    pimpinan: "Maria Goreti",
    kuota: 3,
  },
];

// Local fallback initialization
const initLocalStorage = () => {
  if (!localStorage.getItem("pkl_placements")) {
    localStorage.setItem("pkl_placements", JSON.stringify(DEFAULT_PLACEMENTS));
  }
  if (!localStorage.getItem("pkl_journals")) {
    // Seed standard journals
    const initialJournals: JurnalEntry[] = [
      {
        id: "j1",
        userId: "siswa_sanjaya_123",
        userName: "Siswa Sanjaya Bajawa",
        tanggal: "2026-07-02",
        kegiatan: "Instalasi dan konfigurasi jaringan LAN di ruang Bidang Humas.",
        kendala: "Kabel UTP sempat terputus karena terhimpit meja.",
        solusi: "Melakukan crimping ulang konektor RJ-45 dan merapikan jalur kabel.",
        status: "approved",
        pembimbingComment: "Bagus, pastikan kabel selalu dilindungi ducting.",
        createdAt: new Date("2026-07-02T16:00:00.000Z").toISOString(),
      },
      {
        id: "j2",
        userId: "siswa_sanjaya_123",
        userName: "Siswa Sanjaya Bajawa",
        tanggal: "2026-07-03",
        kegiatan: "Melakukan troubleshooting PC staf Kominfo yang tidak bisa booting.",
        kendala: "RAM kotor dan power supply berdebu tebal.",
        solusi: "Membersihkan pin RAM dengan penghapus pensil dan meniup debu PSU.",
        status: "pending",
        createdAt: new Date("2026-07-03T16:00:00.000Z").toISOString(),
      },
    ];
    localStorage.setItem("pkl_journals", JSON.stringify(initialJournals));
  }
  if (!localStorage.getItem("pkl_attendance")) {
    const initialAttendance: KehadiranEntry[] = [
      {
        id: "a1",
        userId: "siswa_sanjaya_123",
        userName: "Siswa Sanjaya Bajawa",
        tanggal: "2026-07-02",
        jamMasuk: "07:30",
        jamPulang: "16:00",
        status: "hadir",
        createdAt: new Date("2026-07-02T07:30:00.000Z").toISOString(),
      },
      {
        id: "a2",
        userId: "siswa_sanjaya_123",
        userName: "Siswa Sanjaya Bajawa",
        tanggal: "2026-07-03",
        jamMasuk: "07:25",
        jamPulang: "16:05",
        status: "hadir",
        createdAt: new Date("2026-07-03T07:25:00.000Z").toISOString(),
      },
    ];
    localStorage.setItem("pkl_attendance", JSON.stringify(initialAttendance));
  }
  if (!localStorage.getItem("pkl_teacher_notes")) {
    const initialNotes: TeacherNote[] = [
      {
        id: "n1",
        studentId: "siswa_sanjaya_123",
        studentName: "Siswa Sanjaya Bajawa",
        studentClass: "XII TKJ (Teknik Komputer & Jaringan)",
        teacherId: "pembimbing_sergius_456",
        teacherName: "Drs. Sergius Nono",
        title: "Monitoring Minggu Ke-2",
        category: "Monitoring",
        status: "Baik",
        content: "Siswa menunjukkan perkembangan yang sangat baik dalam memahami instalasi jaringan dan konfigurasi LAN di tempat PKL.",
        attachmentUrl: null,
        attachmentName: null,
        createdAt: new Date("2026-07-05T09:00:00.000Z").toISOString(),
        updatedAt: new Date("2026-07-05T09:00:00.000Z").toISOString(),
        createdBy: "pembimbing_sergius_456",
        isDeleted: false,
      },
      {
        id: "n2",
        studentId: "siswa_sanjaya_123",
        studentName: "Siswa Sanjaya Bajawa",
        studentClass: "XII TKJ (Teknik Komputer & Jaringan)",
        teacherId: "pembimbing_sergius_456",
        teacherName: "Drs. Sergius Nono",
        title: "Prestasi dalam Pemecahan Masalah",
        category: "Prestasi",
        status: "Sangat Baik",
        content: "Berhasil menyelesaikan masalah troubleshooting PC staf Kominfo yang mati total dengan sangat mandiri.",
        attachmentUrl: null,
        attachmentName: null,
        createdAt: new Date("2026-07-06T11:30:00.000Z").toISOString(),
        updatedAt: new Date("2026-07-06T11:30:00.000Z").toISOString(),
        createdBy: "pembimbing_sergius_456",
        isDeleted: false,
      }
    ];
    localStorage.setItem("pkl_teacher_notes", JSON.stringify(initialNotes));
  }
};

initLocalStorage();

export const pklService = {
  // --- TEMPAT PKL (PLACEMENTS) ---
  async getTempatPkl(): Promise<TempatPkl[]> {
    if (isFirebaseActive && db) {
      const path = "placements";
      try {
        const querySnapshot = await getDocs(collection(db, path));
        const placements: TempatPkl[] = [];
        querySnapshot.forEach((docSnap) => {
          placements.push({ id: docSnap.id, ...docSnap.data() } as TempatPkl);
        });
        if (placements.length === 0) {
          // Seed firestore if empty
          for (const pl of DEFAULT_PLACEMENTS) {
            await setDoc(doc(db, path, pl.id), {
              nama: pl.nama,
              alamat: pl.alamat,
              pimpinan: pl.pimpinan,
              kuota: pl.kuota,
            });
            placements.push(pl);
          }
        }
        return placements;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return DEFAULT_PLACEMENTS;
      }
    } else {
      const stored = localStorage.getItem("pkl_placements");
      return stored ? JSON.parse(stored) : DEFAULT_PLACEMENTS;
    }
  },

  async addTempatPkl(entry: Omit<TempatPkl, "id">): Promise<TempatPkl> {
    if (isFirebaseActive && db) {
      const path = "placements";
      try {
        const docRef = await addDoc(collection(db, path), entry);
        return { id: docRef.id, ...entry };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_placements");
      const list: TempatPkl[] = stored ? JSON.parse(stored) : [];
      const newEntry: TempatPkl = {
        id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        ...entry,
      };
      list.push(newEntry);
      localStorage.setItem("pkl_placements", JSON.stringify(list));
      return newEntry;
    }
  },

  async updateTempatPkl(id: string, entry: Omit<TempatPkl, "id">): Promise<TempatPkl> {
    if (isFirebaseActive && db) {
      const path = `placements/${id}`;
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "placements", id), entry as any);
        await this.addAuditLog("Edit Mitra", `Mengubah data mitra industri: ${entry.nama}`);
        return { id, ...entry };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_placements");
      const list: TempatPkl[] = stored ? JSON.parse(stored) : [];
      const updatedList = list.map((item) => {
        if (item.id === id) {
          return { ...item, ...entry };
        }
        return item;
      });
      localStorage.setItem("pkl_placements", JSON.stringify(updatedList));
      await this.addAuditLog("Edit Mitra", `Mengubah data mitra industri: ${entry.nama}`);
      return { id, ...entry };
    }
  },

  async deleteTempatPkl(id: string): Promise<void> {
    if (isFirebaseActive && db) {
      const path = `placements/${id}`;
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "placements", id));

        // --- CLEAN UP STUDENT REFS ---
        const profiles = await this.getAllUserProfiles();
        const { updateDoc } = await import("firebase/firestore");
        for (const p of profiles) {
          if (p.role === "siswa" && p.tempatPklId === id) {
            try {
              await updateDoc(doc(db, "profiles", p.uid), {
                tempatPkl: "",
                tempatPklId: ""
              });
            } catch (err) {
              console.error(`Failed to clear placement ref for student ${p.uid}`, err);
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const stored = localStorage.getItem("pkl_placements");
      if (stored) {
        const list: TempatPkl[] = JSON.parse(stored);
        const filtered = list.filter((item) => item.id !== id);
        localStorage.setItem("pkl_placements", JSON.stringify(filtered));
      }

      // --- CLEAN UP STUDENT REFS IN LOCAL STORAGE ---
      const storedProfiles = localStorage.getItem("pkl_custom_profiles");
      if (storedProfiles) {
        const profiles: UserProfile[] = JSON.parse(storedProfiles);
        const updatedProfiles = profiles.map(p => {
          if (p.role === "siswa" && p.tempatPklId === id) {
            return { ...p, tempatPkl: "", tempatPklId: "" };
          }
          return p;
        });
        localStorage.setItem("pkl_custom_profiles", JSON.stringify(updatedProfiles));
      }
    }
  },

  async importTempatPklBulk(placementsList: Omit<TempatPkl, "id">[]): Promise<TempatPkl[]> {
    const imported: TempatPkl[] = [];
    for (const item of placementsList) {
      const newPlacement = await this.addTempatPkl(item);
      imported.push(newPlacement);
      await this.addAuditLog("Import Mitra", `Mengimpor mitra industri baru: ${newPlacement.nama} (Kuota: ${newPlacement.kuota})`);
    }
    return imported;
  },

  // --- JURNAL (JOURNALS) ---
  async getJurnal(userId?: string): Promise<JurnalEntry[]> {
    if (isFirebaseActive && db) {
      const path = "journals";
      try {
        let q = query(collection(db, path), orderBy("createdAt", "desc"));
        if (userId) {
          q = query(collection(db, path), where("userId", "==", userId), orderBy("createdAt", "desc"));
        }
        const querySnapshot = await getDocs(q);
        const entries: JurnalEntry[] = [];
        querySnapshot.forEach((docSnap) => {
          entries.push({ id: docSnap.id, ...docSnap.data() } as JurnalEntry);
        });
        return entries;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const stored = localStorage.getItem("pkl_journals");
      const list: JurnalEntry[] = stored ? JSON.parse(stored) : [];
      // Filter by userId if provided
      const filtered = userId ? list.filter((item) => item.userId === userId) : list;
      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  async createJurnal(entry: Omit<JurnalEntry, "id" | "status" | "createdAt">): Promise<JurnalEntry> {
    const newEntryData = {
      ...entry,
      status: "pending" as JournalStatus,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseActive && db) {
      const path = "journals";
      try {
        const docRef = await addDoc(collection(db, path), {
          ...newEntryData,
          serverTime: serverTimestamp(),
        });
        return { id: docRef.id, ...newEntryData };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_journals");
      const list: JurnalEntry[] = stored ? JSON.parse(stored) : [];
      const newEntry: JurnalEntry = {
        id: `j_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        ...newEntryData,
      };
      list.unshift(newEntry);
      localStorage.setItem("pkl_journals", JSON.stringify(list));
      return newEntry;
    }
  },

  async updateJurnalStatus(id: string, status: JournalStatus, comment?: string): Promise<void> {
    if (isFirebaseActive && db) {
      const path = `journals/${id}`;
      try {
        const docRef = doc(db, "journals", id);
        const updateData: any = { status };
        if (comment !== undefined) {
          updateData.pembimbingComment = comment;
        }
        await updateDoc(docRef, updateData);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      const stored = localStorage.getItem("pkl_journals");
      if (stored) {
        const list: JurnalEntry[] = JSON.parse(stored);
        const index = list.findIndex((item) => item.id === id);
        if (index !== -1) {
          list[index].status = status;
          if (comment !== undefined) {
            list[index].pembimbingComment = comment;
          }
          localStorage.setItem("pkl_journals", JSON.stringify(list));
        }
      }
    }
  },

  async deleteJurnal(id: string): Promise<void> {
    if (isFirebaseActive && db) {
      const path = `journals/${id}`;
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "journals", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const stored = localStorage.getItem("pkl_journals");
      if (stored) {
        const list: JurnalEntry[] = JSON.parse(stored);
        const filtered = list.filter((item) => item.id !== id);
        localStorage.setItem("pkl_journals", JSON.stringify(filtered));
      }
    }
  },

  async importJournals(entries: Array<Omit<JurnalEntry, "id"> & { id?: string }>): Promise<void> {
    const listToSave = entries.map(entry => ({
      ...entry,
      id: entry.id || `j_import_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      status: entry.status || "approved",
      createdAt: entry.createdAt || new Date().toISOString()
    }));

    if (isFirebaseActive && db) {
      const path = "journals";
      try {
        for (const entry of listToSave) {
          await setDoc(doc(db, path, entry.id), {
            ...entry,
            serverTime: serverTimestamp()
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_journals");
      const list: JurnalEntry[] = stored ? JSON.parse(stored) : [];
      
      // Merge and remove duplicates by ID
      const merged = [...listToSave, ...list].filter(
        (value, index, self) => self.findIndex(t => t.id === value.id) === index
      );

      localStorage.setItem("pkl_journals", JSON.stringify(merged));
    }
  },

  // --- KEHADIRAN (ATTENDANCE) ---
  async getKehadiran(userId?: string): Promise<KehadiranEntry[]> {
    if (isFirebaseActive && db) {
      const path = "attendance";
      try {
        let q = query(collection(db, path), orderBy("createdAt", "desc"));
        if (userId) {
          q = query(collection(db, path), where("userId", "==", userId), orderBy("createdAt", "desc"));
        }
        const querySnapshot = await getDocs(q);
        const entries: KehadiranEntry[] = [];
        querySnapshot.forEach((docSnap) => {
          entries.push({ id: docSnap.id, ...docSnap.data() } as KehadiranEntry);
        });
        return entries;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const stored = localStorage.getItem("pkl_attendance");
      const list: KehadiranEntry[] = stored ? JSON.parse(stored) : [];
      const filtered = userId ? list.filter((item) => item.userId === userId) : list;
      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  async clockIn(
    userId: string,
    userName: string,
    status: AttendanceStatus,
    keterangan?: string,
    selfieUrl?: string,
    latitude?: number,
    longitude?: number,
    alamatGps?: string
  ): Promise<KehadiranEntry> {
    const todayStr = new Date().toISOString().split("T")[0];
    const nowTime = new Date().toTimeString().split(" ")[0].substring(0, 5); // "HH:MM"

    // Retrieve active year from settings
    let currentActiveYear = "2025/2026 - Genap";
    try {
      const savedSetStr = localStorage.getItem("pkl_school_settings");
      if (savedSetStr) {
        currentActiveYear = JSON.parse(savedSetStr).tahunAjaranAktif;
      }
    } catch (e) {}

    const newEntryData = {
      userId,
      userName,
      tanggal: todayStr,
      jamMasuk: nowTime,
      status,
      keterangan: keterangan || "",
      selfieUrl: selfieUrl || "",
      latitude: latitude || 0,
      longitude: longitude || 0,
      alamatGps: alamatGps || "",
      tahunAjaran: currentActiveYear,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseActive && db) {
      const path = "attendance";
      try {
        const docRef = await addDoc(collection(db, path), {
          ...newEntryData,
          serverTime: serverTimestamp(),
        });
        return { id: docRef.id, ...newEntryData };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_attendance");
      const list: KehadiranEntry[] = stored ? JSON.parse(stored) : [];

      // Check if already clocked in today
      const alreadyIn = list.find((item) => item.userId === userId && item.tanggal === todayStr);
      if (alreadyIn) {
        throw new Error("Anda sudah melakukan absensi masuk hari ini.");
      }

      const newEntry: KehadiranEntry = {
        id: `a_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        ...newEntryData,
      };
      list.unshift(newEntry);
      localStorage.setItem("pkl_attendance", JSON.stringify(list));
      return newEntry;
    }
  },

  async clockOut(userId: string): Promise<KehadiranEntry> {
    const todayStr = new Date().toISOString().split("T")[0];
    const nowTime = new Date().toTimeString().split(" ")[0].substring(0, 5); // "HH:MM"

    if (isFirebaseActive && db) {
      const path = "attendance";
      try {
        // Query clock-in record for today
        const q = query(
          collection(db, "attendance"),
          where("userId", "==", userId),
          where("tanggal", "==", todayStr)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          throw new Error("Absensi masuk hari ini belum ditemukan.");
        }

        const docSnap = querySnapshot.docs[0];
        const docRef = doc(db, "attendance", docSnap.id);
        await updateDoc(docRef, { jamPulang: nowTime });

        return { id: docSnap.id, ...docSnap.data(), jamPulang: nowTime } as KehadiranEntry;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_attendance");
      const list: KehadiranEntry[] = stored ? JSON.parse(stored) : [];
      const index = list.findIndex((item) => item.userId === userId && item.tanggal === todayStr);

      if (index === -1) {
        throw new Error("Anda belum melakukan absensi masuk hari ini.");
      }

      if (list[index].jamPulang) {
        throw new Error("Anda sudah melakukan absensi pulang hari ini.");
      }

      list[index].jamPulang = nowTime;
      localStorage.setItem("pkl_attendance", JSON.stringify(list));
      return list[index];
    }
  },

  async saveKehadiranManual(entry: KehadiranEntry): Promise<KehadiranEntry> {
    if (isFirebaseActive && db) {
      const path = `attendance/${entry.id}`;
      try {
        await setDoc(doc(db, "attendance", entry.id), {
          ...entry,
          serverTime: serverTimestamp()
        });
        await this.addAuditLog("Manual Absensi", `Menyimpan absensi manual untuk ${entry.userName} tanggal ${entry.tanggal}`);
        return entry;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_attendance");
      const list: KehadiranEntry[] = stored ? JSON.parse(stored) : [];
      const index = list.findIndex((item) => item.id === entry.id);
      if (index !== -1) {
        list[index] = entry;
      } else {
        list.unshift(entry);
      }
      localStorage.setItem("pkl_attendance", JSON.stringify(list));
      await this.addAuditLog("Manual Absensi", `Menyimpan absensi manual untuk ${entry.userName} tanggal ${entry.tanggal}`);
      return entry;
    }
  },

  async deleteKehadiran(id: string): Promise<void> {
    if (isFirebaseActive && db) {
      const path = `attendance/${id}`;
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "attendance", id));
        await this.addAuditLog("Hapus Absensi", `Menghapus entri absensi ID: ${id}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const stored = localStorage.getItem("pkl_attendance");
      if (stored) {
        const list: KehadiranEntry[] = JSON.parse(stored);
        const filtered = list.filter((item) => item.id !== id);
        localStorage.setItem("pkl_attendance", JSON.stringify(filtered));
        await this.addAuditLog("Hapus Absensi", `Menghapus entri absensi ID: ${id}`);
      }
    }
  },

  // --- USER PROFILES & ACCOUNTS MANAGEMENT ---
  async getAllUserProfiles(): Promise<UserProfile[]> {
    if (isFirebaseActive && db) {
      const path = "profiles";
      try {
        const querySnapshot = await getDocs(collection(db, path));
        const list: UserProfile[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        });

        // --- SAFE AUTOMATIC DEDUPLICATION OF STUDENT PROFILES ---
        const uniqueList: UserProfile[] = [];
        const seenEmails = new Set<string>();
        const seenNisns = new Set<string>();
        const seenNames = new Set<string>();
        const duplicatesToDelete: string[] = [];

        // Sort: We want to prioritize profiles that HAVE a valid tempatPkl / tempatPklId
        // or have newer updates so we preserve active placements during merge.
        const sortedList = [...list].sort((a, b) => {
          const aHasPlace = (a.tempatPklId && a.tempatPklId !== "") ? 1 : 0;
          const bHasPlace = (b.tempatPklId && b.tempatPklId !== "") ? 1 : 0;
          if (aHasPlace !== bHasPlace) return bHasPlace - aHasPlace;
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });

        for (const profile of sortedList) {
          if (profile.role === "siswa") {
            const emailKey = profile.email ? profile.email.toLowerCase().trim() : "";
            const nisnKey = profile.nisn ? profile.nisn.trim() : "";
            const nameKey = profile.name ? profile.name.toLowerCase().replace(/\s+/g, " ").trim() : "";

            let isDuplicate = false;
            if (emailKey && seenEmails.has(emailKey)) {
              isDuplicate = true;
            } else if (nisnKey && seenNisns.has(nisnKey)) {
              isDuplicate = true;
            } else if (nameKey && seenNames.has(nameKey)) {
              isDuplicate = true;
            }

            if (isDuplicate) {
              duplicatesToDelete.push(profile.uid);
            } else {
              if (emailKey) seenEmails.add(emailKey);
              if (nisnKey) seenNisns.add(nisnKey);
              if (nameKey) seenNames.add(nameKey);
              uniqueList.push(profile);
            }
          } else {
            uniqueList.push(profile);
          }
        }

        // Safe fire-and-forget delete of duplicates in Firestore to clean up database corruption!
        if (duplicatesToDelete.length > 0) {
          console.warn(`🧹 Automatically cleaning up ${duplicatesToDelete.length} duplicate student records in Firestore...`);
          const { doc, deleteDoc } = await import("firebase/firestore");
          duplicatesToDelete.forEach(async (uid) => {
            try {
              await deleteDoc(doc(db, "profiles", uid));
            } catch (err) {
              console.error(`Failed to delete duplicate profile UID: ${uid}`, err);
            }
          });
        }

        return uniqueList;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const stored = localStorage.getItem("pkl_custom_profiles");
      const custom: UserProfile[] = stored ? JSON.parse(stored) : [];
      
      const seeds: UserProfile[] = [
        {
          uid: "siswa_sanjaya_123",
          name: "Siswa Sanjaya Bajawa",
          email: "siswa@smksanjaya.sch.id",
          role: "siswa",
          nisn: "0081234567",
          kelas: "XII TKJ (Teknik Komputer & Jaringan)",
          tempatPkl: "Dinas Kominfo Ngada",
          tempatPklId: "p1",
          tahunAjaran: "2025/2026 - Genap",
          createdAt: new Date().toISOString(),
        },
        {
          uid: "pembimbing_sergius_456",
          name: "Drs. Sergius Nono",
          email: "sergiusnono80@guru.smk.belajar.id",
          role: "pembimbing",
          createdAt: new Date().toISOString(),
        },
        {
          uid: "penyelia_mitra_999",
          name: "Yosef Sanjaya (Penyelia)",
          email: "penyelia@mitra.com",
          role: "industri",
          tempatPkl: "Sanjaya Motor Bajawa",
          tempatPklId: "p3",
          createdAt: new Date().toISOString(),
        },
        {
          uid: "admin_pkl_789",
          name: "Admin PKL SMKS Sanjaya",
          email: "wasosergio@gmail.com",
          role: "admin",
          createdAt: new Date().toISOString(),
        }
      ];

      const merged = [...custom];
      seeds.forEach(s => {
        if (!merged.some(m => m.uid === s.uid || m.email === s.email)) {
          merged.push(s);
        }
      });

      // Filter out deleted profiles
      const deletedStored = localStorage.getItem("pkl_deleted_profiles");
      const deletedList: string[] = deletedStored ? JSON.parse(deletedStored) : [];
      const activeList = merged.filter(m => !deletedList.includes(m.uid));

      // --- DEDUPLICATE LOCAL STORAGE fallbacks too! ---
      const uniqueList: UserProfile[] = [];
      const seenEmails = new Set<string>();
      const seenNisns = new Set<string>();
      const seenNames = new Set<string>();
      const duplicatesToDeleteLocal: string[] = [];

      const sortedList = [...activeList].sort((a, b) => {
        const aHasPlace = (a.tempatPklId && a.tempatPklId !== "") ? 1 : 0;
        const bHasPlace = (b.tempatPklId && b.tempatPklId !== "") ? 1 : 0;
        if (aHasPlace !== bHasPlace) return bHasPlace - aHasPlace;
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

      for (const profile of sortedList) {
        if (profile.role === "siswa") {
          const emailKey = profile.email ? profile.email.toLowerCase().trim() : "";
          const nisnKey = profile.nisn ? profile.nisn.trim() : "";
          const nameKey = profile.name ? profile.name.toLowerCase().replace(/\s+/g, " ").trim() : "";

          let isDuplicate = false;
          if (emailKey && seenEmails.has(emailKey)) {
            isDuplicate = true;
          } else if (nisnKey && seenNisns.has(nisnKey)) {
            isDuplicate = true;
          } else if (nameKey && seenNames.has(nameKey)) {
            isDuplicate = true;
          }

          if (isDuplicate) {
            duplicatesToDeleteLocal.push(profile.uid);
          } else {
            if (emailKey) seenEmails.add(emailKey);
            if (nisnKey) seenNisns.add(nisnKey);
            if (nameKey) seenNames.add(nameKey);
            uniqueList.push(profile);
          }
        } else {
          uniqueList.push(profile);
        }
      }

      if (duplicatesToDeleteLocal.length > 0) {
        const updatedCustom = custom.filter(p => !duplicatesToDeleteLocal.includes(p.uid));
        localStorage.setItem("pkl_custom_profiles", JSON.stringify(updatedCustom));
      }

      return uniqueList;
    }
  },

  async saveUserProfile(profile: UserProfile): Promise<UserProfile> {
    if (isFirebaseActive && db) {
      const path = `profiles/${profile.uid}`;
      try {
        await setDoc(doc(db, "profiles", profile.uid), profile);
        return profile;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_custom_profiles");
      const list: UserProfile[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex(u => u.uid === profile.uid);
      if (idx !== -1) {
        list[idx] = profile;
      } else {
        list.push(profile);
      }
      localStorage.setItem("pkl_custom_profiles", JSON.stringify(list));
      return profile;
    }
  },

  async importSiswaBulk(siswaList: Omit<UserProfile, "uid" | "role" | "createdAt">[]): Promise<UserProfile[]> {
    const imported: UserProfile[] = [];
    const settings = await this.getSchoolSettings();
    const currentActiveYear = settings.tahunAjaranAktif;

    // Fetch existing user profiles to prevent duplicate accounts
    const existingProfiles = await this.getAllUserProfiles();

    for (const item of siswaList) {
      // Find matching existing student
      let existing = existingProfiles.find(u => 
        u.role === "siswa" && (
          (u.email && item.email && u.email.toLowerCase().trim() === item.email.toLowerCase().trim()) ||
          (u.nisn && item.nisn && u.nisn.trim() === item.nisn.trim()) ||
          (u.name && item.name && u.name.toLowerCase().trim() === item.name.toLowerCase().trim())
        )
      );

      // ALSO check in currently imported batch to prevent duplicate creations in the same upload!
      if (!existing) {
        existing = imported.find(u =>
          u.role === "siswa" && (
            (u.email && item.email && u.email.toLowerCase().trim() === item.email.toLowerCase().trim()) ||
            (u.nisn && item.nisn && u.nisn.trim() === item.nisn.trim()) ||
            (u.name && item.name && u.name.toLowerCase().trim() === item.name.toLowerCase().trim())
          )
        );
      }

      if (existing) {
        // Update existing record
        const updatedSiswa: UserProfile = {
          ...existing,
          name: item.name || existing.name,
          email: item.email || existing.email,
          nisn: item.nisn || existing.nisn,
          kelas: item.kelas || existing.kelas,
          tempatPkl: item.tempatPkl !== undefined ? item.tempatPkl : (existing.tempatPkl || ""),
          tempatPklId: item.tempatPklId !== undefined ? item.tempatPklId : (existing.tempatPklId || ""),
          tahunAjaran: currentActiveYear || existing.tahunAjaran
        };
        await this.saveUserProfile(updatedSiswa);
        
        // If already in imported batch, update it there, otherwise push
        const idx = imported.findIndex(u => u.uid === existing.uid);
        if (idx !== -1) {
          imported[idx] = updatedSiswa;
        } else {
          imported.push(updatedSiswa);
        }
        await this.addAuditLog("Import Siswa", `Memperbarui data siswa via import: ${updatedSiswa.name} (${updatedSiswa.email})`);
      } else {
        // Create new record
        const newSiswa: UserProfile = {
          uid: `siswa_${Math.random().toString(36).substring(2, 10)}`,
          name: item.name,
          email: item.email,
          role: "siswa",
          nisn: item.nisn || "",
          kelas: item.kelas || "XII",
          tempatPkl: item.tempatPkl || "",
          tempatPklId: item.tempatPklId || "",
          pembimbingId: item.pembimbingId || "",
          tahunAjaran: currentActiveYear,
          createdAt: new Date().toISOString()
        };
        // For bulk import, default password is set to Student Nisn or a standard one
        const defaultPassword = item.nisn || "SiswaSanjaya123";
        (newSiswa as any).password = defaultPassword;

        await this.saveUserProfile(newSiswa);
        imported.push(newSiswa);
        await this.addAuditLog("Import Siswa", `Mengimpor akun siswa baru massal: ${newSiswa.name} (${newSiswa.email})`);
      }
    }
    return imported;
  },

  async importPembimbingBulk(pembimbingList: { name: string; email: string; password?: string }[]): Promise<UserProfile[]> {
    const imported: UserProfile[] = [];
    const existingProfiles = await this.getAllUserProfiles();

    for (const item of pembimbingList) {
      const existing = existingProfiles.find(u => 
        u.role === "pembimbing" && (
          (u.email && item.email && u.email.toLowerCase().trim() === item.email.toLowerCase().trim()) ||
          (u.name && item.name && u.name.toLowerCase().trim() === item.name.toLowerCase().trim())
        )
      );

      if (existing) {
        const updated = {
          ...existing,
          name: item.name || existing.name,
          email: item.email || existing.email
        };
        await this.saveUserProfile(updated);
        imported.push(updated);
        await this.addAuditLog("Import Pembimbing", `Memperbarui data pembimbing via import: ${updated.name} (${updated.email})`);
      } else {
        const newPembimbing: UserProfile = {
          uid: `pembimbing_${Math.random().toString(36).substring(2, 10)}`,
          name: item.name,
          email: item.email,
          role: "pembimbing",
          password: item.password || "PembimbingSanjaya123",
          createdAt: new Date().toISOString()
        };
        await this.saveUserProfile(newPembimbing);
        imported.push(newPembimbing);
        await this.addAuditLog("Import Pembimbing", `Mengimpor akun guru pembimbing baru massal: ${newPembimbing.name} (${newPembimbing.email})`);
      }
    }
    return imported;
  },

  async importIndustriBulk(industriList: { name: string; email: string; tempatPkl?: string; tempatPklId?: string; password?: string }[]): Promise<UserProfile[]> {
    const imported: UserProfile[] = [];
    const existingProfiles = await this.getAllUserProfiles();

    for (const item of industriList) {
      const existing = existingProfiles.find(u => 
        u.role === "industri" && (
          (u.email && item.email && u.email.toLowerCase().trim() === item.email.toLowerCase().trim()) ||
          (u.name && item.name && u.name.toLowerCase().trim() === item.name.toLowerCase().trim())
        )
      );

      if (existing) {
        const updated = {
          ...existing,
          name: item.name || existing.name,
          email: item.email || existing.email,
          tempatPkl: item.tempatPkl || existing.tempatPkl,
          tempatPklId: item.tempatPklId || existing.tempatPklId
        };
        await this.saveUserProfile(updated);
        imported.push(updated);
        await this.addAuditLog("Import Industri", `Memperbarui data pembimbing industri via import: ${updated.name} (${updated.email})`);
      } else {
        const newIndustri: UserProfile = {
          uid: `industri_${Math.random().toString(36).substring(2, 10)}`,
          name: item.name,
          email: item.email,
          role: "industri",
          tempatPkl: item.tempatPkl || "",
          tempatPklId: item.tempatPklId || "",
          password: item.password || "IndustriSanjaya123",
          createdAt: new Date().toISOString()
        };
        await this.saveUserProfile(newIndustri);
        imported.push(newIndustri);
        await this.addAuditLog("Import Industri", `Mengimpor akun pembimbing industri baru massal: ${newIndustri.name} (${newIndustri.email})`);
      }
    }
    return imported;
  },

  async deleteUserProfile(uid: string): Promise<void> {
    if (isFirebaseActive && db) {
      const path = `profiles/${uid}`;
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "profiles", uid));
        await this.addAuditLog("Hapus Pengguna", `Menghapus akun pengguna UID: ${uid}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      // Record in deleted list
      const deletedStored = localStorage.getItem("pkl_deleted_profiles");
      const deletedList: string[] = deletedStored ? JSON.parse(deletedStored) : [];
      if (!deletedList.includes(uid)) {
        deletedList.push(uid);
        localStorage.setItem("pkl_deleted_profiles", JSON.stringify(deletedList));
      }

      const stored = localStorage.getItem("pkl_custom_profiles");
      if (stored) {
        const list: UserProfile[] = JSON.parse(stored);
        const filtered = list.filter((item) => item.uid !== uid);
        localStorage.setItem("pkl_custom_profiles", JSON.stringify(filtered));
      }
      await this.addAuditLog("Hapus Pengguna", `Menghapus akun pengguna UID: ${uid}`);
    }
  },

  async resetUserPassword(uid: string, newPassword = "PasswordSanjaya123"): Promise<void> {
    if (isFirebaseActive && db) {
      const path = `profiles/${uid}`;
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "profiles", uid), { password: newPassword });
        await this.addAuditLog("Ubah Password", `Mengubah password pengguna UID: ${uid}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      const stored = localStorage.getItem("pkl_custom_profiles");
      const list: UserProfile[] = stored ? JSON.parse(stored) : [];
      const idx = list.findIndex(u => u.uid === uid);
      if (idx !== -1) {
        list[idx] = { ...list[idx], password: newPassword };
        localStorage.setItem("pkl_custom_profiles", JSON.stringify(list));
      } else {
        // Also check if current user is being updated
        const currentUserStr = localStorage.getItem("pkl_current_user");
        if (currentUserStr) {
          const currentUser = JSON.parse(currentUserStr);
          if (currentUser.uid === uid) {
            currentUser.password = newPassword;
            localStorage.setItem("pkl_current_user", JSON.stringify(currentUser));
          }
        }
      }
      await this.addAuditLog("Ubah Password", `Mengubah password pengguna UID: ${uid}`);
    }
  },

  // --- SCHOOL SETTINGS (TAHUN AJARAN / SEMESTER) ---
  async getSchoolSettings(): Promise<SchoolSettings> {
    const defaultSet: SchoolSettings = {
      tahunAjaranAktif: "2025/2026 - Genap",
      kkmKehadiran: 80,
      namaSekolah: "SMKS Sanjaya Bajawa",
      logoSekolah: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=200&auto=format&fit=crop",
      alamatSekolah: "Jl. Ahmad Yani No. 12, Bajawa, Flores, NTT",
      emailSekolah: "smkssanjayabajawa@gmail.com",
      websiteSekolah: "www.smkssanjayabajawa.sch.id",
      npsnSekolah: "50303124"
    };

    if (isFirebaseActive && db) {
      const path = "settings/school";
      try {
        const snap = await getDoc(doc(db, "settings", "school"));
        if (snap.exists()) {
          return { ...defaultSet, ...snap.data() } as SchoolSettings;
        }
        await setDoc(doc(db, "settings", "school"), defaultSet);
        return defaultSet;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return defaultSet;
      }
    } else {
      const stored = localStorage.getItem("pkl_school_settings");
      if (stored) {
        return { ...defaultSet, ...JSON.parse(stored) };
      }
      localStorage.setItem("pkl_school_settings", JSON.stringify(defaultSet));
      return defaultSet;
    }
  },

  async updateSchoolSettings(settings: SchoolSettings): Promise<SchoolSettings> {
    if (isFirebaseActive && db) {
      const path = "settings/school";
      try {
        await setDoc(doc(db, "settings", "school"), settings);
        await this.addAuditLog("Update Settings", `Mengubah Tahun Ajaran aktif menjadi ${settings.tahunAjaranAktif}`);
        return settings;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      localStorage.setItem("pkl_school_settings", JSON.stringify(settings));
      await this.addAuditLog("Update Settings", `Mengubah Tahun Ajaran aktif menjadi ${settings.tahunAjaranAktif}`);
      return settings;
    }
  },

  // --- PERFORMANCE APPRAISAL (PENILAIAN PKL) ---
  async getPenilaian(siswaId?: string): Promise<PenilaianPkl[]> {
    if (isFirebaseActive && db) {
      const path = "assessments";
      try {
        let q = query(collection(db, path), orderBy("createdAt", "desc"));
        if (siswaId) {
          q = query(collection(db, path), where("siswaId", "==", siswaId), orderBy("createdAt", "desc"));
        }
        const querySnapshot = await getDocs(q);
        const entries: PenilaianPkl[] = [];
        querySnapshot.forEach((docSnap) => {
          entries.push({ id: docSnap.id, ...docSnap.data() } as PenilaianPkl);
        });
        return entries;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const stored = localStorage.getItem("pkl_assessments");
      const list: PenilaianPkl[] = stored ? JSON.parse(stored) : [];
      const filtered = siswaId ? list.filter(item => item.siswaId === siswaId) : list;
      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  async submitPenilaian(entry: Partial<PenilaianPkl> & { siswaId: string; siswaName: string }): Promise<PenilaianPkl> {
    // 1. Get existing penilaian for this student
    const existingList = await this.getPenilaian(entry.siswaId);
    const existing = existingList.length > 0 ? existingList[0] : null;

    // 2. Merge values
    const merged = {
      siswaId: entry.siswaId,
      siswaName: entry.siswaName,
      nisn: entry.nisn ?? existing?.nisn ?? "",
      kelas: entry.kelas ?? existing?.kelas ?? "",
      tempatPkl: entry.tempatPkl ?? existing?.tempatPkl ?? "",
      tahunAjaran: entry.tahunAjaran ?? existing?.tahunAjaran ?? "2025/2026 - Genap",
      
      // Industri scores
      nilaiSikap: entry.nilaiSikap !== undefined ? entry.nilaiSikap : (existing?.nilaiSikap ?? 0),
      nilaiKerja: entry.nilaiKerja !== undefined ? entry.nilaiKerja : (existing?.nilaiKerja ?? 0),
      nilaiDisiplin: entry.nilaiDisiplin !== undefined ? entry.nilaiDisiplin : (existing?.nilaiDisiplin ?? 0),
      nilaiKeaktifan: entry.nilaiKeaktifan !== undefined ? entry.nilaiKeaktifan : (existing?.nilaiKeaktifan ?? 0),
      catatanPenyelia: entry.catatanPenyelia !== undefined ? entry.catatanPenyelia : (existing?.catatanPenyelia ?? ""),
      penilaiName: entry.penilaiName !== undefined ? entry.penilaiName : (existing?.penilaiName ?? ""),

      // TP fields
      tp1_1: entry.tp1_1 !== undefined ? entry.tp1_1 : (existing?.tp1_1 ?? 0),
      tp1_2: entry.tp1_2 !== undefined ? entry.tp1_2 : (existing?.tp1_2 ?? 0),
      tp1_3: entry.tp1_3 !== undefined ? entry.tp1_3 : (existing?.tp1_3 ?? 0),
      tp1_4: entry.tp1_4 !== undefined ? entry.tp1_4 : (existing?.tp1_4 ?? 0),
      tp2_1: entry.tp2_1 !== undefined ? entry.tp2_1 : (existing?.tp2_1 ?? 0),
      tp2_2: entry.tp2_2 !== undefined ? entry.tp2_2 : (existing?.tp2_2 ?? 0),
      tp2_3: entry.tp2_3 !== undefined ? entry.tp2_3 : (existing?.tp2_3 ?? 0),
      tp2_4: entry.tp2_4 !== undefined ? entry.tp2_4 : (existing?.tp2_4 ?? 0),
      tp3_1: entry.tp3_1 !== undefined ? entry.tp3_1 : (existing?.tp3_1 ?? 0),
      tp3_2: entry.tp3_2 !== undefined ? entry.tp3_2 : (existing?.tp3_2 ?? 0),
      tp3_3: entry.tp3_3 !== undefined ? entry.tp3_3 : (existing?.tp3_3 ?? 0),
      tp3_4: entry.tp3_4 !== undefined ? entry.tp3_4 : (existing?.tp3_4 ?? 0),
      tp4_1: entry.tp4_1 !== undefined ? entry.tp4_1 : (existing?.tp4_1 ?? 0),
      tp4_2: entry.tp4_2 !== undefined ? entry.tp4_2 : (existing?.tp4_2 ?? 0),
      tp4_3: entry.tp4_3 !== undefined ? entry.tp4_3 : (existing?.tp4_3 ?? 0),
      tp4_4: entry.tp4_4 !== undefined ? entry.tp4_4 : (existing?.tp4_4 ?? 0),

      // Guru Pembimbing scores
      nilaiLaporan: entry.nilaiLaporan !== undefined ? entry.nilaiLaporan : (existing?.nilaiLaporan ?? 0),
      penilaiLaporanName: entry.penilaiLaporanName !== undefined ? entry.penilaiLaporanName : (existing?.penilaiLaporanName ?? ""),
    };

    // Calculate industrial average
    const hasTps = 
      merged.tp1_1 > 0 || merged.tp1_2 > 0 || merged.tp1_3 > 0 || merged.tp1_4 > 0 ||
      merged.tp2_1 > 0 || merged.tp2_2 > 0 || merged.tp2_3 > 0 || merged.tp2_4 > 0 ||
      merged.tp3_1 > 0 || merged.tp3_2 > 0 || merged.tp3_3 > 0 || merged.tp3_4 > 0 ||
      merged.tp4_1 > 0 || merged.tp4_2 > 0 || merged.tp4_3 > 0 || merged.tp4_4 > 0;

    let rataRata = 0;
    if (hasTps) {
      const r_tp1 = (merged.tp1_1 + merged.tp1_2 + merged.tp1_3 + merged.tp1_4) / 4;
      const r_tp2 = (merged.tp2_1 + merged.tp2_2 + merged.tp2_3 + merged.tp2_4) / 4;
      const r_tp3 = (merged.tp3_1 + merged.tp3_2 + merged.tp3_3 + merged.tp3_4) / 4;
      const r_tp4 = (merged.tp4_1 + merged.tp4_2 + merged.tp4_3 + merged.tp4_4) / 4;
      
      // Calculate final average combining the 4 TPs averages and nilaiSikap
      rataRata = Math.round((r_tp1 + r_tp2 + r_tp3 + r_tp4 + merged.nilaiSikap) / 5);
    } else {
      rataRata = Math.round((merged.nilaiSikap + merged.nilaiKerja + merged.nilaiDisiplin + merged.nilaiKeaktifan) / 4);
    }

    let predikat: "Sangat Baik" | "Baik" | "Cukup" | "Kurang" = "Baik";
    if (rataRata >= 85) predikat = "Sangat Baik";
    else if (rataRata >= 75) predikat = "Baik";
    else if (rataRata >= 60) predikat = "Cukup";
    else predikat = "Kurang";

    const updatedAssessment = {
      ...merged,
      nilaiRataRata: rataRata,
      predikat,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };

    if (isFirebaseActive && db) {
      const path = "assessments";
      try {
        const { doc, setDoc, addDoc } = await import("firebase/firestore");
        if (existing && existing.id) {
          await setDoc(doc(db, path, existing.id), updatedAssessment);
          await this.addAuditLog("Nilai PKL", `Memperbarui nilai untuk siswa: ${entry.siswaName}`);
          return { id: existing.id, ...updatedAssessment } as PenilaianPkl;
        } else {
          const docRef = await addDoc(collection(db, path), updatedAssessment);
          await this.addAuditLog("Nilai PKL", `Memberikan nilai baru untuk siswa: ${entry.siswaName}`);
          return { id: docRef.id, ...updatedAssessment } as PenilaianPkl;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_assessments");
      const list: PenilaianPkl[] = stored ? JSON.parse(stored) : [];
      
      const id = existing?.id ?? `assessment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const finalEntry: PenilaianPkl = {
        id,
        ...updatedAssessment,
      };

      const filtered = list.filter(item => item.siswaId !== entry.siswaId);
      filtered.unshift(finalEntry);
      localStorage.setItem("pkl_assessments", JSON.stringify(filtered));
      await this.addAuditLog("Nilai PKL", `Menyimpan nilai untuk siswa: ${entry.siswaName}`);
      return finalEntry;
    }
  },

  async deletePenilaian(id: string): Promise<void> {
    if (isFirebaseActive && db) {
      const path = `assessments/${id}`;
      try {
        const { doc, deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, "assessments", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const stored = localStorage.getItem("pkl_assessments");
      if (stored) {
        const list: PenilaianPkl[] = JSON.parse(stored);
        const filtered = list.filter((item) => item.id !== id);
        localStorage.setItem("pkl_assessments", JSON.stringify(filtered));
      }
    }
  },

  // --- AUDIT LOGS ---
  async getAuditLogs(): Promise<AuditLog[]> {
    if (isFirebaseActive && db) {
      const path = "audit_logs";
      try {
        const q = query(collection(db, path), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const entries: AuditLog[] = [];
        querySnapshot.forEach((docSnap) => {
          entries.push({ id: docSnap.id, ...docSnap.data() } as AuditLog);
        });
        return entries;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const stored = localStorage.getItem("pkl_audit_logs");
      return stored ? JSON.parse(stored) : [];
    }
  },

  async addAuditLog(action: string, details: string): Promise<AuditLog> {
    const userProfileStr = localStorage.getItem("pkl_current_user");
    const currentUser = userProfileStr ? JSON.parse(userProfileStr) : null;
    
    const newLog: AuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      userId: currentUser?.uid || "system",
      userName: currentUser?.name || "System Automated",
      userRole: currentUser?.role || "admin",
      action,
      details,
      timestamp: new Date().toISOString(),
    };

    if (isFirebaseActive && db) {
      const path = "audit_logs";
      try {
        await addDoc(collection(db, path), newLog);
        return newLog;
      } catch (error) {
        console.error("Failed to write audit log in firestore:", error);
        return newLog;
      }
    } else {
      const stored = localStorage.getItem("pkl_audit_logs");
      const list: AuditLog[] = stored ? JSON.parse(stored) : [];
      list.unshift(newLog);
      if (list.length > 150) list.pop();
      localStorage.setItem("pkl_audit_logs", JSON.stringify(list));
      return newLog;
    }
  },

  // --- NOTIFICATIONS ---
  async getNotifications(userId?: string): Promise<SystemNotification[]> {
    if (isFirebaseActive && db) {
      const path = "notifications";
      try {
        let q = query(collection(db, path), orderBy("createdAt", "desc"));
        if (userId) {
          q = query(collection(db, path), where("userId", "==", userId), orderBy("createdAt", "desc"));
        }
        const querySnapshot = await getDocs(q);
        const list: SystemNotification[] = [];
        querySnapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as SystemNotification);
        });
        return list;
      } catch (error) {
        console.error("Failed to get notifications from Firestore:", error);
        return [];
      }
    } else {
      const stored = localStorage.getItem("pkl_notifications");
      const list: SystemNotification[] = stored ? JSON.parse(stored) : [
        { id: "1", title: "Absensi harian baru", content: "Absensi harian baru diajukan oleh Siswa", time: "5 mnt yang lalu", read: false, userId: "admin" },
        { id: "2", title: "Laporan jurnal harian", content: "Laporan jurnal harian masuk untuk ditinjau", time: "1 jam yang lalu", read: false, userId: "pembimbing_sergius_456" },
        { id: "3", title: "Mitra Baru", content: "Mitra Baru: Bank NTT Cabang Bajawa aktif", time: "1 hari yang lalu", read: true, userId: "all" },
      ];
      if (!stored) {
        localStorage.setItem("pkl_notifications", JSON.stringify(list));
      }
      const filtered = userId ? list.filter(n => n.userId === userId || n.userId === "all" || (userId === "admin_pkl_789" && n.userId === "admin")) : list;
      return filtered;
    }
  },

  async createNotification(noti: Omit<SystemNotification, "id">): Promise<SystemNotification> {
    const newNoti = {
      ...noti,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseActive && db) {
      const path = "notifications";
      try {
        const docRef = await addDoc(collection(db, path), newNoti);
        return { id: docRef.id, ...newNoti };
      } catch (error) {
        console.error("Failed to create notification in Firestore:", error);
        return { id: `noti_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, ...newNoti };
      }
    } else {
      const stored = localStorage.getItem("pkl_notifications");
      const list: SystemNotification[] = stored ? JSON.parse(stored) : [];
      const entry: SystemNotification = {
        id: `noti_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        ...newNoti,
      };
      list.unshift(entry);
      localStorage.setItem("pkl_notifications", JSON.stringify(list));
      return entry;
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    if (isFirebaseActive && db) {
      const path = `notifications/${id}`;
      try {
        const { doc, updateDoc } = await import("firebase/firestore");
        await updateDoc(doc(db, "notifications", id), { read: true });
      } catch (error) {
        console.error("Failed to mark notification read in Firestore:", error);
      }
    } else {
      const stored = localStorage.getItem("pkl_notifications");
      if (stored) {
        const list: SystemNotification[] = JSON.parse(stored);
        const idx = list.findIndex(n => n.id === id);
        if (idx !== -1) {
          list[idx].read = true;
          localStorage.setItem("pkl_notifications", JSON.stringify(list));
        }
      }
    }
  },

  // --- TEACHER NOTES (CATATAN PEMBIMBING) ---
  async getTeacherNotes(userRole?: string, userId?: string): Promise<TeacherNote[]> {
    if (isFirebaseActive && db) {
      const path = "teacher_notes";
      try {
        let q = query(collection(db, path), where("isDeleted", "==", false), orderBy("createdAt", "desc"));
        if (userRole === "pembimbing" && userId) {
          q = query(collection(db, path), where("isDeleted", "==", false), where("teacherId", "==", userId), orderBy("createdAt", "desc"));
        }
        const querySnapshot = await getDocs(q);
        const entries: TeacherNote[] = [];
        querySnapshot.forEach((docSnap) => {
          entries.push({ id: docSnap.id, ...docSnap.data() } as TeacherNote);
        });
        return entries;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const stored = localStorage.getItem("pkl_teacher_notes");
      const list: TeacherNote[] = stored ? JSON.parse(stored) : [];
      let filtered = list.filter((item) => !item.isDeleted);
      if (userRole === "pembimbing" && userId) {
        filtered = filtered.filter((item) => item.teacherId === userId);
      }
      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  async createTeacherNote(entry: Omit<TeacherNote, "id" | "createdAt" | "updatedAt" | "isDeleted">): Promise<TeacherNote> {
    const newEntryData = {
      ...entry,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    if (isFirebaseActive && db) {
      const path = "teacher_notes";
      try {
        const docRef = await addDoc(collection(db, path), {
          ...newEntryData,
          serverTime: serverTimestamp(),
        });
        await this.addAuditLog("Tambah Catatan", `Membuat catatan perkembangan untuk ${entry.studentName}`);
        
        // Trigger notification for admin
        try {
          await this.createNotification({
            title: "Catatan Baru",
            content: `Guru ${entry.teacherName} membuat catatan baru untuk ${entry.studentName}.`,
            time: "Baru saja",
            read: false,
            userId: "admin"
          });
        } catch (ne) {
          console.error("Failed to trigger notification:", ne);
        }

        return { id: docRef.id, ...newEntryData };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_teacher_notes");
      const list: TeacherNote[] = stored ? JSON.parse(stored) : [];
      const newEntry: TeacherNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        ...newEntryData,
      };
      list.unshift(newEntry);
      localStorage.setItem("pkl_teacher_notes", JSON.stringify(list));
      await this.addAuditLog("Tambah Catatan", `Membuat catatan perkembangan untuk ${entry.studentName}`);

      // Trigger notification for admin
      try {
        await this.createNotification({
          title: "Catatan Baru",
          content: `Guru ${entry.teacherName} membuat catatan baru untuk ${entry.studentName}.`,
          time: "Baru saja",
          read: false,
          userId: "admin"
        });
      } catch (ne) {
        console.error("Failed to trigger notification:", ne);
      }

      return newEntry;
    }
  },

  async updateTeacherNote(id: string, entry: Partial<TeacherNote>): Promise<TeacherNote> {
    const updatedData = {
      ...entry,
      updatedAt: new Date().toISOString(),
    };

    if (isFirebaseActive && db) {
      const path = `teacher_notes/${id}`;
      try {
        const docRef = doc(db, "teacher_notes", id);
        const cleanData = { ...updatedData };
        delete (cleanData as any).id;
        await updateDoc(docRef, cleanData);
        await this.addAuditLog("Edit Catatan", `Mengubah catatan perkembangan ID: ${id}`);
        
        // Return full updated note
        const snap = await getDoc(docRef);
        return { id, ...snap.data() } as TeacherNote;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_teacher_notes");
      const list: TeacherNote[] = stored ? JSON.parse(stored) : [];
      const index = list.findIndex((item) => item.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...updatedData } as TeacherNote;
        localStorage.setItem("pkl_teacher_notes", JSON.stringify(list));
        await this.addAuditLog("Edit Catatan", `Mengubah catatan perkembangan ID: ${id}`);
        return list[index];
      }
      throw new Error("Catatan tidak ditemukan");
    }
  },

  async deleteTeacherNote(id: string): Promise<void> {
    await this.updateTeacherNote(id, { isDeleted: true });
    await this.addAuditLog("Hapus Catatan", `Menghapus catatan perkembangan ID: ${id}`);
  },

  // --- MONITORING METHODS ---
  async getMonitorings(userRole?: string, userId?: string): Promise<MonitoringEntry[]> {
    if (isFirebaseActive && db) {
      const path = "monitorings";
      try {
        let q = query(collection(db, path), where("isDeleted", "==", false), orderBy("createdAt", "desc"));
        if (userRole === "pembimbing" && userId) {
          q = query(collection(db, path), where("isDeleted", "==", false), where("pembimbingId", "==", userId), orderBy("createdAt", "desc"));
        }
        const querySnapshot = await getDocs(q);
        const entries: MonitoringEntry[] = [];
        querySnapshot.forEach((docSnap) => {
          entries.push({ id: docSnap.id, ...docSnap.data() } as MonitoringEntry);
        });
        return entries;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const stored = localStorage.getItem("pkl_monitorings");
      const list: MonitoringEntry[] = stored ? JSON.parse(stored) : [];
      let filtered = list.filter((item) => !item.isDeleted);
      if (userRole === "pembimbing" && userId) {
        filtered = filtered.filter((item) => item.pembimbingId === userId);
      }
      return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  async createMonitoring(entry: Omit<MonitoringEntry, "id" | "createdAt" | "isDeleted">): Promise<MonitoringEntry> {
    const newEntryData = {
      ...entry,
      createdAt: new Date().toISOString(),
      isDeleted: false,
    };

    if (isFirebaseActive && db) {
      const path = "monitorings";
      try {
        const docRef = await addDoc(collection(db, path), {
          ...newEntryData,
          serverTime: serverTimestamp(),
        });
        await this.addAuditLog("Monitoring Baru", `Membuat monitoring PKL siswa ${entry.studentName}`);
        
        try {
          await this.createNotification({
            title: "Laporan Monitoring Baru",
            content: `Guru ${entry.pembimbingName} mengirimkan monitoring untuk ${entry.studentName}.`,
            time: "Baru saja",
            read: false,
            userId: "admin"
          });
        } catch (ne) {
          console.error("Failed to trigger notification:", ne);
        }

        return { id: docRef.id, ...newEntryData };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_monitorings");
      const list: MonitoringEntry[] = stored ? JSON.parse(stored) : [];
      const newEntry: MonitoringEntry = {
        id: `monitoring_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        ...newEntryData,
      };
      list.unshift(newEntry);
      localStorage.setItem("pkl_monitorings", JSON.stringify(list));
      await this.addAuditLog("Monitoring Baru", `Membuat monitoring PKL siswa ${entry.studentName}`);

      try {
        await this.createNotification({
          title: "Laporan Monitoring Baru",
          content: `Guru ${entry.pembimbingName} mengirimkan monitoring untuk ${entry.studentName}.`,
          time: "Baru saja",
          read: false,
          userId: "admin"
        });
      } catch (ne) {
        console.error("Failed to trigger notification:", ne);
      }

      return newEntry;
    }
  },

  async updateMonitoring(id: string, entry: Partial<MonitoringEntry>): Promise<MonitoringEntry> {
    if (isFirebaseActive && db) {
      const path = `monitorings/${id}`;
      try {
        const docRef = doc(db, "monitorings", id);
        const cleanData = { ...entry };
        delete (cleanData as any).id;
        await updateDoc(docRef, cleanData);
        await this.addAuditLog("Edit Monitoring", `Mengubah monitoring PKL ID: ${id}`);
        
        const snap = await getDoc(docRef);
        return { id, ...snap.data() } as MonitoringEntry;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_monitorings");
      const list: MonitoringEntry[] = stored ? JSON.parse(stored) : [];
      const index = list.findIndex((item) => item.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...entry } as MonitoringEntry;
        localStorage.setItem("pkl_monitorings", JSON.stringify(list));
        await this.addAuditLog("Edit Monitoring", `Mengubah monitoring PKL ID: ${id}`);
        return list[index];
      }
      throw new Error("Monitoring tidak ditemukan");
    }
  },

  async deleteMonitoring(id: string): Promise<void> {
    await this.updateMonitoring(id, { isDeleted: true });
    await this.addAuditLog("Hapus Monitoring", `Menghapus monitoring PKL ID: ${id}`);
  },
};
