import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import { JurnalEntry, UserProfile } from "../models/types";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  User, 
  Calendar, 
  MessageSquare,
  Upload,
  Printer,
  Download,
  Search,
  Check,
  FileJson,
  Star,
  ChevronLeft,
  Trash2,
  X
} from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from "@mui/material";

export const JurnalReview: React.FC = () => {
  const { user } = useAuth();
  const [journals, setJournals] = useState<JurnalEntry[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [loading, setLoading] = useState(true);

  // States to track input comments for each journal being reviewed (Advisor/Industry)
  const [comments, setComments] = useState<Record<string, string>>({});
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Admin and Catalog specific states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isPrintPreview, setIsPrintPreview] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  const [selectedJournalIds, setSelectedJournalIds] = useState<string[]>([]);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  const handleSelectJournal = (id: string) => {
    setSelectedJournalIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllJournals = (visibleJournals: JurnalEntry[]) => {
    const visibleIds = visibleJournals.map((j) => j.id);
    const allSelected = visibleIds.every((id) => selectedJournalIds.includes(id));
    if (allSelected) {
      // Unselect all visible
      setSelectedJournalIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      // Select all visible
      setSelectedJournalIds((prev) => {
        const union = [...prev];
        visibleIds.forEach((id) => {
          if (!union.includes(id)) union.push(id);
        });
        return union;
      });
    }
  };

  const handleBulkDeleteJournals = async () => {
    if (selectedJournalIds.length === 0) return;
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus ${selectedJournalIds.length} laporan jurnal yang dipilih secara permanen? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      await Promise.all(selectedJournalIds.map((id) => pklService.deleteJurnal(id)));
      if ((window as any).showToast) {
        (window as any).showToast(`Berhasil menghapus ${selectedJournalIds.length} laporan jurnal!`, "success");
      }
      setSelectedJournalIds([]);
      await loadJournals();
    } catch (err) {
      console.error(err);
      if ((window as any).showToast) {
        (window as any).showToast("Gagal menghapus beberapa laporan jurnal.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJournal = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus laporan jurnal harian ini secara permanen?")) {
      return;
    }
    try {
      await pklService.deleteJurnal(id);
      if ((window as any).showToast) {
        (window as any).showToast("Laporan jurnal berhasil dihapus.", "success");
      }
      loadJournals();
    } catch (err) {
      console.error("Error deleting journal:", err);
      if ((window as any).showToast) {
        (window as any).showToast("Gagal menghapus laporan jurnal.", "error");
      }
    }
  };

  const loadJournals = async () => {
    try {
      setLoading(true);
      const [list, allProfiles] = await Promise.all([
        pklService.getJurnal(),
        pklService.getAllUserProfiles()
      ]);
      setJournals(list);
      setProfiles(allProfiles);
    } catch (err) {
      console.error("Error loading journals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJournals();
  }, []);

  const handleCommentChange = (id: string, text: string) => {
    setComments((prev) => ({ ...prev, [id]: text }));
  };

  const handleUpdateStatus = async (id: string, status: "approved" | "rejected") => {
    const comment = comments[id] || "";
    try {
      setActionSuccess(null);
      await pklService.updateJurnalStatus(id, status, comment);
      setActionSuccess(`Berhasil ${status === "approved" ? "menyetujui" : "menolak"} laporan jurnal.`);

      // Clear the comment field for this item
      setComments((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      // Reload journals to sync local state
      await loadJournals();
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  // Export file processing
  const handleExport = () => {
    if (exportFormat === "json") {
      const enrichedJournals = filteredJournals.map((j) => {
        const studentProfile = profiles.find((p) => p.uid === j.userId);
        return {
          ...j,
          kelas: studentProfile?.kelas || "-",
          tempatPkl: studentProfile?.tempatPkl || "-"
        };
      });
      const jsonString = JSON.stringify(enrichedJournals, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `katalog_jurnal_pkl_${new Date().toISOString().split("T")[0]}.json`;
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
        "Kelas / Jurusan",
        "Nama DUDI / Mitra PKL",
        "Kegiatan Pekerjaan",
        "Kendala Lapangan",
        "Solusi Mandiri",
        "Status Verifikasi",
        "Komentar Verifikasi"
      ];
      const csvRows = filteredJournals.map((j, idx) => {
        const studentProfile = profiles.find((p) => p.uid === j.userId);
        const kelas = studentProfile?.kelas || "-";
        const dudi = studentProfile?.tempatPkl || "-";

        const cleanKelas = kelas.replace(/"/g, '""');
        const cleanDudi = dudi.replace(/"/g, '""');
        const cleanKegiatan = (j.kegiatan || "").replace(/"/g, '""');
        const cleanKendala = (j.kendala || "").replace(/"/g, '""');
        const cleanSolusi = (j.solusi || "").replace(/"/g, '""');
        const cleanComment = (j.pembimbingComment || "").replace(/"/g, '""');

        return [
          idx + 1,
          j.tanggal,
          j.userName,
          `"${cleanKelas}"`,
          `"${cleanDudi}"`,
          `"${cleanKegiatan}"`,
          `"${cleanKendala}"`,
          `"${cleanSolusi}"`,
          j.status === "approved" ? "Disetujui DUDI & Guru" : j.status,
          `"${cleanComment}"`
        ];
      });

      const csvContent = "\uFEFF" + [csvHeaders.join(","), ...csvRows.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `katalog_jurnal_pkl_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    setExportDialogOpen(false);
    if ((window as any).showToast) {
      (window as any).showToast(`Berhasil mengekspor ${filteredJournals.length} data jurnal harian!`, "success");
    }
  };

  // Filter journals for the current supervisor if they are "industri"
  const myCompanyJournals = journals.filter((j) => {
    if (user?.role === "industri") {
      const studentProfile = profiles.find((p) => p.uid === j.userId);
      const studentPlaceId = studentProfile?.tempatPklId || "";
      const studentPlaceName = studentProfile?.tempatPkl || "";
      const supervisorPlaceId = user?.tempatPklId || "";
      const supervisorPlaceName = user?.tempatPkl || "";

      const isMatch = 
        (supervisorPlaceId && studentPlaceId === supervisorPlaceId) ||
        (supervisorPlaceName && studentPlaceName === supervisorPlaceName);
        
      return isMatch;
    }
    return true;
  });

  // Filter journals dynamically
  const filteredJournals = myCompanyJournals.filter((j) => {
    // 1. Student list selection filter
    const matchesStudent = selectedStudentId ? j.userId === selectedStudentId : true;
    if (!matchesStudent) return false;

    // 2. Search keyword filter
    const matchesSearch = searchTerm ? (
      j.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.kegiatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (j.tanggal && j.tanggal.includes(searchTerm))
    ) : true;
    if (!matchesSearch) return false;

    // 3. Status filter
    if (user?.role === "admin") {
      if (filter === "all") return true;
      return j.status === filter;
    }

    // Advisor / Industry displays based on status filter
    if (filter === "all") return true;
    return j.status === filter;
  });

  const activeTahunAjaran = "2025/2026 - Genap";

  // PDF / Print Layout Page override
  if (isPrintPreview) {
    const groupedByStudent = filteredJournals.reduce((acc, curr) => {
      if (!acc[curr.userName]) {
        acc[curr.userName] = [];
      }
      acc[curr.userName].push(curr);
      return acc;
    }, {} as Record<string, JurnalEntry[]>);

    const studentEntries = Object.entries(groupedByStudent);

    return (
      <div className="bg-[#E5E7EB] dark:bg-gray-950 min-h-screen pb-12 select-none font-sans print:bg-white print:pb-0">
        <style>{`
          @media print {
            body {
              background-color: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
            .print-page {
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
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
            aside, header, nav, .sidebar, .topbar, .mui-app-bar {
              display: none !important;
            }
          }
        `}</style>

        {/* Floating Controls */}
        <div className="no-print bg-[#1F2937] text-white py-3.5 px-6 flex items-center justify-between shadow-md sticky top-0 z-50">
          <button 
            onClick={() => setIsPrintPreview(false)}
            className="flex items-center gap-1.5 text-xs font-bold hover:text-gray-300 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Kembali ke Katalog
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-medium text-gray-300">Tip: Setiap siswa dicetak pada <b>lembaran kertas terpisah</b> secara otomatis.</span>
            <button
              onClick={() => window.print()}
              className="bg-[#2E7D32] hover:bg-green-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" /> Cetak / Simpan PDF
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas per Student */}
        <div className="space-y-8 print:space-y-0">
          {studentEntries.length === 0 ? (
            <div className="print-page bg-white text-black p-10 max-w-5xl mx-auto my-8 shadow-xl border border-gray-200 rounded-lg min-h-[297mm] flex flex-col justify-center items-center">
              <p className="text-xs text-gray-400 font-semibold">Tidak ada jurnal harian yang disetujui untuk dicetak.</p>
            </div>
          ) : (
            studentEntries.map(([studentName, studentJournals]) => (
              <div 
                key={studentName} 
                className="print-page bg-white text-black p-10 max-w-5xl mx-auto my-8 shadow-xl border border-gray-200 rounded-lg min-h-[297mm]"
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
                    LAPORAN JURNAL HARIAN PRAKTIK KERJA LAPANGAN (PKL)
                  </h2>
                  <p className="text-[10px] font-mono text-gray-600">TAHUN AJARAN: {activeTahunAjaran}</p>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-[11px] mb-4 bg-gray-50 p-3 rounded-lg border border-gray-150 print:bg-white print:border-none print:p-0">
                  <div>
                    <p><span className="font-bold text-gray-500">NAMA SISWA:</span> <span className="font-extrabold text-xs text-gray-900 print:text-black uppercase">{studentName}</span></p>
                    <p><span className="font-bold text-gray-500">Total Jurnal:</span> {studentJournals.length} Laporan</p>
                  </div>
                  <div className="text-right">
                    <p><span className="font-bold text-gray-500">Tanggal Cetak:</span> {new Date().toLocaleDateString("id-ID", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric"
                    })}</p>
                    <p><span className="font-bold text-gray-500">Dicetak Oleh:</span> {user?.role === "admin" ? "Admin SMK Sanjaya" : user?.role === "industri" ? `Pembimbing Industri (${user?.name})` : `Guru Pembimbing (${user?.name})`}</p>
                  </div>
                </div>

                {/* Table */}
                <table className="w-full text-left border-collapse border border-black text-[10px] leading-relaxed">
                  <thead>
                    <tr className="bg-gray-100 print:bg-transparent">
                      <th className="border border-black p-2 text-center font-bold w-10">No</th>
                      <th className="border border-black p-2 font-bold w-24">Tanggal</th>
                      <th className="border border-black p-2 font-bold">Aktivitas / Kegiatan Pekerjaan (DUDI)</th>
                      <th className="border border-black p-2 font-bold w-44">Kendala Lapangan</th>
                      <th className="border border-black p-2 font-bold w-44">Solusi / Penyelesaian Mandiri</th>
                      <th className="border border-black p-2 font-bold w-28 text-center">Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentJournals.map((j, idx) => (
                      <tr key={j.id} className="align-top">
                        <td className="border border-black p-2 text-center">{idx + 1}</td>
                        <td className="border border-black p-2 font-semibold whitespace-nowrap">{j.tanggal}</td>
                        <td className="border border-black p-2 whitespace-pre-line">{j.kegiatan}</td>
                        <td className="border border-black p-2 italic">{j.kendala || "-"}</td>
                        <td className="border border-black p-2">{j.solusi || "-"}</td>
                        <td className="border border-black p-2 text-center text-[9px] font-medium text-green-800">
                          Disetujui
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Signature Blocks */}
                <div className="mt-12 grid grid-cols-2 gap-10 text-center text-[11px] print:avoid-break">
                  <div className="space-y-16">
                    <p>Mengetahui,<br /><span className="font-bold">Pembimbing Industri (DUDI)</span></p>
                    <div className="space-y-1">
                      <p className="underline font-bold">( ...................................................... )</p>
                      <p className="text-[10px] text-gray-500">Nama Lengkap & Cap Perusahaan</p>
                    </div>
                  </div>

                  <div className="space-y-16">
                    <p>Bajawa, {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}<br /><span className="font-bold">Kepala Sekolah / Koordinator PKL</span></p>
                    <div className="space-y-1">
                      <p className="underline font-bold">( ...................................................... )</p>
                      <p className="text-[10px] text-gray-500">NIP. Admin / Kepala Sekolah</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {user?.role === "admin" ? "Katalog Jurnal Harian" : "Persetujuan Jurnal Siswa"}
          </h1>
          <p className="text-xs text-gray-500 mt-1 uppercase font-semibold tracking-wider">
            {user?.role === "admin" 
              ? "Katalog laporan harian siswa yang telah disetujui oleh DUDI dan Guru Pembimbing"
              : "Tinjau laporan aktivitas harian kerja lapangan siswa SMKS Sanjaya"}
          </p>
        </div>

        {/* Header Toolbar Actions */}
        {(user?.role === "admin" || user?.role === "industri" || user?.role === "pembimbing") && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setExportDialogOpen(true)}
              className="px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:text-gray-900 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              id="btn-admin-export-journal"
            >
              <Download className="w-4 h-4 text-[#1565C0]" /> Ekspor Data Jurnal
            </button>
            <button
              onClick={() => setIsPrintPreview(true)}
              className="px-4 py-2 bg-[#2E7D32] hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              id="btn-admin-print-journal"
            >
              <Printer className="w-4 h-4" /> Cetak Laporan PDF
            </button>
          </div>
        )}

        {/* Filter Toolbar for Admin, Guru/Pembimbing and Industri */}
        {(user?.role === "admin" || user?.role === "pembimbing" || user?.role === "industri") && (
          <div className="flex bg-white border border-gray-200 p-1 rounded-xl shadow-sm self-start md:self-center">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === "all" ? "bg-[#1565C0] text-white" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Semua ({myCompanyJournals.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === "pending" ? "bg-yellow-500 text-white" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Tertunda ({myCompanyJournals.filter((j) => j.status === "pending").length})
            </button>
            <button
              onClick={() => setFilter("approved")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === "approved" ? "bg-[#2E7D32] text-white" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Disetujui ({myCompanyJournals.filter((j) => j.status === "approved").length})
            </button>
            <button
              onClick={() => setFilter("rejected")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === "rejected" ? "bg-red-600 text-white" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Ditolak ({myCompanyJournals.filter((j) => j.status === "rejected").length})
            </button>
          </div>
        )}
      </div>

      {actionSuccess && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-xl flex items-center gap-2 text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 text-blue-500" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Admin and Supervisor search & student selection section */}
      {(user?.role === "admin" || user?.role === "pembimbing" || user?.role === "industri") && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Student Dropdown Selector */}
            <div className="md:col-span-5 space-y-1">
              <label className="text-[10px] font-bold text-[#1565C0] uppercase tracking-wider block">List Pilih Siswa:</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-semibold cursor-pointer shadow-sm"
                id="select-student-filter-journal"
              >
                <option value="">-- Tampilkan Semua Data Siswa --</option>
                {profiles.filter(p => p.role === "siswa").map(s => (
                  <option key={s.uid} value={s.uid}>
                    {s.name} ({s.kelas || "Tanpa Kelas"}) {s.tempatPkl ? `— ${s.tempatPkl}` : "— Belum PKL"}
                  </option>
                ))}
              </select>
            </div>

            {/* Keyword Search */}
            <div className="md:col-span-7 space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Cari Laporan:</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Cari kata kunci kegiatan harian, kendala, atau tanggal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all font-semibold shadow-sm"
                  id="admin-journal-search"
                />
              </div>
            </div>
          </div>
          
          {user?.role === "admin" && (
            <div className="bg-[#1565C0]/5 border border-[#1565C0]/10 p-2.5 rounded-xl flex items-center justify-between text-xs font-semibold">
              <span className="text-gray-500 flex items-center gap-1.5"><Star className="w-4 h-4 text-[#1565C0]" /> Total Disetujui:</span>
              <span className="text-sm font-black text-[#1565C0]">{journals.filter(j => j.status === "approved").length} Jurnal</span>
            </div>
          )}
        </div>
      )}

      {/* Bulk Selection Bar */}
      {!loading && filteredJournals.length > 0 && (user?.role === "admin" || user?.role === "pembimbing" || user?.role === "industri") && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200/85 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="select-all-journals"
              checked={
                filteredJournals.length > 0 &&
                filteredJournals.every((j) => selectedJournalIds.includes(j.id))
              }
              onChange={() => handleSelectAllJournals(filteredJournals)}
              className="w-4 h-4 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer"
            />
            <label htmlFor="select-all-journals" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
              Pilih Semua Data ({filteredJournals.length} Laporan Terfilter)
            </label>
          </div>
          {selectedJournalIds.length > 0 && (
            <div className="flex items-center gap-2 animate-fade-in w-full sm:w-auto justify-end">
              <span className="text-xs text-red-650 font-bold">
                Terpilih: <b>{selectedJournalIds.length}</b> laporan
              </span>
              <button
                onClick={handleBulkDeleteJournals}
                className="bg-red-650 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                id="btn-bulk-delete-journals"
              >
                <Trash2 className="w-4 h-4" /> Hapus Terpilih
              </button>
            </div>
          )}
        </div>
      )}

      {/* Journals List Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredJournals.length === 0 ? (
        <div className="bg-white py-16 text-center text-gray-400 rounded-3xl border border-gray-200">
          <FileText className="w-14 h-14 mx-auto mb-2 opacity-35" />
          <p className="text-sm font-semibold">Tidak Ada Jurnal Ditemukan</p>
          <p className="text-xs text-gray-400 mt-1">Laporan dengan filter ini kosong.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredJournals.map((j) => (
            <div
              key={j.id}
              className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 flex flex-col md:flex-row md:items-start justify-between gap-6"
            >
               {/* Left Column: Student Detail & Journal Logs */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  {(user?.role === "admin" || user?.role === "pembimbing" || user?.role === "industri") && (
                    <input
                      type="checkbox"
                      checked={selectedJournalIds.includes(j.id)}
                      onChange={() => handleSelectJournal(j.id)}
                      className="w-4 h-4 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer"
                    />
                  )}
                  <div className="flex items-center gap-2 bg-blue-50/50 text-[#1565C0] text-xs font-bold px-3 py-1.5 rounded-xl border border-blue-100">
                    <User className="w-3.5 h-3.5" />
                    <span>{j.userName}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 text-gray-500 text-xs font-semibold px-3 py-1.5 rounded-xl">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{j.tanggal}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full ${
                      j.status === "approved"
                        ? "bg-green-100 text-[#2E7D32]"
                        : j.status === "rejected"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {j.status === "approved" ? "Disetujui DUDI & Guru" : j.status === "rejected" ? "Ditolak" : "Tertunda"}
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  <div>
                    <h5 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Aktivitas Pekerjaan</h5>
                    <p className="text-xs text-gray-800 mt-0.5 whitespace-pre-line leading-relaxed">
                      {j.kegiatan}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-red-50/35 p-3 rounded-xl border border-red-50">
                      <h5 className="text-[10px] uppercase font-bold text-red-700/60 tracking-wider">Kendala Lapangan</h5>
                      <p className="text-xs text-gray-700 mt-0.5 italic">{j.kendala || "Tidak ada kendala"}</p>
                    </div>
                    <div className="bg-green-50/35 p-3 rounded-xl border border-green-50">
                      <h5 className="text-[10px] uppercase font-bold text-[#2E7D32]/60 tracking-wider">Solusi Mandiri</h5>
                      <p className="text-xs text-gray-700 mt-0.5">{j.solusi || "Tidak ada solusi"}</p>
                    </div>
                  </div>

                  {j.fotoUrl && (
                    <div className="pt-2">
                      <h5 className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">Foto Kegiatan (Dokumentasi)</h5>
                      <div 
                        className="relative group overflow-hidden rounded-xl border border-gray-200 bg-gray-50 max-w-xs cursor-pointer"
                        onClick={() => setSelectedPhotoModal(j.fotoUrl || null)}
                      >
                        <img src={j.fotoUrl} alt="Dokumentasi Jurnal" className="max-h-28 w-auto object-cover rounded-xl transition-all group-hover:scale-105" referrerPolicy="no-referrer" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                          <span className="text-[10px] text-white font-semibold">Klik untuk Perbesar</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {j.pembimbingComment && (
                  <div className="bg-green-50 p-3 rounded-xl border border-green-100 flex items-start gap-2">
                    <MessageSquare className="w-4 h-4 text-[#2E7D32] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-green-800 tracking-wider">Komentar Verifikasi</p>
                      <p className="text-xs text-[#2E7D32] mt-0.5 font-medium italic">"{j.pembimbingComment}"</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Actions (Hapus) */}
              {(user?.role === "admin" || user?.role === "pembimbing" || user?.role === "industri") && (
                <div className="w-full md:w-32 flex flex-col justify-start md:items-end shrink-0">
                  <button
                    onClick={() => handleDeleteJournal(j.id)}
                    className="bg-white hover:bg-red-50 border border-red-200 text-red-600 hover:text-red-800 font-bold py-1.5 px-3 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                    title="Hapus Jurnal Harian"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              )}

              {/* Right Column: Supervisor Actions (Only for non-admin pending items) */}
              {user?.role !== "admin" && j.status === "pending" && (
                <div className="w-full md:w-72 bg-gray-50 border border-gray-200/80 p-4 rounded-xl space-y-3 shrink-0 self-stretch flex flex-col justify-between">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Berikan Catatan / Umpan Balik
                    </label>
                    <textarea
                      value={comments[j.id] || ""}
                      onChange={(e) => handleCommentChange(j.id, e.target.value)}
                      placeholder="Contoh: Sangat baik, kuasai aspek routing dinamis pada routerboard..."
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-[#1565C0] outline-none transition-all h-20 resize-none font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdateStatus(j.id, "rejected")}
                      className="bg-white hover:bg-red-50 border border-red-200 text-red-700 hover:text-red-800 font-semibold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <XCircle className="w-4 h-4" /> Tolak
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(j.id, "approved")}
                      className="bg-[#2E7D32] hover:bg-green-700 text-white font-semibold py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Setujui
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Export Data Dialog for Admin */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle className="font-bold text-base text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-1.5">
          <Download className="w-5 h-5 text-[#1565C0]" /> Ekspor Jurnal Harian Siswa
        </DialogTitle>
        <DialogContent className="pt-4 space-y-4">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Ekspor seluruh data katalog jurnal harian yang saat ini terfilter (<b>{filteredJournals.length} Jurnal</b>) ke komputer Anda. Silakan pilih format dokumen di bawah ini.
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
            <p>• Data yang diekspor disesuaikan dengan kata kunci pencarian jika Anda menggunakan filter pencarian.</p>
            <p>• Ekspor data disesuaikan dengan filter status yang sedang aktif.</p>
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
            Unduh File Jurnal
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lightbox Photo Modal */}
      {selectedPhotoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in animate-duration-200"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div className="relative max-w-3xl w-full bg-white dark:bg-[#111827] rounded-2xl overflow-hidden shadow-2xl p-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhotoModal(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/85 text-white rounded-full transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={selectedPhotoModal} alt="Dokumentasi Jurnal Besar" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" referrerPolicy="no-referrer" />
          </div>
        </div>
      )}
    </div>
  );
};

export default JurnalReview;
