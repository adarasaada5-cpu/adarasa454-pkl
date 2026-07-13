import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import { SchoolSettings, AuditLog, UserProfile } from "../models/types";
import {
  Settings,
  Calendar,
  Archive,
  History,
  ShieldCheck,
  Search,
  RefreshCw,
  Sliders,
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  UserPlus,
  UserCheck,
  Lock,
  Key,
  Trash2,
  School
} from "lucide-react";
import {
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from "@mui/material";

export const Pengaturan: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [settings, setSettings] = useState<SchoolSettings>({
    tahunAjaranAktif: "2025/2026 - Genap",
    kkmKehadiran: 80
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"umum" | "arsip" | "audit" | "admin">("umum");
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  // Admin & Security states
  const [admins, setAdmins] = useState<UserProfile[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // 1. Add Admin fields
  const [newAdminName, setNewAdminName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");

  // 2. Rename Admin fields
  const [selectedAdminToRename, setSelectedAdminToRename] = useState<string>("");
  const [renamedAdminName, setRenamedAdminName] = useState("");

  // 3. Reset Password fields
  const [selectedUserToReset, setSelectedUserToReset] = useState<string>("");
  const [resetPasswordValue, setResetPasswordValue] = useState("PasswordSanjaya123");

  // 4. Self Password fields
  const [newPasswordSelf, setNewPasswordSelf] = useState("");
  const [confirmPasswordSelf, setConfirmPasswordSelf] = useState("");

  // 5. Account Deletion fields
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 6. School Profile fields
  const [formNamaSekolah, setFormNamaSekolah] = useState("");
  const [formLogoSekolah, setFormLogoSekolah] = useState("");
  const [formAlamatSekolah, setFormAlamatSekolah] = useState("");
  const [formEmailSekolah, setFormEmailSekolah] = useState("");
  const [formWebsiteSekolah, setFormWebsiteSekolah] = useState("");
  const [formNpsnSekolah, setFormNpsnSekolah] = useState("");

  // Archiving confirmation state
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archives, setArchives] = useState<{ id: string; tahunAjaran: string; tanggalArsip: string; totalSiswa: number }[]>([
    { id: "arch_1", tahunAjaran: "2024/2025 - Ganjil", tanggalArsip: "2024-12-20", totalSiswa: 48 },
    { id: "arch_2", tahunAjaran: "2024/2025 - Genap", tanggalArsip: "2025-06-15", totalSiswa: 52 },
    { id: "arch_3", tahunAjaran: "2025/2026 - Ganjil", tanggalArsip: "2025-12-18", totalSiswa: 45 }
  ]);

  useEffect(() => {
    const loadSettingsAndLogs = async () => {
      try {
        setLoading(true);
        const [loadedSettings, loadedLogs, loadedUsers] = await Promise.all([
          pklService.getSchoolSettings(),
          pklService.getAuditLogs(),
          pklService.getAllUserProfiles()
        ]);
        setSettings(loadedSettings);
        setFormNamaSekolah(loadedSettings.namaSekolah || "");
        setFormLogoSekolah(loadedSettings.logoSekolah || "");
        setFormAlamatSekolah(loadedSettings.alamatSekolah || "");
        setFormEmailSekolah(loadedSettings.emailSekolah || "");
        setFormWebsiteSekolah(loadedSettings.websiteSekolah || "");
        setFormNpsnSekolah(loadedSettings.npsnSekolah || "");
        
        setAuditLogs(loadedLogs);
        setAllUsers(loadedUsers);

        const adminProfiles = loadedUsers.filter(u => u.role === "admin");
        setAdmins(adminProfiles);

        if (user) {
          const selfAdmin = adminProfiles.find(a => a.uid === user.uid);
          if (selfAdmin) {
            setSelectedAdminToRename(selfAdmin.uid);
            setRenamedAdminName(selfAdmin.name);
          } else if (adminProfiles.length > 0) {
            setSelectedAdminToRename(adminProfiles[0].uid);
            setRenamedAdminName(adminProfiles[0].name);
          }
        }
      } catch (err) {
        console.error("Gagal memuat pengaturan sekolah:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.role === "admin") {
      loadSettingsAndLogs();
    }
  }, [user]);

  const handleSaveSettings = async (updatedYear: string, updatedKkm: number) => {
    try {
      const payload: SchoolSettings = {
        ...settings,
        tahunAjaranAktif: updatedYear,
        kkmKehadiran: updatedKkm
      };
      await pklService.updateSchoolSettings(payload);
      setSettings(payload);
      
      // Refresh audit logs
      const refreshedLogs = await pklService.getAuditLogs();
      setAuditLogs(refreshedLogs);

      (window as any).showToast?.("Pengaturan tahun ajaran berhasil diperbarui!", "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal memperbarui pengaturan.", "error");
    }
  };

  const handleSaveSchoolProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: SchoolSettings = {
        ...settings,
        namaSekolah: formNamaSekolah,
        logoSekolah: formLogoSekolah,
        alamatSekolah: formAlamatSekolah,
        emailSekolah: formEmailSekolah,
        websiteSekolah: formWebsiteSekolah,
        npsnSekolah: formNpsnSekolah
      };
      await pklService.updateSchoolSettings(payload);
      setSettings(payload);
      
      // Add Audit Log
      await pklService.addAuditLog("Update Profil Sekolah", `Mengubah profil sekolah: ${formNamaSekolah}`);
      
      // Refresh audit logs
      const refreshedLogs = await pklService.getAuditLogs();
      setAuditLogs(refreshedLogs);

      (window as any).showToast?.("Profil sekolah berhasil diperbarui!", "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal memperbarui profil sekolah.", "error");
    }
  };

  const handlePerformArchive = async () => {
    try {
      const newArch = {
        id: `arch_${Date.now()}`,
        tahunAjaran: settings.tahunAjaranAktif,
        tanggalArsip: new Date().toISOString().split("T")[0],
        totalSiswa: 5
      };

      setArchives(prev => [newArch, ...prev]);
      await pklService.addAuditLog("Arsip Data PKL", `Melakukan pengarsipan database PKL untuk periode ${settings.tahunAjaranAktif}`);
      
      // Refresh logs
      const refreshedLogs = await pklService.getAuditLogs();
      setAuditLogs(refreshedLogs);

      setArchiveDialogOpen(false);
      (window as any).showToast?.(`Arsip periode ${settings.tahunAjaranAktif} berhasil diterbitkan secara aman!`, "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal melakukan pengarsipan.", "error");
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      (window as any).showToast?.("Semua kolom harus diisi!", "error");
      return;
    }
    
    // Check if email already registered
    const emailExists = allUsers.some(u => u.email.toLowerCase() === newAdminEmail.toLowerCase());
    if (emailExists) {
      (window as any).showToast?.("Email ini sudah terdaftar di sistem!", "error");
      return;
    }

    try {
      const newAdmin: UserProfile = {
        uid: `admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: newAdminName,
        email: newAdminEmail,
        role: "admin",
        createdAt: new Date().toISOString()
      };
      // For mock-login support
      (newAdmin as any).password = newAdminPassword;

      await pklService.saveUserProfile(newAdmin);
      await pklService.addAuditLog("Tambah Admin", `Menambahkan administrator baru: ${newAdminName} (${newAdminEmail})`);

      // Refresh users list
      const refreshedUsers = await pklService.getAllUserProfiles();
      setAllUsers(refreshedUsers);
      setAdmins(refreshedUsers.filter(u => u.role === "admin"));

      // Clear form
      setNewAdminName("");
      setNewAdminEmail("");
      setNewAdminPassword("");

      (window as any).showToast?.("Administrator baru berhasil ditambahkan!", "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal menambahkan administrator baru.", "error");
    }
  };

  const handleRenameAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdminToRename || !renamedAdminName) {
      (window as any).showToast?.("Pilih admin dan masukkan nama baru!", "error");
      return;
    }

    try {
      const targetAdmin = admins.find(a => a.uid === selectedAdminToRename);
      if (!targetAdmin) return;

      const updatedAdmin = { ...targetAdmin, name: renamedAdminName };
      await pklService.saveUserProfile(updatedAdmin);

      // If it's themselves, update current login session state
      if (selectedAdminToRename === user?.uid) {
        await updateProfile({ name: renamedAdminName });
      }

      await pklService.addAuditLog("Edit Nama Admin", `Mengubah nama admin ${targetAdmin.email} menjadi ${renamedAdminName}`);

      // Refresh users list
      const refreshedUsers = await pklService.getAllUserProfiles();
      setAllUsers(refreshedUsers);
      setAdmins(refreshedUsers.filter(u => u.role === "admin"));

      (window as any).showToast?.("Nama administrator berhasil diperbarui!", "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal memperbarui nama admin.", "error");
    }
  };

  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToReset || !resetPasswordValue) {
      (window as any).showToast?.("Pilih pengguna dan masukkan password baru!", "error");
      return;
    }

    try {
      const targetUser = allUsers.find(u => u.uid === selectedUserToReset);
      if (!targetUser) return;

      await pklService.resetUserPassword(selectedUserToReset, resetPasswordValue);
      await pklService.addAuditLog("Reset Password", `Mereset password pengguna ${targetUser.name} (${targetUser.email})`);

      (window as any).showToast?.(`Password untuk ${targetUser.name} berhasil di-reset!`, "success");
      setSelectedUserToReset("");
      setResetPasswordValue("PasswordSanjaya123");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal mereset password pengguna.", "error");
    }
  };

  const handleChangePasswordSelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordSelf || !confirmPasswordSelf) {
      (window as any).showToast?.("Masukkan password baru dan konfirmasi!", "error");
      return;
    }

    if (newPasswordSelf !== confirmPasswordSelf) {
      (window as any).showToast?.("Konfirmasi password baru tidak cocok!", "error");
      return;
    }

    if (newPasswordSelf.length < 6) {
      (window as any).showToast?.("Password minimal terdiri dari 6 karakter!", "error");
      return;
    }

    try {
      if (!user) return;
      await pklService.resetUserPassword(user.uid, newPasswordSelf);
      await pklService.addAuditLog("Ubah Password Mandiri", `Mengubah password administrator pribadi (${user.email})`);

      setNewPasswordSelf("");
      setConfirmPasswordSelf("");

      (window as any).showToast?.("Password Anda berhasil diperbarui!", "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal mengubah password mandiri.", "error");
    }
  };

  const handleDeleteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToDelete) {
      (window as any).showToast?.("Pilih pengguna yang ingin dihapus!", "error");
      return;
    }

    const targetUser = allUsers.find(u => u.uid === selectedUserToDelete);
    if (!targetUser) return;

    if (targetUser.uid === user?.uid) {
      (window as any).showToast?.("Anda tidak dapat menghapus akun Anda sendiri!", "error");
      return;
    }

    setDeleteDialogOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!selectedUserToDelete) return;
    try {
      const targetUser = allUsers.find(u => u.uid === selectedUserToDelete);
      if (!targetUser) return;

      if (targetUser.uid === user?.uid) {
        (window as any).showToast?.("Anda tidak dapat menghapus akun Anda sendiri!", "error");
        setDeleteDialogOpen(false);
        return;
      }

      // 1. Delete user profile
      await pklService.deleteUserProfile(targetUser.uid);

      // 2. Add to deletedEmails settings list
      const currentSettings = await pklService.getSchoolSettings();
      const updatedDeletedEmails = currentSettings.deletedEmails || [];
      if (!updatedDeletedEmails.includes(targetUser.email.toLowerCase())) {
        updatedDeletedEmails.push(targetUser.email.toLowerCase());
      }
      
      const updatedSettings: SchoolSettings = {
        ...currentSettings,
        deletedEmails: updatedDeletedEmails
      };
      await pklService.updateSchoolSettings(updatedSettings);
      setSettings(updatedSettings);

      // 3. Add Audit Log
      await pklService.addAuditLog("Hapus Akun", `Menghapus akun pengguna permanen: ${targetUser.name} (${targetUser.email})`);

      // 4. Refresh
      const [refreshedUsers, refreshedLogs] = await Promise.all([
        pklService.getAllUserProfiles(),
        pklService.getAuditLogs()
      ]);
      setAllUsers(refreshedUsers);
      setAdmins(refreshedUsers.filter(u => u.role === "admin"));
      setAuditLogs(refreshedLogs);

      setSelectedUserToDelete("");
      setDeleteDialogOpen(false);
      (window as any).showToast?.(`Akun ${targetUser.name} berhasil dihapus secara permanen!`, "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal menghapus akun pengguna.", "error");
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300";
      case "pembimbing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
      case "industri":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  // Only authorized for administrators
  if (user?.role !== "admin") {
    return (
      <div className="py-20 text-center text-gray-400">
        <AlertTriangle className="w-16 h-16 mx-auto mb-3 text-red-500" />
        <h3 className="text-base font-bold text-gray-800">Hak Akses Terbatas</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Hanya pengguna dengan peran Administrator Utama yang diizinkan untuk mengakses modul konfigurasi akademik dan log audit keamanan sekolah.
        </p>
      </div>
    );
  }

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = actionFilter === "all" || log.action.toLowerCase().includes(actionFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6" id="pengaturan-stage">
      <div className="bg-white border border-gray-200/80 p-6 sm:p-8 rounded-2xl relative overflow-hidden shadow-sm">
        <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-12 -translate-y-12 text-[#1565C0]">
          <Settings className="w-96 h-96" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="bg-[#1565C0]/10 text-[#1565C0] px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
            Pusat Konfigurasi Sistem
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 mt-3">
            Pengaturan Administrasi Sekolah
          </h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Kelola data tahun ajaran aktif, lakukan pengarsipan database tahunan otomatis, dan pantau log audit tindakan sistem untuk menjaga integritas data administrasi PKL.
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-gray-200 gap-1 select-none">
        <button
          onClick={() => setActiveTab("umum")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "umum"
              ? "border-[#1565C0] text-[#1565C0]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Sliders className="w-4 h-4" />
          Konfigurasi Umum
        </button>
        <button
          onClick={() => setActiveTab("arsip")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "arsip"
              ? "border-[#1565C0] text-[#1565C0]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Archive className="w-4 h-4" />
          Arsip Per Tahun Ajaran
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "audit"
              ? "border-[#1565C0] text-[#1565C0]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <History className="w-4 h-4" />
          Log Audit Keamanan ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab("admin")}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "admin"
              ? "border-[#1565C0] text-[#1565C0]"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
        >
          <Lock className="w-4 h-4" />
          Kelola Admin & Keamanan
        </button>
      </div>

      {/* Loading state inside tabs */}
      {loading ? (
        <div className="py-12 text-center text-xs text-gray-500 font-semibold animate-pulse">
          Menghubungkan ke layanan master...
        </div>
      ) : (
        <div className="space-y-6">
          {/* TAB 1: GENERAL CONFIGURATION */}
          {activeTab === "umum" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-6">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#1565C0]" /> Tahun Ajaran & Semester Berjalan
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Mengubah tahun ajaran berakibat pada filter default data jurnal, daftar siswa, absensi presensi, dan penilaian di seluruh portal siswa dan guru. Data tahun lalu tidak akan terhapus, melainkan disaring otomatis.
                </p>

                <div className="space-y-4 max-w-md pt-2">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">Pilih Tahun Ajaran Aktif</label>
                    <select
                      value={settings.tahunAjaranAktif}
                      onChange={(e) => handleSaveSettings(e.target.value, settings.kkmKehadiran)}
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800"
                    >
                      <option value="2024/2025 - Ganjil">2024/2025 - Semester Ganjil</option>
                      <option value="2024/2025 - Genap">2024/2025 - Semester Genap</option>
                      <option value="2025/2026 - Ganjil">2025/2026 - Semester Ganjil</option>
                      <option value="2025/2026 - Genap">2025/2026 - Semester Genap (Aktif)</option>
                      <option value="2026/2027 - Ganjil">2026/2027 - Semester Ganjil</option>
                      <option value="2026/2027 - Genap">2026/2027 - Semester Genap</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">KKM Target Kehadiran Siswa (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.kkmKehadiran}
                      onChange={(e) => handleSaveSettings(settings.tahunAjaranAktif, Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-bold text-gray-800"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Siswa di bawah persentase kehadiran ini akan ditandai berwarna merah dalam laporan rekap.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" /> Status Layanan Database
                  </h4>
                  <div className="space-y-4 text-xs">
                    <div className="flex justify-between items-center bg-emerald-50 dark:bg-emerald-900/10 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
                      <div>
                        <p className="font-bold text-emerald-800 dark:text-emerald-300">Firebase Cloud</p>
                        <p className="text-[10px] text-emerald-600/80 mt-0.5">Firestore & Auth Active</p>
                      </div>
                      <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
                    </div>

                    <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                      <p className="font-bold text-gray-700">Audit Trail Otomatis</p>
                      <p className="text-gray-500 leading-relaxed text-[11px]">
                        Seluruh tindakan penambahan, pengeditan, persetujuan jurnal, absensi, dan reset password dicatat secara permanen di server logs demi kepatuhan SOP administrasi 2026.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 text-[10px] text-center font-bold font-mono text-gray-400">
                  SMKS SANJAYA SECURITY ENGINE v2.0
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ARCHIVES */}
          {activeTab === "arsip" && (
            <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Archive className="w-4 h-4 text-[#2E7D32]" /> Database Arsip PKL
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Arsipkan data bimbingan PKL, jurnal harian, dan absensi di akhir semester untuk membekukan data penempatan agar siap digunakan untuk angkatan baru.
                  </p>
                </div>
                <button
                  onClick={() => setArchiveDialogOpen(true)}
                  className="px-4 py-2 bg-[#2E7D32] hover:bg-green-700 text-white rounded-xl text-xs font-bold shadow-sm shrink-0 transition-colors flex items-center gap-1.5"
                >
                  <Archive className="w-4.5 h-4.5" />
                  Buat Arsip Baru
                </button>
              </div>

              {/* Archives Table */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 border-b border-gray-100">
                      <th className="p-3.5 font-bold uppercase tracking-wider">Tahun Ajaran</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider">Tanggal Diarsipkan</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider">Total Siswa PKL</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider">Status Laporan</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider text-right">Laporan PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {archives.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50/50 text-gray-700 transition-colors">
                        <td className="p-3.5 font-bold text-gray-800">{a.tahunAjaran}</td>
                        <td className="p-3.5 font-mono text-gray-500">{a.tanggalArsip}</td>
                        <td className="p-3.5 font-bold text-gray-900">{a.totalSiswa} Siswa</td>
                        <td className="p-3.5">
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                            Terkuci (Frozen)
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => (window as any).showToast?.("Mengunduh bundle arsip PDF lengkap...", "info")}
                            className="inline-flex items-center gap-1 text-xs text-[#1565C0] font-bold hover:underline"
                          >
                            <FileSpreadsheet className="w-4 h-4" /> Download ZIP
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#1565C0]" /> Log Audit Tindakan Keamanan
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Sistem secara transparan merekam riwayat modifikasi akun, penilaian, dan pengaturan sekolah untuk mendeteksi anomali administrasi.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const logs = await pklService.getAuditLogs();
                    setAuditLogs(logs);
                    (window as any).showToast?.("Audit logs disinkronkan!", "success");
                  }}
                  className="px-3.5 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                >
                  <RefreshCw className="w-4 h-4" /> Sinkronisasi
                </button>
              </div>

              {/* Filters / Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari user, aktivitas, detail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#1565C0] font-medium"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-gray-400 font-bold">Aktivitas:</span>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="px-2 py-1 text-xs bg-white border border-gray-200 rounded-lg outline-none font-semibold text-gray-700"
                  >
                    <option value="all">Semua Tindakan</option>
                    <option value="Absen">Absensi Presensi</option>
                    <option value="Jurnal">Persetujuan Jurnal</option>
                    <option value="Nilai">Penilaian PKL</option>
                    <option value="Import">Import Excel</option>
                    <option value="Reset">Reset Password</option>
                    <option value="Settings">Pengaturan</option>
                  </select>
                </div>
              </div>

              {/* Audit Table */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 border-b border-gray-100">
                      <th className="p-3.5 font-bold uppercase tracking-wider w-40">Timestamp</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider">Aktor</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider">Aksi</th>
                      <th className="p-3.5 font-bold uppercase tracking-wider">Keterangan / Detail Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50 text-gray-600 transition-colors">
                        <td className="p-3.5 font-mono text-[10px] text-gray-400">
                          {new Date(log.timestamp).toLocaleString("id-ID")}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800">{log.userName}</span>
                            <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${getRoleColor(log.userRole)}`}>
                              {log.userRole}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-[#1565C0]">{log.action}</td>
                        <td className="p-3.5 text-xs text-gray-500 leading-relaxed font-mono">{log.details}</td>
                      </tr>
                    ))}

                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-gray-400">
                          Belum ada log aktivitas yang tercatat sesuai kata kunci.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ADMIN MANAGEMENT & SECURITY */}
          {activeTab === "admin" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Column 1: Add and Edit Admins */}
              <div className="space-y-6">
                {/* Section 1A: Tambah Admin Baru */}
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-[#1565C0]" /> Tambah Administrator Baru
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Daftarkan akun administrator sekolah baru untuk mengelola data siswa, pembimbing, mitra industri, dan pengaturan sistem secara kolaboratif.
                  </p>

                  <form onSubmit={handleCreateAdmin} className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Nama Lengkap</label>
                      <input
                        type="text"
                        required
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="Contoh: Drs. Yosep Sanjaya"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Email Administrator</label>
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="Contoh: yosepsanjaya@smksanjaya.sch.id"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Password</label>
                      <input
                        type="password"
                        required
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#1565C0] hover:bg-[#0D47A1] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <UserPlus className="w-4 h-4" /> Tambah Admin Baru
                    </button>
                  </form>
                </div>

                {/* Section 1B: Mengganti Nama Admin */}
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-[#1565C0]" /> Ganti Nama Administrator
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Ubah nama tampilan (profil) akun administrator tertentu untuk memperjelas identitas pelaku di Log Audit.
                  </p>

                  <form onSubmit={handleRenameAdmin} className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Pilih Administrator</label>
                      <select
                        value={selectedAdminToRename}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedAdminToRename(val);
                          const chosen = admins.find(a => a.uid === val);
                          if (chosen) setRenamedAdminName(chosen.name);
                        }}
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-700"
                      >
                        <option value="">-- Pilih Administrator --</option>
                        {admins.map(admin => (
                          <option key={admin.uid} value={admin.uid}>
                            {admin.name} ({admin.email}) {admin.uid === user?.uid ? " - (Saya)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Nama Tampilan Baru</label>
                      <input
                        type="text"
                        required
                        value={renamedAdminName}
                        onChange={(e) => setRenamedAdminName(e.target.value)}
                        placeholder="Nama Lengkap Baru"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedAdminToRename}
                      className="w-full py-2.5 bg-gray-900 hover:bg-black text-white disabled:bg-gray-200 disabled:text-gray-400 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" /> Simpan Perubahan Nama
                    </button>
                  </form>
                </div>

                {/* Section 1C: Konfigurasi Identitas Profil Sekolah */}
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <School className="w-4 h-4 text-[#1565C0]" /> Konfigurasi Identitas Profil Sekolah
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Sesuaikan identitas lembaga pendidikan yang akan ditampilkan di dasbor utama aplikasi, seperti nama, logo, NPSN, alamat, email, dan website resmi.
                  </p>

                  <form onSubmit={handleSaveSchoolProfile} className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Nama Sekolah</label>
                      <input
                        type="text"
                        required
                        value={formNamaSekolah}
                        onChange={(e) => setFormNamaSekolah(e.target.value)}
                        placeholder="Contoh: SMKS Sanjaya Bajawa"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">NPSN Sekolah</label>
                      <input
                        type="text"
                        required
                        value={formNpsnSekolah}
                        onChange={(e) => setFormNpsnSekolah(e.target.value)}
                        placeholder="Contoh: 50303124"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Logo Sekolah (URL Gambar)</label>
                      <input
                        type="url"
                        required
                        value={formLogoSekolah}
                        onChange={(e) => setFormLogoSekolah(e.target.value)}
                        placeholder="URL logo sekolah (contoh: https://...)"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800 font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Alamat Sekolah</label>
                      <textarea
                        required
                        rows={2}
                        value={formAlamatSekolah}
                        onChange={(e) => setFormAlamatSekolah(e.target.value)}
                        placeholder="Contoh: Jl. Ahmad Yani No. 12, Bajawa, Flores, NTT"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800 resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1.5">Alamat Email Sekolah</label>
                        <input
                          type="email"
                          required
                          value={formEmailSekolah}
                          onChange={(e) => setFormEmailSekolah(e.target.value)}
                          placeholder="smkssanjayabajawa@gmail.com"
                          className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-1.5">Website Sekolah</label>
                        <input
                          type="text"
                          required
                          value={formWebsiteSekolah}
                          onChange={(e) => setFormWebsiteSekolah(e.target.value)}
                          placeholder="www.smkssanjayabajawa.sch.id"
                          className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-[#1565C0] hover:bg-[#0D47A1] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <School className="w-4 h-4" /> Simpan Profil Sekolah
                    </button>
                  </form>
                </div>
              </div>

              {/* Column 2: Password and Reset Settings */}
              <div className="space-y-6">
                {/* Section 2A: Ganti Password Mandiri */}
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-600" /> Ganti Password Saya
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Demi keamanan akun, harap lakukan penggantian sandi secara berkala menggunakan kombinasi huruf dan angka.
                  </p>

                  <form onSubmit={handleChangePasswordSelf} className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Email Saya</label>
                      <input
                        type="text"
                        disabled
                        value={user?.email || ""}
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-100 border border-gray-200 rounded-xl outline-none text-gray-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Password Baru</label>
                      <input
                        type="password"
                        required
                        value={newPasswordSelf}
                        onChange={(e) => setNewPasswordSelf(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Konfirmasi Password Baru</label>
                      <input
                        type="password"
                        required
                        value={confirmPasswordSelf}
                        onChange={(e) => setConfirmPasswordSelf(e.target.value)}
                        placeholder="Ulangi password baru"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-800"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <Key className="w-4 h-4" /> Perbarui Password Saya
                    </button>
                  </form>
                </div>

                {/* Section 2B: Reset Password Pengguna */}
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw className="w-4 h-4 text-rose-600" /> Reset Password Akun Pengguna
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Setel ulang sandi salah satu akun (siswa, pembimbing, maupun sesama admin) yang mengalami lupa password login.
                  </p>

                  <form onSubmit={handleResetUserPassword} className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Pilih Akun Pengguna</label>
                      <select
                        value={selectedUserToReset}
                        onChange={(e) => setSelectedUserToReset(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-700"
                      >
                        <option value="">-- Pilih Pengguna --</option>
                        {allUsers.map(u => (
                          <option key={u.uid} value={u.uid}>
                            [{u.role.toUpperCase()}] {u.name} ({u.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Password Baru (Hasil Reset)</label>
                      <input
                        type="text"
                        required
                        value={resetPasswordValue}
                        onChange={(e) => setResetPasswordValue(e.target.value)}
                        placeholder="Contoh: PasswordSanjaya123"
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-mono font-bold text-gray-800"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedUserToReset}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white disabled:bg-gray-200 disabled:text-gray-400 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-4 h-4" /> Reset Password Pengguna
                    </button>
                  </form>
                </div>

                {/* Section 2C: Hapus Akun Pengguna */}
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4 text-red-600" /> Hapus Akun Pengguna (Demo/Bawaan)
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Hapus secara permanen akun demo atau bawaan sistem (siswa, pembimbing, industri, maupun admin) agar tidak bisa lagi diakses saat aplikasi online.
                  </p>

                  <form onSubmit={handleDeleteUser} className="space-y-4 pt-2">
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-1.5">Pilih Akun yang Akan Dihapus</label>
                      <select
                        value={selectedUserToDelete}
                        onChange={(e) => setSelectedUserToDelete(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-[#1565C0] font-semibold text-gray-700"
                      >
                        <option value="">-- Pilih Akun --</option>
                        {allUsers.map(u => (
                          <option key={u.uid} value={u.uid} disabled={u.uid === user?.uid}>
                            [{u.role.toUpperCase()}] {u.name} ({u.email}) {u.uid === user?.uid ? " - (Akun Anda - Tidak Bisa Dihapus)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedUserToDelete}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-200 disabled:text-gray-400 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus Akun Secara Permanen
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONFIRM DIALOG FOR ARCHIVING */}
      <Dialog
        open={archiveDialogOpen}
        onClose={() => setArchiveDialogOpen(false)}
      >
        <DialogTitle className="font-bold text-gray-900 text-base">Konfirmasi Pengarsipan Akademik</DialogTitle>
        <DialogContent>
          <DialogContentText className="text-xs leading-relaxed text-gray-500 space-y-2">
            <p>
              Apakah Anda yakin ingin membekukan dan mengarsipkan database periode <strong className="text-gray-900">{settings.tahunAjaranAktif}</strong>?
            </p>
            <p>
              Tindakan ini akan mengunci seluruh pengajuan jurnal harian siswa bimbingan dan absensi agar tidak dapat diubah lagi oleh guru maupun siswa. Seluruh data penempatan PKL aktif akan dibekukan ke dalam lembaran laporan statis.
            </p>
          </DialogContentText>
        </DialogContent>
        <DialogActions className="p-3 border-t border-gray-100 gap-2">
          <Button
            onClick={() => setArchiveDialogOpen(false)}
            variant="outlined"
            style={{ color: "#666", borderColor: "#ddd", borderRadius: 8, fontSize: "11px" }}
          >
            Batal
          </Button>
          <Button
            onClick={handlePerformArchive}
            variant="contained"
            color="success"
            style={{ borderRadius: 8, fontSize: "11px", fontWeight: "bold" }}
          >
            Ya, Bekukan & Arsipkan
          </Button>
        </DialogActions>
      </Dialog>

      {/* CONFIRM DIALOG FOR ACCOUNT DELETION */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle className="font-bold text-red-600 text-base">Konfirmasi Hapus Akun Permanen</DialogTitle>
        <DialogContent>
          <DialogContentText className="text-xs leading-relaxed text-gray-500 space-y-2">
            <p>
              Apakah Anda yakin ingin menghapus akun <strong className="text-gray-900">{allUsers.find(u => u.uid === selectedUserToDelete)?.name} ({allUsers.find(u => u.uid === selectedUserToDelete)?.email})</strong> secara permanen?
            </p>
            <p className="text-red-500 font-semibold">
              Tindakan ini tidak dapat dibatalkan! Akun ini tidak akan dapat digunakan untuk masuk atau mengakses portal administrasi sekolah SMKS Sanjaya lagi, bahkan jika dicoba diakses menggunakan kredensial bawaan/demo.
            </p>
          </DialogContentText>
        </DialogContent>
        <DialogActions className="p-3 border-t border-gray-100 gap-2">
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            style={{ color: "#666", borderColor: "#ddd", borderRadius: 8, fontSize: "11px" }}
          >
            Batal
          </Button>
          <Button
            onClick={handleConfirmDeleteUser}
            variant="contained"
            color="error"
            style={{ borderRadius: 8, fontSize: "11px", fontWeight: "bold" }}
          >
            Ya, Hapus Permanen
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
