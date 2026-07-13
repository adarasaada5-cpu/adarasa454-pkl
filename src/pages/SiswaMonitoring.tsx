import React, { useState, useEffect } from "react";
import { pklService } from "../services/pklService";
import { JurnalEntry, KehadiranEntry } from "../models/types";
import { useAuth } from "../context/AuthContext";
import {
  Users,
  FileText,
  CheckCircle2,
  Award,
  Search,
  Calendar,
  Landmark,
  MapPin,
  FileSpreadsheet,
  Key,
  Plus,
  Trash2,
  Clock,
  Filter
} from "lucide-react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

interface SiswaProgress {
  id: string;
  name: string;
  nisn: string;
  kelas: string;
  tempatPkl: string;
  attendanceRate: string;
  journalCount: number;
  approvedCount: number;
}

export const SiswaMonitoring: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<SiswaProgress[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  // Excel Import Dialog State
  const [importOpen, setImportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [targetStudent, setTargetStudent] = useState<SiswaProgress | null>(null);
  const [selectedMonitoringIds, setSelectedMonitoringIds] = useState<string[]>([]);
  const [allAttendance, setAllAttendance] = useState<KehadiranEntry[]>([]);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState("");

  const handleDeleteMonitoringBulk = async () => {
    if (selectedMonitoringIds.length === 0) return;
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus ${selectedMonitoringIds.length} data siswa terpilih dari pemantauan dan sistem?`);
    if (confirmed) {
      try {
        setLoading(true);
        await Promise.all(selectedMonitoringIds.map(uid => pklService.deleteUserProfile(uid)));
        await pklService.addAuditLog("Hapus Siswa Massal", `Menghapus ${selectedMonitoringIds.length} siswa dari monitoring`);
        
        if ((window as any).showToast) {
          (window as any).showToast(`${selectedMonitoringIds.length} data siswa berhasil dihapus!`, "success");
        }
        setSelectedMonitoringIds([]);
        await calculateStudentStats();
      } catch (err) {
        console.error("Gagal menghapus siswa massal:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDeleteSingleMonitoring = async (uid: string, name: string) => {
    const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus data siswa "${name}" dari pemantauan dan sistem?`);
    if (confirmed) {
      try {
        setLoading(true);
        await pklService.deleteUserProfile(uid);
        await pklService.addAuditLog("Hapus Siswa", `Menghapus siswa: ${name}`);
        
        if ((window as any).showToast) {
          (window as any).showToast(`Data siswa "${name}" berhasil dihapus`, "success");
        }
        await calculateStudentStats();
      } catch (err) {
        console.error("Gagal menghapus siswa:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const calculateStudentStats = async () => {
    try {
      setLoading(true);

      // Fetch all customized/imported profiles
      const allProfilesData = await pklService.getAllUserProfiles();
      setAllProfiles(allProfilesData);
      const siswaProfiles = allProfilesData.filter(p => p.role === "siswa");

      // Fetch all attendance logs
      const allAttendanceData = await pklService.getKehadiran();
      setAllAttendance(allAttendanceData);

      // Fetch real logs to dynamically compute stats for our primary test user
      const realJournals = await pklService.getJurnal("siswa_sanjaya_123");
      const realAttendance = allAttendanceData.filter((a) => a.userId === "siswa_sanjaya_123");

      const realPresentCount = realAttendance.filter((a) => a.status === "hadir").length;
      const totalPossibleDays = 20; // Simulated workdays in the term
      const calculatedRate = totalPossibleDays > 0 ? `${Math.round((realPresentCount / totalPossibleDays) * 100)}%` : "100%";

      const studentRoster: SiswaProgress[] = [
        {
          id: "siswa_sanjaya_123",
          name: "Siswa Sanjaya Bajawa",
          nisn: "0081234567",
          kelas: "XII TKJ",
          tempatPkl: "Dinas Kominfo Ngada",
          attendanceRate: calculatedRate,
          journalCount: realJournals.length,
          approvedCount: realJournals.filter((j) => j.status === "approved").length,
        },
        {
          id: "s2",
          name: "Maria Angeline",
          nisn: "0089876543",
          kelas: "XII TKJ",
          tempatPkl: "Telkom Indonesia Bajawa",
          attendanceRate: "95%",
          journalCount: 14,
          approvedCount: 12,
        },
        {
          id: "s3",
          name: "Paulus Klementinus",
          nisn: "0071122334",
          kelas: "XII TKJ",
          tempatPkl: "Dinas Kominfo Ngada",
          attendanceRate: "90%",
          journalCount: 12,
          approvedCount: 10,
        },
        {
          id: "s4",
          name: "Katarina Ndona",
          nisn: "0085566778",
          kelas: "XII RPL",
          tempatPkl: "Sanjaya Motor Bajawa",
          attendanceRate: "100%",
          journalCount: 15,
          approvedCount: 15,
        },
        {
          id: "s5",
          name: "Ignasius Lako",
          nisn: "0084455661",
          kelas: "XII TKJ",
          tempatPkl: "Bank NTT Kantor Cabang Bajawa",
          attendanceRate: "85%",
          journalCount: 10,
          approvedCount: 8,
        },
      ];

      // Merge imported profiles that aren't already in list
      siswaProfiles.forEach(p => {
        if (!studentRoster.some(s => s.id === p.uid || s.nisn === p.nisn)) {
          studentRoster.push({
            id: p.uid,
            name: p.name,
            nisn: p.nisn || "",
            kelas: p.kelas || "XII",
            tempatPkl: p.tempatPkl || "Belum Ditempatkan",
            attendanceRate: "100%",
            journalCount: 0,
            approvedCount: 0
          });
        }
      });

      setStudents(studentRoster);
    } catch (err) {
      console.error("Error calculating student stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateStudentStats();
  }, []);

  const handleSimulateImportExcel = async () => {
    try {
      const mockExcelData = [
        { name: "Arnoldus Golo", email: "arnoldgolo@siswa.sch.id", nisn: "0087788992", kelas: "XII TKJ", tempatPkl: "Telkom Indonesia Bajawa", tempatPklId: "p2" },
        { name: "Theresia Soge", email: "theresiasoge@siswa.sch.id", nisn: "0086655441", kelas: "XII RPL", tempatPkl: "Sanjaya Motor Bajawa", tempatPklId: "p3" },
        { name: "Fransiskus Nani", email: "fransnani@siswa.sch.id", nisn: "0083322119", kelas: "XII TKJ", tempatPkl: "Dinas Kominfo Ngada", tempatPklId: "p1" }
      ];

      await pklService.importSiswaBulk(mockExcelData);
      await calculateStudentStats();
      setImportOpen(false);
      (window as any).showToast?.("Berhasil mengimpor 3 akun siswa baru dari data Excel!", "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal mengimpor akun siswa.", "error");
    }
  };

  const handleResetPassword = async () => {
    if (!targetStudent) return;
    try {
      await pklService.resetUserPassword(targetStudent.id, "Sanjaya@2026");
      setResetOpen(false);
      (window as any).showToast?.(`Password untuk ${targetStudent.name} berhasil direset ke: Sanjaya@2026`, "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal mereset password.", "error");
    }
  };

  // Filter students based on supervisor company if role is "industri"
  const myCompanyStudents = students.filter((s) => {
    if (user?.role === "industri") {
      const studentPlaceId = s.id === "siswa_sanjaya_123" ? "p1" : 
                            s.id === "s2" ? "p2" :
                            s.id === "s3" ? "p1" :
                            s.id === "s4" ? "p3" :
                            s.id === "s5" ? "p4" : "";
      
      const studentPlaceName = s.tempatPkl || "";
      const supervisorPlaceId = user?.tempatPklId || "";
      const supervisorPlaceName = user?.tempatPkl || "";

      if (supervisorPlaceId && studentPlaceId === supervisorPlaceId) return true;

      if (supervisorPlaceName && studentPlaceName) {
        const sName = studentPlaceName.toLowerCase();
        const vName = supervisorPlaceName.toLowerCase();
        if (sName.includes(vName) || vName.includes(sName)) return true;
        if (sName.includes("kominfo") && vName.includes("kominfo")) return true;
        if (sName.includes("telkom") && vName.includes("telkom")) return true;
        if (sName.includes("sanjaya motor") && vName.includes("sanjaya motor")) return true;
        if (sName.includes("bank ntt") && vName.includes("bank ntt")) return true;
      }
      return false;
    }
    return true;
  });

  const isStudentOfSupervisor = (studentId: string, studentPlaceName?: string, studentPlaceId?: string) => {
    const supervisorPlaceId = user?.tempatPklId || "";
    const supervisorPlaceName = user?.tempatPkl || "";

    const sPlaceId = studentId === "siswa_sanjaya_123" ? "p1" : 
                    studentId === "s2" ? "p2" :
                    studentId === "s3" ? "p1" :
                    studentId === "s4" ? "p3" :
                    studentId === "s5" ? "p4" : (studentPlaceId || "");
    const sPlaceName = studentPlaceName || "";

    if (supervisorPlaceId && sPlaceId === supervisorPlaceId) return true;

    if (supervisorPlaceName && sPlaceName) {
      const sName = sPlaceName.toLowerCase();
      const vName = supervisorPlaceName.toLowerCase();
      if (sName.includes(vName) || vName.includes(sName)) return true;
      if (sName.includes("kominfo") && vName.includes("kominfo")) return true;
      if (sName.includes("telkom") && vName.includes("telkom")) return true;
      if (sName.includes("sanjaya motor") && vName.includes("sanjaya motor")) return true;
      if (sName.includes("bank ntt") && vName.includes("bank ntt")) return true;
    }
    return false;
  };

  const myCompanyAttendance = allAttendance.filter((entry) => {
    if (user?.role === "industri") {
      const studentProfile = allProfiles.find(p => p.uid === entry.userId);
      return isStudentOfSupervisor(entry.userId, studentProfile?.tempatPkl, studentProfile?.tempatPklId);
    }
    return true;
  });

  const filteredAttendance = myCompanyAttendance.filter((entry) => {
    const matchSearch = entry.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchDate = !dateFilter || entry.tanggal === dateFilter;
    return matchSearch && matchDate;
  });

  const attendanceStats = {
    hadir: myCompanyAttendance.filter(a => a.status === "hadir").length,
    sakit: myCompanyAttendance.filter(a => a.status === "sakit").length,
    izin: myCompanyAttendance.filter(a => a.status === "izin").length,
    alpa: myCompanyAttendance.filter(a => a.status === "alpa").length,
  };
  const totalStatsCount = attendanceStats.hadir + attendanceStats.sakit + attendanceStats.izin + attendanceStats.alpa;

  const getPercent = (count: number) => {
    if (totalStatsCount === 0) return 0;
    return Math.round((count / totalStatsCount) * 100);
  };

  if (user?.role === "industri") {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Absensi Bimbingan & Grafik Kehadiran</h1>
            <p className="text-xs text-gray-500 mt-1 uppercase font-semibold tracking-wider">
              Status kehadiran harian dan grafik statistik bimbingan siswa di {user?.tempatPkl || "Mitra Industri"}
            </p>
          </div>
        </div>

        {/* Graphics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Visual Graph Card */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1565C0] animate-pulse" />
                Grafik Kehadiran Siswa
              </h3>
              <p className="text-[11px] text-gray-400">Distribusi persentase status kehadiran harian siswa bimbingan</p>
            </div>

            <div className="space-y-4 my-6">
              {/* Hadir Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-gray-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-600" />
                    Hadir
                  </span>
                  <span className="font-mono text-gray-500 font-semibold">{attendanceStats.hadir} Hari ({getPercent(attendanceStats.hadir)}%)</span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-green-600 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${getPercent(attendanceStats.hadir)}%` }}
                  />
                </div>
              </div>

              {/* Sakit Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-gray-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                    Sakit
                  </span>
                  <span className="font-mono text-gray-500 font-semibold">{attendanceStats.sakit} Hari ({getPercent(attendanceStats.sakit)}%)</span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-red-600 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${getPercent(attendanceStats.sakit)}%` }}
                  />
                </div>
              </div>

              {/* Izin Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-gray-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Izin
                  </span>
                  <span className="font-mono text-gray-500 font-semibold">{attendanceStats.izin} Hari ({getPercent(attendanceStats.izin)}%)</span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${getPercent(attendanceStats.izin)}%` }}
                  />
                </div>
              </div>

              {/* Alpa Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-gray-700 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-500" />
                    Alpa
                  </span>
                  <span className="font-mono text-gray-500 font-semibold">{attendanceStats.alpa} Hari ({getPercent(attendanceStats.alpa)}%)</span>
                </div>
                <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-gray-500 h-full rounded-full transition-all duration-1000"
                    style={{ width: `${getPercent(attendanceStats.alpa)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-3 text-[10px] text-gray-400 italic">
              * Total akumulasi {totalStatsCount} data absensi harian terdaftar untuk siswa bimbingan.
            </div>
          </div>

          {/* Stat Boxes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-50/40 p-4 rounded-2xl border border-green-100 flex flex-col justify-center items-center text-center">
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Hadir</span>
              <span className="text-4xl font-black text-green-900 mt-2">{attendanceStats.hadir}</span>
              <span className="text-[10px] text-green-600 mt-1 font-semibold">{getPercent(attendanceStats.hadir)}% Kehadiran</span>
            </div>
            <div className="bg-red-50/40 p-4 rounded-2xl border border-red-100 flex flex-col justify-center items-center text-center">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Sakit</span>
              <span className="text-4xl font-black text-red-900 mt-2">{attendanceStats.sakit}</span>
              <span className="text-[10px] text-red-600 mt-1 font-semibold">{getPercent(attendanceStats.sakit)}% Berhalangan</span>
            </div>
            <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100 flex flex-col justify-center items-center text-center">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Izin</span>
              <span className="text-4xl font-black text-amber-900 mt-2">{attendanceStats.izin}</span>
              <span className="text-[10px] text-amber-600 mt-1 font-semibold">{getPercent(attendanceStats.izin)}% Permohonan</span>
            </div>
            <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-200 flex flex-col justify-center items-center text-center">
              <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">Alpa</span>
              <span className="text-4xl font-black text-gray-900 mt-2">{attendanceStats.alpa}</span>
              <span className="text-[10px] text-gray-500 mt-1 font-semibold">{getPercent(attendanceStats.alpa)}% Tanpa Kabar</span>
            </div>
          </div>
        </div>

        {/* Filter and Table Section */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="relative w-full sm:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari nama siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Date Filter */}
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 w-full sm:w-auto">
              <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
              <span>Tanggal:</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 outline-none"
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

            <div className="text-[11px] font-semibold text-gray-400 ml-auto select-none shrink-0">
              Menampilkan <strong className="text-gray-900">{filteredAttendance.length}</strong> dari {myCompanyAttendance.length} Absensi
            </div>
          </div>
        </div>

        {/* Attendance List Table */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] font-bold text-gray-400 bg-gray-50/50 uppercase tracking-widest">
                  <th className="py-4 px-6">Informasi Siswa</th>
                  <th className="py-4 px-6">Tanggal</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Jam Masuk</th>
                  <th className="py-4 px-6 text-center">Jam Pulang</th>
                  <th className="py-4 px-6">Lokasi / Geotagging</th>
                  <th className="py-4 px-6">Catatan / Alasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs font-bold">Tidak ada rekap absensi yang cocok</p>
                      <p className="text-[10px] text-gray-400 mt-1">Gunakan filter pencarian atau tanggal yang berbeda.</p>
                    </td>
                  </tr>
                ) : (
                  filteredAttendance.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50/40 transition-colors text-xs text-gray-700">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 text-[#1565C0] flex items-center justify-center font-bold text-xs">
                            {a.userName.substring(0, 1)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{a.userName}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Siswa Bimbingan Aktif</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>{a.tanggal}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span
                          className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                            a.status === "hadir"
                              ? "bg-green-100 text-green-800"
                              : a.status === "sakit"
                                ? "bg-red-100 text-red-800"
                                : a.status === "izin"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-mono font-medium text-gray-600">
                        {a.status === "hadir" ? (
                          <div className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-green-500" />
                            <span>{a.jamMasuk}</span>
                          </div>
                        ) : "--:--"}
                      </td>
                      <td className="py-4 px-6 text-center font-mono font-medium text-gray-600">
                        {a.status === "hadir" ? (
                          <div className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span>{a.jamPulang || "--:--"}</span>
                          </div>
                        ) : "--:--"}
                      </td>
                      <td className="py-4 px-6">
                        {a.alamatGps ? (
                          <div className="flex items-center gap-1 text-gray-600 max-w-xs truncate" title={a.alamatGps}>
                            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span className="text-[11px]">{a.alamatGps}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Tidak ada geotag</span>
                        )}
                      </td>
                      <td className="py-4 px-6 max-w-xs truncate italic text-gray-500">
                        {a.keterangan || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const filteredStudents = myCompanyStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.tempatPkl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nisn && s.nisn.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Monitoring Siswa PKL</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase font-semibold tracking-wider">
            Melihat keaktifan kehadiran dan status kelulusan laporan jurnal harian siswa
          </p>
        </div>

        {user?.role === "admin" && (
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import Excel (Massal)
          </button>
        )}
      </div>

      {/* Search Bar and Overview metrics */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari siswa atau instansi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
            id="input-monitor-search"
          />
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-gray-500 shrink-0">
          <span>Menampilkan <strong className="text-gray-900">{filteredStudents.length}</strong> dari {myCompanyStudents.length} Siswa</span>
        </div>
      </div>

      {/* BULK ACTIONS FOR MONITORING */}
      {user?.role === "admin" && !loading && filteredStudents.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs mb-4">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-gray-700">
              Terpilih: {selectedMonitoringIds.length} dari {filteredStudents.length} Siswa
            </span>
          </div>

          {selectedMonitoringIds.length > 0 && (
            <button
              onClick={handleDeleteMonitoringBulk}
              className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-md hover:shadow-lg cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih ({selectedMonitoringIds.length})
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-[10px] font-bold text-gray-400 bg-gray-50/50 uppercase tracking-widest">
                  <th className="py-4 px-6 flex items-center gap-2">
                    {user?.role === "admin" && (
                      <input
                        type="checkbox"
                        checked={filteredStudents.length > 0 && selectedMonitoringIds.length === filteredStudents.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMonitoringIds(filteredStudents.map(s => s.id));
                          } else {
                            setSelectedMonitoringIds([]);
                          }
                        }}
                        className="w-4 h-4 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer"
                      />
                    )}
                    <span>Informasi Siswa</span>
                  </th>
                  <th className="py-4 px-6">Instansi Placement</th>
                  <th className="py-4 px-6 text-center">Tingkat Hadir</th>
                  <th className="py-4 px-6 text-center">Laporan Jurnal</th>
                  <th className="py-4 px-6 text-center">Status Jurnal</th>
                  {user?.role === "admin" && <th className="py-4 px-6 text-right">Aksi Akun</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/40 transition-colors text-xs text-gray-700">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        {user?.role === "admin" && (
                          <input
                            type="checkbox"
                            checked={selectedMonitoringIds.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMonitoringIds(prev => [...prev, s.id]);
                              } else {
                                setSelectedMonitoringIds(prev => prev.filter(id => id !== s.id));
                              }
                            }}
                            className="w-4 h-4 text-[#1565C0] border-gray-300 rounded focus:ring-[#1565C0] cursor-pointer"
                          />
                        )}
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-[#1565C0] flex items-center justify-center font-bold text-sm">
                          {s.name.substring(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{s.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">NISN: {s.nisn} • Kelas: {s.kelas}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-medium text-gray-800">{s.tempatPkl}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="font-mono font-bold text-[#1565C0] text-sm">{s.attendanceRate}</span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-gray-600">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        <span>{s.journalCount} Dikirim</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                        <span className="text-xs font-semibold text-gray-800">
                          {s.approvedCount} Disetujui
                        </span>
                      </div>
                    </td>
                    {user?.role === "admin" && (
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => {
                            setTargetStudent(s);
                            setResetOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 rounded-lg transition-colors border border-red-200/45"
                        >
                          <Key className="w-3 h-3" /> Reset Pwd
                        </button>
                        <button
                          onClick={() => handleDeleteSingleMonitoring(s.id, s.name)}
                          className="inline-flex items-center gap-1 text-[10px] bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 rounded-lg transition-colors border border-red-200/45 ml-1"
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* IMPORT DIALOG */}
      <Dialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      >
        <DialogTitle className="font-bold text-gray-900 text-base flex items-center gap-2 border-b border-gray-100 pb-3">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Import Rekomendasi Siswa (Excel)
        </DialogTitle>
        <DialogContent className="pt-4 space-y-4">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:bg-gray-50/60 transition-colors cursor-pointer">
            <span className="material-icons text-emerald-600 text-[40px] mb-2">upload_file</span>
            <p className="text-xs font-bold text-gray-800">Pilih lembar kerja XLS / XLSX</p>
            <p className="text-[10px] text-gray-400 mt-1">atau seret file excel Anda di sini (max 10MB)</p>
          </div>
          <div className="bg-amber-50 text-[11px] text-amber-800 p-3 rounded-lg border border-amber-100 leading-relaxed">
            <strong>Peringatan Sistem:</strong> Format file excel harus memuat kolom berurutan: NISN, Nama Lengkap, Alamat Email, dan Kode Kelas. Akun login siswa PKL akan otomatis diprovokasi oleh sistem secara massal.
          </div>
        </DialogContent>
        <DialogActions className="border-t border-gray-100 p-3 flex gap-2">
          <Button
            onClick={() => setImportOpen(false)}
            variant="outlined"
            style={{ color: "#666", borderColor: "#ddd", borderRadius: 8, fontSize: "11px" }}
          >
            Batal
          </Button>
          <Button
            onClick={handleSimulateImportExcel}
            variant="contained"
            color="success"
            style={{ borderRadius: 8, fontSize: "11px", fontWeight: "bold" }}
          >
            Simpan & Daftarkan Massal
          </Button>
        </DialogActions>
      </Dialog>

      {/* RESET PASSWORD DIALOG */}
      <Dialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
      >
        <DialogTitle className="font-bold text-gray-900 text-base">Konfirmasi Reset Password</DialogTitle>
        <DialogContent>
          {targetStudent && (
            <p className="text-xs leading-relaxed text-gray-500">
              Apakah Anda yakin ingin mereset password akun untuk <strong className="text-gray-900">{targetStudent.name}</strong> (NISN: {targetStudent.nisn})? Password default akan dipulihkan menjadi <strong className="text-red-600">Sanjaya@2026</strong>.
            </p>
          )}
        </DialogContent>
        <DialogActions className="border-t border-gray-100 p-3 flex gap-2">
          <Button
            onClick={() => setResetOpen(false)}
            variant="outlined"
            style={{ color: "#666", borderColor: "#ddd", borderRadius: 8, fontSize: "11px" }}
          >
            Batal
          </Button>
          <Button
            onClick={handleResetPassword}
            variant="contained"
            color="error"
            style={{ borderRadius: 8, fontSize: "11px", fontWeight: "bold" }}
          >
            Ya, Pulihkan Password
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
export default SiswaMonitoring;
