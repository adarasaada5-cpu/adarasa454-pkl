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
  Printer,
  ShieldAlert,
  Sliders,
  CheckCircle,
  Briefcase
} from "lucide-react";

export const ManajemenPembimbing: React.FC = () => {
  const { user } = useAuth();
  
  // Tab control: 'sekolah' for Guru Pembimbing, 'industri' for Pembimbing Industri
  const [activeTab, setActiveTab] = useState<"sekolah" | "industri">("sekolah");
  
  // Data lists
  const [pembimbingList, setPembimbingList] = useState<UserProfile[]>([]);
  const [industriList, setIndustriList] = useState<UserProfile[]>([]);
  const [placements, setPlacements] = useState<TempatPkl[]>([]);
  
  // App states
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Form modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState<UserProfile | null>(null);
  
  // Toast notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Excel Import states
  const [isImporting, setIsImporting] = useState(false);
  const [parsedPembimbing, setParsedPembimbing] = useState<{ name: string; email: string; password?: string }[]>([]);
  const [parsedIndustri, setParsedIndustri] = useState<{ name: string; email: string; tempatPkl?: string; tempatPklId?: string; password?: string }[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formTempatPklId, setFormTempatPklId] = useState("");
  const [formPassword, setFormPassword] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      // Fetch all user profiles from DB
      const allUsers = await pklService.getAllUserProfiles();
      
      // Filter by respective roles
      const schoolSupervisors = allUsers.filter(u => u.role === "pembimbing");
      const industrySupervisors = allUsers.filter(u => u.role === "industri");
      
      setPembimbingList(schoolSupervisors);
      setIndustriList(industrySupervisors);

      // Fetch placements to map and select for industry supervisors
      const places = await pklService.getTempatPkl();
      setPlacements(places);
    } catch (err) {
      console.error("Gagal memuat data manajemen pembimbing:", err);
      setErrorMsg("Gagal memuat data pembimbing dari database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Registration Form
  const handleOpenAddForm = () => {
    setEditingSupervisor(null);
    setFormName("");
    setFormEmail("");
    setFormTempatPklId("");
    setFormPassword("");
    setSuccessMsg(null);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  // Open Edit Form
  const handleOpenEditForm = (sup: UserProfile) => {
    setEditingSupervisor(sup);
    setFormName(sup.name);
    setFormEmail(sup.email);
    setFormTempatPklId(sup.tempatPklId || "");
    setFormPassword(""); // Clear password field, only change if non-empty
    setSuccessMsg(null);
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  // Form Submission
  const handleSaveSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      setErrorMsg("Nama Lengkap dan Email wajib diisi.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      let selectedPlacementName = "";
      if (activeTab === "industri" && formTempatPklId) {
        const pObj = placements.find(p => p.id === formTempatPklId);
        if (pObj) {
          selectedPlacementName = pObj.nama;
        }
      }

      if (editingSupervisor) {
        // Edit Mode
        const updatedProfile: UserProfile = {
          ...editingSupervisor,
          name: formName.trim(),
          email: formEmail.trim(),
        };

        if (activeTab === "industri") {
          updatedProfile.tempatPkl = selectedPlacementName || undefined;
          updatedProfile.tempatPklId = formTempatPklId || undefined;
        }

        // If password is changed
        if (formPassword.trim()) {
          updatedProfile.password = formPassword.trim();
        }

        await pklService.saveUserProfile(updatedProfile);
        
        await pklService.addAuditLog(
          "Edit Pembimbing", 
          `Mengubah data pembimbing (${activeTab}): ${updatedProfile.name}`
        );

        if (formPassword.trim()) {
          await pklService.resetUserPassword(editingSupervisor.uid, formPassword.trim());
        }

        setSuccessMsg(`Akun "${updatedProfile.name}" berhasil diperbarui!`);
      } else {
        // Add Mode
        const randomId = Math.random().toString(36).substring(2, 10);
        const prefix = activeTab === "sekolah" ? "pembimbing" : "industri";
        const newUid = `${prefix}_${randomId}`;

        const newProfile: UserProfile = {
          uid: newUid,
          name: formName.trim(),
          email: formEmail.trim(),
          role: activeTab === "sekolah" ? "pembimbing" : "industri",
          password: formPassword.trim() || (activeTab === "sekolah" ? "PembimbingSanjaya123" : "IndustriSanjaya123"),
          createdAt: new Date().toISOString()
        };

        if (activeTab === "industri") {
          newProfile.tempatPkl = selectedPlacementName || undefined;
          newProfile.tempatPklId = formTempatPklId || undefined;
        }

        await pklService.saveUserProfile(newProfile);
        await pklService.addAuditLog(
          "Tambah Pembimbing", 
          `Menambahkan akun pembimbing baru (${activeTab}): ${newProfile.name}`
        );

        setSuccessMsg(`Akun pembimbing baru "${newProfile.name}" berhasil didaftarkan!`);
      }

      setIsFormOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Gagal menyimpan data akun pembimbing.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Supervisor
  const handleDeleteSupervisor = async (uid: string, name: string) => {
    const title = activeTab === "sekolah" ? "Guru Pembimbing" : "Pembimbing Industri";
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus akun ${title} "${name}"? Tindakan ini tidak bisa dibatalkan.`);
    if (confirmed) {
      try {
        setSuccessMsg(null);
        await pklService.deleteUserProfile(uid);
        await pklService.addAuditLog("Hapus Pembimbing", `Menghapus akun pembimbing: ${name}`);
        
        setSuccessMsg(`Akun ${title} "${name}" berhasil dihapus.`);
        await loadData();
      } catch (err) {
        console.error("Gagal menghapus pembimbing:", err);
        setErrorMsg("Gagal menghapus data pembimbing.");
      }
    }
  };

  // --- EXCEL TEMPLATE DOWNLOAD & EXCEL IMPORT ---
  const handleOpenImportModal = () => {
    setParsedPembimbing([]);
    setParsedIndustri([]);
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

        let startRow = 0;
        const firstRow = rawRows[0];
        const isHeader = firstRow && firstRow.some(cell => {
          const val = String(cell || "").toLowerCase();
          return val.includes("nama") || val.includes("email") || val.includes("password") || val.includes("mitra");
        });

        if (isHeader) {
          startRow = 1;
        }

        if (activeTab === "sekolah") {
          const list: typeof parsedPembimbing = [];
          for (let i = startRow; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const name = row[0] ? String(row[0]).trim() : "";
            if (!name) continue;

            const email = row[1] ? String(row[1]).trim() : `${name.toLowerCase().replace(/\s+/g, "")}@smksanjaya.sch.id`;
            const password = row[2] ? String(row[2]).trim() : "PembimbingSanjaya123";

            list.push({ name, email, password });
          }

          if (list.length === 0) {
            setImportError("Tidak ditemukan data Guru Pembimbing yang valid.");
          } else {
            setParsedPembimbing(list);
          }
        } else {
          const list: typeof parsedIndustri = [];
          for (let i = startRow; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.length === 0) continue;

            const name = row[0] ? String(row[0]).trim() : "";
            if (!name) continue;

            const email = row[1] ? String(row[1]).trim() : `${name.toLowerCase().replace(/\s+/g, "")}@mitrapkl.com`;
            const password = row[2] ? String(row[2]).trim() : "IndustriSanjaya123";
            const rawPlaceName = row[3] ? String(row[3]).trim() : "";

            let tempatPklName = "";
            let tempatPklId: string | undefined = undefined;
            if (rawPlaceName) {
              const foundPlace = placements.find(p => p.nama.toLowerCase().includes(rawPlaceName.toLowerCase()));
              if (foundPlace) {
                tempatPklName = foundPlace.nama;
                tempatPklId = foundPlace.id;
              } else {
                tempatPklName = rawPlaceName;
              }
            }

            list.push({
              name,
              email,
              password,
              tempatPkl: tempatPklName || undefined,
              tempatPklId: tempatPklId || undefined
            });
          }

          if (list.length === 0) {
            setImportError("Tidak ditemukan data Pembimbing Industri yang valid.");
          } else {
            setParsedIndustri(list);
          }
        }
      } catch (err) {
        console.error(err);
        setImportError("Format file Excel salah atau tidak valid.");
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
      processExcelFile(file);
    }
  };

  const handleDownloadTemplate = () => {
    if (activeTab === "sekolah") {
      const headers = ["Nama Lengkap Guru Pembimbing", "Alamat Email", "Password Default (Opsional)"];
      const data = [
        ["Drs. Fransiskus Ngada", "frans.ngada@smksanjaya.sch.id", "PembimbingSanjaya123"],
        ["Maria Soba, S.Pd", "maria.soba@smksanjaya.sch.id", "MariaSoba567"]
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Guru Pembimbing");
      ws["!cols"] = [{ wch: 30 }, { wch: 35 }, { wch: 20 }];
      XLSX.writeFile(wb, "Template_Import_Guru_Pembimbing.xlsx");
    } else {
      const headers = ["Nama Lengkap Pembimbing Industri", "Alamat Email", "Password Default (Opsional)", "Nama Mitra Industri PKL"];
      const data = [
        ["Yustinus Sola", "yustinus@kominfongada.go.id", "IndustriSanjaya123", "Dinas Kominfo Kabupaten Ngada"],
        ["Ignasius Dhone", "ignas@sanjayamotor.com", "SanjayaBajawa99", "Sanjaya Motor Bajawa"]
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Pembimbing Industri");
      ws["!cols"] = [{ wch: 30 }, { wch: 35 }, { wch: 20 }, { wch: 35 }];
      XLSX.writeFile(wb, "Template_Import_Pembimbing_Industri.xlsx");
    }
  };

  const handleProcessImport = async () => {
    const len = activeTab === "sekolah" ? parsedPembimbing.length : parsedIndustri.length;
    if (len === 0) {
      setImportError("Tidak ada data untuk di-import.");
      return;
    }

    try {
      setIsSubmittingImport(true);
      setImportError(null);

      if (activeTab === "sekolah") {
        await pklService.importPembimbingBulk(parsedPembimbing);
        setImportSuccess(`Berhasil mengimpor ${parsedPembimbing.length} akun Guru Pembimbing baru!`);
        setParsedPembimbing([]);
      } else {
        await pklService.importIndustriBulk(parsedIndustri);
        setImportSuccess(`Berhasil mengimpor ${parsedIndustri.length} akun Pembimbing Industri baru!`);
        setParsedIndustri([]);
      }

      await loadData();
      setTimeout(() => {
        setIsImporting(false);
      }, 1800);
    } catch (err: any) {
      setImportError(err?.message || "Terjadi kesalahan internal saat memproses import massal.");
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // --- EXPORT EXCEL ---
  const handleExportExcel = () => {
    const targetList = activeTab === "sekolah" ? pembimbingList : industriList;
    const title = activeTab === "sekolah" ? "Guru_Pembimbing" : "Pembimbing_Industri";
    
    if (targetList.length === 0) {
      alert("Tidak ada data yang tersedia untuk di-export.");
      return;
    }

    let ws;
    if (activeTab === "sekolah") {
      const rows = targetList.map((p, idx) => ({
        "No": idx + 1,
        "Nama Lengkap": p.name,
        "Alamat Email": p.email,
        "Password Akun": p.password || "********",
        "Tanggal Dibuat": p.createdAt ? new Date(p.createdAt).toLocaleDateString("id-ID") : "-"
      }));
      ws = XLSX.utils.json_to_sheet(rows);
    } else {
      const rows = targetList.map((p, idx) => ({
        "No": idx + 1,
        "Nama Lengkap": p.name,
        "Alamat Email": p.email,
        "Mitra Industri PKL": p.tempatPkl || "Belum Ditempatkan",
        "Password Akun": p.password || "********",
        "Tanggal Dibuat": p.createdAt ? new Date(p.createdAt).toLocaleDateString("id-ID") : "-"
      }));
      ws = XLSX.utils.json_to_sheet(rows);
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title.replace("_", " "));
    XLSX.writeFile(wb, `Data_${title}_PKL_Sanjaya.xlsx`);
  };

  // --- HIGH-FIDELITY PRINT / PDF EXPORT ---
  const handleExportPDF = () => {
    const targetList = activeTab === "sekolah" ? pembimbingList : industriList;
    const title = activeTab === "sekolah" ? "Daftar Guru Pembimbing PKL" : "Daftar Pembimbing Industri (Mitra) PKL";
    const sub = activeTab === "sekolah" ? "Sekolah Menengah Kejuruan Swasta Sanjaya Bajawa" : "Mitra Industri Kerjasama Swasta Sanjaya Bajawa";

    if (targetList.length === 0) {
      alert("Tidak ada data yang tersedia untuk dicetak ke PDF.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Popup blocker menghalangi pembukaan jendela cetak. Izinkan popup terlebih dahulu.");
      return;
    }

    const tableRows = targetList.map((p, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 10px 12px; font-weight: 500; font-size: 11px;">${idx + 1}</td>
        <td style="padding: 10px 12px; font-weight: 700; font-size: 11px; color: #1e293b;">${p.name}</td>
        <td style="padding: 10px 12px; font-size: 11px; font-family: monospace;">${p.email}</td>
        ${activeTab === "industri" ? `<td style="padding: 10px 12px; font-weight: 600; font-size: 11px; color: #1e3a8a;">${p.tempatPkl || "Belum Ditempatkan"}</td>` : ""}
        <td style="padding: 10px 12px; font-size: 11px; font-family: monospace; color: #475569;">${p.password || "********"}</td>
        <td style="padding: 10px 12px; font-size: 10px; color: #64748b;">${p.createdAt ? new Date(p.createdAt).toLocaleDateString("id-ID") : "-"}</td>
      </tr>
    `).join("");

    const extraHeader = activeTab === "industri" ? `<th style="text-align: left; padding: 12px; color: #475569; font-size: 10px; font-weight: bold; text-transform: uppercase;">Mitra Industri</th>` : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>${title} - SMK Sanjaya Bajawa</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              color: #334155;
              padding: 40px;
              line-height: 1.5;
            }
            .header-container {
              border-bottom: 3px double #94a3b8;
              padding-bottom: 20px;
              margin-bottom: 30px;
              display: flex;
              align-items: center;
              gap: 20px;
            }
            .kop-surat {
              flex-grow: 1;
            }
            .kop-surat h1 {
              font-size: 16px;
              font-weight: 800;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0f172a;
            }
            .kop-surat h2 {
              font-size: 13px;
              font-weight: 700;
              margin: 4px 0 0 0;
              color: #1e3a8a;
            }
            .kop-surat p {
              font-size: 10px;
              margin: 4px 0 0 0;
              color: #64748b;
            }
            .doc-title {
              font-size: 14px;
              font-weight: 800;
              text-align: center;
              text-transform: uppercase;
              margin: 20px 0;
              color: #0f172a;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th {
              background-color: #f8fafc;
              border-bottom: 2px solid #cbd5e1;
            }
            tr:nth-child(even) {
              background-color: #f8fafc/50;
            }
            .footer-info {
              margin-top: 50px;
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              color: #64748b;
            }
            .signature-block {
              text-align: center;
              width: 200px;
            }
            .signature-line {
              margin-top: 70px;
              border-top: 1.5px solid #000;
              font-weight: bold;
              color: #000;
              padding-top: 4px;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div style="width: 60px; height: 60px; background-color: #1e3a8a; color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px; box-shadow: inset 0 0 10px rgba(0,0,0,0.3);">
              S
            </div>
            <div class="kop-surat">
              <h1>YAYASAN PERSEKOLAHAN SANJAYA BAJAWA</h1>
              <h2>SMK SWASTA SANJAYA BAJAWA</h2>
              <p>Jalan Gajah Mada No. 12, Bajawa, Kabupaten Ngada, Nusa Tenggara Timur - Kode Pos 86711</p>
            </div>
          </div>

          <div class="doc-title">
            ${title}
          </div>

          <table>
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 12px; color: #475569; font-size: 10px; font-weight: bold; text-transform: uppercase; width: 40px;">No</th>
                <th style="padding: 12px; color: #475569; font-size: 10px; font-weight: bold; text-transform: uppercase;">Nama Lengkap</th>
                <th style="padding: 12px; color: #475569; font-size: 10px; font-weight: bold; text-transform: uppercase;">Alamat Email</th>
                ${extraHeader}
                <th style="padding: 12px; color: #475569; font-size: 10px; font-weight: bold; text-transform: uppercase; width: 140px;">Password</th>
                <th style="padding: 12px; color: #475569; font-size: 10px; font-weight: bold; text-transform: uppercase; width: 100px;">Tgl Dibuat</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="footer-info">
            <div>
              <p>Dicetak pada: ${new Date().toLocaleString("id-ID")}</p>
              <p>Oleh: Admin Sekolah (${user?.email || "Superadmin"})</p>
            </div>
            <div class="signature-block">
              <p>Bajawa, ${new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p>Kepala Sekolah SMK Swasta Sanjaya,</p>
              <div class="signature-line">
                Fransiskus Nono, S.Kom
              </div>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Filter list
  const activeList = activeTab === "sekolah" ? pembimbingList : industriList;
  const filteredList = activeList.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tempatPkl && p.tempatPkl.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6" id="manajemen-pembimbing-root">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 uppercase tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" /> Akun Pembimbing & Mentor
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Manajemen lengkap akun Guru Pembimbing Sekolah dan Pembimbing Industri/Penyelia Lapangan.
          </p>
        </div>

        {/* Top Controls */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-gray-800 hover:bg-black text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
            id="btn-export-pdf"
          >
            <Printer className="w-4 h-4" /> Cetak PDF / Surat
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
            id="btn-export-excel"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>
          <button
            onClick={handleOpenImportModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
            id="btn-import-excel"
          >
            <FileSpreadsheet className="w-4 h-4" /> Import Excel
          </button>
          <button
            onClick={handleOpenAddForm}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors shadow-md cursor-pointer"
            id="btn-register-pembimbing"
          >
            <Plus className="w-4 h-4" /> Registrasi Akun
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
        <button
          onClick={() => {
            setActiveTab("sekolah");
            setSearchQuery("");
            setSuccessMsg(null);
            setErrorMsg(null);
          }}
          className={`py-3 px-5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "sekolah"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
          id="tab-guru-pembimbing"
        >
          <GraduationCap className="w-4.5 h-4.5" /> Guru Pembimbing (Sekolah)
          <span className="ml-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
            {pembimbingList.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab("industri");
            setSearchQuery("");
            setSuccessMsg(null);
            setErrorMsg(null);
          }}
          className={`py-3 px-5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === "industri"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
          id="tab-pembimbing-industri"
        >
          <Briefcase className="w-4.5 h-4.5" /> Pembimbing Industri (Mitra)
          <span className="ml-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
            {industriList.length}
          </span>
        </button>
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
      <div className="bg-white dark:bg-gray-850 p-4 rounded-2xl border border-gray-150 dark:border-gray-800 shadow-xs flex items-center">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-gray-400" />
          <input
            type="text"
            placeholder={
              activeTab === "sekolah"
                ? "Cari Guru Pembimbing berdasarkan nama, email sekolah..."
                : "Cari Pembimbing Industri berdasarkan nama, email, atau mitra pkl..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-full text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-gray-100"
          />
        </div>
      </div>

      {/* SUPERVISORS LIST TABLE */}
      {loading ? (
        <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-xs">
          <div className="w-10 h-10 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs text-gray-500 font-medium">Sedang memuat data pembimbing magang dari database...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-xs">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">Tidak Ada Data</h4>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Tidak ditemukan pembimbing yang cocok dengan kueri pencarian Anda.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-850 rounded-2xl border border-gray-150 dark:border-gray-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4 pl-6">Nama Lengkap</th>
                  <th className="p-4">Alamat Email / Username</th>
                  {activeTab === "industri" && <th className="p-4">Mitra Kerja PKL</th>}
                  <th className="p-4">Password Akun</th>
                  <th className="p-4">Tanggal Bergabung</th>
                  <th className="p-4 pr-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                {filteredList.map((sup) => (
                  <tr key={sup.uid} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30 group transition-colors">
                    {/* Identity */}
                    <td className="p-4 pl-6 font-bold text-gray-900 dark:text-gray-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-550/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {sup.name.substring(0, 1)}
                        </div>
                        {sup.name}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="p-4 font-mono text-gray-650 dark:text-gray-400">
                      {sup.email}
                    </td>

                    {/* Industry Partner association (tab industri only) */}
                    {activeTab === "industri" && (
                      <td className="p-4">
                        {sup.tempatPkl ? (
                          <span className="bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit">
                            <Building2 className="w-3.5 h-3.5" /> {sup.tempatPkl}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">Belum diasosiasikan</span>
                        )}
                      </td>
                    )}

                    {/* Password display / indicator */}
                    <td className="p-4 font-mono font-bold text-gray-500 flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-gray-400" />
                      {sup.password || "SanjayaSandi123"}
                    </td>

                    {/* Created Date */}
                    <td className="p-4 text-gray-400">
                      {sup.createdAt ? new Date(sup.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                    </td>

                    {/* Actions */}
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditForm(sup)}
                          className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
                          title="Edit Akun & Password"
                          id={`btn-edit-sup-${sup.uid}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupervisor(sup.uid, sup.name)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                          title="Hapus Akun"
                          id={`btn-delete-sup-${sup.uid}`}
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
        </div>
      )}

      {/* FORM MODAL (ADD & EDIT) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-850 w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-150 dark:border-gray-800">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-indigo-600" />
                <h3 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  {editingSupervisor 
                    ? `Edit Akun: ${editingSupervisor.name}` 
                    : activeTab === "sekolah" ? "Daftarkan Guru Pembimbing Baru" : "Daftarkan Pembimbing Industri Baru"
                  }
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
            <form onSubmit={handleSaveSupervisor} className="p-5 space-y-4 text-xs font-medium">
              {/* Full name */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Contoh: Maria Magdalena Soba, S.Pd"
                    className="pl-9 pr-3 py-2 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Email / Username */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">Alamat Email (Username)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder={activeTab === "sekolah" ? "guru@smksanjaya.sch.id" : "penyelia@mitrapkl.com"}
                    className="pl-9 pr-3 py-2 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Industry association (Only for industri tab) */}
              {activeTab === "industri" && (
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 mb-1">Hubungkan ke Tempat PKL / Mitra</label>
                  <select
                    value={formTempatPklId}
                    onChange={(e) => setFormTempatPklId(e.target.value)}
                    className="w-full py-2 px-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                  >
                    <option value="">-- Tidak Terhubung / Kosong --</option>
                    {placements.map(p => (
                      <option key={p.id} value={p.id}>{p.nama}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Hubungkan akun pembimbing industri dengan perusahaan tempat PKL siswa.
                  </p>
                </div>
              )}

              {/* Password / Password Reset */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1">
                  {editingSupervisor ? "Ubah Sandi / Password" : "Password Akun"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={
                      editingSupervisor 
                        ? "Kosongkan jika tidak ingin diubah" 
                        : activeTab === "sekolah" ? "PembimbingSanjaya123" : "IndustriSanjaya123"
                    }
                    className="pl-9 pr-3 py-2 w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 dark:text-gray-100"
                  />
                </div>
              </div>

              {/* Form Actions Footer */}
              <div className="pt-4 border-t border-gray-150 dark:border-gray-800 flex justify-end gap-2">
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
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-xl transition-all flex items-center gap-2 shadow-md cursor-pointer"
                  id="btn-save-sup"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      Simpan Akun
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
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-xs font-black text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Import Akun via Excel (.xlsx)
                </h3>
              </div>
              <button
                onClick={() => setIsImporting(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
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
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Format template akun ({activeTab === "sekolah" ? "Guru Pembimbing" : "Pembimbing Industri"}) :
                      </span>
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
                        : "border-gray-300 dark:border-gray-700 hover:border-emerald-500 hover:bg-gray-50/50"
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
                      Seret & letakkan berkas Excel di sini
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      atau klik untuk menjelajah file dari komputer Anda (.xlsx, .xls)
                    </p>
                  </div>

                  {/* Live supervisor preview list */}
                  {((activeTab === "sekolah" ? parsedPembimbing : parsedIndustri).length > 0) && (
                    <div className="space-y-2 animate-fade-in">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600" /> Pratinjau Pembimbing Siap Di-import ({activeTab === "sekolah" ? parsedPembimbing.length : parsedIndustri.length} Akun)
                      </h4>
                      <div className="border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-inner">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 text-gray-500 font-bold uppercase tracking-wider text-[9px]">
                              <th className="p-2.5 pl-3">Nama Lengkap</th>
                              <th className="p-2.5">Email / Username</th>
                              <th className="p-2.5">Sandi Awal</th>
                              {activeTab === "industri" && <th className="p-2.5 pr-3">Mitra PKL</th>}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                            {activeTab === "sekolah" ? (
                              parsedPembimbing.map((p, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                                  <td className="p-2 pl-3 font-bold">{p.name}</td>
                                  <td className="p-2 font-mono">{p.email}</td>
                                  <td className="p-2 font-mono text-gray-500">{p.password || "PembimbingSanjaya123"}</td>
                                </tr>
                              ))
                            ) : (
                              parsedIndustri.map((p, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                                  <td className="p-2 pl-3 font-bold">{p.name}</td>
                                  <td className="p-2 font-mono">{p.email}</td>
                                  <td className="p-2 font-mono text-gray-500">{p.password || "IndustriSanjaya123"}</td>
                                  <td className="p-2 pr-3 truncate max-w-[120px]">{p.tempatPkl || <span className="text-gray-400 italic">Kosong</span>}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/30 rounded-xl leading-relaxed text-emerald-800 dark:text-emerald-400 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      Sistem akan membuat akun baru dan mengirimkan audit logs aktivitas. Sandi akan tersimpan rahasia untuk otentikasi login pembimbing masing-masing.
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
                  disabled={isSubmittingImport || (activeTab === "sekolah" ? parsedPembimbing.length === 0 : parsedIndustri.length === 0)}
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
                      Import Akun
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
