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
  Search
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

  // Drag and Drop Handlers
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
      // Validate file extension
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (["xlsx", "xls", "csv"].includes(ext || "")) {
        processExcelFile(file);
      } else {
        setImportError("Format file tidak didukung. Harap unggah berkas Excel (.xlsx / .xls) atau CSV.");
      }
    }
  };

  // Generate and Download Excel Template instantly
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

        await pklService.importSiswaBulk(payload);
        setImportSuccess(`Berhasil mengimpor ${parsedSiswa.length} data siswa dan mendaftarkan ${parsedDudis.length} mitra industri secara otomatis sesuai format Excel!`);
      } else {
        // Standard non-unified flow (requires importTargetPartner)
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
      
      // Refresh database records
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
        
        // Parse rows as raw 2D array
        const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (rawRows.length === 0) {
          setImportMitraError("File Excel kosong atau tidak terbaca.");
          return;
        }

        const list: typeof parsedMitra = [];
        let startRow = 0;

        // Check if row 0 acts as a header (e.g. contains words like nama, alamat, pimpinan, kuota)
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
          if (!nama) continue; // Skip rows without name

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Mitra Industri PKL</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase font-semibold tracking-wider">
            Daftar instansi, perusahaan, dan dunia kerja (DUDI) mitra SMKS Sanjaya Bajawa
          </p>
        </div>

        {isEditable && !isAdding && (
          <div className="flex flex-wrap gap-2.5 self-start sm:self-center">
            <button
              onClick={() => handleOpenImportModal(null)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors shadow-md hover:shadow-lg"
              id="btn-import-siswa-trigger"
            >
              <FileSpreadsheet className="w-4 h-4" /> Import Data PKL (Excel)
            </button>
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 bg-[#1565C0] hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors shadow-md hover:shadow-lg"
              id="btn-add-mitra-trigger"
            >
              <Plus className="w-4 h-4" /> Tambah Mitra Baru
            </button>
          </div>
        )}
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-[#2E7D32] p-4 rounded-xl flex items-center gap-3 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
          <span>{successMsg}</span>
        </div>
      )}

      {!isAdding && (
        <div className="relative max-w-md w-full animate-fade-in shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            placeholder="Cari nama mitra, alamat, atau pimpinan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#1565C0] focus:border-[#1565C0] transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500 shadow-sm"
          />
        </div>
      )}

      {isEditable && !isAdding && filteredPlacements.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs animate-fade-in shadow-sm">
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
            <label htmlFor="select-all-placements" className="font-bold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              Pilih Semua ({filteredPlacements.length} Mitra)
            </label>
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteBulk}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-md hover:shadow-lg self-start sm:self-center"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih ({selectedIds.length})
            </button>
          )}
        </div>
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-md">
          <div className="flex items-center justify-between mb-4">
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
              className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
                id="input-mitra-pimpinan"
              />
              {errors.pimpinan && (
                <p className="text-xs text-red-500 mt-1">{errors.pimpinan.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Kuota Penerimaan Siswa (Jumlah Maksimal)
              </label>
              <input
                {...register("kuota")}
                type="number"
                placeholder="Contoh: 4"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
                id="input-mitra-kuota"
              />
              {errors.kuota && (
                <p className="text-xs text-red-500 mt-1">{errors.kuota.message}</p>
              )}
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelForm}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="bg-[#1565C0] hover:bg-blue-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition-all shadow-md"
                id="btn-mitra-save"
              >
                {editingPartner ? "Simpan Perubahan" : "Simpan Instansi Mitra"}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200/75 dark:border-gray-800 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
              </div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {filteredPlacements.length === 0 ? (
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm">
              <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm font-medium">Tidak ada mitra industri yang cocok dengan pencarian Anda.</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="mt-3 text-xs text-[#1565C0] hover:underline font-bold cursor-pointer"
                >
                  Bersihkan Pencarian
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              {filteredPlacements.map((p) => {
                const assignedStudents = profiles.filter(
                  (profile) => profile.role === "siswa" && (profile.tempatPklId === p.id || profile.tempatPkl === p.nama)
                );
                const filledCount = assignedStudents.length;

                return (
                  <div
                    key={p.id}
                    className={`bg-white dark:bg-[#111827] rounded-2xl border ${selectedIds.includes(p.id) ? "border-[#1565C0] ring-1 ring-[#1565C0]/50 bg-blue-50/10" : "border-gray-200/75 dark:border-gray-800"} shadow-sm p-5 flex flex-col justify-between hover:shadow-md transition-all hover:border-gray-300 dark:hover:border-gray-700 relative group`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="flex items-center gap-3">
                          {isEditable && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(p.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(prev => [...prev, p.id]);
                                } else {
                                  setSelectedIds(prev => prev.filter(id => id !== p.id));
                                }
                              }}
                              className="w-4.5 h-4.5 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer"
                            />
                          )}
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/20 text-[#1565C0] dark:text-[#60A5FA] rounded-xl flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 leading-snug line-clamp-1">{p.nama}</h3>
                            <p className="text-[10px] text-green-700 dark:text-emerald-400 font-semibold tracking-wider uppercase mt-0.5">Mitra Industri Aktif</p>
                          </div>
                        </div>

                        {isEditable && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="text-gray-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                              title="Edit Informasi Mitra"
                              id={`btn-edit-mitra-${p.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id, p.nama)}
                              className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                              title="Hapus Mitra"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2.5 my-4">
                        <div className="flex items-start gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{p.alamat}</span>
                        </div>

                        <div className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-gray-400">
                          <User className="w-4 h-4 text-gray-400 shrink-0" />
                          <span>Penyelia: <strong className="text-gray-800 dark:text-gray-200">{p.pimpinan}</strong></span>
                        </div>

                        {filledCount > 0 && (
                          <div className="mt-3 bg-gray-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-150/50 dark:border-gray-800">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-[#1565C0]" /> Siswa Penempatan ({filledCount}):
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {assignedStudents.map((std) => (
                                <span key={std.uid} className="text-[9px] bg-blue-50 dark:bg-blue-950/20 text-[#1565C0] dark:text-[#60A5FA] font-bold px-2 py-0.5 rounded-lg border border-blue-100/30">
                                  {std.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-150 dark:border-gray-800 flex items-center justify-between mt-3 gap-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Status Kuota</span>
                        <span className={`text-xs font-black mt-0.5 ${filledCount >= p.kuota ? "text-amber-600" : "text-[#2E7D32]"}`}>
                          {filledCount} / {p.kuota} Terisi
                        </span>
                      </div>
                      {isEditable && (
                        <button
                          onClick={() => handleOpenImportModal(p)}
                          className="flex items-center gap-1 text-[11px] font-bold bg-[#1565C0] hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer"
                          title="Import data siswa ke mitra ini"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" /> Import Excel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom end total */}
          {placements.length > 0 && (
            <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-200/75 dark:border-gray-800 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm text-xs text-gray-500 dark:text-gray-400">
              <div>
                Menampilkan <span className="font-bold text-gray-900 dark:text-gray-100">{filteredPlacements.length}</span> dari{" "}
                <span className="font-bold text-gray-900 dark:text-gray-100">{placements.length}</span> mitra PKL terdaftar
              </div>
              <div className="font-semibold text-gray-700 dark:text-gray-300">
                Total Keseluruhan Mitra DUDI: <span className="text-[#1565C0] dark:text-[#60A5FA] font-black text-sm">{placements.length}</span> Mitra
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= STUDENT IMPORT MODAL ================= */}
      {isImporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] w-full max-w-2xl rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Import Siswa Magang dari Excel
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Unggah dokumen Excel untuk mendaftarkan dan menempatkan siswa sekaligus
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsImporting(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              {importSuccess ? (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 text-[#2E7D32] dark:text-green-400 p-5 rounded-2xl flex flex-col items-center text-center gap-3 animate-fade-in">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h4 className="font-bold text-sm uppercase tracking-wider">Import Berhasil Selesai!</h4>
                  <p className="text-xs leading-relaxed max-w-md">{importSuccess}</p>
                </div>
              ) : (
                <>
                  {importError && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 text-xs leading-relaxed font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                      <span>{importError}</span>
                    </div>
                  )}

                  {/* Target Partner Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Mitra Industri Tujuan Penempatan (Opsional jika menggunakan format lengkap)
                    </label>
                    {importTargetPartner ? (
                      <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/10 border border-blue-150/60 dark:border-blue-900/50 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Building2 className="w-4 h-4 text-[#1565C0] dark:text-blue-400" />
                          <span className="font-extrabold text-xs text-gray-800 dark:text-gray-200">
                            {importTargetPartner.nama}
                          </span>
                        </div>
                        <button
                          onClick={() => setImportTargetPartner(null)}
                          className="text-[10px] font-extrabold text-red-600 hover:underline"
                        >
                          Ganti Mitra
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select
                          onChange={(e) => {
                            const pId = e.target.value;
                            const found = placements.find(x => x.id === pId);
                            setImportTargetPartner(found || null);
                          }}
                          className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-[#1565C0]"
                          defaultValue=""
                        >
                          <option value="" disabled>-- Pilih Mitra Industri Penempatan (Khusus Format Siswa Saja) --</option>
                          {placements.map(p => (
                            <option key={p.id} value={p.id}>{p.nama} (Kuota: {p.kuota})</option>
                          ))}
                        </select>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                          💡 <strong>Info:</strong> Jika menggunakan template PKL lengkap (berisi kolom Nama DUDI, Nama Pemilik, Alamat, dsb), sistem akan otomatis mendeteksi, membuat data mitra baru, dan menghubungkan siswa ke mitra masing-masing secara langsung tanpa perlu memilih manual.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Template download header */}
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-150 dark:border-gray-800 text-xs">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Gunakan format Excel standar sekolah:</span>
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
                        ? "border-[#1565C0] bg-blue-50/50 dark:bg-blue-950/10 scale-[0.99]"
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
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                      Seret & Letakkan file Excel Anda di sini
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      atau klik untuk menjelajah file komputer (.xlsx, .xls, .csv)
                    </p>
                  </div>

                  {/* Live Student Preview List */}
                  {parsedSiswa.length > 0 && (
                    <div className="space-y-2 animate-fade-in">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-600" /> Pratinjau Siswa ({parsedSiswa.length} Orang) & Mitra ({parsedDudis.length} Unit) Siap Di-import
                      </h4>
                      <div className="border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-inner">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 text-gray-500 font-bold uppercase tracking-wider text-[9px]">
                              <th className="p-2.5 pl-3">Nama</th>
                              <th className="p-2.5">Email</th>
                              <th className="p-2.5">Kelas / Jurus</th>
                              <th className="p-2.5 pr-3">DUDI Penempatan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                            {parsedSiswa.map((s, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                                <td className="p-2 pl-3 font-bold">{s.name}</td>
                                <td className="p-2 truncate max-w-[120px]">{s.email}</td>
                                <td className="p-2 font-semibold text-gray-600 dark:text-gray-400">{s.kelas}</td>
                                <td className="p-2 pr-3 font-bold text-[#1565C0] dark:text-blue-400 truncate max-w-[150px]">
                                  {s.tempatPkl || (importTargetPartner ? importTargetPartner.nama : <span className="text-gray-400 font-normal italic">Belum dipilih</span>)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100/40 dark:border-blue-900/30 rounded-xl text-[10.5px] leading-relaxed text-blue-800 dark:text-blue-400 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#1565C0] dark:text-blue-400" />
                    <span>
                      Siswa yang di-import akan secara otomatis memiliki akun login terdaftar dengan peran <strong>Siswa PKL</strong>, ditempatkan di mitra industri yang Anda pilih, dan didata di bawah Tahun Ajaran aktif saat ini.
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
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleProcessImport}
                  disabled={isSubmittingImport || parsedSiswa.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-md"
                >
                  {isSubmittingImport ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      Import & Hubungkan
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Partner Import Modal (Import Mitra Baru) */}
      {isImportingMitra && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-850 w-full max-w-xl rounded-2xl shadow-xl overflow-hidden border border-gray-150 dark:border-gray-800 animate-scale-up">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-150 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-teal-600 animate-pulse" />
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Import Mitra Industri Baru (.xlsx)
                </h3>
              </div>
              <button
                onClick={() => setIsImportingMitra(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {importMitraError && (
                <div className="bg-red-50 border border-red-200 text-[#C62828] p-3 rounded-xl flex items-start gap-2 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{importMitraError}</span>
                </div>
              )}

              {importMitraSuccess ? (
                <div className="py-6 text-center space-y-3">
                  <div className="w-14 h-14 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider">Import Berhasil</h4>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">{importMitraSuccess}</p>
                </div>
              ) : (
                <>
                  {/* Template download header */}
                  <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-150 dark:border-gray-800 text-xs">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Format Excel Mitra:</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadMitraTemplate}
                      className="flex items-center gap-1 bg-white hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-900 font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh Template Excel
                    </button>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOverMitra}
                    onDragLeave={handleDragLeaveMitra}
                    onDrop={handleDropMitra}
                    onClick={() => fileInputMitraRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                      isDragOverMitra
                        ? "border-teal-600 bg-teal-50/50 dark:bg-teal-950/10 scale-[0.99]"
                        : "border-gray-300 dark:border-gray-700 hover:border-teal-500 hover:bg-gray-50/50 dark:hover:bg-gray-900/20"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputMitraRef}
                      onChange={handleFileInputMitraChange}
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                    />
                    <div className="w-12 h-12 bg-teal-50 dark:bg-teal-950/20 text-teal-600 rounded-full flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 stroke-[2]" />
                    </div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                      Seret & Letakkan file Excel Anda di sini
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      atau klik untuk menjelajah file komputer (.xlsx, .xls, .csv)
                    </p>
                  </div>

                  {/* Live Mitra Preview List */}
                  {parsedMitra.length > 0 && (
                    <div className="space-y-2 animate-fade-in">
                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-600" /> Pratinjau Mitra Siap Di-import ({parsedMitra.length} Instansi)
                      </h4>
                      <div className="border border-gray-150 dark:border-gray-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-inner">
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-150 dark:border-gray-800 text-gray-500 font-bold uppercase tracking-wider text-[9px]">
                              <th className="p-2.5 pl-3">Nama Mitra</th>
                              <th className="p-2.5">Alamat</th>
                              <th className="p-2.5">Pimpinan</th>
                              <th className="p-2.5 pr-3 text-right">Kuota</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                            {parsedMitra.map((m, idx) => (
                              <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                                <td className="p-2 pl-3 font-bold">{m.nama}</td>
                                <td className="p-2 truncate max-w-[120px]">{m.alamat}</td>
                                <td className="p-2 truncate max-w-[100px]">{m.pimpinan}</td>
                                <td className="p-2 pr-3 text-right font-semibold text-gray-600 dark:text-gray-400">{m.kuota}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="p-3.5 bg-teal-50/40 dark:bg-teal-950/10 border border-teal-100/40 dark:border-teal-900/30 rounded-xl text-[10.5px] leading-relaxed text-teal-800 dark:text-teal-400 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
                    <span>
                      Sistem akan mendaftarkan mitra industri baru sesuai data di dalam tabel di atas. Anda dapat segera menggunakannya untuk penempatan siswa magang.
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!importMitraSuccess && (
              <div className="p-4 border-t border-gray-150 dark:border-gray-800 flex justify-end gap-2 bg-gray-50/50 dark:bg-gray-900/20">
                <button
                  onClick={() => setIsImportingMitra(false)}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold py-2 px-4 rounded-xl text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleProcessImportMitra}
                  disabled={isSubmittingImportMitra || parsedMitra.length === 0}
                  className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-xl text-xs transition-all flex items-center gap-2 shadow-md"
                >
                  {isSubmittingImportMitra ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      Import Mitra
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

export default TempatPkl;
