import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import { PenilaianPkl, UserProfile } from "../models/types";
import * as XLSX from "xlsx";
import {
  Award,
  Search,
  Star,
  PlusCircle,
  TrendingUp,
  Sliders,
  Sparkles,
  ShieldCheck,
  Check,
  HelpCircle,
  FileCheck,
  Calendar,
  Clock,
  UserCheck,
  MapPin,
  AlertCircle,
  Download,
  Printer,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Trash2
} from "lucide-react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Card,
  CardContent,
  Divider,
  Rating
} from "@mui/material";

export const Penilaian: React.FC = () => {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<PenilaianPkl[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Filter States
  const [filterKelas, setFilterKelas] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMitra, setFilterMitra] = useState("");

  const [selectedStudentUids, setSelectedStudentUids] = useState<string[]>([]);

  const handleSelectStudentUid = (uid: string) => {
    setSelectedStudentUids((prev) =>
      prev.includes(uid) ? prev.filter((item) => item !== uid) : [...prev, uid]
    );
  };

  const handleSelectAllStudents = (visibleStudents: UserProfile[]) => {
    const visibleStudentUidsWithGrades = visibleStudents
      .filter((s) => assessments.some((a) => a.siswaId === s.uid))
      .map((s) => s.uid);

    const allSelected = visibleStudentUidsWithGrades.every((uid) =>
      selectedStudentUids.includes(uid)
    );

    if (allSelected) {
      setSelectedStudentUids((prev) =>
        prev.filter((uid) => !visibleStudentUidsWithGrades.includes(uid))
      );
    } else {
      setSelectedStudentUids((prev) => {
        const union = [...prev];
        visibleStudentUidsWithGrades.forEach((uid) => {
          if (!union.includes(uid)) union.push(uid);
        });
        return union;
      });
    }
  };

  const handleBulkDeleteAssessments = async () => {
    if (selectedStudentUids.length === 0) return;
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menghapus data nilai untuk ${selectedStudentUids.length} siswa terpilih secara permanen? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    try {
      setLoading(true);
      const targets = selectedStudentUids
        .map((uid) => assessments.find((a) => a.siswaId === uid))
        .filter(Boolean) as PenilaianPkl[];

      await Promise.all(targets.map((a) => pklService.deletePenilaian(a.id)));

      if ((window as any).showToast) {
        (window as any).showToast(`Berhasil menghapus nilai PKL untuk ${targets.length} siswa!`, "success");
      }
      setSelectedStudentUids([]);
      // Reload assessments
      const assessList = await pklService.getPenilaian();
      setAssessments(assessList);
    } catch (err) {
      console.error(err);
      if ((window as any).showToast) {
        (window as any).showToast("Gagal menghapus beberapa nilai PKL.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssessment = async (id: string, studentName: string) => {
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus semua data nilai PKL untuk siswa ${studentName}? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;
    try {
      await pklService.deletePenilaian(id);
      setAssessments(prev => prev.filter(a => a.id !== id));
      setSelectedStudentUids(prev => prev.filter(uid => uid !== selectedStudentUids.find(uid => assessments.find(a => a.id === id)?.siswaId === uid)));
      (window as any).showToast?.(`Berhasil menghapus nilai PKL ${studentName}!`, "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal menghapus nilai PKL.", "error");
    }
  };

  // Print States
  const [studentToPrint, setStudentToPrint] = useState<UserProfile | null>(null);
  const [printBulk, setPrintBulk] = useState(false);

  // Dynamic filter lists derived from data
  const uniqueClasses = Array.from(new Set(students.map(s => s.kelas).filter(Boolean))) as string[];
  const uniqueMitra = Array.from(new Set(students.map(s => s.tempatPkl).filter(Boolean))) as string[];

  // Export & Print Handlers
  const handleExportExcel = () => {
    try {
      const exportData = filteredStudents.map((s, idx) => {
        const score = assessments.find(a => a.siswaId === s.uid);
        
        // Calculate TP averages if score exists
        const t1 = score ? Math.round(((score.tp1_1 || 0) + (score.tp1_2 || 0) + (score.tp1_3 || 0) + (score.tp1_4 || 0)) / 4) : 0;
        const t2 = score ? Math.round(((score.tp2_1 || 0) + (score.tp2_2 || 0) + (score.tp2_3 || 0) + (score.tp2_4 || 0)) / 4) : 0;
        const t3 = score ? Math.round(((score.tp3_1 || 0) + (score.tp3_2 || 0) + (score.tp3_3 || 0) + (score.tp3_4 || 0)) / 4) : 0;
        const t4 = score ? Math.round(((score.tp4_1 || 0) + (score.tp4_2 || 0) + (score.tp4_3 || 0) + (score.tp4_4 || 0)) / 4) : 0;

        const totalAvg = score && score.nilaiRataRata > 0 ? score.nilaiRataRata : 0;
        const lapScore = score && score.nilaiLaporan !== undefined && score.nilaiLaporan !== null ? score.nilaiLaporan : 0;
        const overallScore = totalAvg > 0 && lapScore > 0 ? Math.round((totalAvg + lapScore) / 2) : (totalAvg || lapScore || "-");

        return {
          "No": idx + 1,
          "Nama Siswa": s.name,
          "NISN": s.nisn || "-",
          "Kelas": s.kelas || "-",
          "Tempat PKL": s.tempatPkl || "-",
          "Nilai Sikap": score ? score.nilaiSikap : "-",
          "Rata-rata TP 1": score ? t1 : "-",
          "Rata-rata TP 2": score ? t2 : "-",
          "Rata-rata TP 3": score ? t3 : "-",
          "Rata-rata TP 4": score ? t4 : "-",
          "Rata-rata Industri": score && score.nilaiRataRata > 0 ? score.nilaiRataRata : "-",
          "Nilai Laporan": score && score.nilaiLaporan !== undefined && score.nilaiLaporan !== null ? score.nilaiLaporan : "-",
          "Nilai Akhir (Gabungan)": overallScore,
          "Predikat": score ? score.predikat : "-",
          "Catatan": score ? score.catatanPenyelia : "-"
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai Siswa PKL");
      
      // Auto-size columns slightly
      const maxColWidth = [{ wch: 5 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 22 }, { wch: 12 }, { wch: 30 }];
      worksheet["!cols"] = maxColWidth;

      XLSX.writeFile(workbook, `Rekap_Nilai_PKL_${new Date().getFullYear()}.xlsx`);
      (window as any).showToast?.("Berhasil mengekspor data ke Excel!", "success");
    } catch (error) {
      console.error("Gagal mengekspor ke Excel:", error);
      (window as any).showToast?.("Gagal mengekspor data ke Excel", "error");
    }
  };

  const handlePrintIndividual = (student: UserProfile) => {
    setStudentToPrint(student);
    setPrintBulk(false);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handlePrintBulk = () => {
    setStudentToPrint(null);
    setPrintBulk(true);
    setTimeout(() => {
      window.print();
    }, 500);
  };

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UserProfile | null>(null);
  const [selectedStudentAttendance, setSelectedStudentAttendance] = useState<any[]>([]);
  const [loadingAttendance, setLoadingAttendance] = useState<boolean>(false);
  
  // Form Fields - Industri
  const [nilaiSikap, setNilaiSikap] = useState<number>(85);
  const [nilaiKerja, setNilaiKerja] = useState<number>(80);
  const [nilaiDisiplin, setNilaiDisiplin] = useState<number>(85);
  const [nilaiKeaktifan, setNilaiKeaktifan] = useState<number>(90);
  const [catatan, setCatatan] = useState<string>("");

  // TP Competency States (4 evaluations each)
  const [tp1_1, setTp1_1] = useState<number>(80);
  const [tp1_2, setTp1_2] = useState<number>(80);
  const [tp1_3, setTp1_3] = useState<number>(80);
  const [tp1_4, setTp1_4] = useState<number>(80);

  const [tp2_1, setTp2_1] = useState<number>(80);
  const [tp2_2, setTp2_2] = useState<number>(80);
  const [tp2_3, setTp2_3] = useState<number>(80);
  const [tp2_4, setTp2_4] = useState<number>(80);

  const [tp3_1, setTp3_1] = useState<number>(80);
  const [tp3_2, setTp3_2] = useState<number>(80);
  const [tp3_3, setTp3_3] = useState<number>(80);
  const [tp3_4, setTp3_4] = useState<number>(80);

  const [tp4_1, setTp4_1] = useState<number>(80);
  const [tp4_2, setTp4_2] = useState<number>(80);
  const [tp4_3, setTp4_3] = useState<number>(80);
  const [tp4_4, setTp4_4] = useState<number>(80);

  // Form Fields - Guru Pembimbing
  const [nilaiLaporan, setNilaiLaporan] = useState<number>(85);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [assessList, profileList] = await Promise.all([
          pklService.getPenilaian(),
          pklService.getAllUserProfiles()
        ]);
        setAssessments(assessList);
        
        // Filter out non-students
        const siswaProfiles = profileList.filter(p => p.role === "siswa");
        setStudents(siswaProfiles);
      } catch (err) {
        console.error("Gagal memuat data penilaian:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleOpenAssessDialog = async (student: UserProfile) => {
    // Look for existing grade
    const existing = assessments.find(a => a.siswaId === student.uid);
    setSelectedStudent(student);
    if (existing) {
      setNilaiSikap(existing.nilaiSikap ?? 0);
      setNilaiKerja(existing.nilaiKerja ?? 0);
      setNilaiDisiplin(existing.nilaiDisiplin ?? 0);
      setNilaiKeaktifan(existing.nilaiKeaktifan ?? 0);
      setCatatan(existing.catatanPenyelia || "");
      setNilaiLaporan(existing.nilaiLaporan ?? 85);
      
      setTp1_1(existing.tp1_1 ?? 80);
      setTp1_2(existing.tp1_2 ?? 80);
      setTp1_3(existing.tp1_3 ?? 80);
      setTp1_4(existing.tp1_4 ?? 80);
      
      setTp2_1(existing.tp2_1 ?? 80);
      setTp2_2(existing.tp2_2 ?? 80);
      setTp2_3(existing.tp2_3 ?? 80);
      setTp2_4(existing.tp2_4 ?? 80);
      
      setTp3_1(existing.tp3_1 ?? 80);
      setTp3_2(existing.tp3_2 ?? 80);
      setTp3_3(existing.tp3_3 ?? 80);
      setTp3_4(existing.tp3_4 ?? 80);
      
      setTp4_1(existing.tp4_1 ?? 80);
      setTp4_2(existing.tp4_2 ?? 80);
      setTp4_3(existing.tp4_3 ?? 80);
      setTp4_4(existing.tp4_4 ?? 80);
    } else {
      setNilaiSikap(85);
      setNilaiKerja(80);
      setNilaiDisiplin(85);
      setNilaiKeaktifan(90);
      setCatatan("");
      setNilaiLaporan(85);
      
      setTp1_1(80);
      setTp1_2(80);
      setTp1_3(80);
      setTp1_4(80);
      
      setTp2_1(80);
      setTp2_2(80);
      setTp2_3(80);
      setTp2_4(80);
      
      setTp3_1(80);
      setTp3_2(80);
      setTp3_3(80);
      setTp3_4(80);
      
      setTp4_1(80);
      setTp4_2(80);
      setTp4_3(80);
      setTp4_4(80);
    }
    setDialogOpen(true);

    // Fetch student attendance list
    setSelectedStudentAttendance([]);
    setLoadingAttendance(true);
    try {
      const records = await pklService.getKehadiran(student.uid);
      setSelectedStudentAttendance(records || []);
    } catch (e) {
      console.error("Gagal memuat absensi siswa:", e);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleSubmitAssessment = async () => {
    if (!selectedStudent || !user) return;

    try {
      let payload: any = {
        siswaId: selectedStudent.uid,
        siswaName: selectedStudent.name,
        nisn: selectedStudent.nisn || "0081234567",
        kelas: selectedStudent.kelas || "XII TKJ",
        tempatPkl: selectedStudent.tempatPkl || "Dinas Kominfo Ngada",
        tahunAjaran: selectedStudent.tahunAjaran || "2025/2026 - Genap"
      };

      if (user.role === "industri") {
        // Industry supervisor fills out industrial performance criteria
        payload = {
          ...payload,
          nilaiSikap,
          nilaiKerja,
          nilaiDisiplin,
          nilaiKeaktifan,
          catatanPenyelia: catatan,
          penilaiName: user.name,
          // TP Competency scores
          tp1_1, tp1_2, tp1_3, tp1_4,
          tp2_1, tp2_2, tp2_3, tp2_4,
          tp3_1, tp3_2, tp3_3, tp3_4,
          tp4_1, tp4_2, tp4_3, tp4_4,
        };
      } else if (user.role === "pembimbing") {
        // School teacher fills out PKL Report score only
        payload = {
          ...payload,
          nilaiLaporan,
          penilaiLaporanName: user.name
        };
      } else {
        // Admin or other role has full permission to modify all
        payload = {
          ...payload,
          nilaiSikap,
          nilaiKerja,
          nilaiDisiplin,
          nilaiKeaktifan,
          catatanPenyelia: catatan,
          penilaiName: payload.penilaiName || user.name,
          nilaiLaporan,
          penilaiLaporanName: user.name,
          // TP Competency scores
          tp1_1, tp1_2, tp1_3, tp1_4,
          tp2_1, tp2_2, tp2_3, tp2_4,
          tp3_1, tp3_2, tp3_3, tp3_4,
          tp4_1, tp4_2, tp4_3, tp4_4,
        };
      }

      const result = await pklService.submitPenilaian(payload);
      
      // Update local assessments state
      setAssessments(prev => {
        const filtered = prev.filter(a => a.siswaId !== selectedStudent.uid);
        return [result, ...filtered];
      });

      setDialogOpen(false);
      (window as any).showToast?.(`Nilai siswa ${selectedStudent.name} berhasil disimpan!`, "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal menyimpan penilaian.", "error");
    }
  };

  const getPredikatColor = (predikat: string) => {
    switch (predikat) {
      case "Sangat Baik":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
      case "Baik":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
      case "Cukup":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
      default:
        return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    }
  };

  const filteredStudents = students.filter(s => {
    // 1. Student selection filter dropdown
    const matchesStudentSelection = selectedStudentId ? s.uid === selectedStudentId : true;
    if (!matchesStudentSelection) return false;

    const score = assessments.find(a => a.siswaId === s.uid);
    const hasScore = score && (score.nilaiRataRata > 0 || (score.nilaiLaporan !== undefined && score.nilaiLaporan !== null));

    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.nisn && s.nisn.includes(searchTerm)) ||
                          (s.tempatPkl && s.tempatPkl.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (s.kelas && s.kelas.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesKelas = !filterKelas || s.kelas === filterKelas;
    const matchesMitra = !filterMitra || s.tempatPkl === filterMitra;
    
    let matchesStatus = true;
    if (filterStatus === "sudah") {
      matchesStatus = !!hasScore;
    } else if (filterStatus === "belum") {
      matchesStatus = !hasScore;
    }

    if (user?.role === "industri") {
      // Industri can only assess students assigned to their company
      const matchesCompany = s.tempatPklId === user.tempatPklId || s.tempatPkl === user.tempatPkl;
      return matchesSearch && matchesKelas && matchesStatus && matchesCompany;
    }
    return matchesSearch && matchesKelas && matchesMitra && matchesStatus;
  });

  // Real-time calculations for TP averages
  const avgTp1 = Math.round(((tp1_1 || 0) + (tp1_2 || 0) + (tp1_3 || 0) + (tp1_4 || 0)) / 4);
  const avgTp2 = Math.round(((tp2_1 || 0) + (tp2_2 || 0) + (tp2_3 || 0) + (tp2_4 || 0)) / 4);
  const avgTp3 = Math.round(((tp3_1 || 0) + (tp3_2 || 0) + (tp3_3 || 0) + (tp3_4 || 0)) / 4);
  const avgTp4 = Math.round(((tp4_1 || 0) + (tp4_2 || 0) + (tp4_3 || 0) + (tp4_4 || 0)) / 4);
  const currentOverallAvg = Math.round((avgTp1 + avgTp2 + avgTp3 + avgTp4 + (nilaiSikap || 0)) / 5);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold animate-pulse">Memuat Transkrip Evaluasi...</p>
      </div>
    );
  }

  // STUDENT VIEW CARD
  if (user?.role === "siswa") {
    const myAssessment = assessments.find(a => a.siswaId === user.uid);

    return (
      <div className="space-y-6" id="penilaian-siswa-stage">
        <div className="bg-white border border-gray-200/80 p-6 sm:p-8 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-12 -translate-y-12 text-[#1565C0]">
            <Award className="w-96 h-96" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <span className="bg-[#1565C0]/10 text-[#1565C0] px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
              Lembar Hasil Nilai
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 mt-3">
              Nilai Sertifikasi & Evaluasi PKL
            </h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Berikut adalah laporan penilaian digital Anda dari program Praktik Kerja Lapangan (PKL) aktif pada Tahun Ajaran {user.tahunAjaran || "2025/2026"}.
            </p>
          </div>
        </div>

        {!myAssessment ? (
          <div className="py-16 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm max-w-3xl mx-auto">
            <Award className="w-16 h-16 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">Penilaian Belum Diterbitkan</p>
            <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto px-4">
              Penyelia Industri dari perusahaan mitra tempat Anda bimbingan atau Guru Pembimbing belum memasukkan lembar penilaian digital Anda ke dalam sistem. Silakan hubungi pembimbing Anda jika masa PKL telah berakhir.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
            {/* Header / Summary banner for Industrial Appraisal */}
            <div className="bg-gradient-to-r from-[#1565C0] to-[#0D47A1] p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-blue-200 font-bold">Hasil Evaluasi Kinerja Industri</p>
                <h3 className="text-2xl font-bold mt-1">{myAssessment.nilaiRataRata > 0 ? myAssessment.predikat : "Belum Dievaluasi"}</h3>
                <p className="text-xs text-blue-100 mt-0.5 font-semibold">
                  {myAssessment.penilaiName ? `Diberikan oleh ${myAssessment.penilaiName} (Penyelia Industri)` : "Penyelia Industri belum mengisi nilai kinerja"}
                </p>
              </div>
              <div className="bg-white/10 px-4 py-3 rounded-xl border border-white/15 text-center shrink-0">
                <p className="text-[10px] uppercase tracking-wider text-blue-200 font-bold">Rata-Rata Industri</p>
                <h3 className="text-3xl font-extrabold">{myAssessment.nilaiRataRata > 0 ? myAssessment.nilaiRataRata : "-"}</h3>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Laporan PKL Section (Guru Pembimbing) */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div className="space-y-1">
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Nilai Guru Pembimbing
                  </span>
                  <h4 className="text-sm font-bold text-gray-800 mt-1">Nilai Laporan PKL</h4>
                  <p className="text-xs text-gray-500 font-medium">
                    {myAssessment.penilaiLaporanName ? `Dinilai oleh ${myAssessment.penilaiLaporanName}` : "Guru Pembimbing belum menginput nilai laporan."}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-emerald-700">
                    {myAssessment.nilaiLaporan !== undefined && myAssessment.nilaiLaporan !== null ? myAssessment.nilaiLaporan : "-"}
                  </div>
                  {myAssessment.nilaiLaporan !== undefined && myAssessment.nilaiLaporan !== null && (
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">
                      {myAssessment.nilaiLaporan >= 85 ? "Sangat Baik" : myAssessment.nilaiLaporan >= 75 ? "Baik" : myAssessment.nilaiLaporan >= 60 ? "Cukup" : "Kurang"}
                    </span>
                  )}
                </div>
              </div>

              {/* Detail Kinerja Industri */}
              {myAssessment.nilaiRataRata > 0 && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rincian Metrik Kinerja Industri</h4>
                  
                  {myAssessment.tp1_1 !== undefined ? (
                    // TP-Based Competencies View
                    <div className="space-y-3.5">
                      {/* Nilai Sikap */}
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                        <div>
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Nilai Sikap & Etika</h4>
                          <p className="text-sm font-semibold text-gray-500 mt-1">Evaluasi perilaku, kedisiplinan dan sopan santun selama bimbingan.</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-2xl font-extrabold text-gray-950">{myAssessment.nilaiSikap}</p>
                          <span className="text-[10px] font-bold text-[#1565C0] uppercase tracking-wide">SIKAP</span>
                        </div>
                      </div>

                      {/* TP 1 */}
                      <div className="p-4 bg-blue-50/10 rounded-xl border border-blue-50/50 space-y-3 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">TP 1</span>
                            <p className="text-xs text-gray-700 font-semibold mt-1.5 leading-relaxed">
                              Penerapan etika berkomunikasi, integritas, etos kerja, kerja tim, kepedulian sosial/lingkungan, serta ketaatan norma & POS K3LH.
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[9px] text-gray-400 block font-bold">Rata-rata</span>
                            <span className="text-xl font-extrabold text-[#1565C0]">
                              {Math.round(((myAssessment.tp1_1 || 0) + (myAssessment.tp1_2 || 0) + (myAssessment.tp1_3 || 0) + (myAssessment.tp1_4 || 0)) / 4)}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 1</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp1_1 ?? "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 2</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp1_2 ?? "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 3</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp1_3 ?? "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 4</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp1_4 ?? "-"}</span>
                          </div>
                        </div>
                      </div>

                      {/* TP 2 */}
                      <div className="p-4 bg-blue-50/10 rounded-xl border border-blue-50/50 space-y-3 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">TP 2</span>
                            <p className="text-xs text-gray-700 font-semibold mt-1.5 leading-relaxed">
                              Penerapan kompetensi teknis pada pekerjaan sesuai POS yang berlaku di dunia kerja.
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[9px] text-gray-400 block font-bold">Rata-rata</span>
                            <span className="text-xl font-extrabold text-[#1565C0]">
                              {Math.round(((myAssessment.tp2_1 || 0) + (myAssessment.tp2_2 || 0) + (myAssessment.tp2_3 || 0) + (myAssessment.tp2_4 || 0)) / 4)}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 1</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp2_1 ?? "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 2</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp2_2 ?? "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 3</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp2_3 ?? "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 4</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp2_4 ?? "-"}</span>
                          </div>
                        </div>
                      </div>

                      {/* TP 3 */}
                      <div className="p-4 bg-blue-50/10 rounded-xl border border-blue-50/50 space-y-3 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">TP 3</span>
                            <p className="text-xs text-gray-700 font-semibold mt-1.5 leading-relaxed">
                              Penerapan kompetensi teknis baru dan/atau kompetensi teknis yang belum tuntas dipelajari.
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[9px] text-gray-400 block font-bold">Rata-rata</span>
                            <span className="text-xl font-extrabold text-[#1565C0]">
                              {Math.round(((myAssessment.tp3_1 || 0) + (myAssessment.tp3_2 || 0) + (myAssessment.tp3_3 || 0) + (myAssessment.tp3_4 || 0)) / 4)}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 1</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp3_1 ?? "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 2</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp3_2 ?? "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 3</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp3_3 ?? "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 4</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp3_4 ?? "-"}</span>
                          </div>
                        </div>
                      </div>

                      {/* TP 4 */}
                      <div className="p-4 bg-blue-50/10 rounded-xl border border-blue-50/50 space-y-3 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">TP 4</span>
                            <p className="text-xs text-gray-700 font-semibold mt-1.5 leading-relaxed">
                              Kemampuan melakukan analisis usaha secara mandiri di lapangan kerja.
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[9px] text-gray-400 block font-bold">Rata-rata</span>
                            <span className="text-xl font-extrabold text-[#1565C0]">
                              {Math.round(((myAssessment.tp4_1 || 0) + (myAssessment.tp4_2 || 0) + (myAssessment.tp4_3 || 0) + (myAssessment.tp4_4 || 0)) / 4)}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 bg-gray-50 p-2 rounded-lg text-center border border-gray-100">
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 1</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp4_1 ?? "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 2</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp4_2 ?? "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 3</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp4_3 ?? "-"}</span>
                          </div>
                          <div>
                            <span className="text-[8px] text-gray-400 block font-bold">Evaluasi 4</span>
                            <span className="text-xs font-bold text-gray-800">{myAssessment.tp4_4 ?? "-"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Legacy Metrics View
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Sikap & Etika</h4>
                          <p className="text-2xl font-extrabold text-gray-900 mt-1">{myAssessment.nilaiSikap}</p>
                        </div>
                        <div className="text-amber-500 font-semibold text-xs flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-500" /> {myAssessment.nilaiSikap >= 85 ? "Sangat Baik" : "Baik"}
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Kinerja Teknis</h4>
                          <p className="text-2xl font-extrabold text-gray-900 mt-1">{myAssessment.nilaiKerja}</p>
                        </div>
                        <div className="text-amber-500 font-semibold text-xs flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-500" /> {myAssessment.nilaiKerja >= 85 ? "Sangat Baik" : "Baik"}
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Kedisiplinan</h4>
                          <p className="text-2xl font-extrabold text-gray-900 mt-1">{myAssessment.nilaiDisiplin}</p>
                        </div>
                        <div className="text-amber-500 font-semibold text-xs flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-500" /> {myAssessment.nilaiDisiplin >= 85 ? "Sangat Baik" : "Baik"}
                        </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Keaktifan / Inisiatif</h4>
                          <p className="text-2xl font-extrabold text-gray-900 mt-1">{myAssessment.nilaiKeaktifan}</p>
                        </div>
                        <div className="text-amber-500 font-semibold text-xs flex items-center gap-1">
                          <Star className="w-4 h-4 fill-amber-500" /> {myAssessment.nilaiKeaktifan >= 85 ? "Sangat Baik" : "Baik"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {myAssessment.catatanPenyelia && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                  <h4 className="text-xs font-bold text-[#1565C0] uppercase tracking-wide flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4" /> Evaluasi & Catatan Perusahaan
                  </h4>
                  <p className="text-xs text-gray-600 mt-2 italic leading-relaxed">
                    "{myAssessment.catatanPenyelia}"
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-semibold font-mono">
                <span>DITERBITKAN SECARA DIGITAL</span>
                <span>TGL: {new Date(myAssessment.createdAt).toLocaleDateString("id-ID")}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // INSTRUCTOR / ADMIN VIEW (Dashboard / Student List to insert marks)
  return (
    <div className="space-y-6" id="penilaian-master-stage">
      <div className="bg-white border border-gray-200/80 p-6 sm:p-8 rounded-2xl relative overflow-hidden shadow-sm no-print">
        <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-12 -translate-y-12 text-[#1565C0]">
          <Award className="w-96 h-96" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="bg-[#1565C0]/10 text-[#1565C0] px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase">
            Sistem Evaluasi PKL
          </span>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 mt-3">
            Manajemen Lembar Nilai Siswa
          </h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Halaman penilaian dibagi sesuai tugas pembimbing: Pembimbing Industri mengisi evaluasi kinerja industri siswa (Sikap, Keterampilan, Disiplin, dan Keaktifan), sedangkan Guru Pembimbing mengisi Nilai Laporan PKL.
          </p>
        </div>
      </div>

      {/* Control Dashboard: Filters & Export Actions */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-4 no-print" id="filter-controls-container">
        
        {/* Row 1: Search & Bulk Action Buttons */}
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama, NISN, kelas, atau perusahaan mitra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 focus:bg-white border border-gray-200 rounded-xl outline-none transition-all placeholder:text-gray-400 font-semibold"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Ekspor rekapitulasi nilai semua siswa ke file Excel (.xlsx)"
              id="btn-export-excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel</span>
            </button>

            {/* Print Bulk Rekap Button */}
            <button
              onClick={handlePrintBulk}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Cetak rekapitulasi penilaian sebagai lembar PDF / Fisik"
              id="btn-print-rekap"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Rekap</span>
            </button>

            {/* Reset Filters */}
            {(filterKelas || filterStatus || filterMitra || searchTerm) && (
              <button
                onClick={() => {
                  setFilterKelas("");
                  setFilterStatus("");
                  setFilterMitra("");
                  setSearchTerm("");
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                id="btn-reset-filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <Divider className="opacity-60" />

        {/* Row 2: Select Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* List Pilih Siswa */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#1565C0] uppercase tracking-wider block">List Pilih Siswa</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-bold shadow-sm"
              id="select-student-filter-penilaian"
            >
              <option value="">-- Semua Siswa (Semua Data) --</option>
              {students.map(s => (
                <option key={s.uid} value={s.uid}>
                  {s.name} ({s.kelas || "Tanpa Kelas"})
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kelas */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Filter Kelas</label>
            <select
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-semibold"
            >
              <option value="">Semua Kelas</option>
              {uniqueClasses.map(kelas => (
                <option key={kelas} value={kelas}>{kelas}</option>
              ))}
            </select>
          </div>

          {/* Filter Status Penilaian */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Status Penilaian</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-semibold"
            >
              <option value="">Semua Status</option>
              <option value="sudah">Sudah Dinilai</option>
              <option value="belum">Belum Dinilai</option>
            </select>
          </div>

          {/* Filter Mitra PKL (Only shown for Admin / Pembimbing) */}
          {user?.role !== "industri" ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Perusahaan Mitra</label>
              <select
                value={filterMitra}
                onChange={(e) => setFilterMitra(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-semibold"
              >
                <option value="">Semua Mitra</option>
                {uniqueMitra.map(mitra => (
                  <option key={mitra} value={mitra}>{mitra}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-end text-[10px] text-gray-400 font-bold py-2 px-1">
              <span>Membatasi Mitra: <strong className="text-[#1565C0] font-black uppercase">{user.tempatPkl}</strong></span>
            </div>
          )}
        </div>

        {/* Info label */}
        <div className="text-[10px] text-gray-400 font-bold font-mono flex justify-between items-center bg-gray-50 p-2.5 rounded-xl border border-gray-100">
          <span>MENAMPILKAN: <strong className="text-gray-700">{filteredStudents.length} SISWA</strong></span>
          <span>DARI TOTAL: <strong className="text-gray-700">{students.length} SISWA</strong></span>
        </div>
      </div>

      {/* Bulk Selection Bar */}
      {!loading && filteredStudents.length > 0 && (user?.role === "admin" || user?.role === "pembimbing" || user?.role === "industri") && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200/85 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="select-all-assessments"
              checked={
                filteredStudents.filter((s) => assessments.some((a) => a.siswaId === s.uid)).length > 0 &&
                filteredStudents
                  .filter((s) => assessments.some((a) => a.siswaId === s.uid))
                  .every((s) => selectedStudentUids.includes(s.uid))
              }
              onChange={() => handleSelectAllStudents(filteredStudents)}
              className="w-4 h-4 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer"
            />
            <label htmlFor="select-all-assessments" className="text-xs font-bold text-gray-700 cursor-pointer select-none">
              Pilih Semua Nilai ({filteredStudents.filter((s) => assessments.some((a) => a.siswaId === s.uid)).length} Siswa Sudah Dinilai)
            </label>
          </div>
          {selectedStudentUids.length > 0 && (
            <div className="flex items-center gap-2 animate-fade-in w-full sm:w-auto justify-end">
              <span className="text-xs text-red-650 font-bold">
                Terpilih: <b>{selectedStudentUids.length}</b> siswa
              </span>
              <button
                onClick={handleBulkDeleteAssessments}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                id="btn-bulk-delete-assessments"
              >
                <Trash2 className="w-4 h-4" /> Hapus Nilai Terpilih
              </button>
            </div>
          )}
        </div>
      )}

      {/* Student List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 no-print" id="student-list-grid">
        {filteredStudents.map((student) => {
          const score = assessments.find(a => a.siswaId === student.uid);

          return (
            <div
              key={student.uid}
              className="bg-white border border-gray-200/80 rounded-2xl shadow-sm hover:border-[#1565C0]/40 transition-all flex flex-col overflow-hidden"
            >
              <div className="p-5 flex-1 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {(user?.role === "admin" || user?.role === "pembimbing" || user?.role === "industri") && score && (
                      <input
                        type="checkbox"
                        checked={selectedStudentUids.includes(student.uid)}
                        onChange={() => handleSelectStudentUid(student.uid)}
                        className="w-4 h-4 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 truncate">{student.name}</h3>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">NISN: {student.nisn || "0081234567"}</p>
                    </div>
                  </div>
                  <span className="bg-blue-50 text-[#1565C0] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
                    {student.kelas || "XII TKJ"}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-gray-500 font-semibold uppercase text-[9px] tracking-wider">Mitra PKL:</p>
                  <p className="font-semibold text-gray-700 truncate">{student.tempatPkl || "Dinas Kominfo Ngada"}</p>
                </div>

                <Divider className="my-2" />

                {score ? (
                  <div className="space-y-2">
                    {/* Industri Grade */}
                    <div className="bg-blue-50/40 p-2.5 rounded-xl border border-blue-50 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-blue-800 font-bold uppercase">Kinerja Industri</p>
                        <p className="text-sm font-extrabold text-gray-900 mt-0.5">
                          {score.nilaiRataRata > 0 ? `${score.nilaiRataRata} (Rata-Rata)` : "-"}
                        </p>
                      </div>
                      {score.nilaiRataRata > 0 ? (
                        <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${getPredikatColor(score.predikat)}`}>
                          {score.predikat}
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-400 font-medium italic">Belum dinilai</span>
                      )}
                    </div>

                    {/* Report Grade */}
                    <div className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-50 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-emerald-800 font-bold uppercase">Nilai Laporan PKL</p>
                        <p className="text-sm font-extrabold text-gray-900 mt-0.5">
                          {score.nilaiLaporan !== undefined && score.nilaiLaporan !== null ? score.nilaiLaporan : "-"}
                        </p>
                      </div>
                      {score.nilaiLaporan !== undefined && score.nilaiLaporan !== null ? (
                        <span className="text-[8px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {score.nilaiLaporan >= 85 ? "Sangat Baik" : score.nilaiLaporan >= 75 ? "Baik" : score.nilaiLaporan >= 60 ? "Cukup" : "Kurang"}
                        </span>
                      ) : (
                        <span className="text-[9px] text-gray-400 font-medium italic">Belum dinilai</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-red-50/40 text-red-700 border border-red-50 rounded-xl text-center text-[11px] font-medium flex items-center justify-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-red-400" /> Belum Ada Nilai PKL
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-gray-50/50 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => handleOpenAssessDialog(student)}
                  className="flex-1 text-center py-2 bg-[#1565C0] text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  {user?.role === "admin" ? "Lihat Nilai & Presensi" : (
                    score ? (
                      user?.role === "pembimbing" ? "Edit Nilai Laporan" :
                      user?.role === "industri" ? "Edit Nilai Kinerja" : "Edit Penilaian"
                    ) : (
                      user?.role === "pembimbing" ? "Beri Nilai Laporan" :
                      user?.role === "industri" ? "Beri Nilai Kinerja" : "Beri Penilaian PKL"
                    )
                  )}
                </button>
                {score && (
                  <button
                    onClick={() => handlePrintIndividual(student)}
                    className="p-2 border border-gray-200 hover:border-blue-600 hover:bg-blue-50/30 text-gray-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                    title="Cetak Transkrip Rapor Nilai Siswa"
                    id={`btn-print-transcript-${student.uid}`}
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                )}
                {(user?.role === "admin" || user?.role === "pembimbing" || user?.role === "industri") && score && (
                  <button
                    onClick={() => handleDeleteAssessment(score.id, student.name)}
                    className="p-2 border border-red-200 hover:border-red-600 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Nilai PKL Siswa"
                    id={`btn-delete-assessment-${student.uid}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredStudents.length === 0 && (
          <div className="col-span-full py-16 text-center text-gray-400 bg-white border border-dashed border-gray-200 rounded-2xl shadow-sm">
            <Search className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-semibold text-gray-700">Tidak ada siswa yang sesuai pencarian</p>
            <p className="text-xs text-gray-400 mt-1">Silakan coba kata kunci pencarian yang lain.</p>
          </div>
        )}
      </div>

      {/* Appraising Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth={user?.role === "admin" || user?.role === "industri" ? "md" : "xs"}
        fullWidth
      >
        <DialogTitle className="font-bold text-base text-gray-900 border-b border-gray-100 pb-3">
          {user?.role === "admin" ? "Evaluasi & Riwayat Presensi Siswa" : "Lembar Evaluasi PKL Siswa"}
        </DialogTitle>
        <DialogContent className="pt-4 space-y-4">
          {/* Quick Select Student List (Only for admin or pembimbing to switch students quickly) */}
          {(user?.role === "admin" || user?.role === "pembimbing") && (
            <div className="space-y-1 bg-blue-50/10 p-3.5 rounded-xl border border-blue-100/50">
              <label className="text-[10px] font-bold text-[#1565C0] uppercase tracking-wider block mb-1">List Untuk Memilih Siswa:</label>
              <select
                value={selectedStudent?.uid || ""}
                onChange={(e) => {
                  const s = students.find(item => item.uid === e.target.value);
                  if (s) {
                    handleOpenAssessDialog(s);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-600 font-semibold cursor-pointer"
              >
                {students.map(s => (
                  <option key={s.uid} value={s.uid}>
                    {s.name} ({s.kelas}) — {s.tempatPkl || "Belum Ada Mitra"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedStudent && (
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
              <p className="font-bold text-gray-800">{selectedStudent.name}</p>
              <p className="text-gray-500 font-medium mt-0.5">{selectedStudent.tempatPkl || "Dinas Kominfo Ngada"}</p>
            </div>
          )}

          {user?.role === "admin" ? (
            <div className="space-y-4">
              {/* DUDI Score Panel */}
              <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-50 space-y-3">
                <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-blue-500 text-blue-500" /> Nilai Kinerja Industri (Oleh DUDI)
                </h4>
                
                {/* If we have values filled by DUDI */}
                {(() => {
                  const assessment = assessments.find(a => a.siswaId === selectedStudent?.uid);
                  const hasDudiScore = assessment && (assessment.nilaiRataRata ?? 0) > 0;
                  if (hasDudiScore) {
                    const t1_avg = Math.round(((assessment.tp1_1 || 0) + (assessment.tp1_2 || 0) + (assessment.tp1_3 || 0) + (assessment.tp1_4 || 0)) / 4) || assessment.nilaiSikap || 0;
                    const t2_avg = Math.round(((assessment.tp2_1 || 0) + (assessment.tp2_2 || 0) + (assessment.tp2_3 || 0) + (assessment.tp2_4 || 0)) / 4) || assessment.nilaiKerja || 0;
                    const t3_avg = Math.round(((assessment.tp3_1 || 0) + (assessment.tp3_2 || 0) + (assessment.tp3_3 || 0) + (assessment.tp3_4 || 0)) / 4) || assessment.nilaiDisiplin || 0;
                    const t4_avg = Math.round(((assessment.tp4_1 || 0) + (assessment.tp4_2 || 0) + (assessment.tp4_3 || 0) + (assessment.tp4_4 || 0)) / 4) || assessment.nilaiKeaktifan || 0;

                    return (
                      <div className="space-y-4 text-xs">
                        {/* Summary of Rating */}
                        <div className="bg-[#1565C0] p-3 rounded-xl text-white flex items-center justify-between shadow-sm">
                          <div>
                            <p className="text-[9px] uppercase tracking-wider text-blue-100 font-bold">RATA-RATA EVALUASI TP & SIKAP</p>
                            <h4 className="text-base font-extrabold mt-0.5">{assessment.nilaiRataRata} / 100</h4>
                          </div>
                          <div className="text-right">
                            <span className="bg-white/15 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wide">
                              {assessment.predikat}
                            </span>
                          </div>
                        </div>

                        {/* Nilai Sikap */}
                        <div className="p-3 bg-white rounded-xl border border-gray-100 flex items-center justify-between">
                          <div>
                            <h5 className="text-[11px] font-bold text-gray-800">Nilai Sikap & Etika</h5>
                            <p className="text-[9px] text-gray-400 mt-0.5 font-medium">Evaluasi perilaku, sopan santun, dan ketaatan selama PKL</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-[#1565C0] bg-blue-50/50 px-2.5 py-1 rounded-lg">{assessment.nilaiSikap}</span>
                          </div>
                        </div>

                        {/* TP 1 */}
                        <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="bg-blue-50 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">TP 1</span>
                              <h5 className="text-[11px] font-bold text-gray-800 mt-1">Etika, Komunikasi & SOP</h5>
                            </div>
                            <span className="text-xs font-black text-[#1565C0] bg-blue-50/50 px-2 py-0.5 rounded-md">Rata-rata: {t1_avg}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 text-center bg-gray-50 p-1.5 rounded-lg border border-gray-100 text-[10px]">
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-1</span><span className="font-bold text-gray-700">{assessment.tp1_1 ?? "-"}</span></div>
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-2</span><span className="font-bold text-gray-700">{assessment.tp1_2 ?? "-"}</span></div>
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-3</span><span className="font-bold text-gray-700">{assessment.tp1_3 ?? "-"}</span></div>
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-4</span><span className="font-bold text-gray-700">{assessment.tp1_4 ?? "-"}</span></div>
                          </div>
                        </div>

                        {/* TP 2 */}
                        <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="bg-blue-50 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">TP 2</span>
                              <h5 className="text-[11px] font-bold text-gray-800 mt-1">Kompetensi Teknis Kerja</h5>
                            </div>
                            <span className="text-xs font-black text-[#1565C0] bg-blue-50/50 px-2 py-0.5 rounded-md">Rata-rata: {t2_avg}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 text-center bg-gray-50 p-1.5 rounded-lg border border-gray-100 text-[10px]">
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-1</span><span className="font-bold text-gray-700">{assessment.tp2_1 ?? "-"}</span></div>
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-2</span><span className="font-bold text-gray-700">{assessment.tp2_2 ?? "-"}</span></div>
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-3</span><span className="font-bold text-gray-700">{assessment.tp2_3 ?? "-"}</span></div>
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-4</span><span className="font-bold text-gray-700">{assessment.tp2_4 ?? "-"}</span></div>
                          </div>
                        </div>

                        {/* TP 3 */}
                        <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="bg-blue-50 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">TP 3</span>
                              <h5 className="text-[11px] font-bold text-gray-800 mt-1">Kompetensi Teknis Baru</h5>
                            </div>
                            <span className="text-xs font-black text-[#1565C0] bg-blue-50/50 px-2 py-0.5 rounded-md">Rata-rata: {t3_avg}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 text-center bg-gray-50 p-1.5 rounded-lg border border-gray-100 text-[10px]">
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-1</span><span className="font-bold text-gray-700">{assessment.tp3_1 ?? "-"}</span></div>
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-2</span><span className="font-bold text-gray-700">{assessment.tp3_2 ?? "-"}</span></div>
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-3</span><span className="font-bold text-gray-700">{assessment.tp3_3 ?? "-"}</span></div>
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-4</span><span className="font-bold text-gray-700">{assessment.tp3_4 ?? "-"}</span></div>
                          </div>
                        </div>

                        {/* TP 4 */}
                        <div className="p-3 bg-white rounded-xl border border-gray-100 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="bg-blue-50 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">TP 4</span>
                              <h5 className="text-[11px] font-bold text-gray-800 mt-1">Analisis Usaha Mandiri</h5>
                            </div>
                            <span className="text-xs font-black text-[#1565C0] bg-blue-50/50 px-2 py-0.5 rounded-md">Rata-rata: {t4_avg}</span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 text-center bg-gray-50 p-1.5 rounded-lg border border-gray-100 text-[10px]">
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-1</span><span className="font-bold text-gray-700">{assessment.tp4_1 ?? "-"}</span></div>
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-2</span><span className="font-bold text-gray-700">{assessment.tp4_2 ?? "-"}</span></div>
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-3</span><span className="font-bold text-gray-700">{assessment.tp4_3 ?? "-"}</span></div>
                            <div><span className="text-[8px] text-gray-400 block font-bold">Ke-4</span><span className="font-bold text-gray-700">{assessment.tp4_4 ?? "-"}</span></div>
                          </div>
                        </div>

                        {assessment.catatanPenyelia && (
                          <div className="p-3 bg-blue-50/20 border border-blue-100 rounded-xl text-xs text-gray-700 italic">
                            <strong className="block text-[10px] text-blue-800 uppercase not-italic mb-1 tracking-wide font-black">Catatan Evaluasi Penyelia:</strong>
                            "{assessment.catatanPenyelia}"
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-4 bg-amber-50/50 border border-dashed border-amber-100 rounded-lg text-center flex flex-col items-center justify-center gap-1">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <p className="text-xs font-bold text-amber-800">Belum Dinilai oleh DUDI</p>
                        <p className="text-[10px] text-amber-600/80">Pembimbing Industri/DUDI belum melakukan penilaian terhadap siswa ini.</p>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Attendance Panel */}
              <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-50 space-y-3">
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" /> Daftar Hadir (Diisi oleh Siswa)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 uppercase tracking-wider">
                    Total: {selectedStudentAttendance.length} Entri
                  </span>
                </h4>

                {loadingAttendance ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] text-emerald-600 uppercase tracking-wider font-semibold animate-pulse">Memuat Presensi...</p>
                  </div>
                ) : selectedStudentAttendance.length > 0 ? (
                  <div className="space-y-2.5">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                        <span className="block text-[8px] font-bold text-emerald-700 uppercase">Hadir</span>
                        <span className="text-xs font-extrabold text-emerald-800">{selectedStudentAttendance.filter(r => r.status === "hadir").length}</span>
                      </div>
                      <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-100">
                        <span className="block text-[8px] font-bold text-amber-700 uppercase">Izin</span>
                        <span className="text-xs font-extrabold text-amber-800">{selectedStudentAttendance.filter(r => r.status === "izin").length}</span>
                      </div>
                      <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="block text-[8px] font-bold text-blue-700 uppercase">Sakit</span>
                        <span className="text-xs font-extrabold text-blue-800">{selectedStudentAttendance.filter(r => r.status === "sakit").length}</span>
                      </div>
                      <div className="p-1.5 bg-red-50 rounded-lg border border-red-100">
                        <span className="block text-[8px] font-bold text-red-700 uppercase">Alpa</span>
                        <span className="text-xs font-extrabold text-red-800">{selectedStudentAttendance.filter(r => r.status === "alpa").length}</span>
                      </div>
                    </div>

                    {/* Attendance list scrollable */}
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-gray-100 rounded-lg bg-white/50 p-1.5">
                      {selectedStudentAttendance.map((record) => (
                        <div key={record.id} className="p-2 bg-white rounded-lg border border-gray-100 flex items-center justify-between text-xs hover:bg-gray-50/50 transition-colors">
                          <div className="space-y-0.5">
                            <p className="font-bold text-gray-700">
                              {new Date(record.tanggal).toLocaleDateString("id-ID", {
                                weekday: "long",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            <p className="text-[10px] text-gray-400 font-medium font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-400 shrink-0" />
                              Masuk: {record.jamMasuk} {record.jamPulang ? `• Pulang: ${record.jamPulang}` : ""}
                            </p>
                            {record.keterangan && (
                              <p className="text-[10px] text-gray-500 italic font-medium mt-0.5">
                                Ket: {record.keterangan}
                              </p>
                            )}
                          </div>
                          <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                            record.status === "hadir" ? "bg-emerald-100 text-emerald-800" :
                            record.status === "izin" ? "bg-amber-100 text-amber-800" :
                            record.status === "sakit" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"
                          }`}>
                            {record.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 border border-dashed border-gray-200 rounded-lg text-center flex flex-col items-center justify-center gap-1">
                    <AlertCircle className="w-5 h-5 text-gray-300" />
                    <p className="text-xs font-bold text-gray-500">Tidak Ada Riwayat Presensi</p>
                    <p className="text-[10px] text-gray-400">Siswa ini belum pernah melakukan absensi harian di sistem.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* If industri: show industrial appraisal fields */}
              {user?.role === "industri" && (
                <div className="space-y-4 bg-blue-50/20 p-4 rounded-xl border border-blue-50">
                  <p className="text-[10px] font-bold uppercase text-blue-800 tracking-wider mb-2">Penilaian Kompetensi Industri (Oleh Pembimbing Industri)</p>
                  
                  {/* Real-time Summary Card */}
                  <div className="bg-[#1565C0] p-3 rounded-lg text-white flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-blue-100 font-bold">RATA-RATA EVALUASI TP & SIKAP</p>
                      <h4 className="text-xl font-bold mt-0.5">{currentOverallAvg} / 100</h4>
                    </div>
                    <div className="text-right">
                      <span className="bg-white/15 px-2.5 py-1 rounded text-xs font-bold">
                        {currentOverallAvg >= 85 ? "Sangat Baik" : currentOverallAvg >= 75 ? "Baik" : currentOverallAvg >= 60 ? "Cukup" : "Kurang"}
                      </span>
                    </div>
                  </div>

                  {/* Nilai Sikap Card */}
                  <div className="p-3 bg-white rounded-lg border border-gray-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 block">Nilai Sikap (0-100)</label>
                      <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">Ditambahkan Ke Nilai Sikap</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={nilaiSikap}
                      onChange={(e) => setNilaiSikap(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#1565C0] font-semibold"
                    />
                  </div>

                  {/* TP 1 */}
                  <div className="p-3 bg-white rounded-lg border border-gray-100 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">TP 1</span>
                        <p className="text-[10px] text-gray-500 font-medium mt-1 leading-relaxed">
                          Peserta didik mampu menerapkan etika berkomunikasi secara lisan dan tulisan, integritas (antara lain jujur, disiplin, komitmen, dan tanggung jawab), etos kerja, bekerja secara mandiri dan/atau bekerja di dalam tim, kepedulian sosial dan lingkungan, serta ketaatan terhadap norma, K3LH, dan POS yang berlaku di dunia kerja.
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] text-gray-400 block font-bold">Rata-rata</span>
                        <span className="text-sm font-extrabold text-[#1565C0]">{avgTp1}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-1</label>
                        <input
                          type="number" min="0" max="100" value={tp1_1}
                          onChange={(e) => setTp1_1(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-2</label>
                        <input
                          type="number" min="0" max="100" value={tp1_2}
                          onChange={(e) => setTp1_2(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-3</label>
                        <input
                          type="number" min="0" max="100" value={tp1_3}
                          onChange={(e) => setTp1_3(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-4</label>
                        <input
                          type="number" min="0" max="100" value={tp1_4}
                          onChange={(e) => setTp1_4(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* TP 2 */}
                  <div className="p-3 bg-white rounded-lg border border-gray-100 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">TP 2</span>
                        <p className="text-[10px] text-gray-500 font-medium mt-1 leading-relaxed">
                          Peserta didik mampu menerapkan kompetensi teknis pada pekerjaan sesuai POS yang berlaku di dunia kerja.
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] text-gray-400 block font-bold">Rata-rata</span>
                        <span className="text-sm font-extrabold text-[#1565C0]">{avgTp2}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-1</label>
                        <input
                          type="number" min="0" max="100" value={tp2_1}
                          onChange={(e) => setTp2_1(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-2</label>
                        <input
                          type="number" min="0" max="100" value={tp2_2}
                          onChange={(e) => setTp2_2(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-3</label>
                        <input
                          type="number" min="0" max="100" value={tp2_3}
                          onChange={(e) => setTp2_3(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-4</label>
                        <input
                          type="number" min="0" max="100" value={tp2_4}
                          onChange={(e) => setTp2_4(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* TP 3 */}
                  <div className="p-3 bg-white rounded-lg border border-gray-100 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">TP 3</span>
                        <p className="text-[10px] text-gray-500 font-medium mt-1 leading-relaxed">
                          Peserta didik mampu menerapkan kompetensi teknis baru dan/atau kompetensi teknis yang belum tuntas dipelajari.
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] text-gray-400 block font-bold">Rata-rata</span>
                        <span className="text-sm font-extrabold text-[#1565C0]">{avgTp3}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-1</label>
                        <input
                          type="number" min="0" max="100" value={tp3_1}
                          onChange={(e) => setTp3_1(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-2</label>
                        <input
                          type="number" min="0" max="100" value={tp3_2}
                          onChange={(e) => setTp3_2(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-3</label>
                        <input
                          type="number" min="0" max="100" value={tp3_3}
                          onChange={(e) => setTp3_3(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-4</label>
                        <input
                          type="number" min="0" max="100" value={tp3_4}
                          onChange={(e) => setTp3_4(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* TP 4 */}
                  <div className="p-3 bg-white rounded-lg border border-gray-100 space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">TP 4</span>
                        <p className="text-[10px] text-gray-500 font-medium mt-1 leading-relaxed">
                          Peserta didik mampu melakukan analisis usaha secara mandiri.
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[9px] text-gray-400 block font-bold">Rata-rata</span>
                        <span className="text-sm font-extrabold text-[#1565C0]">{avgTp4}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-1</label>
                        <input
                          type="number" min="0" max="100" value={tp4_1}
                          onChange={(e) => setTp4_1(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-2</label>
                        <input
                          type="number" min="0" max="100" value={tp4_2}
                          onChange={(e) => setTp4_2(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-3</label>
                        <input
                          type="number" min="0" max="100" value={tp4_3}
                          onChange={(e) => setTp4_3(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-400 font-bold block mb-0.5 text-center">Ke-4</label>
                        <input
                          type="number" min="0" max="100" value={tp4_4}
                          onChange={(e) => setTp4_4(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                          className="w-full p-1 text-center text-xs border border-gray-200 rounded outline-none font-semibold focus:border-[#1565C0]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Catatan Penyelia */}
                  <div className="p-3 bg-white rounded-lg border border-gray-100">
                    <label className="text-xs font-bold text-gray-700 block mb-1">Catatan Evaluasi / Rekomendasi Kualitatif</label>
                    <textarea
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      placeholder="Tulis umpan balik positif atau hal-hal yang perlu ditingkatkan siswa..."
                      rows={2}
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-[#1565C0] placeholder:text-gray-400 font-medium"
                    />
                  </div>
                </div>
              )}

              {/* If pembimbing: show report grade field */}
              {user?.role === "pembimbing" && (
                <div className="space-y-3 bg-emerald-50/20 p-3.5 rounded-xl border border-emerald-50">
                  <p className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider mb-2">Penilaian Laporan PKL (Oleh Guru Pembimbing)</p>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Nilai Laporan PKL (0-100)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={nilaiLaporan}
                      onChange={(e) => setNilaiLaporan(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-emerald-600 font-semibold"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 font-medium">
                      Guru pembimbing memasukkan nilai evaluasi berdasarkan laporan PKL tertulis yang disusun oleh siswa.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions className="border-t border-gray-100 p-3 flex gap-2">
          {user?.role === "admin" ? (
            <Button
              onClick={() => setDialogOpen(false)}
              variant="contained"
              color="primary"
              style={{ borderRadius: 8, fontSize: "11px", fontWeight: "bold" }}
              className="w-full"
            >
              Tutup
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setDialogOpen(false)}
                variant="outlined"
                style={{ color: "#666", borderColor: "#ddd", borderRadius: 8, fontSize: "11px" }}
              >
                Batal
              </Button>
              <Button
                onClick={handleSubmitAssessment}
                variant="contained"
                color="primary"
                style={{ borderRadius: 8, fontSize: "11px", fontWeight: "bold" }}
              >
                Simpan Nilai PKL
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* =========================================================================
          PRINT ONLY ELEMENT: REKAPITULASI BULK PENILAIAN PKL
          ========================================================================= */}
      {printBulk && (
        <div className="print-only p-8 bg-white text-black font-sans w-full text-xs">
          <div className="text-center space-y-2 mb-6 border-b-2 border-black pb-4">
            <h1 className="text-sm font-bold uppercase tracking-wider">
              DAFTAR REKAPITULASI PENILAIAN PRAKTIK KERJA LAPANGAN (PKL)
            </h1>
            <h2 className="text-xs font-semibold">
              SMK NEGERI 1 BAJAWA • TAHUN PELAJARAN {new Date().getFullYear() - 1}/{new Date().getFullYear()}
            </h2>
            <p className="text-[10px] text-gray-500 italic">
              Dicetak pada: {new Date().toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <table className="w-full border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 font-bold w-10">No</th>
                <th className="border border-black p-2 font-bold text-left">Nama Siswa</th>
                <th className="border border-black p-2 font-bold">NISN</th>
                <th className="border border-black p-2 font-bold">Kelas</th>
                <th className="border border-black p-2 font-bold text-left">Tempat PKL</th>
                <th className="border border-black p-2 font-bold">Nilai Sikap</th>
                <th className="border border-black p-2 font-bold">Rata-Rata Industri</th>
                <th className="border border-black p-2 font-bold">Nilai Laporan</th>
                <th className="border border-black p-2 font-bold">Nilai Akhir</th>
                <th className="border border-black p-2 font-bold">Predikat</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((s, idx) => {
                const score = assessments.find(a => a.siswaId === s.uid);
                const totalAvg = score && score.nilaiRataRata > 0 ? score.nilaiRataRata : 0;
                const lapScore = score && score.nilaiLaporan !== undefined && score.nilaiLaporan !== null ? score.nilaiLaporan : 0;
                const overallScore = totalAvg > 0 && lapScore > 0 ? Math.round((totalAvg + lapScore) / 2) : (totalAvg || lapScore || "-");

                return (
                  <tr key={s.uid}>
                    <td className="border border-black p-2">{idx + 1}</td>
                    <td className="border border-black p-2 text-left font-bold">{s.name}</td>
                    <td className="border border-black p-2">{s.nisn || "-"}</td>
                    <td className="border border-black p-2 font-semibold">{s.kelas || "-"}</td>
                    <td className="border border-black p-2 text-left">{s.tempatPkl || "-"}</td>
                    <td className="border border-black p-2">{score ? score.nilaiSikap : "-"}</td>
                    <td className="border border-black p-2">{totalAvg || "-"}</td>
                    <td className="border border-black p-2">{score && score.nilaiLaporan !== undefined && score.nilaiLaporan !== null ? score.nilaiLaporan : "-"}</td>
                    <td className="border border-black p-2 font-bold">{overallScore}</td>
                    <td className="border border-black p-2 font-semibold">{score ? score.predikat : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-12 flex justify-between items-start">
            <div className="w-1/3 text-center space-y-12">
              <p>Mengetahui,<br />Koordinator PKL</p>
              <div className="h-16" />
              <p className="font-bold underline">_______________________</p>
              <p className="text-[9px] text-gray-500">NIP. -</p>
            </div>
            <div className="w-1/3" />
            <div className="w-1/3 text-center space-y-12">
              <p>Bajawa, {new Date().toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric' })}<br />Kepala Sekolah / Admin</p>
              <div className="h-16" />
              <p className="font-bold underline">{user?.name || "Administrator"}</p>
              <p className="text-[9px] text-gray-500">NIP. -</p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          PRINT ONLY ELEMENT: INDIVIDUAL TRANSCRIPT / RAPOR PENILAIAN PKL
          ========================================================================= */}
      {studentToPrint && (
        <div className="print-only p-12 bg-white text-black font-sans leading-relaxed text-xs">
          {/* Header Kop Surat Formal */}
          <div className="text-center border-b-4 double border-black pb-4 mb-6">
            <h1 className="text-sm font-black uppercase tracking-wider">
              PEMERINTAH PROVINSI NUSA TENGGARA TIMUR
            </h1>
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-800">
              DINAS PENDIDIKAN DAN KEBUDAYAAN
            </h2>
            <h2 className="text-base font-extrabold uppercase tracking-wider text-black mt-0.5">
              SMK NEGERI 1 BAJAWA
            </h2>
            <p className="text-[9px] text-gray-500 italic mt-0.5">
              Jalan Tendean No. 24 Bajawa, Ngada, NTT • Email: info@smkn1bajawa.sch.id
            </p>
          </div>

          <div className="text-center space-y-1 mb-8">
            <h3 className="text-xs font-black uppercase tracking-widest underline decoration-2">
              LEMBAR HASIL EVALUASI PRAKTIK KERJA LAPANGAN
            </h3>
            <p className="text-[10px] font-mono">Tahun Pelajaran {new Date().getFullYear() - 1}/{new Date().getFullYear()}</p>
          </div>

          {/* Student Biodata Card */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
            <div>
              <table className="w-full text-left text-[11px]">
                <tbody>
                  <tr>
                    <td className="font-semibold py-0.5 w-24">Nama Siswa</td>
                    <td className="py-0.5 w-4">:</td>
                    <td className="font-bold uppercase py-0.5">{studentToPrint.name}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-0.5">NISN</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5 font-mono">{studentToPrint.nisn || "-"}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-0.5">Kelas / Jurusan</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5 font-semibold">{studentToPrint.kelas || "XII TKJ"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div>
              <table className="w-full text-left text-[11px]">
                <tbody>
                  <tr>
                    <td className="font-semibold py-0.5 w-28">Perusahaan Mitra</td>
                    <td className="py-0.5 w-4">:</td>
                    <td className="font-bold py-0.5">{studentToPrint.tempatPkl || "-"}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-0.5">Guru Pembimbing</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5">
                      {assessments.find(a => a.siswaId === studentToPrint.uid)?.penilaiLaporanName || "Bapak/Ibu Guru"}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-0.5">Pembimbing Industri</td>
                    <td className="py-0.5">:</td>
                    <td className="py-0.5">
                      {assessments.find(a => a.siswaId === studentToPrint.uid)?.penilaiName || "Pembimbing DUDI"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Score Table */}
          {(() => {
            const score = assessments.find(a => a.siswaId === studentToPrint.uid);
            
            const s1 = score?.tp1_1 || 0; const s2 = score?.tp1_2 || 0; const s3 = score?.tp1_3 || 0; const s4 = score?.tp1_4 || 0;
            const avg1 = Math.round((s1 + s2 + s3 + s4) / 4) || score?.nilaiKerja || 0;

            const t1 = score?.tp2_1 || 0; const t2 = score?.tp2_2 || 0; const t3 = score?.tp2_3 || 0; const t4 = score?.tp2_4 || 0;
            const avg2 = Math.round((t1 + t2 + t3 + t4) / 4) || score?.nilaiKerja || 0;

            const u1 = score?.tp3_1 || 0; const u2 = score?.tp3_2 || 0; const u3 = score?.tp3_3 || 0; const u4 = score?.tp3_4 || 0;
            const avg3 = Math.round((u1 + u2 + u3 + u4) / 4) || score?.nilaiKerja || 0;

            const v1 = score?.tp4_1 || 0; const v2 = score?.tp4_2 || 0; const v3 = score?.tp4_3 || 0; const v4 = score?.tp4_4 || 0;
            const avg4 = Math.round((v1 + v2 + v3 + v4) / 4) || score?.nilaiKerja || 0;

            const nSikap = score?.nilaiSikap || 0;
            const nLaporan = score?.nilaiLaporan || 0;
            
            const nRataRata = score?.nilaiRataRata || Math.round((avg1 + avg2 + avg3 + avg4) / 4) || 0;
            const nAkhir = nRataRata > 0 && nLaporan > 0 ? Math.round((nRataRata + nLaporan) / 2) : (nRataRata || nLaporan || 0);

            return (
              <div className="space-y-6">
                <table className="w-full border-collapse border border-black text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 text-center">
                      <th className="border border-black p-2 font-bold w-12">No</th>
                      <th className="border border-black p-2 font-bold text-left">Aspek Kompetensi & Penilaian PKL</th>
                      <th className="border border-black p-2 font-bold w-20">Nilai Angka</th>
                      <th className="border border-black p-2 font-bold w-28">Kategori Kelayakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-black p-2 text-center font-bold">1</td>
                      <td className="border border-black p-2 font-bold">Aspek Sikap & Etika Perilaku</td>
                      <td className="border border-black p-2 text-center font-bold">{nSikap || "-"}</td>
                      <td className="border border-black p-2 text-center font-semibold">
                        {nSikap >= 85 ? "Sangat Baik" : nSikap >= 75 ? "Baik" : nSikap >= 60 ? "Cukup" : "Kurang"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 text-center font-bold">2</td>
                      <td className="border border-black p-2">
                        <p className="font-bold">Tujuan Pembelajaran 1 (TP 1)</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">Penerapan etika berkomunikasi, integritas, etos kerja, kerja tim, ketaatan POS K3LH</p>
                      </td>
                      <td className="border border-black p-2 text-center font-semibold">{avg1 || "-"}</td>
                      <td className="border border-black p-2 text-center">
                        {avg1 >= 85 ? "Sangat Baik" : avg1 >= 75 ? "Baik" : avg1 >= 60 ? "Cukup" : "Kurang"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 text-center font-bold">3</td>
                      <td className="border border-black p-2">
                        <p className="font-bold">Tujuan Pembelajaran 2 (TP 2)</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">Penerapan kompetensi teknis pada pekerjaan sesuai POS dunia kerja</p>
                      </td>
                      <td className="border border-black p-2 text-center font-semibold">{avg2 || "-"}</td>
                      <td className="border border-black p-2 text-center">
                        {avg2 >= 85 ? "Sangat Baik" : avg2 >= 75 ? "Baik" : avg2 >= 60 ? "Cukup" : "Kurang"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 text-center font-bold">4</td>
                      <td className="border border-black p-2">
                        <p className="font-bold">Tujuan Pembelajaran 3 (TP 3)</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">Penerapan kompetensi teknis baru dan/atau yang belum tuntas dipelajari</p>
                      </td>
                      <td className="border border-black p-2 text-center font-semibold">{avg3 || "-"}</td>
                      <td className="border border-black p-2 text-center">
                        {avg3 >= 85 ? "Sangat Baik" : avg3 >= 75 ? "Baik" : avg3 >= 60 ? "Cukup" : "Kurang"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black p-2 text-center font-bold">5</td>
                      <td className="border border-black p-2">
                        <p className="font-bold">Tujuan Pembelajaran 4 (TP 4)</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">Kemampuan melakukan analisis usaha secara mandiri di lapangan kerja</p>
                      </td>
                      <td className="border border-black p-2 text-center font-semibold">{avg4 || "-"}</td>
                      <td className="border border-black p-2 text-center">
                        {avg4 >= 85 ? "Sangat Baik" : avg4 >= 75 ? "Baik" : avg4 >= 60 ? "Cukup" : "Kurang"}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/10">
                      <td className="border border-black p-2 text-center font-bold">6</td>
                      <td className="border border-black p-2 font-bold">Rerata Evaluasi Kinerja Industri (A)</td>
                      <td className="border border-black p-2 text-center font-bold text-blue-800">{nRataRata || "-"}</td>
                      <td className="border border-black p-2 text-center font-bold text-blue-800">
                        {score?.predikat || "BAIK"}
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/10">
                      <td className="border border-black p-2 text-center font-bold">7</td>
                      <td className="border border-black p-2 font-bold">Nilai Evaluasi Laporan PKL (B)</td>
                      <td className="border border-black p-2 text-center font-bold text-emerald-800">{nLaporan || "-"}</td>
                      <td className="border border-black p-2 text-center font-bold text-emerald-800">
                        {nLaporan >= 85 ? "Sangat Baik" : nLaporan >= 75 ? "Baik" : nLaporan >= 60 ? "Cukup" : "Kurang"}
                      </td>
                    </tr>
                    <tr className="bg-gray-100 font-extrabold text-[12px]">
                      <td className="border border-black p-3 text-center font-black">#</td>
                      <td className="border border-black p-3 uppercase tracking-wider">NILAI AKHIR GABUNGAN ( Rata-Rata A & B )</td>
                      <td className="border border-black p-3 text-center text-red-600 font-black">{nAkhir || "-"}</td>
                      <td className="border border-black p-3 text-center uppercase text-red-600 font-black">
                        {nAkhir >= 85 ? "Sangat Baik" : nAkhir >= 75 ? "Baik" : nAkhir >= 60 ? "Cukup" : "Kurang"}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Catatan / Keterangan Tambahan */}
                {score?.catatanPenyelia && (
                  <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg">
                    <p className="font-bold text-[10px] uppercase text-gray-700 tracking-wider">Catatan Evaluasi / Rekomendasi Industri:</p>
                    <p className="text-xs italic text-gray-800 mt-1">"{score.catatanPenyelia}"</p>
                  </div>
                )}

                {/* Signature Block */}
                <div className="mt-14 flex justify-between items-start text-center text-[11px]">
                  <div className="w-[45%] space-y-16">
                    <div>
                      <p className="font-semibold text-gray-700">Penyelia / Pembimbing Industri,</p>
                      <p className="text-[10px] text-gray-500 font-bold tracking-wide uppercase">{studentToPrint.tempatPkl}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold underline uppercase">{score?.penilaiName || "_________________________"}</p>
                      <p className="text-[9px] text-gray-400">Tanda Tangan & Stempel</p>
                    </div>
                  </div>
                  <div className="w-[10%]" />
                  <div className="w-[45%] space-y-16">
                    <div>
                      <p className="font-semibold text-gray-700">Bajawa, {new Date().toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      <p className="text-[10px] text-gray-500 font-bold tracking-wide uppercase">Guru Pembimbing Sekolah</p>
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold underline uppercase">{score?.penilaiLaporanName || "_________________________"}</p>
                      <p className="text-[9px] text-gray-400">NIP. -</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
