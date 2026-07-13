import React, { useState, useEffect } from "react";
import { pklService } from "../services/pklService";
import { KehadiranEntry, UserProfile, AttendanceStatus, SchoolSettings } from "../models/types";
import { useAuth } from "../context/AuthContext";
import {
  Calendar,
  Clock,
  Download,
  Printer,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit2,
  ChevronLeft,
  AlertCircle,
  Check,
  User,
  FileText,
  UserCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  Building2,
  RefreshCw
} from "lucide-react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

export const KehadiranManajemen: React.FC = () => {
  const { user } = useAuth();
  
  // Data States
  const [attendanceList, setAttendanceList] = useState<KehadiranEntry[]>([]);
  const [studentsList, setStudentsList] = useState<UserProfile[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Print Preview
  const [isPrintPreview, setIsPrintPreview] = useState(false);

  // Export Dialog
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  // Form Dialog (Add / Edit)
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KehadiranEntry | null>(null);
  
  // Form values
  const [formStudentId, setFormStudentId] = useState("");
  const [formTanggal, setFormTanggal] = useState("");
  const [formStatus, setFormStatus] = useState<AttendanceStatus>("hadir");
  const [formJamMasuk, setFormJamMasuk] = useState("07:30");
  const [formJamPulang, setFormJamPulang] = useState("16:00");
  const [formKeterangan, setFormKeterangan] = useState("");

  const [selectedAbsensiIds, setSelectedAbsensiIds] = useState<string[]>([]);

  const handleSelectAbsensi = (id: string) => {
    setSelectedAbsensiIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllAbsensi = (visibleAbsensi: KehadiranEntry[]) => {
    const visibleIds = visibleAbsensi.map((a) => a.id);
    const allSelected = visibleIds.every((id) => selectedAbsensiIds.includes(id));
    if (allSelected) {
      // Unselect all visible
      setSelectedAbsensiIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      // Select all visible
      setSelectedAbsensiIds((prev) => {
        const union = [...prev];
        visibleIds.forEach((id) => {
          if (!union.includes(id)) union.push(id);
        });
        return union;
      });
    }
  };

  const handleBulkDeleteAbsensi = async () => {
    if (selectedAbsensiIds.length === 0) return;
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus ${selectedAbsensiIds.length} data absensi terpilih secara permanen? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await Promise.all(selectedAbsensiIds.map((id) => pklService.deleteKehadiran(id)));
      if ((window as any).showToast) {
        (window as any).showToast(`Berhasil menghapus ${selectedAbsensiIds.length} data absensi!`, "success");
      }
      setSelectedAbsensiIds([]);
      await loadData();
    } catch (err) {
      console.error(err);
      if ((window as any).showToast) {
        (window as any).showToast("Gagal menghapus beberapa data absensi.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [attendance, profiles, settings] = await Promise.all([
        pklService.getKehadiran(),
        pklService.getAllUserProfiles(),
        pklService.getSchoolSettings()
      ]);
      setAttendanceList(attendance);
      setStudentsList(profiles.filter(p => p.role === "siswa"));
      setSchoolSettings(settings);
    } catch (error) {
      console.error("Gagal memuat data absensi manajemen:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter student list to show in the dropdown selector or statistics
  const myCompanyStudents = studentsList.filter((st) => {
    if (user?.role === "industri") {
      const studentPlaceId = st.tempatPklId || "";
      const studentPlaceName = st.tempatPkl || "";
      const supervisorPlaceId = user?.tempatPklId || "";
      const supervisorPlaceName = user?.tempatPkl || "";

      return (
        (supervisorPlaceId && studentPlaceId === supervisorPlaceId) ||
        (supervisorPlaceName && studentPlaceName === supervisorPlaceName)
      );
    }
    return true;
  });

  const openAddDialog = () => {
    setEditingEntry(null);
    const availableStudents = user?.role === "industri" ? myCompanyStudents : studentsList;
    if (availableStudents.length > 0) {
      setFormStudentId(availableStudents[0].uid);
    } else {
      setFormStudentId("");
    }
    setFormTanggal(new Date().toISOString().split("T")[0]);
    setFormStatus("hadir");
    setFormJamMasuk("07:30");
    setFormJamPulang("16:00");
    setFormKeterangan("");
    setFormDialogOpen(true);
  };

  const openEditDialog = (entry: KehadiranEntry) => {
    setEditingEntry(entry);
    setFormStudentId(entry.userId);
    setFormTanggal(entry.tanggal);
    setFormStatus(entry.status);
    setFormJamMasuk(entry.jamMasuk);
    setFormJamPulang(entry.jamPulang || "");
    setFormKeterangan(entry.keterangan || "");
    setFormDialogOpen(true);
  };

  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStudentId) {
      if ((window as any).showToast) {
        (window as any).showToast("Harap pilih siswa terlebih dahulu.", "error");
      }
      return;
    }

    const selectedStudent = studentsList.find(s => s.uid === formStudentId);
    if (!selectedStudent) return;

    try {
      const entryId = editingEntry?.id || `a_manual_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const newEntry: KehadiranEntry = {
        id: entryId,
        userId: formStudentId,
        userName: selectedStudent.name,
        tanggal: formTanggal,
        jamMasuk: formJamMasuk,
        jamPulang: formJamPulang || undefined,
        status: formStatus,
        keterangan: formKeterangan,
        tahunAjaran: schoolSettings?.tahunAjaranAktif || "2025/2026 - Genap",
        createdAt: editingEntry?.createdAt || new Date().toISOString(),
        selfieUrl: editingEntry?.selfieUrl || "",
        alamatGps: editingEntry?.alamatGps || "Ditulis secara manual oleh Admin Sekolah",
        latitude: editingEntry?.latitude || -8.7911,
        longitude: editingEntry?.longitude || 120.9734,
      };

      await pklService.saveKehadiranManual(newEntry);
      
      if ((window as any).showToast) {
        (window as any).showToast(
          editingEntry 
            ? `Berhasil memperbarui absensi ${selectedStudent.name}!` 
            : `Berhasil menambahkan absensi untuk ${selectedStudent.name}!`,
          "success"
        );
      }

      setFormDialogOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
      if ((window as any).showToast) {
        (window as any).showToast("Gagal menyimpan rekap absensi harian.", "error");
      }
    }
  };

  const handleDelete = async (id: string, studentName: string, date: string) => {
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus catatan kehadiran ${studentName} pada tanggal ${date}? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;
    try {
      await pklService.deleteKehadiran(id);
      if ((window as any).showToast) {
        (window as any).showToast(`Berhasil menghapus absensi ${studentName}!`, "success");
      }
      await loadData();
    } catch (err) {
      console.error(err);
      if ((window as any).showToast) {
        (window as any).showToast("Gagal menghapus data absensi.", "error");
      }
    }
  };

  // Filter logic
  const filteredAttendance = attendanceList.filter((entry) => {
    if (user?.role === "industri") {
      const studentProfile = studentsList.find((s) => s.uid === entry.userId);
      if (!studentProfile) return false;

      const studentPlaceId = studentProfile.tempatPklId || "";
      const studentPlaceName = studentProfile.tempatPkl || "";
      const supervisorPlaceId = user?.tempatPklId || "";
      const supervisorPlaceName = user?.tempatPkl || "";

      const isMatch = 
        (supervisorPlaceId && studentPlaceId === supervisorPlaceId) ||
        (supervisorPlaceName && studentPlaceName === supervisorPlaceName);

      if (!isMatch) return false;
    }

    // Student selection list filter
    const matchStudentSelection = selectedStudentId ? entry.userId === selectedStudentId : true;
    if (!matchStudentSelection) return false;

    const matchSearch = entry.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || entry.status === statusFilter;
    const matchDate = !dateFilter || entry.tanggal === dateFilter;
    return matchSearch && matchStatus && matchDate;
  });

  const handleExport = () => {
    if (exportFormat === "json") {
      const jsonString = JSON.stringify(filteredAttendance, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap_absensi_pkl_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      // CSV format
      const csvHeaders = [
        "No",
        "Tanggal",
        "Nama Siswa",
        "Status",
        "Jam Masuk",
        "Jam Pulang",
        "Lokasi Geotagging",
        "Keterangan/Alasan"
      ];
      const csvRows = filteredAttendance.map((a, idx) => {
        const cleanKeterangan = (a.keterangan || "").replace(/"/g, '""');
        const cleanAlamat = (a.alamatGps || "").replace(/"/g, '""');
        return [
          idx + 1,
          a.tanggal,
          a.userName,
          a.status.toUpperCase(),
          a.jamMasuk,
          a.jamPulang || "-",
          `"${cleanAlamat}"`,
          `"${cleanKeterangan}"`
        ];
      });

      const csvContent = "\uFEFF" + [csvHeaders.join(","), ...csvRows.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap_absensi_pkl_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setExportDialogOpen(false);
    if ((window as any).showToast) {
      (window as any).showToast(`Berhasil mengekspor ${filteredAttendance.length} rekap absensi!`, "success");
    }
  };

  // Render Print Preview Mode (with student separation)
  if (isPrintPreview) {
    const groupedByStudent = filteredAttendance.reduce((acc, curr) => {
      if (!acc[curr.userName]) {
        acc[curr.userName] = [];
      }
      acc[curr.userName].push(curr);
      return acc;
    }, {} as Record<string, KehadiranEntry[]>);

    const studentEntries = Object.entries(groupedByStudent);

    return (
      <div className="bg-[#E5E7EB] dark:bg-gray-950 min-h-screen pb-12 select-none font-sans print:bg-white print:pb-0">
        <style>{`
          @media print {
            body {
              background-color: white !important;
              color: black !important;
            }
            .print-page {
              margin: 0 !important;
              padding: 1.5cm !important;
              box-shadow: none !important;
              border: none !important;
              max-width: 100% !important;
              width: 100% !important;
              background-color: white !important;
              page-break-after: always !important;
              break-after: page !important;
            }
            .print-page:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            aside, header, nav, .sidebar, .topbar, .mui-app-bar, .no-print {
              display: none !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>

        {/* Floating Print Navigation Bar */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between sticky top-0 shadow-lg z-50">
          <button
            onClick={() => setIsPrintPreview(false)}
            className="flex items-center gap-1 text-xs text-gray-300 hover:text-white font-bold transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Kembali ke Manajemen Absensi
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-gray-300">
              Tip: Setiap rekap siswa dicetak pada <b>lembaran kertas terpisah</b> secara otomatis.
            </span>
            <button
              onClick={() => window.print()}
              className="bg-[#2E7D32] hover:bg-green-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" /> Cetak Sekarang
            </button>
          </div>
        </div>

        {/* Printable Canvas */}
        <div className="space-y-8 print:space-y-0">
          {studentEntries.length === 0 ? (
            <div className="print-page bg-white text-black p-10 max-w-4xl mx-auto my-8 shadow-xl border border-gray-200 rounded-lg min-h-[297mm] flex flex-col justify-center items-center">
              <p className="text-xs text-gray-400 font-semibold">Tidak ada rekap absensi siswa yang cocok untuk dicetak.</p>
            </div>
          ) : (
            studentEntries.map(([studentName, records]) => {
              // Find NISN / Kelas of the student for metadata
              const profile = studentsList.find(s => s.name === studentName);
              const nisn = profile?.nisn || "-";
              const kelas = profile?.kelas || "XII";
              const tempatPkl = profile?.tempatPkl || "Mitra Industri";

              // Summary stats
              const totalHadir = records.filter(r => r.status === "hadir").length;
              const totalSakit = records.filter(r => r.status === "sakit").length;
              const totalIzin = records.filter(r => r.status === "izin").length;
              const totalAlfa = records.filter(r => r.status === "alpa").length;

              return (
                <div 
                  key={studentName} 
                  className="print-page bg-white text-black p-10 max-w-4xl mx-auto my-8 shadow-xl border border-gray-200 rounded-lg min-h-[297mm] font-sans"
                >
                  {/* Official Letterhead */}
                  <div className="text-center border-b-4 border-double border-black pb-4 mb-6">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-gray-700">Yayasan Persekolahan Umat Katolik Ngada</h3>
                    <h1 className="text-xl font-black uppercase tracking-wider mt-0.5 text-black">SMK Katolik Sanjaya Bajawa</h1>
                    <p className="text-[10px] font-bold italic text-gray-600">
                      Kompetensi Keahlian: Teknik Komputer & Jaringan • Akreditasi BAN-SM: A
                    </p>
                    <p className="text-[9px] text-gray-500 mt-1">
                      Alamat: Jl. Gajah Mada No. 14, Bajawa, Kabupaten Ngada, Flores, Nusa Tenggara Timur | Pos: 86413
                    </p>
                  </div>

                  {/* Laporan Header */}
                  <div className="text-center space-y-1 mb-6">
                    <h2 className="text-sm font-black uppercase tracking-wide underline">
                      REKAP DAFTAR HADIR HARIAN SISWA PKL
                    </h2>
                    <p className="text-[10px] font-mono text-gray-600">TAHUN AJARAN: {schoolSettings?.tahunAjaranAktif || "2025/2026 - Genap"}</p>
                  </div>

                  {/* Student Metadata Table */}
                  <div className="grid grid-cols-2 gap-4 text-[11px] mb-4 bg-gray-50 p-4 rounded-lg border border-gray-150 print:bg-white print:border-none print:p-0 print:mb-6">
                    <div className="space-y-1">
                      <p><span className="font-bold text-gray-400">NAMA SISWA :</span> <span className="font-extrabold text-xs text-gray-900 print:text-black uppercase">{studentName}</span></p>
                      <p><span className="font-bold text-gray-400">NISN / KELAS :</span> {nisn} • {kelas}</p>
                      <p><span className="font-bold text-gray-400">TEMPAT PKL  :</span> {tempatPkl}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p><span className="font-bold text-gray-400">TANGGAL REKAP:</span> {new Date().toLocaleDateString("id-ID", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric"
                      })}</p>
                      <div className="flex justify-end gap-2 text-[10px] mt-2">
                        <span className="bg-green-100 print:border print:border-green-300 text-green-800 px-1.5 py-0.5 rounded font-bold">H: {totalHadir}</span>
                        <span className="bg-red-100 print:border print:border-red-300 text-red-800 px-1.5 py-0.5 rounded font-bold">S: {totalSakit}</span>
                        <span className="bg-yellow-100 print:border print:border-yellow-300 text-yellow-800 px-1.5 py-0.5 rounded font-bold">I: {totalIzin}</span>
                        <span className="bg-slate-100 print:border print:border-slate-300 text-slate-800 px-1.5 py-0.5 rounded font-bold">A: {totalAlfa}</span>
                      </div>
                    </div>
                  </div>

                  {/* Table Logs */}
                  <table className="w-full text-left border-collapse border border-black text-[10px] leading-relaxed">
                    <thead>
                      <tr className="bg-gray-100 print:bg-transparent">
                        <th className="border border-black p-2 text-center font-bold w-10">No</th>
                        <th className="border border-black p-2 font-bold w-24">Tanggal</th>
                        <th className="border border-black p-2 font-bold w-20 text-center">Status</th>
                        <th className="border border-black p-2 font-bold w-20 text-center">Jam Masuk</th>
                        <th className="border border-black p-2 font-bold w-20 text-center">Jam Pulang</th>
                        <th className="border border-black p-2 font-bold">Keterangan / Alasan Ketidakhadiran</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((a, idx) => (
                        <tr key={a.id} className="align-top">
                          <td className="border border-black p-2 text-center">{idx + 1}</td>
                          <td className="border border-black p-2 font-medium">{a.tanggal}</td>
                          <td className="border border-black p-2 text-center font-extrabold uppercase">
                            <span className={
                              a.status === "hadir" ? "text-green-700" :
                              a.status === "sakit" ? "text-red-600" :
                              a.status === "izin" ? "text-yellow-600" : "text-gray-900"
                            }>
                              {a.status}
                            </span>
                          </td>
                          <td className="border border-black p-2 text-center font-mono">{a.jamMasuk}</td>
                          <td className="border border-black p-2 text-center font-mono">{a.jamPulang || "-"}</td>
                          <td className="border border-black p-2 italic">{a.keterangan || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Signatures */}
                  <div className="mt-16 grid grid-cols-2 gap-10 text-center text-[11px] print:avoid-break">
                    <div className="space-y-16">
                      <p>Mengetahui,<br /><span className="font-bold">Penyelia / Pembimbing Industri</span></p>
                      <div className="space-y-1">
                        <p className="underline font-bold">( ...................................................... )</p>
                        <p className="text-[10px] text-gray-500">Nama Lengkap & Cap Perusahaan</p>
                      </div>
                    </div>

                    <div className="space-y-16">
                      <p>Bajawa, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}<br /><span className="font-bold">Koordinator PKL SMKS Katolik Sanjaya</span></p>
                      <div className="space-y-1">
                        <p className="underline font-bold">( ...................................................... )</p>
                        <p className="text-[10px] text-gray-500">NIP / Kode Verifikasi Sekolah</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Manajemen Rekap Absensi</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase font-semibold tracking-wider">
            Sekolah Admin • Mengoreksi, mendaftar, dan merekap data kehadiran PKL siswa secara rinci
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setExportDialogOpen(true)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
            id="btn-export-absensi"
          >
            <Download className="w-4 h-4 text-[#1565C0]" /> Ekspor Data
          </button>
          <button
            onClick={() => setIsPrintPreview(true)}
            className="px-4 py-2 bg-[#1565C0] hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
            id="btn-cetak-rekap-absensi"
          >
            <Printer className="w-4 h-4" /> Cetak Rekap per Siswa
          </button>
          <button
            onClick={openAddDialog}
            className="px-4 py-2 bg-[#2E7D32] hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm"
            id="btn-tambah-absensi-manual"
          >
            <Plus className="w-4 h-4" /> Input Manual
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row items-center gap-4 justify-between">
        <div className="relative w-full lg:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            placeholder="Cari nama siswa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all dark:text-gray-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Student Selector List */}
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 w-full sm:w-auto">
            <User className="w-4 h-4 text-[#1565C0] shrink-0" />
            <span className="shrink-0">Pilih Siswa:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-[#1565C0] max-w-[200px]"
              id="select-student-filter-absensi"
            >
              <option value="">-- Semua Siswa (Semua Data) --</option>
              {myCompanyStudents.map((st) => (
                <option key={st.uid} value={st.uid}>
                  {st.name} ({st.kelas || "Tanpa Kelas"})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="shrink-0">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-700 dark:text-gray-200 outline-none focus:ring-1 focus:ring-[#1565C0]"
            >
              <option value="all">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="sakit">Sakit</option>
              <option value="izin">Izin</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="shrink-0">Tanggal:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs text-gray-700 dark:text-gray-200 outline-none"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter("")}
                className="text-[10px] text-red-500 hover:underline font-bold"
              >
                Reset
              </button>
            )}
          </div>

          <div className="text-[11px] font-medium text-gray-400 ml-auto shrink-0 select-none">
            Total: <b>{filteredAttendance.length}</b> rekap
          </div>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {!loading && filteredAttendance.length > 0 && (
        <div className="bg-white dark:bg-[#111827] p-4 rounded-2xl border border-gray-200/60 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Pilihan Massal: Terpilih <b>{selectedAbsensiIds.length}</b> data absensi
            </span>
          </div>
          {selectedAbsensiIds.length > 0 && (
            <button
              onClick={handleBulkDeleteAbsensi}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              id="btn-bulk-delete-absensi"
            >
              <Trash2 className="w-4 h-4" /> Hapus Terpilih ({selectedAbsensiIds.length})
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#1565C0] animate-spin" />
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Menyelaraskan Data Absensi...</p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#111827] rounded-3xl border border-gray-200/60 dark:border-gray-800/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800 text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-gray-900/10 uppercase tracking-widest select-none">
                  <th className="py-4 px-6 w-12">
                    <input
                      type="checkbox"
                      checked={
                        filteredAttendance.length > 0 &&
                        filteredAttendance.every((a) => selectedAbsensiIds.includes(a.id))
                      }
                      onChange={() => handleSelectAllAbsensi(filteredAttendance)}
                      className="w-4 h-4 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-6">Siswa</th>
                  <th className="py-4 px-6">Tanggal</th>
                  <th className="py-4 px-6">Status Kehadiran</th>
                  <th className="py-4 px-6">Masuk</th>
                  <th className="py-4 px-6">Pulang</th>
                  <th className="py-4 px-6">Metode & Geotag</th>
                  <th className="py-4 px-6">Catatan Admin/Siswa</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-800/60">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-400 dark:text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-xs font-semibold">Tidak Ada Rekap Data Absensi Cocok</p>
                      <p className="text-[10px] text-gray-400 mt-1">Silakan sesuaikan filter pencarian atau input data baru secara manual.</p>
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/45 dark:hover:bg-gray-800/30 transition-colors text-xs text-gray-700 dark:text-gray-300">
                      <td className="py-4 px-6 w-12">
                        <input
                          type="checkbox"
                          checked={selectedAbsensiIds.includes(item.id)}
                          onChange={() => handleSelectAbsensi(item.id)}
                          className="w-4 h-4 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer"
                        />
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-900 dark:text-gray-100">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-[#1565C0] dark:text-[#60A5FA] flex items-center justify-center font-bold text-xs select-none">
                            {item.userName.substring(0,1)}
                          </div>
                          <span>{item.userName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold whitespace-nowrap">{item.tanggal}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full select-none ${
                            item.status === "hadir"
                              ? "bg-green-100 text-[#2E7D32]"
                              : item.status === "sakit"
                                ? "bg-red-100 text-red-800"
                                : item.status === "izin"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono font-medium">{item.jamMasuk}</td>
                      <td className="py-4 px-6 font-mono font-medium">{item.jamPulang || "--:--"}</td>
                      <td className="py-4 px-6">
                        {item.selfieUrl ? (
                          <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase flex items-center gap-1 select-none">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Selfie + GPS
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium select-none">Manual Admin</span>
                        )}
                      </td>
                      <td className="py-4 px-6 max-w-xs truncate italic text-gray-500 dark:text-gray-400">
                        {item.keterangan || "-"}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditDialog(item)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-[#1565C0] rounded-lg transition-colors border border-blue-200/35"
                            title="Edit Rekap"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.userName, item.tanggal)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors border border-red-200/35"
                            title="Hapus Rekap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MANUAL INPUT & CORRECTION FORM DIALOG */}
      <Dialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSaveManual}>
          <DialogTitle className="font-bold text-gray-900 text-base border-b border-gray-100 pb-3 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-[#1565C0]" />
            {editingEntry ? "Koreksi Kehadiran Siswa PKL" : "Input Manual Kehadiran PKL Baru"}
          </DialogTitle>
          <DialogContent className="pt-4 space-y-4 font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Siswa Selector */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pilih Siswa PKL</label>
                {editingEntry ? (
                  <div className="bg-gray-150 text-gray-700 px-4 py-3 rounded-xl border border-gray-200 font-bold text-xs">
                    {editingEntry.userName}
                  </div>
                ) : (
                  <select
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-[#1565C0] transition-all font-semibold"
                    required
                  >
                    <option value="" disabled>-- Pilih Siswa --</option>
                    {myCompanyStudents.map((st) => (
                      <option key={st.uid} value={st.uid}>
                        {st.name} ({st.kelas || "XII"}) - {st.tempatPkl || "Belum ditempatkan"}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Tanggal Kehadiran</label>
                <input
                  type="date"
                  value={formTanggal}
                  onChange={(e) => setFormTanggal(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1565C0] transition-all"
                  required
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Status Presensi</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as AttendanceStatus)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1565C0] transition-all font-semibold"
                >
                  <option value="hadir">Hadir (Bekerja)</option>
                  <option value="sakit">Sakit</option>
                  <option value="izin">Izin</option>
                  <option value="alpa">Alpa (Tanpa Keterangan)</option>
                </select>
              </div>

              {/* Jam Masuk */}
              {formStatus === "hadir" && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Jam Masuk (Clock In)</label>
                    <input
                      type="text"
                      placeholder="07:30"
                      value={formJamMasuk}
                      onChange={(e) => setFormJamMasuk(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-[#1565C0] transition-all"
                      required
                    />
                  </div>

                  {/* Jam Pulang */}
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Jam Pulang (Clock Out)</label>
                    <input
                      type="text"
                      placeholder="16:00"
                      value={formJamPulang}
                      onChange={(e) => setFormJamPulang(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono outline-none focus:ring-2 focus:ring-[#1565C0] transition-all"
                    />
                  </div>
                </>
              )}

              {/* Keterangan */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Catatan Keterangan / Alasan Ketidakhadiran
                </label>
                <textarea
                  placeholder="Isi keterangan, misalnya 'Sakit demam, surat terlampir' atau 'Izin keperluan keluarga mendesak'."
                  value={formKeterangan}
                  onChange={(e) => setFormKeterangan(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#1565C0] transition-all h-20 resize-none"
                />
              </div>

            </div>
          </DialogContent>
          <DialogActions className="border-t border-gray-100 p-3 flex gap-2">
            <Button
              onClick={() => setFormDialogOpen(false)}
              variant="outlined"
              style={{ color: "#666", borderColor: "#ddd", borderRadius: 8, fontSize: "11px", textTransform: "none" }}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="contained"
              style={{ backgroundColor: "#1565C0", borderRadius: 8, fontSize: "11px", fontWeight: "bold", textTransform: "none" }}
            >
              Simpan Data Kehadiran
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* EXPORT DATA DIALOG */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle className="font-bold text-gray-900 text-base border-b border-gray-100 pb-3 flex items-center gap-2">
          <Download className="w-5 h-5 text-[#1565C0]" /> Ekspor Rekap Absensi Siswa
        </DialogTitle>
        <DialogContent className="pt-4 space-y-4">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Ekspor seluruh data daftar hadir siswa PKL yang terfilter (<b>{filteredAttendance.length} entri</b>) ke komputer Anda. Silakan pilih format dokumen di bawah ini.
          </p>

          <div className="space-y-3">
            <label className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">Format Dokumen</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat("csv")}
                className={`p-3.5 border rounded-xl text-left transition-all ${
                  exportFormat === "csv"
                    ? "border-[#1565C0] bg-blue-50/20 text-[#1565C0] ring-2 ring-[#1565C0]/25"
                    : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                }`}
              >
                <div className="font-bold text-xs">Microsoft Excel (CSV)</div>
                <div className="text-[9px] text-gray-400 mt-0.5">Format standar tabel spreadsheet .csv</div>
              </button>
              <button
                type="button"
                onClick={() => setExportFormat("json")}
                className={`p-3.5 border rounded-xl text-left transition-all ${
                  exportFormat === "json"
                    ? "border-[#1565C0] bg-blue-50/20 text-[#1565C0] ring-2 ring-[#1565C0]/25"
                    : "border-gray-200 hover:border-gray-300 text-gray-600 bg-white"
                }`}
              >
                <div className="font-bold text-xs">Dokumen JSON</div>
                <div className="text-[9px] text-gray-400 mt-0.5">Format data mentah terstruktur .json</div>
              </button>
            </div>
          </div>

          <div className="p-3 bg-gray-50 border border-gray-150 rounded-xl text-[10px] text-gray-500 space-y-1">
            <p className="font-bold text-gray-600">Catatan Ekspor:</p>
            <p>• Data diselaraskan dengan hasil pencarian dan filter status/tanggal aktif Anda saat ini.</p>
          </div>
        </DialogContent>
        <DialogActions className="border-t border-gray-100 p-3 flex gap-2">
          <Button
            onClick={() => setExportDialogOpen(false)}
            variant="outlined"
            style={{ color: "#666", borderColor: "#ddd", borderRadius: 8, fontSize: "11px", textTransform: "none" }}
          >
            Batal
          </Button>
          <Button
            onClick={handleExport}
            variant="contained"
            style={{ backgroundColor: "#1565C0", borderRadius: 8, fontSize: "11px", fontWeight: "bold", textTransform: "none" }}
          >
            Unduh File Absensi
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
};

export default KehadiranManajemen;
