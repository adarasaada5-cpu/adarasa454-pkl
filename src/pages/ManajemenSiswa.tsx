import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import { UserProfile, TempatPkl } from "../models/types";
import * as XLSX from "xlsx";
import { 
  Users, 
  Plus, 
  User, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  FileSpreadsheet, 
  Info, 
  Check, 
  X, 
  Upload, 
  Download, 
  Pencil,
  Lock,
  Search,
  Mail,
  GraduationCap,
  Building2,
  Key
} from "lucide-react";

export const ManajemenSiswa: React.FC = () => {
  const { user } = useAuth();
  
  // Data lists
  const [siswaList, setSiswaList] = useState<UserProfile[]>([]);
  const [placements, setPlacements] = useState<TempatPkl[]>([]);
  const [pembimbingList, setPembimbingList] = useState<UserProfile[]>([]);
  
  // App state
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("");
  
  // Form modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState<UserProfile | null>(null);
  
  // Custom delete confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<{ uid: string; name: string } | null>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  
  // Toast and error notification
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Excel Import modal states
  const [isImporting, setIsImporting] = useState(false);
  const [parsedSiswa, setParsedSiswa] = useState<any[]>([]);
  const [parsedDudis, setParsedDudis] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formNisn, setFormNisn] = useState("");
  const [formKelas, setFormKelas] = useState("");
  const [formTempatPklId, setFormTempatPklId] = useState("");
  const [formPembimbingId, setFormPembimbingId] = useState("");
  const [formPassword, setFormPassword] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch all users
      const allUsers = await pklService.getAllUserProfiles();
      
      // Filter siswa (role === 'siswa')
      const siswa = allUsers.filter(u => u.role === "siswa");
      setSiswaList(siswa);

      // Filter pembimbing (role === 'pembimbing')
      const pembimbing = allUsers.filter(u => u.role === "pembimbing");
      setPembimbingList(pembimbing);

      // Fetch placements
      const places = await pklService.getTempatPkl();
      setPlacements(places);
    } catch (err) {
      console.error("Gagal memuat data manajemen siswa:", err);
      setErrorMsg("Gagal memuat data dari database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick helper to fetch the Supervisor name for display
  const getPembimbingName = (pembimbingId?: string) => {
    if (!pembimbingId) return "Belum ditentukan";
    const found = pembimbingList.find(p => p.uid === pembimbingId);
    return found ? found.name : "Pembimbing Tidak Dikenal";
  };

  // Open Add Student Form
  const handleOpenAddForm = () => {
    setEditingSiswa(null);
    setFormName("");
    setFormEmail("");
    setFormNisn("");
    setFormKelas("");
    setFormTempatPklId("");
    setFormPembimbingId("");
    setFormPassword("");
    setSuccessMsg(null);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  // Open Edit Student Form
  const handleOpenEditForm = (siswa: UserProfile) => {
    setEditingSiswa(siswa);
    setFormName(siswa.name);
    setFormEmail(siswa.email);
    setFormNisn(siswa.nisn || "");
    setFormKelas(siswa.kelas || "");
    setFormTempatPklId(siswa.tempatPklId || "");
    setFormPembimbingId(siswa.pembimbingId || "");
    setFormPassword(""); // Always clear password on open, only filled if changing
    setSuccessMsg(null);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  // Form Submission
  const handleSaveSiswa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim() || !formKelas.trim()) {
      setErrorMsg("Nama Lengkap, Email, dan Kelas wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      // Look up placement details
      let selectedPlacementName = "";
      if (formTempatPklId) {
        const placeObj = placements.find(p => p.id === formTempatPklId);
        if (placeObj) {
          selectedPlacementName = placeObj.nama;
        }
      }

      const activeSettings = await pklService.getSchoolSettings();

      if (editingSiswa) {
        // Edit Mode
        const updatedProfile: UserProfile = {
          ...editingSiswa,
          name: formName.trim(),
          email: formEmail.trim(),
          nisn: formNisn.trim(),
          kelas: formKelas.trim(),
          tempatPkl: selectedPlacementName,
          tempatPklId: formTempatPklId || undefined,
          pembimbingId: formPembimbingId || undefined,
        };

        // If a password was entered, update it
        if (formPassword.trim()) {
          updatedProfile.password = formPassword.trim();
        }

        await pklService.saveUserProfile(updatedProfile);
        
        // Log auditing
        await pklService.addAuditLog("Edit Siswa", `Memperbarui data siswa: ${updatedProfile.name}`);
        
        // If password was specifically updated
        if (formPassword.trim()) {
          await pklService.resetUserPassword(editingSiswa.uid, formPassword.trim());
        }

        setSuccessMsg(`Data siswa "${updatedProfile.name}" berhasil diperbarui!`);
      } else {
        // Add Mode
        const newUid = `siswa_${Math.random().toString(36).substring(2, 10)}`;
        const newProfile: UserProfile = {
          uid: newUid,
          name: formName.trim(),
          email: formEmail.trim(),
          role: "siswa",
          nisn: formNisn.trim(),
          kelas: formKelas.trim(),
          tempatPkl: selectedPlacementName,
          tempatPklId: formTempatPklId || undefined,
          pembimbingId: formPembimbingId || undefined,
          tahunAjaran: activeSettings.tahunAjaranAktif,
          password: formPassword.trim() || "PasswordSanjaya123", // fallback default
          createdAt: new Date().toISOString()
        };

        await pklService.saveUserProfile(newProfile);
        await pklService.addAuditLog("Tambah Siswa", `Menambahkan akun siswa baru: ${newProfile.name}`);
        
        setSuccessMsg(`Siswa baru "${newProfile.name}" berhasil didaftarkan!`);
      }

      setIsFormOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Gagal menyimpan data siswa. Pastikan input valid.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Student Profile
  const handleDeleteSiswa = (uid: string, name: string) => {
    setStudentToDelete({ uid, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteSiswa = async () => {
    if (!studentToDelete) return;
    const { uid, name } = studentToDelete;
    try {
      setSuccessMsg(null);
      await pklService.deleteUserProfile(uid);
      await pklService.addAuditLog("Hapus Siswa", `Menghapus akun siswa: ${name}`);
      
      // Trigger Toast notifications on main screen if available
      if ((window as any).showToast) {
        (window as any).showToast(`Akun siswa "${name}" telah dihapus`, "success");
      } else {
        setSuccessMsg(`Akun siswa "${name}" telah dihapus.`);
      }
      await loadData();
    } catch (err) {
      console.error("Gagal menghapus siswa:", err);
      setErrorMsg("Gagal menghapus data siswa.");
    } finally {
      setDeleteConfirmOpen(false);
      setStudentToDelete(null);
    }
  };

  const [selectedSiswaIds, setSelectedSiswaIds] = useState<string[]>([]);

  const handleDeleteSiswaBulk = () => {
    if (selectedSiswaIds.length === 0) return;
    setBulkDeleteConfirmOpen(true);
  };

  const confirmDeleteSiswaBulk = async () => {
    try {
      setLoading(true);
      setSuccessMsg(null);
      await Promise.all(selectedSiswaIds.map(uid => pklService.deleteUserProfile(uid)));
      await pklService.addAuditLog("Hapus Siswa Massal", `Menghapus ${selectedSiswaIds.length} akun siswa`);
      
      if ((window as any).showToast) {
        (window as any).showToast(`${selectedSiswaIds.length} akun siswa telah dihapus`, "success");
      } else {
        setSuccessMsg(`${selectedSiswaIds.length} akun siswa telah dihapus.`);
      }
      setSelectedSiswaIds([]);
      await loadData();
    } catch (err) {
      console.error("Gagal menghapus siswa massal:", err);
      setErrorMsg("Gagal menghapus beberapa data siswa.");
    } finally {
      setLoading(false);
      setBulkDeleteConfirmOpen(false);
    }
  };

  // --- HANDLERS FOR IMPORTING STUDENTS FROM EXCEL ---
  const handleOpenImportModal = () => {
    setParsedSiswa([]);
    setImportError(null);
    setImportSuccess(null);
    setIsImporting(true);
  };

  const processExcelFile = (file: File) => {
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error("Gagal membaca berkas.");

        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rawRows.length === 0) {
          setImportError("File Excel kosong atau tidak terbaca.");
          return;
        }

        const list: typeof parsedSiswa = [];
        const dudiList: any[] = [];
        const seenDudis = new Set<string>();
        let startRow = 0;

        const firstRow = rawRows[0];
        
        // Let's identify which template is uploaded
        const headersLower = firstRow ? firstRow.map(cell => String(cell || "").toLowerCase().trim()) : [];
        const isUnifiedTemplate = headersLower.some(h => h.includes("dudi") || h.includes("pemilik") || h.includes("peserta") || h.includes("jurus"));

        if (isUnifiedTemplate) {
          // Unified DUDI + Student format from the image
          let currentDUDI: {
            nama: string;
            pimpinan: string;
            noHp: string;
            alamat: string;
            kuota: number;
          } | null = null;

          // Find column indices based on header names or use defaults matching the exact columns in the image:
          // A: NO, B: Nama DUDI, C: Nama Pemilik, D: NO HP, E: Alamat, F: Pilih Jurus, G: Jumlah Pe, H: NAMA PESERTA
          const dudiIdx = headersLower.findIndex(h => h.includes("dudi")) !== -1 ? headersLower.findIndex(h => h.includes("dudi")) : 1;
          const pemilikIdx = headersLower.findIndex(h => h.includes("pemilik")) !== -1 ? headersLower.findIndex(h => h.includes("pemilik")) : 2;
          const hpIdx = headersLower.findIndex(h => h.includes("hp")) !== -1 ? headersLower.findIndex(h => h.includes("hp")) : 3;
          const alamatIdx = headersLower.findIndex(h => h.includes("alamat")) !== -1 ? headersLower.findIndex(h => h.includes("alamat")) : 4;
          const jurusIdx = headersLower.findIndex(h => h.includes("jurus")) !== -1 ? headersLower.findIndex(h => h.includes("jurus")) : 5;
          const kuotaIdx = headersLower.findIndex(h => h.includes("jumlah") || h.includes("pe")) !== -1 ? headersLower.findIndex(h => h.includes("jumlah") || h.includes("pe")) : 6;
          const pesertaIdx = headersLower.findIndex(h => h.includes("peserta")) !== -1 ? headersLower.findIndex(h => h.includes("peserta")) : 7;

          startRow = 1;

          for (let i = startRow; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const rowDudi = row[dudiIdx] ? String(row[dudiIdx]).trim() : "";
            const rowPemilik = row[pemilikIdx] ? String(row[pemilikIdx]).trim() : "";
            const rowHp = row[hpIdx] ? String(row[hpIdx]).trim() : "";
            const rowAlamat = row[alamatIdx] ? String(row[alamatIdx]).trim() : "";
            const rowJurus = row[jurusIdx] ? String(row[jurusIdx]).trim() : "";
            const rowKuota = row[kuotaIdx] ? Number(row[kuotaIdx]) : null;
            const rowPeserta = row[pesertaIdx] ? String(row[pesertaIdx]).trim() : "";

            // If a DUDI is specified in this row, we update currentDUDI
            if (rowDudi) {
              currentDUDI = {
                nama: rowDudi,
                // If phone number is specified, append it to pimpinan info to preserve it
                pimpinan: rowHp ? `${rowPemilik || "Pimpinan"} (Hub: ${rowHp})` : (rowPemilik || "Pimpinan"),
                noHp: rowHp,
                alamat: rowAlamat || "Alamat belum ditentukan",
                kuota: rowKuota || 2
              };
              const normalized = rowDudi.toLowerCase().trim();
              if (!seenDudis.has(normalized)) {
                seenDudis.add(normalized);
                dudiList.push({ ...currentDUDI });
              }
            }

            // If we have a student name on this row, add to list
            if (rowPeserta) {
              const dudiName = currentDUDI ? currentDUDI.nama : "";
              const studentEmail = `${rowPeserta.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/\s+/g, "")}@siswa.sch.id`;
              const randomNisn = `008${Math.floor(1000000 + Math.random() * 9000000)}`;
              const studentClass = rowJurus || "XII";

              list.push({
                name: rowPeserta,
                email: studentEmail,
                nisn: randomNisn,
                kelas: studentClass,
                isUnified: true,
                dudiInfo: currentDUDI ? { ...currentDUDI } : null,
                tempatPkl: dudiName
              });
            }
          }
        } else {
          // Standard simple student list format
          const isHeader = firstRow && firstRow.some(cell => {
            const val = String(cell || "").toLowerCase();
            return val.includes("nama") || val.includes("email") || val.includes("nisn") || val.includes("kelas");
          });

          if (isHeader) {
            startRow = 1;
          }

          for (let i = startRow; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const name = row[0] ? String(row[0]).trim() : "";
            if (!name) continue;

            const email = row[1] ? String(row[1]).trim() : `${name.toLowerCase().replace(/\s+/g, "")}@siswa.sch.id`;
            const nisn = row[2] ? String(row[2]).trim() : `008${Math.floor(1000000 + Math.random() * 9000000)}`;
            const kelas = row[3] ? String(row[3]).trim() : "XII TKJ";

            list.push({ name, email, nisn, kelas });
          }
        }

        if (list.length === 0) {
          setImportError("Tidak menemukan data siswa yang valid di file Excel ini.");
        } else {
          setParsedSiswa(list);
          setParsedDudis(dudiList);
        }
      } catch (err: any) {
        console.error(err);
        setImportError("Format berkas Excel tidak valid atau rusak. Silakan gunakan format file yang didukung (.xlsx, .xls, .csv).");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (["xlsx", "xls", "csv"].includes(ext || "")) {
        processExcelFile(file);
      } else {
        setImportError("Format file tidak didukung. Harap unggah berkas Excel (.xlsx / .xls) atau CSV.");
      }
    }
  };

  const handleDownloadTemplate = () => {
    // Exact columns requested by user matching the image
    const headers = [
      "NO",
      "Nama DUDI",
      "Nama Pemilik",
      "NO HP",
      "Alamat",
      "Pilih Jurus",
      "Jumlah Pe",
      "NAMA PESERTA"
    ];

    const mockData = [
      [1, "MAHAN RAKYAT KAB. NGADA", "Daniel Kopong", "081339442710", "Ibaumuku, Bajawa, Ngada", "XII TITL", 3, "NIKOLAUS L. A. KILA"],
      ["", "", "", "", "", "XII TITL", "", "YOSEPH KEYS EREKE"],
      ["", "", "", "", "", "XII TITL", "", "MARSELINO NONO"],
      [2, "NDUNG ELEKTRIK SERVICE", "Gilbertus Mor", "081338423200", "Bong, Bajawa, Ngada", "TEI", 2, "MELKIADESALDINO RATO"],
      ["", "", "", "", "", "TEI", "", "ROMOALDUS BELU"]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...mockData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template PKL");

    // Style the sheet columns nicely
    ws["!cols"] = [
      { wch: 6 },   // NO
      { wch: 30 },  // Nama DUDI
      { wch: 20 },  // Nama Pemilik
      { wch: 15 },  // NO HP
      { wch: 25 },  // Alamat
      { wch: 15 },  // Pilih Jurus
      { wch: 12 },  // Jumlah Pe
      { wch: 28 }   // NAMA PESERTA
    ];

    XLSX.writeFile(wb, "Format_Import_PKL_Siswa_DUDI.xlsx");
  };

  const handleProcessImport = async () => {
    if (parsedSiswa.length === 0) {
      setImportError("Tidak ada data siswa yang valid untuk di-import.");
      return;
    }

    try {
      setIsSubmittingImport(true);
      setImportError(null);

      const isUnified = parsedSiswa.some(s => s.isUnified);
      let payload: any[] = [];

      if (isUnified) {
        // 1. Fetch latest placements so we don't duplicate existing ones
        const latestPlacements = await pklService.getTempatPkl();
        const dudiMap: { [nama: string]: TempatPkl } = {};

        // Create ALL parsed DUDIs (all 112 of them!)
        for (const d of parsedDudis) {
          const dudiName = d.nama;
          if (!dudiMap[dudiName]) {
            let existing = latestPlacements.find(p => p.nama.toLowerCase().trim() === dudiName.toLowerCase().trim());
            if (!existing) {
              const studentsInDudi = parsedSiswa.filter(x => x.tempatPkl?.toLowerCase().trim() === dudiName.toLowerCase().trim());
              const computedKuota = d.kuota || studentsInDudi.length || 2;

              existing = await pklService.addTempatPkl({
                nama: d.nama,
                pimpinan: d.pimpinan,
                alamat: d.alamat,
                kuota: computedKuota
              });
            }
            dudiMap[dudiName] = existing;
          }
        }

        // 2. Map student records with the created/resolved partner details
        payload = parsedSiswa.map(s => {
          const resolvedDudi = s.tempatPkl ? dudiMap[s.tempatPkl] : null;
          return {
            name: s.name,
            email: s.email,
            nisn: s.nisn,
            kelas: s.kelas,
            tempatPkl: resolvedDudi ? resolvedDudi.nama : "",
            tempatPklId: resolvedDudi ? resolvedDudi.id : ""
          };
        });
      } else {
        payload = parsedSiswa.map(s => ({
          name: s.name,
          email: s.email,
          nisn: s.nisn,
          kelas: s.kelas,
          tempatPkl: s.tempatPkl || "",
          tempatPklId: s.tempatPklId || ""
        }));
      }

      await pklService.importSiswaBulk(payload);
      
      setImportSuccess(`Berhasil mengimpor ${parsedSiswa.length} data siswa magang baru dan mendaftarkan ${parsedDudis.length} mitra industri secara otomatis sesuai format Excel!`);
      setParsedSiswa([]);
      setParsedDudis([]);
      
      await loadData();

      setTimeout(() => {
        setIsImporting(false);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setImportError(err?.message || "Terjadi kesalahan internal saat memproses import siswa.");
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // Filtering list
  const filteredSiswa = siswaList.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.nisn && s.nisn.includes(searchQuery)) ||
      (s.tempatPkl && s.tempatPkl.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesClass = classFilter === "" || s.kelas?.toLowerCase().includes(classFilter.toLowerCase());
    
    return matchesSearch && matchesClass;
  });

  return (
    <div className="space-y-6" id="siswa-management-root">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-[#1565C0]" /> Manajemen Siswa PKL
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Daftarkan, perbarui profil, ubah password akun, dan import data siswa magang secara massal.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleOpenImportModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors shadow-md hover:shadow-lg cursor-pointer"
            id="btn-import-siswa-excel"
          >
            <FileSpreadsheet className="w-4 h-4" /> Import Excel (.xlsx)
          </button>
          <button
            onClick={handleOpenAddForm}
            className="flex items-center gap-2 bg-[#1565C0] hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors shadow-md hover:shadow-lg cursor-pointer"
            id="btn-add-siswa-manual"
          >
            <Plus className="w-4 h-4" /> Registrasi Siswa Baru
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-teal-50 border border-teal-200 text-teal-800 p-4 rounded-xl flex items-start gap-3 text-xs font-semibold shadow-xs animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-[#C62828] p-4 rounded-xl flex items-start gap-3 text-xs font-semibold shadow-xs animate-fade-in">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* FILTER & SEARCH */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white dark:bg-gray-850 p-4 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-xs">
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari siswa berdasarkan nama, email, NISN, atau mitra PKL..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-gray-100"
          />
        </div>
        <div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full py-2 px-3 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-gray-100"
          >
            <option value="">Semua Kelas</option>
            <option value="TKJ">TKJ (Teknik Komputer & Jaringan)</option>
            <option value="Multimedia">Multimedia / DKV</option>
            <option value="RPL">RPL (Rekayasa Perangkat Lunak)</option>
            <option value="XII">Kelas XII (Semua)</option>
            <option value="XI">Kelas XI (Semua)</option>
          </select>
        </div>
      </div>

      {/* BULK ACTIONS FOR SISWA */}
      {!loading && filteredSiswa.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-gray-700 dark:text-gray-300">
              Terpilih: {selectedSiswaIds.length} dari {filteredSiswa.length} Siswa
            </span>
          </div>

          {selectedSiswaIds.length > 0 && (
            <button
              onClick={handleDeleteSiswaBulk}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-md hover:shadow-lg cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Akun Terpilih ({selectedSiswaIds.length})
            </button>
          )}
        </div>
      )}

      {/* SISWA TABLE STAGE */}
      {loading ? (
        <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-xs">
          <div className="w-10 h-10 border-4 border-[#1565C0]/30 border-t-[#1565C0] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-gray-500 font-medium">Sedang memuat data siswa PKL dari database...</p>
        </div>
      ) : filteredSiswa.length === 0 ? (
        <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-xs">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Tidak Ada Data Siswa</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Tidak ada siswa magang yang cocok dengan kueri pencarian atau filter kelas Anda.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-150 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4 pl-6 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filteredSiswa.length > 0 && selectedSiswaIds.length === filteredSiswa.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedSiswaIds(filteredSiswa.map(s => s.uid));
                        } else {
                          setSelectedSiswaIds([]);
                        }
                      }}
                      className="w-4 h-4 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer"
                    />
                    <span>Profil Siswa</span>
                  </th>
                  <th className="p-4">NISN</th>
                  <th className="p-4">Kelas</th>
                  <th className="p-4">Penempatan PKL</th>
                  <th className="p-4">Guru Pembimbing</th>
                  <th className="p-4 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {filteredSiswa.map((siswa) => (
                  <tr key={siswa.uid} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 group transition-colors">
                    {/* Student Identity */}
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedSiswaIds.includes(siswa.uid)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSiswaIds(prev => [...prev, siswa.uid]);
                            } else {
                              setSelectedSiswaIds(prev => prev.filter(id => id !== siswa.uid));
                            }
                          }}
                          className="w-4 h-4 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer"
                        />
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center font-bold text-xs shadow-xs border border-gray-200/40 shrink-0">
                          {siswa.name.substring(0, 1)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-gray-900 dark:text-gray-100 truncate">{siswa.name}</span>
                          <span className="text-[10px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" /> {siswa.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    {/* NISN */}
                    <td className="p-4 font-mono font-medium text-gray-600 dark:text-gray-400">
                      {siswa.nisn || "-"}
                    </td>

                    {/* Class */}
                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">
                      {siswa.kelas || "-"}
                    </td>

                    {/* PKL Placement */}
                    <td className="p-4">
                      {siswa.tempatPkl ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-semibold text-blue-800 dark:text-blue-400">{siswa.tempatPkl}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Belum ditempatkan</span>
                      )}
                    </td>

                    {/* Supervisor */}
                    <td className="p-4 font-medium">
                      {getPembimbingName(siswa.pembimbingId)}
                    </td>

                    {/* Actions */}
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditForm(siswa)}
                          className="p-2 rounded-lg text-gray-500 hover:text-[#1565C0] hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                          title="Edit Siswa / Ubah Password"
                          id={`btn-edit-siswa-${siswa.uid}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSiswa(siswa.uid, siswa.name)}
                          className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Hapus Siswa"
                          id={`btn-delete-siswa-${siswa.uid}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Bottom end total */}
          <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-150 dark:border-gray-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div>
              Menampilkan <span className="font-bold text-gray-900 dark:text-gray-100">{filteredSiswa.length}</span> dari{" "}
              <span className="font-bold text-gray-900 dark:text-gray-100">{siswaList.length}</span> siswa terdaftar
            </div>
            <div className="font-semibold text-gray-700 dark:text-gray-300">
              Total Keseluruhan Siswa PKL: <span className="text-[#1565C0] dark:text-[#60A5FA] font-black text-sm">{siswaList.length}</span> Siswa
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL (ADD & EDIT) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-850 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden border border-gray-150 dark:border-gray-800">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-[#1565C0]" />
                <h3 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  {editingSiswa ? `Edit Siswa: ${editingSiswa.name}` : "Registrasi Siswa Magang Baru"}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveSiswa} className="p-5 space-y-4 text-xs font-medium">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full name */}
                <div className="sm:col-span-2">
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap Siswa</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Contoh: Margaretha Bhia Soba"
                      className="pl-9 pr-3 py-2 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Alamat Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="siswa@smksanjaya.sch.id"
                      className="pl-9 pr-3 py-2 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* NISN */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">NISN (10 Digit)</label>
                  <div className="relative">
                    <FileSpreadsheet className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      maxLength={10}
                      value={formNisn}
                      onChange={(e) => setFormNisn(e.target.value.replace(/\D/g, ""))}
                      placeholder="0081234567"
                      className="pl-9 pr-3 py-2 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* Kelas */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Kelas & Keahlian</label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      required
                      value={formKelas}
                      onChange={(e) => setFormKelas(e.target.value)}
                      placeholder="XII TKJ A"
                      className="pl-9 pr-3 py-2 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* Password / Ubah Password */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">
                    {editingSiswa ? "Ubah Password Akun" : "Password Akun"}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder={editingSiswa ? "Biarkan kosong jika tidak diubah" : "PasswordSanjaya123"}
                      className="pl-9 pr-3 py-2 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                    />
                  </div>
                </div>

                {/* Tempat PKL Select */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Tempat Penempatan PKL</label>
                  <select
                    value={formTempatPklId}
                    onChange={(e) => setFormTempatPklId(e.target.value)}
                    className="w-full py-2 px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                  >
                    <option value="">-- Belum Ditempatkan --</option>
                    {placements.map(p => (
                      <option key={p.id} value={p.id}>{p.nama}</option>
                    ))}
                  </select>
                </div>

                {/* Guru Pembimbing Select */}
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Guru Pembimbing Sekolah</label>
                  <select
                    value={formPembimbingId}
                    onChange={(e) => setFormPembimbingId(e.target.value)}
                    className="w-full py-2 px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                  >
                    <option value="">-- Belum Ditentukan --</option>
                    {pembimbingList.map(p => (
                      <option key={p.uid} value={p.uid}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="pt-4 border-t border-gray-150 dark:border-gray-800 flex justify-end gap-2 bg-gray-50/20">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#1565C0] hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer"
                  id="btn-save-siswa"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      Simpan Data Siswa
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      {isImporting && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-850 w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-gray-150 dark:border-gray-800">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 animate-pulse" />
                <h3 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Import Siswa Baru via Excel (.xlsx)
                </h3>
              </div>
              <button
                onClick={() => setIsImporting(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              {importError && (
                <div className="bg-red-50 border border-red-200 text-[#C62828] p-3 rounded-xl flex items-start gap-2 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{importError}</span>
                </div>
              )}

              {importSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Import Berhasil</h4>
                  <p className="text-gray-500 max-w-sm mx-auto">{importSuccess}</p>
                </div>
              ) : (
                <>
                  {/* Template download header */}
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-150 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Format Template Siswa:</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-1 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900 font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh Template Excel
                    </button>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                      isDragOver
                        ? "border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/10 scale-[0.99]"
                        : "border-gray-300 dark:border-gray-700 hover:border-emerald-500 hover:bg-gray-50/50 dark:hover:bg-gray-900/20"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 stroke-[2]" />
                    </div>
                    <p className="font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                      Seret & Letakkan file Excel Anda di sini
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      atau klik untuk menjelajah file komputer (.xlsx, .xls, .csv)
                    </p>
                  </div>

                  {/* Live Siswa Preview List */}
                  {parsedSiswa.length > 0 && (
                    <div className="space-y-2 animate-fade-in">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600" /> Pratinjau Siswa ({parsedSiswa.length} Siswa) & Mitra ({parsedDudis.length} Unit) Siap Di-import
                      </h4>
                      <div className="border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-inner">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 text-gray-500 font-bold uppercase tracking-wider text-[9px]">
                              <th className="p-2.5 pl-3">Nama Lengkap</th>
                              <th className="p-2.5">Email</th>
                              <th className="p-2.5">NISN</th>
                              <th className="p-2.5">Kelas</th>
                              <th className="p-2.5 pr-3">Penempatan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                            {parsedSiswa.map((siswa, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                                <td className="p-2 pl-3 font-bold">{siswa.name}</td>
                                <td className="p-2 truncate max-w-[120px]">{siswa.email}</td>
                                <td className="p-2 font-mono">{siswa.nisn || "-"}</td>
                                <td className="p-2 font-semibold text-gray-600 dark:text-gray-400">{siswa.kelas}</td>
                                <td className="p-2 pr-3 truncate max-w-[120px]">{siswa.tempatPkl || <span className="text-gray-400 italic">Kosong</span>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/30 rounded-xl leading-relaxed text-emerald-850 dark:text-emerald-400 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      Sistem akan mendaftarkan akun siswa baru dan men-generate password awal default menggunakan NISN masing-masing siswa (atau sandi default <strong>SiswaSanjaya123</strong> jika NISN dikosongkan).
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!importSuccess && (
              <div className="p-4 border-t border-gray-150 dark:border-gray-800 flex justify-end gap-2 bg-gray-50/50 dark:bg-gray-900/20">
                <button
                  onClick={() => setIsImporting(false)}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleProcessImport}
                  disabled={isSubmittingImport || parsedSiswa.length === 0}
                  className="bg-emerald-650 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer"
                >
                  {isSubmittingImport ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      Import Siswa
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SINGLE DELETE CONFIRMATION MODAL */}
      {deleteConfirmOpen && studentToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-850 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-150 dark:border-gray-800 animate-fade-in">
            <div className="p-5 text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-gray-950 dark:text-gray-100 uppercase tracking-wide">
                  Konfirmasi Hapus Akun Siswa
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Apakah Anda yakin ingin menghapus akun siswa <strong className="text-gray-800 dark:text-gray-200">"{studentToDelete.name}"</strong>? Semua riwayat jurnal, penilaian, dan data terkait siswa ini akan dihapus dari sistem secara permanen.
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-150 dark:border-gray-800 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setStudentToDelete(null);
                }}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteSiswa}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {bulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-850 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-150 dark:border-gray-800 animate-fade-in">
            <div className="p-5 text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <AlertCircle className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-black text-gray-950 dark:text-gray-100 uppercase tracking-wide">
                  Konfirmasi Hapus Massal
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Apakah Anda yakin ingin menghapus <strong className="text-red-600 font-extrabold">{selectedSiswaIds.length} akun siswa</strong> yang dipilih secara permanen? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-150 dark:border-gray-800 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setBulkDeleteConfirmOpen(false)}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteSiswaBulk}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Ya, Hapus Semua ({selectedSiswaIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
