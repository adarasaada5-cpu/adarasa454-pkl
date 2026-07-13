import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import { MonitoringEntry, UserProfile } from "../models/types";
import {
  ClipboardList,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
  FileText,
  MapPin,
  Camera,
  Signature,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  Printer,
  Trash2,
} from "lucide-react";

export const AdminMonitoring: React.FC = () => {
  const { user } = useAuth();

  // Core Data States
  const [monitorings, setMonitorings] = useState<MonitoringEntry[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [pembimbings, setPembimbings] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter & Sort States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPembimbing, setFilterPembimbing] = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [filterStatusSiswa, setFilterStatusSiswa] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  
  // Sort state
  const [sortBy, setSortBy] = useState<"tanggal" | "studentName" | "pembimbingName" | "statusSiswa">("tanggal");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Detail Modal State
  const [selectedMonitoring, setSelectedMonitoring] = useState<MonitoringEntry | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Delete modal state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [monitoringToDelete, setMonitoringToDelete] = useState<MonitoringEntry | null>(null);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load aggregate data
  const loadAggregateData = async () => {
    try {
      setLoading(true);
      const [allProfiles, allMonitorings] = await Promise.all([
        pklService.getAllUserProfiles(),
        pklService.getMonitorings(), // Gets all monitorings for admin
      ]);

      setStudents(allProfiles.filter((p) => p.role === "siswa"));
      setPembimbings(allProfiles.filter((p) => p.role === "pembimbing"));
      setMonitorings(allMonitorings);
    } catch (err) {
      console.error("Gagal memuat rekap monitoring admin:", err);
      showToast("Gagal menyinkronkan data monitoring.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAggregateData();
  }, []);

  const showToast = (msg: string, type: "success" | "error") => {
    if ((window as any).showToast) {
      (window as any).showToast(msg, type);
    } else {
      if (type === "success") {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(null), 4000);
      }
    }
  };

  // Sorting Handler
  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  // Filtering & Sorting Process
  const filteredAndSortedMonitorings = monitorings
    .filter((m) => {
      const matchesSearch =
        m.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.pembimbingName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tempatPkl.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.kategori.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.alamatGps && m.alamatGps.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPembimbing = filterPembimbing === "" || m.pembimbingId === filterPembimbing;
      const matchesStudent = filterStudent === "" || m.studentId === filterStudent;
      const matchesStatus = filterStatusSiswa === "" || m.statusSiswa === filterStatusSiswa;
      const matchesKategori = filterKategori === "" || m.kategori === filterKategori;

      return matchesSearch && matchesPembimbing && matchesStudent && matchesStatus && matchesKategori;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === "tanggal") {
        comparison = new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
      } else if (sortBy === "studentName") {
        comparison = a.studentName.localeCompare(b.studentName);
      } else if (sortBy === "pembimbingName") {
        comparison = a.pembimbingName.localeCompare(b.pembimbingName);
      } else if (sortBy === "statusSiswa") {
        comparison = a.statusSiswa.localeCompare(b.statusSiswa);
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

  // EXPORT EXCEL (CSV Format with UTF-8 BOM for automatic Excel support)
  const exportToExcel = () => {
    if (filteredAndSortedMonitorings.length === 0) {
      showToast("Tidak ada data monitoring untuk diexport.", "error");
      return;
    }

    const headers = [
      "ID",
      "Tanggal",
      "Kategori",
      "Guru Pembimbing",
      "Nama Siswa",
      "Kelas",
      "Tempat PKL",
      "Status Keaktifan",
      "Catatan Monitoring",
      "Alamat GPS",
      "Latitude",
      "Longitude",
      "Berita Acara Resmi",
    ];

    const csvRows = [headers.join(",")];

    filteredAndSortedMonitorings.forEach((m) => {
      const row = [
        `"${m.id}"`,
        `"${m.tanggal}"`,
        `"${m.kategori}"`,
        `"${m.pembimbingName}"`,
        `"${m.studentName}"`,
        `"${m.studentClass}"`,
        `"${m.tempatPkl}"`,
        `"${m.statusSiswa}"`,
        `"${m.catatan.replace(/"/g, '""').replace(/\n/g, " ")}"`,
        `"${(m.alamatGps || "").replace(/"/g, '""')}"`,
        m.latitude || "",
        m.longitude || "",
        `"${m.beritaAcara.replace(/"/g, '""').replace(/\n/g, " ")}"`,
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = "\uFEFF" + csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Monitoring_PKL_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Berhasil mengunduh dokumen Excel/CSV!", "success");
  };

  // EXPORT ALL TO PDF (Open a formatted, clean table for direct printing)
  const exportAllToPdf = () => {
    if (filteredAndSortedMonitorings.length === 0) {
      showToast("Tidak ada data untuk dicetak.", "error");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Mohon izinkan pop-up browser Anda untuk membuka dokumen PDF.", "error");
      return;
    }

    const rowsHtml = filteredAndSortedMonitorings
      .map(
        (m, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td>${new Date(m.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</td>
        <td><b>${m.studentName}</b><br/><small>${m.studentClass}</small></td>
        <td>${m.pembimbingName}</td>
        <td>${m.tempatPkl}</td>
        <td><span style="font-size: 11px; padding: 2px 6px; border-radius: 4px; background: #f3f4f6; font-weight: bold;">${m.statusSiswa}</span></td>
        <td>${m.catatan}</td>
        <td><small>${m.alamatGps || "-"}</small></td>
      </tr>
    `
      )
      .join("");

    const htmlContent = `
      <html>
        <head>
          <title>Rekapitulasi Monitoring PKL - SMKS Sanjaya Bajawa</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 30px; font-size: 12px; color: #111; }
            .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px; }
            .school-title { font-size: 16px; font-weight: bold; }
            .school-sub { font-size: 11px; color: #555; }
            .doc-title { text-align: center; font-size: 14px; font-weight: bold; margin: 15px 0; text-transform: uppercase; letter-spacing: 1px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
            th { background-color: #f8fafc; font-weight: bold; font-size: 11px; text-transform: uppercase; }
            tr:nth-child(even) { background-color: #fcfcfc; }
            .meta { margin-bottom: 15px; font-size: 11px; color: #444; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div class="school-title">YAYASAN PERSEKOLAHAN SANJAYA BAJAWA</div>
            <div class="school-title" style="font-size: 18px; margin-top: 2px;">SMKS SANJAYA BAJAWA</div>
            <div class="school-sub">Sistem Informasi Monitoring PKL Lapangan • Bajawa, Ngada, NTT</div>
          </div>

          <div class="doc-title">Rekapitulasi Laporan Monitoring Siswa PKL</div>
          
          <div class="meta">
            Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}<br/>
            Total Log Terfilter: <b>${filteredAndSortedMonitorings.length} Laporan</b>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 4%; text-align: center;">No</th>
                <th style="width: 10%;">Tanggal</th>
                <th style="width: 15%;">Nama Siswa</th>
                <th style="width: 15%;">Pembimbing</th>
                <th style="width: 15%;">Tempat PKL</th>
                <th style="width: 10%;">Status</th>
                <th style="width: 18%;">Catatan Temuan</th>
                <th style="width: 13%;">Titik GPS</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // EXPORT SINGLE REPORT TO PDF/PRINT
  const handlePrintSingle = (item: MonitoringEntry) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Mohon izinkan pop-up browser Anda untuk mencetak Berita Acara.", "error");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>Berita Acara Monitoring - ${item.studentName}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.6; color: #000; }
            .header-table { width: 100%; border-bottom: 3px double #000; margin-bottom: 20px; padding-bottom: 10px; }
            .school-title { text-align: center; font-size: 18px; font-weight: bold; }
            .school-subtitle { text-align: center; font-size: 14px; }
            .doc-title { text-align: center; font-size: 16px; font-weight: bold; text-decoration: underline; margin-top: 25px; margin-bottom: 20px; }
            .details-table { width: 100%; margin-bottom: 25px; border-collapse: collapse; }
            .details-table td { padding: 4px 8px; vertical-align: top; }
            .content-block { text-align: justify; white-space: pre-wrap; font-size: 14px; margin-bottom: 30px; }
            .photo-box { text-align: center; margin: 30px 0; }
            .photo-img { max-width: 320px; max-height: 200px; border: 1px solid #ccc; border-radius: 6px; }
            .sign-section { width: 100%; margin-top: 50px; }
            .sign-cols { display: flex; justify-content: space-between; }
            .sign-box { text-align: center; width: 45%; }
            .signature-img { height: 75px; margin-top: 10px; }
          </style>
        </head>
        <body onload="window.print()">
          <table class="header-table">
            <tr>
              <td class="school-title">YAYASAN PERSEKOLAHAN SANJAYA BAJAWA</td>
            </tr>
            <tr>
              <td class="school-title" style="font-size: 20px;">SMKS SANJAYA BAJAWA</td>
            </tr>
            <tr>
              <td class="school-subtitle">Jl. Trans Flores, Bajawa, Kabupaten Ngada, Nusa Tenggara Timur</td>
            </tr>
          </table>

          <div class="doc-title">BERITA ACARA MONITORING LAPANGAN PKL</div>

          <table class="details-table">
            <tr>
              <td style="width: 25%; font-weight: bold;">Guru Pembimbing</td>
              <td style="width: 3%;">:</td>
              <td>${item.pembimbingName}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Nama Siswa</td>
              <td>:</td>
              <td>${item.studentName} (${item.studentClass})</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Tempat PKL</td>
              <td>:</td>
              <td>${item.tempatPkl}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Tanggal Kunjungan</td>
              <td>:</td>
              <td>${new Date(item.tanggal).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Status Keaktifan</td>
              <td>:</td>
              <td>${item.statusSiswa}</td>
            </tr>
            <tr>
              <td style="font-weight: bold;">Lokasi GPS</td>
              <td>:</td>
              <td>${item.alamatGps || "-"}</td>
            </tr>
          </table>

          <div class="content-block">
${item.beritaAcara}
          </div>

          ${
            item.fotoUrl
              ? `
          <div class="photo-box">
            <p style="font-size: 12px; font-weight: bold; margin-bottom: 5px;">DOKUMENTASI LAPANGAN</p>
            <img class="photo-img" src="${item.fotoUrl}" />
          </div>`
              : ""
          }

          <div class="sign-section">
            <div class="sign-cols">
              <div class="sign-box">
                <p>Mengetahui,</p>
                <p style="font-weight: bold; margin-bottom: 60px;">Pimpinan Industri / Penyelia</p>
                <p>( ________________________ )</p>
              </div>
              <div class="sign-box">
                <p>Bajawa, ${new Date(item.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                <p style="font-weight: bold;">Guru Pembimbing Lapangan,</p>
                ${
                  item.signatureUrl
                    ? `<img class="signature-img" src="${item.signatureUrl}" />`
                    : '<div style="margin-bottom: 60px;"></div>'
                }
                <p style="font-weight: bold; text-decoration: underline;">${item.pembimbingName}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Delete Action Handlers
  const handleDeleteClick = (item: MonitoringEntry) => {
    setMonitoringToDelete(item);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!monitoringToDelete) return;
    try {
      setLoading(true);
      await pklService.deleteMonitoring(monitoringToDelete.id);
      showToast("Laporan monitoring berhasil dihapus secara permanen.", "success");
      setIsDeleteOpen(false);
      setMonitoringToDelete(null);
      await loadAggregateData();
    } catch (err) {
      console.error(err);
      showToast("Gagal menghapus monitoring.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast elements */}
      {successMsg && (
        <div className="fixed top-5 right-5 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-5 right-5 z-50 bg-red-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      {/* Main Admin Header Panel */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-sm">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              Arsip Monitoring Guru Pembimbing
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Halaman Administrator untuk mengontrol, mengurutkan (sort), menyaring, dan mengekspor seluruh berita acara monitoring lapangan PKL.
            </p>
          </div>
        </div>

        {/* Sync Indicator */}
        <button
          onClick={loadAggregateData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all border border-gray-200/50 dark:border-gray-750 shrink-0 self-start md:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : ""}`} />
          {loading ? "Menyinkronkan..." : "Sinkronisasi Data"}
        </button>
      </div>

      {/* Export & Command Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-blue-50/60 to-gray-50/20 dark:from-gray-900 dark:to-gray-900/60 p-4 rounded-2xl border border-blue-50/20 dark:border-gray-800 shadow-sm">
        <div className="text-xs font-extrabold text-gray-700 dark:text-gray-300 flex items-center gap-2 uppercase tracking-wider">
          <Filter className="w-4 h-4 text-blue-500" /> Hasil Pencarian: {filteredAndSortedMonitorings.length} Laporan PKL
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={exportToExcel}
            disabled={filteredAndSortedMonitorings.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel/CSV
          </button>
          <button
            onClick={exportAllToPdf}
            disabled={filteredAndSortedMonitorings.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            <FileText className="w-4 h-4" /> Cetak PDF Rekap
          </button>
        </div>
      </div>

      {/* Grid Filter Options */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-4">
        {/* Row 1: Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kata kunci nama siswa, guru pembimbing, tempat PKL, alamat koordinat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-150 dark:border-gray-750 focus:border-blue-500 rounded-xl pl-10 pr-4 py-3 text-xs outline-none"
          />
        </div>

        {/* Row 2: Combobox Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Guru Pembimbing</label>
            <select
              value={filterPembimbing}
              onChange={(e) => setFilterPembimbing(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-750 rounded-xl px-3 py-2 text-xs outline-none text-gray-600 dark:text-gray-300"
            >
              <option value="">Semua Guru</option>
              {pembimbings.map((p) => (
                <option key={p.uid} value={p.uid}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Siswa PKL</label>
            <select
              value={filterStudent}
              onChange={(e) => setFilterStudent(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-750 rounded-xl px-3 py-2 text-xs outline-none text-gray-600 dark:text-gray-300"
            >
              <option value="">Semua Siswa</option>
              {students.map((s) => (
                <option key={s.uid} value={s.uid}>
                  {s.name} ({s.kelas})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Status Siswa</label>
            <select
              value={filterStatusSiswa}
              onChange={(e) => setFilterStatusSiswa(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-750 rounded-xl px-3 py-2 text-xs outline-none text-gray-600 dark:text-gray-300"
            >
              <option value="">Semua Status</option>
              <option value="Sangat Aktif">Sangat Aktif</option>
              <option value="Aktif">Aktif</option>
              <option value="Kurang Aktif">Kurang Aktif</option>
              <option value="Bermasalah">Bermasalah</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Kategori Monitoring</label>
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-750 rounded-xl px-3 py-2 text-xs outline-none text-gray-600 dark:text-gray-300"
            >
              <option value="">Semua Kategori</option>
              <option value="Kunjungan Rutin">Kunjungan Rutin</option>
              <option value="Penyelesaian Masalah">Penyelesaian Masalah</option>
              <option value="Monitoring Insidental">Monitoring Insidental</option>
            </select>
          </div>
        </div>
      </div>

      {/* INTERACTIVE TABLE LIST */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-500">Mendapatkan arsip bimbingan guru...</p>
          </div>
        ) : filteredAndSortedMonitorings.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <ClipboardList className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Data Kosong</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Tidak ada catatan laporan monitoring lapangan yang tersimpan atau cocok dengan kriteria filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50/50 dark:bg-gray-800/10 border-b border-gray-100 dark:border-gray-800 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                <tr>
                  <th className="p-4 text-center w-[50px]">No</th>
                  <th className="p-4 cursor-pointer select-none" onClick={() => handleSort("tanggal")}>
                    <div className="flex items-center gap-1.5">
                      Tanggal & Jadwal <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer select-none" onClick={() => handleSort("studentName")}>
                    <div className="flex items-center gap-1.5">
                      Siswa PKL <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer select-none" onClick={() => handleSort("pembimbingName")}>
                    <div className="flex items-center gap-1.5">
                      Guru Pembimbing <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </th>
                  <th className="p-4">Tempat PKL / Industri</th>
                  <th className="p-4 cursor-pointer select-none" onClick={() => handleSort("statusSiswa")}>
                    <div className="flex items-center gap-1.5">
                      Status Siswa <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </th>
                  <th className="p-4 text-center">Bukti Validasi</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredAndSortedMonitorings.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors">
                    <td className="p-4 text-center font-bold text-gray-400">{idx + 1}</td>
                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">
                      {new Date(item.tanggal).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      <span className="block text-[9px] font-bold text-blue-600 uppercase mt-0.5">{item.kategori}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-extrabold text-gray-900 dark:text-white">{item.studentName}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.studentClass}</p>
                    </td>
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300">{item.pembimbingName}</td>
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300">{item.tempatPkl}</td>
                    <td className="p-4">
                      <span
                        className={`text-[9px] font-extrabold px-2.5 py-1 rounded-full ${
                          item.statusSiswa === "Sangat Aktif" || item.statusSiswa === "Aktif"
                            ? "bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400"
                            : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
                        }`}
                      >
                        {item.statusSiswa}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-3">
                        {item.latitude ? (
                          <span title="GPS Koordinat Terlampir">
                            <MapPin className="w-4 h-4 text-red-500" />
                          </span>
                        ) : (
                          <span className="text-gray-200 dark:text-gray-700 font-bold">-</span>
                        )}
                        {item.fotoUrl ? (
                          <span title="Foto Lapangan Terlampir">
                            <Camera className="w-4 h-4 text-blue-500" />
                          </span>
                        ) : (
                          <span className="text-gray-200 dark:text-gray-700 font-bold">-</span>
                        )}
                        {item.signatureUrl ? (
                          <span title="TTD Digital Terlampir">
                            <Signature className="w-4 h-4 text-emerald-500" />
                          </span>
                        ) : (
                          <span className="text-gray-200 dark:text-gray-700 font-bold">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedMonitoring(item);
                            setIsDetailOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-all"
                          title="Lihat Detail Berita Acara"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handlePrintSingle(item)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                          title="Cetak Berita Acara"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg transition-all"
                          title="Hapus"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {isDetailOpen && selectedMonitoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-[#111827] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-800 animate-fade-in">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10 flex items-center justify-between sticky top-0 bg-white dark:bg-[#111827] z-10">
              <div>
                <h2 className="text-sm font-extrabold text-gray-900 dark:text-white">Arsip Berita Acara Monitoring</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">ID Laporan: {selectedMonitoring.id}</p>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Profile Card */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-gray-50 dark:bg-gray-850 p-4 rounded-xl border border-gray-150 dark:border-gray-800">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-gray-400">Siswa PKL</span>
                  <span className="font-extrabold text-gray-800 dark:text-white">{selectedMonitoring.studentName}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-gray-400">Kelas</span>
                  <span className="font-extrabold text-gray-800 dark:text-white">{selectedMonitoring.studentClass}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-gray-400">Guru Pembimbing</span>
                  <span className="font-extrabold text-gray-800 dark:text-white">{selectedMonitoring.pembimbingName}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-gray-400">Tanggal</span>
                  <span className="font-extrabold text-gray-800 dark:text-white">
                    {new Date(selectedMonitoring.tanggal).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Status Tags */}
              <div className="flex flex-wrap gap-2.5">
                <span className="px-3 py-1 text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 rounded-full border uppercase tracking-wider">
                  Kategori: {selectedMonitoring.kategori}
                </span>
                <span className="px-3 py-1 text-[10px] font-extrabold bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 rounded-full border uppercase tracking-wider">
                  Siswa: {selectedMonitoring.statusSiswa}
                </span>
              </div>

              {/* Catatan Temuan */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-gray-800 dark:text-white uppercase tracking-widest">Catatan / Temuan Monitoring</h4>
                <div className="bg-gray-50 dark:bg-gray-850 p-4 rounded-xl border border-gray-150 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {selectedMonitoring.catatan}
                </div>
              </div>

              {/* GPS Geolocation details */}
              {selectedMonitoring.alamatGps && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-gray-800 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-red-500" /> GPS Geolocation Tracking
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-850 p-3.5 rounded-xl border border-gray-150 dark:border-gray-800 text-xs">
                    <p className="font-semibold text-green-600">{selectedMonitoring.alamatGps}</p>
                    {selectedMonitoring.latitude && selectedMonitoring.longitude && (
                      <p className="text-[10px] text-gray-400 mt-1">
                        Latitude: {selectedMonitoring.latitude} | Longitude: {selectedMonitoring.longitude}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Berita Acara Content */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-gray-800 dark:text-white uppercase tracking-widest">Naskah Berita Acara Resmi</h4>
                <div className="bg-gray-50 dark:bg-gray-850 p-4 rounded-xl border border-gray-150 dark:border-gray-800 font-mono text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedMonitoring.beritaAcara}
                </div>
              </div>

              {/* Photo Documentation and Digital Signature Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Photo */}
                {selectedMonitoring.fotoUrl && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-gray-800 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-500" /> Foto Dokumentasi
                    </h4>
                    <div
                      className="border rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-gray-50"
                      onClick={() => setSelectedPhoto(selectedMonitoring.fotoUrl)}
                    >
                      <img src={selectedMonitoring.fotoUrl} alt="Foto Lapangan" className="w-full h-40 object-cover" />
                    </div>
                  </div>
                )}

                {/* Signature */}
                {selectedMonitoring.signatureUrl && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-extrabold text-gray-800 dark:text-white uppercase tracking-widest flex items-center gap-1.5">
                      <Signature className="w-4 h-4 text-emerald-500" /> TTD Guru Pembimbing
                    </h4>
                    <div className="border border-gray-200 dark:border-gray-750 rounded-xl p-3 bg-gray-50 flex items-center justify-center h-40">
                      <img src={selectedMonitoring.signatureUrl} alt="TTD Digital" className="max-h-24 object-contain" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer buttons */}
            <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3.5">
              <button
                onClick={() => handlePrintSingle(selectedMonitoring)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Cetak Berita Acara
              </button>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX FOR PHOTO VIEWING */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl w-full bg-white dark:bg-[#111827] rounded-2xl overflow-hidden p-2 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={selectedPhoto} alt="Dokumentasi Besar" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {isDeleteOpen && monitoringToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#111827] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 dark:border-gray-800">
            <div className="p-5 text-center space-y-4">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">Konfirmasi Hapus Laporan</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus laporan monitoring untuk siswa <b>{monitoringToDelete.studentName}</b>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-850 p-4 flex justify-end gap-3.5 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setIsDeleteOpen(false)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-750 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
