/**
 * Type definitions for the PKL SANJAYA BAJAWA application.
 */

export type UserRole = "siswa" | "pembimbing" | "industri" | "admin";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  photoURL?: string;
  // Siswa specific fields
  nisn?: string;
  kelas?: string;
  tempatPkl?: string; // Nama tempat PKL / Mitra Industri
  tempatPklId?: string; // ID tempat PKL
  pembimbingId?: string; // ID Guru Pembimbing
  tahunAjaran?: string; // e.g., "2025/2026 - Ganjil"
  password?: string; // Optional password for login credentials in 2026 release
  createdAt: string;
}

export type JournalStatus = "pending" | "approved" | "rejected";

export interface JurnalEntry {
  id: string;
  userId: string;
  userName: string;
  tanggal: string;
  kegiatan: string;
  kendala: string;
  solusi: string;
  status: JournalStatus;
  pembimbingComment?: string;
  createdAt: string;
  tahunAjaran?: string;
  fotoUrl?: string;
}

export type AttendanceStatus = "hadir" | "sakit" | "izin" | "alpa";

export interface KehadiranEntry {
  id: string;
  userId: string;
  userName: string;
  tanggal: string;
  jamMasuk: string;
  jamPulang?: string;
  status: AttendanceStatus;
  keterangan?: string;
  // Dynamic 2026 parameters
  selfieUrl?: string; // Base64 or Firebase URL
  latitude?: number;
  longitude?: number;
  alamatGps?: string;
  createdAt: string;
  tahunAjaran?: string;
}

export interface TempatPkl {
  id: string;
  nama: string;
  alamat: string;
  pimpinan: string;
  kuota: number;
}

// 2026 Performance Appraisal Schema (Penilaian)
export interface PenilaianPkl {
  id: string;
  siswaId: string;
  siswaName: string;
  nisn: string;
  kelas: string;
  tempatPkl: string;
  nilaiSikap: number; // 0-100
  nilaiKerja: number; // 0-100
  nilaiDisiplin: number; // 0-100
  nilaiKeaktifan: number; // 0-100
  nilaiRataRata: number;
  predikat: "Sangat Baik" | "Baik" | "Cukup" | "Kurang";
  catatanPenyelia?: string;
  penilaiName: string;
  nilaiLaporan?: number; // 0-100 (filled by guru pembimbing)
  penilaiLaporanName?: string; // name of guru pembimbing
  createdAt: string;
  tahunAjaran?: string;

  // TP Competencies (4 times assessment each)
  tp1_1?: number;
  tp1_2?: number;
  tp1_3?: number;
  tp1_4?: number;
  tp2_1?: number;
  tp2_2?: number;
  tp2_3?: number;
  tp2_4?: number;
  tp3_1?: number;
  tp3_2?: number;
  tp3_3?: number;
  tp3_4?: number;
  tp4_1?: number;
  tp4_2?: number;
  tp4_3?: number;
  tp4_4?: number;
}

// 2026 School Setting Schema
export interface SchoolSettings {
  tahunAjaranAktif: string; // e.g. "2025/2026 - Genap"
  kkmKehadiran: number; // e.g. 80
  deletedEmails?: string[];
  namaSekolah?: string;
  logoSekolah?: string;
  alamatSekolah?: string;
  emailSekolah?: string;
  websiteSekolah?: string;
  npsnSekolah?: string;
}

// 2026 Audit Log Entry
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
}

// Catatan Pembimbing types
export type TeacherNoteCategory = "Monitoring" | "Prestasi" | "Pelanggaran" | "Konseling" | "Lainnya";
export type TeacherNoteStatus = "Sangat Baik" | "Baik" | "Cukup" | "Perlu Pembinaan" | "Kritis";

export interface TeacherNote {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  teacherId: string;
  teacherName: string;
  title: string;
  category: TeacherNoteCategory;
  status: TeacherNoteStatus;
  content: string;
  tanggal?: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  isDeleted: boolean;
}

export interface SystemNotification {
  id: string;
  title: string;
  content: string;
  time: string;
  read: boolean;
  userId: string;
  createdAt?: string;
}

// 2026 Teacher Monitoring Form Schema
export interface MonitoringEntry {
  id: string;
  pembimbingId: string;
  pembimbingName: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  tempatPkl: string;
  tanggal: string; // Jadwal
  kategori: string; // Rutin, Khusus, dll.
  catatan: string; // Form Monitoring notes
  statusSiswa: "Sangat Aktif" | "Aktif" | "Kurang Aktif" | "Bermasalah"; // Form Monitoring status
  fotoUrl: string | null; // Foto
  latitude: number | null; // GPS
  longitude: number | null; // GPS
  alamatGps: string | null; // GPS
  beritaAcara: string; // Berita Acara
  signatureUrl: string | null; // TTD Digital (Signature)
  createdAt: string;
  tahunAjaran?: string;
  isDeleted: boolean;
}

// --- COMMUNICATION CENTER MODELS ---
export interface ChatRoom {
  roomId: string;
  type: "direct" | "group";
  participants: string[];
  lastMessage?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  messageId: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  receiverId: string;
  message: string;
  messageType: "text" | "image" | "pdf" | "doc" | "xls" | "file";
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  emoji?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface InboxMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  receiverId: string;
  receiverName: string;
  receiverRole: string;
  subject: string;
  body: string;
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  targetRole: "all" | "siswa" | "pembimbing" | "industri" | "kelas" | "tempatPkl" | "guru";
  targetClass?: string;
  targetIndustry?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  publishDate: string;
  expireDate: string;
  createdBy: string;
  createdByName?: string;
  createdAt: string;
}

export interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  target: "all_teachers" | "all_industries" | "all_students" | "class" | "tempat_pkl";
  targetValue?: string;
  senderId: string;
  senderName: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

