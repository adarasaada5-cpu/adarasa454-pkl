import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import { TempatPkl as TempatPklType, UserProfile } from "../models/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as XLSX from "xlsx";
import { 
  Building2, 
  Plus, 
  User, 
  MapPin, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  FileSpreadsheet, 
  Info, 
  Check, 
  X, 
  Users,
  Upload,
  Download,
  Pencil,
  Search,
  Loader2
} from "lucide-react";
import * as z from "zod";

// Zod Schema for Placement Validation
const placementSchema = z.object({
  nama: z.string().min(3, { message: "Nama Instansi / Mitra minimal 3 karakter" }),
  alamat: z.string().min(5, { message: "Alamat lengkap minimal 5 karakter" }),
  pimpinan: z.string().min(3, { message: "Nama pimpinan instansi minimal 3 karakter" }),
  kuota: z.coerce.number().min(1, { message: "Kuota minimal harus 1" }).max(50, { message: "Maksimal kuota 50 siswa" }),
});

type PlacementFormValues = z.infer<typeof placementSchema>;

export const TempatPkl: React.FC = () => {
  const { user } = useAuth();
  const [placements, setPlacements] = useState<TempatPklType[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPartner, setEditingPartner] = useState<TempatPklType | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPlacements = placements.filter(
    (p) =>
      p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.alamat.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.pimpinan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteBulk = () => {
    if (selectedIds.length === 0) return;
    const executeBulkDelete = async () => {
      try {
        setLoading(true);
        await Promise.all(selectedIds.map(id => pklService.deleteTempatPkl(id)));
        if ((window as any).showToast) {
          (window as any).showToast(`${selectedIds.length} Data Mitra Industri berhasil dihapus!`, "success");
        }
        setSelectedIds([]);
        await loadPlacements();
      } catch (err: any) {
        if ((window as any).showToast) {
          (window as any).showToast(err?.message || "Gagal menghapus beberapa data mitra.", "error");
        }
      } finally {
        setLoading(false);
      }
    };

    if ((window as any).showConfirmDialog) {
      (window as any).showConfirmDialog(
        "Hapus Mitra Terpilih",
        `Apakah Anda yakin ingin menghapus ${selectedIds.length} data mitra terpilih? Tindakan ini juga akan menyinkronkan data penempatan siswa.`,
        executeBulkDelete
      );
    } else {
      const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus ${selectedIds.length} data mitra terpilih?`);
      if (confirmed) {
        executeBulkDelete();
      }
    }
  };

  // States for Student Import
  const [isImporting, setIsImporting] = useState(false);
  const [importTargetPartner, setImportTargetPartner] = useState<TempatPklType | null>(null);
  const [parsedSiswa, setParsedSiswa] = useState<{ name: string; email: string; nisn: string; kelas: string; isUnified?: boolean; dudiInfo?: any; tempatPkl?: string }[]>([]);
  const [parsedDudis, setParsedDudis] = useState<any[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for Partner Import (Import Mitra Baru)
  const [isImportingMitra, setIsImportingMitra] = useState(false);
  const [parsedMitra, setParsedMitra] = useState<{ nama: string; alamat: string; pimpinan: string; kuota: number }[]>([]);
  const [importMitraError, setImportMitraError] = useState<string | null>(null);
  const [importMitraSuccess, setImportMitraSuccess] = useState<string | null>(null);
  const [isSubmittingImportMitra, setIsSubmittingImportMitra] = useState(false);
  const [isDragOverMitra, setIsDragOverMitra] = useState(false);
  const fileInputMitraRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(placementSchema),
    defaultValues: {
      nama: "",
      alamat: "",
      pimpinan: "",
      kuota: 2,
    },
  });

  const loadPlacements = async () => {
    try {
      setLoading(true);
      const [list, userProfiles] = await Promise.all([
        pklService.getTempatPkl(),
        pklService.getAllUserProfiles()
      ]);
      setPlacements(list);
      setProfiles(userProfiles);
    } catch (err) {
      console.error("Error loading placements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlacements();
  }, []);

  const onSubmit = async (data: PlacementFormValues) => {
    try {
      setSuccessMsg(null);
      if (editingPartner) {
        await pklService.updateTempatPkl(editingPartner.id, data);
        setSuccessMsg(`Data Mitra "${data.nama}" berhasil diperbarui!`);
      } else {
        await pklService.addTempatPkl(data);
        setSuccessMsg("Instansi Mitra PKL baru berhasil ditambahkan ke pangkalan data!");
      }
      reset({
        nama: "",
        alamat: "",
        pimpinan: "",
        kuota: 2,
      });
      setIsAdding(false);
      setEditingPartner(null);
      await loadPlacements();
    } catch (err) {
      console.error("Error saving placement:", err);
    }
  };

  const handleStartEdit = (partner: TempatPklType) => {
    setEditingPartner(partner);
    setIsAdding(true);
    reset({
      nama: partner.nama,
      alamat: partner.alamat,
      pimpinan: partner.pimpinan,
      kuota: partner.kuota,
    });
  };

  const handleCancelForm = () => {
    setIsAdding(false);
    setEditingPartner(null);
    reset({
      nama: "",
      alamat: "",
      pimpinan: "",
      kuota: 2,
    });
  };

  const isEditable = user?.role === "pembimbing" || user?.role === "admin";

  const handleDelete = (id: string, name: string) => {
    if ((window as any).showConfirmDialog) {
      (window as any).showConfirmDialog(
        "Hapus Mitra Industri",
        `Apakah Anda yakin ingin menghapus data mitra "${name}"? Seluruh data penempatan siswa pada mitra ini juga akan disinkronkan ulang.`,
        async () => {
          try {
            await pklService.deleteTempatPkl(id);
            if ((window as any).showToast) {
              (window as any).showToast("Data Mitra Industri berhasil dihapus!", "success");
            }
            await loadPlacements();
          } catch (err: any) {
            if ((window as any).showToast) {
              (window as any).showToast(err?.message || "Gagal menghapus data mitra.", "error");
            }
          }
        }
      );
    }
  };

  // Handler to open student import modal
  const handleOpenImportModal = (partner: TempatPklType | null) => {
    setImportTargetPartner(partner);
    setParsedSiswa([]);
    setImportError(null);
    setImportSuccess(null);
    setIsImporting(true);
  };

  // Excel (.xlsx/.xls) and CSV parsing logic using SheetJS
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
        
        // Parse rows as raw 2D array
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

  // Submit bulk student import
  const handleProcessImport = async () => {
    if (parsedSiswa.length === 0) {
      setImportError("Tidak ada data siswa yang valid untuk di-import.");
      return;
    }

    const isUnified = parsedSiswa.some(s => s.isUnified);

    if (!isUnified && !importTargetPartner) {
      setImportError("Silakan pilih mitra industri tujuan penempatan terlebih dahulu.");
      return;
    }

    try {
      setIsSubmittingImport(true);
      setImportError(null);

      let payload: any[] = [];

      if (isUnified) {
        // 1. Fetch latest placements so we don't duplicate existing ones
        const latestPlacements = await pklService.getTempatPkl();
        const dudiMap: { [nama: string]: TempatPklType } = {};

        // Create ALL parsed DUDIs
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

        await pklService.importSiswaBulk(payload);
        setImportSuccess(`Berhasil mengimpor ${parsedSiswa.length} data siswa dan mendaftarkan ${parsedDudis.length} mitra industri secara otomatis sesuai format Excel!`);
      } else {
        if (!importTargetPartner) {
          setImportError("Silakan pilih mitra industri tujuan penempatan terlebih dahulu.");
          setIsSubmittingImport(false);
          return;
        }

        payload = parsedSiswa.map(s => ({
          name: s.name,
          email: s.email,
          nisn: s.nisn,
          kelas: s.kelas,
          tempatPkl: importTargetPartner.nama,
          tempatPklId: importTargetPartner.id
        }));

        await pklService.importSiswaBulk(payload);
        setImportSuccess(`Berhasil mengimpor dan menempatkan ${parsedSiswa.length} siswa ke ${importTargetPartner.nama}!`);
      }

      setParsedSiswa([]);
      await loadPlacements();

      setTimeout(() => {
        setIsImporting(false);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setImportError(err?.message || "Terjadi kesalahan internal saat memproses import.");
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // --- HANDLERS FOR IMPORTING MITRA (PARTNERS) ---
  const handleOpenImportMitraModal = () => {
    setParsedMitra([]);
    setImportMitraError(null);
    setImportMitraSuccess(null);
    setIsImportingMitra(true);
  };

  const processExcelMitraFile = (file: File) => {
    setImportMitraError(null);
    setImportMitraSuccess(null);

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
          setImportMitraError("File Excel kosong atau tidak terbaca.");
          return;
        }

        const list: typeof parsedMitra = [];
        let startRow = 0;

        const firstRow = rawRows[0];
        const isHeader = firstRow && firstRow.some(cell => {
          const val = String(cell || "").toLowerCase();
          return val.includes("nama") || val.includes("alamat") || val.includes("pimpinan") || val.includes("kuota");
        });

        if (isHeader) {
          startRow = 1;
        }

        for (let i = startRow; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const nama = row[0] ? String(row[0]).trim() : "";
          if (!nama) continue;

          const alamat = row[1] ? String(row[1]).trim() : "Alamat belum ditentukan";
          const pimpinan = row[2] ? String(row[2]).trim() : "Pimpinan belum ditentukan";
          const kuota = row[3] ? Number(row[3]) || 2 : 2;

          list.push({ nama, alamat, pimpinan, kuota });
        }

        if (list.length === 0) {
          setImportMitraError("Tidak menemukan data mitra yang valid di file Excel ini.");
        } else {
          setParsedMitra(list);
        }
      } catch (err: any) {
        console.error(err);
        setImportMitraError("Format berkas Excel tidak valid atau rusak. Silakan gunakan format file yang didukung (.xlsx, .xls, .csv).");
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleFileInputMitraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelMitraFile(file);
    }
  };

  const handleDragOverMitra = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverMitra(true);
  };

  const handleDragLeaveMitra = () => {
    setIsDragOverMitra(false);
  };

  const handleDropMitra = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOverMitra(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (["xlsx", "xls", "csv"].includes(ext || "")) {
        processExcelMitraFile(file);
      } else {
        setImportMitraError("Format file tidak didukung. Harap unggah berkas Excel (.xlsx / .xls) atau CSV.");
      }
    }
  };

  const handleDownloadMitraTemplate = () => {
    const headers = ["Nama Mitra / Instansi", "Alamat Kantor", "Nama Pimpinan / Penyelia", "Kuota Siswa"];
    const mockData = [
      ["PT Telkom Indonesia Witel Bajawa", "Jl. Gajah Mada No. 12, Bajawa, Ngada", "Robertus Gani", 4],
      ["Dinas Pertanian Ngada", "Jl. Trans Bajawa-Ende Km. 2, Bajawa", "Ignasius Lako, S.P", 3],
      ["Bengkel Sanjaya Motor", "Jl. Trans Flores, Bajawa", "Yosef Sanjaya", 5]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...mockData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daftar Mitra");

    ws["!cols"] = [
      { wch: 30 }, // Nama Mitra
      { wch: 35 }, // Alamat
      { wch: 25 }, // Pimpinan
      { wch: 12 }  // Kuota
    ];

    XLSX.writeFile(wb, "Template_Import_Mitra_PKL.xlsx");
  };

  const handleProcessImportMitra = async () => {
    if (parsedMitra.length === 0) {
      setImportMitraError("Tidak ada data mitra yang valid untuk di-import.");
      return;
    }

    try {
      setIsSubmittingImportMitra(true);
      setImportMitraError(null);

      await pklService.importTempatPklBulk(parsedMitra);
      
      setImportMitraSuccess(`Berhasil mengimpor ${parsedMitra.length} mitra industri baru ke pangkalan data!`);
      setParsedMitra([]);
      
      await loadPlacements();

      setTimeout(() => {
        setIsImportingMitra(false);
      }, 1800);
    } catch (err: any) {
      setImportMitraError(err?.message || "Terjadi kesalahan internal saat memproses import mitra.");
    } finally {
      setIsSubmittingImportMitra(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-[#1565C0]" /> Mitra Industri PKL
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-wider">
            Daftar instansi, perusahaan, dan dunia kerja (DUDI) mitra SMKS Sanjaya Bajawa
          </p>
        </div>

        {isEditable && !isAdding && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleOpenImportModal(null)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all shadow-sm hover:shadow-md"
              id="btn-import-siswa-trigger"
            >
              <FileSpreadsheet className="w-4 h-4" /> Import Excel (Siswa + DUDI)
            </button>
            <button
              onClick={handleOpenImportMitraModal}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all shadow-sm hover:shadow-md"
            >
              <Upload className="w-4 h-4" /> Import Hanya DUDI
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-[#1565C0] hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all shadow-sm hover:shadow-md"
              id="btn-add-mitra-trigger"
            >
              <Plus className="w-4 h-4" /> Tambah Manual
            </button>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-[#2E7D32] p-4 rounded-xl flex items-center gap-3 text-sm font-medium animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Search Bar */}
      {!isAdding && (
        <div className="relative max-w-md w-full shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cari nama mitra, alamat, atau pimpinan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1565C0] focus:border-[#1565C0] transition-all placeholder:text-gray-400 shadow-sm"
          />
        </div>
      )}

      {/* Bulk Delete Bar */}
      {isEditable && !isAdding && filteredPlacements.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="select-all-placements"
              checked={filteredPlacements.length > 0 && selectedIds.length === filteredPlacements.length}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedIds(filteredPlacements.map(p => p.id));
                } else {
                  setSelectedIds([]);
                }
              }}
              className="w-4.5 h-4.5 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer"
            />
            <label htmlFor="select-all-placements" className="font-bold text-gray-700 cursor-pointer select-none">
              Pilih Semua ({filteredPlacements.length} Mitra)
            </label>
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteBulk}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-md hover:shadow-lg"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih ({selectedIds.length})
            </button>
          )}
        </div>
      )}

      {/* Form Manual Tambah/Edit */}
      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-md max-w-2xl mx-auto animate-fade-in">
          <div className="flex items-center justify-between mb-5 border-b pb-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              {editingPartner ? (
                <>
                  <Pencil className="w-5 h-5 text-[#1565C0]" /> Edit Informasi Mitra Industri
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5 text-[#1565C0]" /> Registrasi Mitra Industri Baru
                </>
              )}
            </h3>
            <button
              onClick={handleCancelForm}
              className="text-xs text-gray-500 hover:text-gray-700 font-bold border border-gray-200 rounded-lg px-2.5 py-1 hover:bg-gray-55"
            >
              Batal
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 grid grid-cols-1 sm:grid-cols-2 gap-4" id="form-add-mitra">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Nama Perusahaan / Instansi (DUDI)
              </label>
              <input
                {...register("nama")}
                type="text"
                placeholder="Contoh: PT Telkom Indonesia Wilayah Bajawa"
                className="w-full bg-gray-55 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
                id="input-mitra-nama"
              />
              {errors.nama && (
                <p className="text-xs text-red-500 mt-1">{errors.nama.message}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Alamat Kantor Lengkap
              </label>
              <input
                {...register("alamat")}
                type="text"
                placeholder="Contoh: Jl. Trans Bajawa-Ende Km. 3, Bajawa, Ngada"
                className="w-full bg-gray-55 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
                id="input-mitra-alamat"
              />
              {errors.alamat && (
                <p className="text-xs text-red-500 mt-1">{errors.alamat.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Nama Pimpinan / Penyelia Lapangan
              </label>
              <input
                {...register("pimpinan")}
                type="text"
                placeholder="Contoh: Yosef Blegur, S.ST"
                className="w-full bg-gray-55 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
                id="input-mitra-pimpinan"
              />
              {errors.pimpinan && (
                <p className="text-xs text-red-500 mt-1">{errors.pimpinan.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Kuota Maksimal Siswa (Pax)
              </label>
              <input
                {...register("kuota")}
                type="number"
                placeholder="2"
                className="w-full bg-gray-55 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
                id="input-mitra-kuota"
              />
              {errors.kuota && (
                <p className="text-xs text-red-500 mt-1">{errors.kuota.message}</p>
              )}
            </div>

            <div className="sm:col-span-2 pt-2 flex justify-end gap-2 border-t mt-4">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
              >
                Batalkan
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-[#1565C0] hover:bg-blue-700 rounded-xl shadow-md transition-all"
              >
                {editingPartner ? "Simpan Perubahan" : "Simpan Mitra Baru"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid Dashboard Card Mitra */}
      {!isAdding && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-9 h-9 text-[#1565C0] animate-spin" />
              <p className="text-sm text-gray-500 font-medium">Memuat pangkalan data mitra industri...</p>
            </div>
          ) : filteredPlacements.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed rounded-2xl p-6">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 font-bold">Tidak ditemukan data mitra industri</p>
              <p className="text-xs text-gray-400 mt-1">Gunakan pencarian kata kunci lain atau lakukan import berkas Excel.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredPlacements.map((partner) => {
                const assignedStudents = profiles.filter(p => p.tempatPklId === partner.id);
                const isSelected = selectedIds.includes(partner.id);

                return (
                  <div 
                    key={partner.id}
                    className={`bg-white border rounded-2xl p-5 shadow-xs relative transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                      isSelected ? "border-blue-500 ring-1 ring-blue-500/30" : "border-gray-200/80"
                    }`}
                  >
                    {isEditable && (
                      <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, partner.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== partner.id));
                            }
                          }}
                          className="w-4 h-4 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer mr-2"
                        />
                        <button
                          onClick={() => handleStartEdit(partner)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Mitra"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(partner.id, partner.nama)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="space-y-3 flex-1 pr-14">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{partner.nama}</h4>
                        <div className="flex items-start gap-1.5 text-xs text-gray-500 mt-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{partner.alamat}</span>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Pimpinan/Penyelia:</span>
                          <span className="font-semibold text-gray-700 text-right truncate max-w-[150px]">{partner.pimpinan}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Siswa Terplot:</span>
                          <span className="font-bold text-gray-800 flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-[#1565C0]" /> {assignedStudents.length} / {partner.kuota} Siswa
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Kuota Bar */}
                    <div className="mt-4 pt-3 border-t border-gray-50">
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            assignedStudents.length >= partner.kuota ? "bg-red-500" : "bg-[#1565C0]"
                          }`}
                          style={{ width: `${Math.min(100, (assignedStudents.length / partner.kuota) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL 1: IMPORT BULK (SISWA & MITRA OTOMATIS) */}
      {isImporting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide">Import Massal via Excel</h3>
                  <p className="text-[10px] text-emerald-100 mt-0.5">Mendukung pendaftaran otomatis 112 mitra & penempatan siswa</p>
                </div>
              </div>
              <button onClick={() => setIsImporting(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {importSuccess ? (
                <div className="bg-green-50 border border-green-200 text-[#2E7D32] p-5 rounded-xl text-xs space-y-2 text-center">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-[#2E7D32]" />
                  <p className="font-bold text-sm">Proses Import Berhasil!</p>
                  <p>{importSuccess}</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex items-start gap-3 text-xs text-blue-800">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <p className="font-bold">Informasi Skema Unggah Excel:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Sistem otomatis mendeteksi kolom: <code className="bg-blue-100 px-1 rounded font-mono">Nama DUDI</code>, <code className="bg-blue-100 px-1 rounded font-mono">Nama Pemilik</code>, <code className="bg-blue-100 px-1 rounded font-mono">NO HP</code>, <code className="bg-blue-100 px-1 rounded font-mono">Alamat</code>, dan <code className="bg-blue-100 px-1 rounded font-mono">NAMA PESERTA</code>.</li>
                        <li>Jika nama DUDI belum ada di pangkalan data, sistem akan <b>mendaftarkannya secara otomatis</b>.</li>
                        <li>Siswa pada baris bersangkutan otomatis terplot ke DUDI tersebut.</li>
                      </ul>
                      <button 
                        onClick={handleDownloadTemplate}
                        className="mt-2 flex items-center gap-1.5 bg-white text-blue-700 border border-blue-300 px-2.5 py-1 rounded-lg font-bold hover:bg-blue-100 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh Format Template Excel (.xlsx)
                      </button>
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      isDragOver ? "border-emerald-600 bg-emerald-50/50" : "border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileInputChange} 
                      accept=".xlsx, .xls, .csv" 
                      className="hidden" 
                    />
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3 animate-pulse" />
                    <p className="text-xs font-bold text-gray-750">Tarik & Lepas berkas Excel di sini, atau <span className="text-emerald-600 hover:underline">Pilih File</span></p>
                    <p className="text-[10px] text-gray-400 mt-1">Ekstensi yang didukung: .xlsx, .xls, .csv</p>
                  </div>

                  {importError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{importError}</span>
                    </div>
                  )}

                  {/* Preview Parsed Data */}
                  {parsedSiswa.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden animate-fade-in">
                      <div className="bg-gray-50 px-4 py-2 border-b text-[11px] font-bold text-gray-700 flex justify-between items-center">
                        <span>Ringkasan Data Terbaca</span>
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          {parsedSiswa.length} Siswa | {parsedDudis.length} Mitra Baru Terdeteksi
                        </span>
                      </div>
                      <div className="max-h-[160px] overflow-y-auto text-[11px] divide-y">
                        {parsedSiswa.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="p-2.5 px-4 flex justify-between items-center bg-white">
                            <div>
                              <p className="font-bold text-gray-800">{item.name} ({item.kelas})</p>
                              <p className="text-[10px] text-gray-400 font-mono">NISN: {item.nisn}</p>
                            </div>
                            <div className="text-right">
                              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium text-[10px]">
                                📍 {item.tempatPkl || "Menunggu Pilihan"}
                              </span>
                            </div>
                          </div>
                        ))}
                        {parsedSiswa.length > 5 && (
                          <div className="p-2 text-center text-[10px] text-gray-400 bg-gray-50/50 font-medium">
                            ... dan {parsedSiswa.length - 5} data siswa lainnya tersemat.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!importSuccess && (
              <div className="bg-gray-50 px-6 py-3.5 flex justify-end gap-2 border-t">
                <button
                  onClick={() => setIsImporting(false)}
                  disabled={isSubmittingImport}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleProcessImport}
                  disabled={parsedSiswa.length === 0 || isSubmittingImport}
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmittingImport ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Memproses Import...
                    </>
                  ) : (
                    "Eksekusi & Simpan ke Database"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORT HANYA MITRA (DUDI) BARU */}
      {isImportingMitra && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide">Import Daftar Mitra Industri (DUDI)</h3>
                  <p className="text-[10px] text-amber-100 mt-0.5">Menambahkan pangkalan data instansi mitra tanpa plot siswa</p>
                </div>
              </div>
              <button onClick={() => setIsImportingMitra(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {importMitraSuccess ? (
                <div className="bg-green-50 border border-green-200 text-[#2E7D32] p-5 rounded-xl text-xs space-y-2 text-center">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-[#2E7D32]" />
                  <p className="font-bold text-sm">Proses Import Mitra Berhasil!</p>
                  <p>{importMitraSuccess}</p>
                </div>
              ) : (
                <>
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 text-xs text-amber-800">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1.5">
                      <p className="font-bold">Ketentuan Format Excel Mitra:</p>
                      <p>Pastikan urutan kolom sesuai urutan template berikut: <b>Nama Mitra</b>, <b>Alamat Kantor</b>, <b>Nama Pimpinan</b>, dan <b>Kuota Siswa</b>.</p>
                      <button 
                        type="button"
                        onClick={handleDownloadMitraTemplate}
                        className="mt-2 flex items-center gap-1.5 bg-white text-amber-700 border border-amber-300 px-2.5 py-1 rounded-lg font-bold hover:bg-amber-100 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh Format Template Daftar Mitra (.xlsx)
                      </button>
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOverMitra}
                    onDragLeave={handleDragLeaveMitra}
                    onDrop={handleDropMitra}
                    onClick={() => fileInputMitraRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      isDragOverMitra ? "border-amber-600 bg-amber-50/50" : "border-gray-300 hover:bg-gray-55"
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputMitraRef} 
                      onChange={handleFileInputMitraChange} 
                      accept=".xlsx, .xls, .csv" 
                      className="hidden" 
                    />
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3 animate-bounce" />
                    <p className="text-xs font-bold text-gray-750">Tarik & Lepas berkas Excel Daftar Mitra di sini, atau <span className="text-amber-600 hover:underline">Pilih File</span></p>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">Ekstensi yang didukung: .xlsx, .xls, .csv</p>
                  </div>

                  {importMitraError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl flex items-start gap-2.5 text-xs font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{importMitraError}</span>
                    </div>
                  )}

                  {/* Preview Parsed Mitra Data */}
                  {parsedMitra.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden animate-fade-in">
                      <div className="bg-gray-50 px-4 py-2 border-b text-[11px] font-bold text-gray-700 flex justify-between items-center">
                        <span>Ringkasan Berkas Mitra Terbaca</span>
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Total {parsedMitra.length} Instansi
                        </span>
                      </div>
                      <div className="max-h-[160px] overflow-y-auto text-[11px] divide-y">
                        {parsedMitra.slice(0, 5).map((item, idx) => (
                          <div key={idx} className="p-2.5 px-4 flex justify-between items-center bg-white">
                            <div>
                              <p className="font-bold text-gray-800">{item.nama}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">👤 Pim: {item.pimpinan} | 📍 {item.alamat}</p>
                            </div>
                            <div className="text-right">
                              <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold text-[10px]">
                                Kuota: {item.kuota}
                              </span>
                            </div>
                          </div>
                        ))}
                        {parsedMitra.length > 5 && (
                          <div className="p-2 text-center text-[10px] text-gray-400 bg-gray-50/50 font-medium">
                            ... dan {parsedMitra.length - 5} data instansi lainnya tersemat.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!importMitraSuccess && (
              <div className="bg-gray-50 px-6 py-3.5 flex justify-end gap-2 border-t">
                <button
                  onClick={() => setIsImportingMitra(false)}
                  disabled={isSubmittingImportMitra}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={handleProcessImportMitra}
                  disabled={parsedMitra.length === 0 || isSubmittingImportMitra}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 rounded-xl shadow-md transition-all flex items-center gap-1.5"
                >
                  {isSubmittingImportMitra ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menyimpan Mitra...
                    </>
                  ) : (
                    "Impor Mitra Baru"
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