import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import { JurnalEntry, KehadiranEntry, TempatPkl, UserProfile, TeacherNote, SchoolSettings } from "../models/types";
import { SCHOOL_NAME } from "../constants";
import { motion } from "motion/react";
import {
  Users,
  CalendarCheck,
  FileText,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [journals, setJournals] = useState<JurnalEntry[]>([]);
  const [attendance, setAttendance] = useState<KehadiranEntry[]>([]);
  const [placements, setPlacements] = useState<TempatPkl[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [teacherNotes, setTeacherNotes] = useState<TeacherNote[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let [jList, aList, pList, uList, nList, sSettings] = await Promise.all([
          pklService.getJurnal(),
          pklService.getKehadiran(),
          pklService.getTempatPkl(),
          pklService.getAllUserProfiles(),
          user?.role === "admin" || user?.role === "pembimbing" ? pklService.getTeacherNotes(user.role, user.uid) : Promise.resolve([]),
          pklService.getSchoolSettings(),
        ]);

        setProfiles(uList);
        setTeacherNotes(nList);
        setSchoolSettings(sSettings);

        if (user?.role === "siswa") {
          jList = jList.filter((j) => j.userId === user.uid);
          aList = aList.filter((a) => a.userId === user.uid);
        } else if (user?.role === "industri") {
          // Filter to only students assigned to this industry partner
          const myStudentIds = uList
            .filter((u) => u.tempatPklId === user.tempatPklId || u.tempatPkl === user.tempatPkl)
            .map((u) => u.uid);
          jList = jList.filter((j) => myStudentIds.includes(j.userId));
          aList = aList.filter((a) => myStudentIds.includes(a.userId));
        }

        setJournals(jList);
        setAttendance(aList);
        setPlacements(pList);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#1565C0] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Statistics Calculations
  const totalJournals = journals.length;
  const approvedJournals = journals.filter((j) => j.status === "approved").length;
  const pendingJournals = journals.filter((j) => j.status === "pending").length;
  const rejectedJournals = journals.filter((j) => j.status === "rejected").length;

  const totalAttendance = attendance.length;
  const presentDays = attendance.filter((a) => a.status === "hadir").length;
  const sickDays = attendance.filter((a) => a.status === "sakit").length;
  const permissionDays = attendance.filter((a) => a.status === "izin").length;
  const alpaDays = attendance.filter((a) => a.status === "alpa").length;

  const totalDays = presentDays + sickDays + permissionDays + alpaDays;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  // Render Student Dashboard
  const renderSiswaDashboard = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayAttendance = attendance.find((a) => a.tanggal === todayStr);

    return (
      <div className="space-y-6">
        {/* Welcome Hero Banner */}
        <div className="bg-white border border-gray-200/80 p-6 sm:p-8 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-12 -translate-y-12 text-[#1565C0]">
            <Building2 className="w-96 h-96" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 bg-[#1565C0]/5 text-[#1565C0] px-3 py-1 rounded-full text-xs font-semibold w-fit tracking-wide uppercase mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Siswa Terdaftar PKL
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              Selamat Datang, {user?.name}!
            </h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Anda ditempatkan di <span className="font-semibold text-gray-800 underline decoration-[#1565C0]/40">{user?.tempatPkl}</span>.
              Gunakan sistem ini untuk mencatat jurnal harian Anda dan melakukan absensi kehadiran setiap hari kerja secara tepat waktu.
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-[#1565C0] rounded-xl">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Hadir</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{presentDays} Hari</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Jurnal Tertunda</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{pendingJournals}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-50 text-[#2E7D32] rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Jurnal Disetujui</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{approvedJournals}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-50 text-red-600 rounded-xl">
              <XCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Sakit / Izin</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{sickDays + permissionDays} Hari</h3>
            </div>
          </div>
        </div>

        {/* Statistik Kehadiran Siswa PKL (Secara Menyeluruh) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div>
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-[#1565C0]" /> Analisis & Statistik Kehadiran PKL Menyeluruh
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5">Statistik tingkat partisipasi kerja Anda di mitra DUDI</p>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 text-[#1565C0] px-3 py-1 rounded-xl font-extrabold text-xs">
              Rasio Kehadiran: <span className="text-sm font-black text-[#1565C0]">{attendanceRate}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
            {/* Visual Ring Chart with Tailwind pure CSS */}
            <div className="flex flex-col items-center justify-center bg-gray-50/50 p-4 rounded-2xl border border-gray-150/60 col-span-1">
              <div className="relative flex items-center justify-center w-24 h-24">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-200"
                    strokeWidth="3.2"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#1565C0] transition-all duration-1000 ease-out"
                    strokeDasharray={`${attendanceRate}, 100`}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute text-center">
                  <span className="text-lg font-black text-gray-800">{attendanceRate}%</span>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">PRESENSI</p>
                </div>
              </div>
              <p className="text-[9px] text-gray-400 font-bold mt-2.5 uppercase tracking-wider">KEAKTIFAN KERJA</p>
            </div>

            {/* Linear stats breakdown */}
            <div className="md:col-span-3 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-green-50/50 border border-green-100 rounded-xl">
                  <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Hadir</div>
                  <div className="text-lg font-extrabold text-[#2E7D32] mt-1">{presentDays}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">Hari Kerja</div>
                </div>
                <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl">
                  <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Sakit</div>
                  <div className="text-lg font-extrabold text-red-800 mt-1">{sickDays}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">Dengan Surat</div>
                </div>
                <div className="p-3 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                  <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider">Izin</div>
                  <div className="text-lg font-extrabold text-yellow-800 mt-1">{permissionDays}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">Keperluan</div>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Alpa</div>
                  <div className="text-lg font-extrabold text-gray-800 mt-1">{alpaDays}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">Tanpa Berita</div>
                </div>
              </div>

              {/* Progress Bar of whole spectrum */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  <span>Komparasi Distribusi Presensi ({totalDays} Hari Total)</span>
                  <span>{attendanceRate}% Efektivitas</span>
                </div>
                <div className="w-full h-3 bg-gray-150 rounded-full overflow-hidden flex">
                  {presentDays > 0 && (
                    <div 
                      className="bg-[#2E7D32]" 
                      style={{ width: `${(presentDays / (totalDays || 1)) * 100}%` }}
                      title={`Hadir: ${presentDays} hari`}
                    />
                  )}
                  {sickDays > 0 && (
                    <div 
                      className="bg-red-500" 
                      style={{ width: `${(sickDays / (totalDays || 1)) * 100}%` }}
                      title={`Sakit: ${sickDays} hari`}
                    />
                  )}
                  {permissionDays > 0 && (
                    <div 
                      className="bg-yellow-500" 
                      style={{ width: `${(permissionDays / (totalDays || 1)) * 100}%` }}
                      title={`Izin: ${permissionDays} hari`}
                    />
                  )}
                  {alpaDays > 0 && (
                    <div 
                      className="bg-gray-800" 
                      style={{ width: `${(alpaDays / (totalDays || 1)) * 100}%` }}
                      title={`Alpa: ${alpaDays} hari`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-4 text-[9px] text-gray-400 mt-1 font-bold">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#2E7D32]" /> Hadir ({totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(0) : 0}%)</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500" /> Sakit ({totalDays > 0 ? ((sickDays / totalDays) * 100).toFixed(0) : 0}%)</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-yellow-500" /> Izin ({totalDays > 0 ? ((permissionDays / totalDays) * 100).toFixed(0) : 0}%)</div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-gray-800" /> Alpa ({totalDays > 0 ? ((alpaDays / totalDays) * 100).toFixed(0) : 0}%)</div>
                </div>
              </div>

              {/* Status Text Advice */}
              <div className="p-3 bg-blue-50/50 border border-blue-100/40 rounded-xl text-[11px] leading-relaxed flex items-start gap-2.5 text-blue-800 font-medium">
                <HelpCircle className="w-4 h-4 text-[#1565C0] shrink-0 mt-0.5" />
                <span>
                  {attendanceRate >= 90 
                    ? "Sangat Baik! Tingkat kehadiran Anda memenuhi standar prima dunia kerja profesional. Pertahankan performa kerja luar biasa ini di dunia industri." 
                    : attendanceRate >= 75 
                      ? "Kehadiran Cukup. Usahakan untuk meminimalkan izin/sakit kecuali keadaan mendesak, agar pembelajaran kompetensi keahlian Anda di lokasi DUDI berjalan optimal."
                      : "Perhatian Khusus! Tingkat kehadiran Anda berada di bawah batas minimum kelulusan sekolah (75%). Harap segera berkonsultasi dengan Guru Pembimbing PKL Anda."
                  }
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Actions Panel */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#1565C0]" /> Status Absensi Hari Ini
              </h4>

              {todayAttendance ? (
                <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-800 uppercase bg-blue-100 px-2.5 py-1 rounded-full">
                      Status: {todayAttendance.status}
                    </span>
                    <span className="text-xs font-mono text-gray-500">{todayAttendance.tanggal}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                    <div className="bg-white p-3 rounded-lg border border-gray-150">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Jam Masuk</p>
                      <p className="text-md font-bold text-gray-800 mt-1">{todayAttendance.jamMasuk}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-150">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase">Jam Pulang</p>
                      <p className="text-md font-bold text-gray-800 mt-1">
                        {todayAttendance.jamPulang || "--:--"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 text-center">
                  <p className="text-xs font-semibold text-yellow-800">
                    Anda Belum Absen Hari Ini
                  </p>
                  <p className="text-[11px] text-yellow-600 mt-1">
                    Silakan isi kehadiran kerja Anda di menu Absensi Presensi.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <Link
                to="/presensi"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#1565C0] text-white py-2.5 px-4 rounded-xl font-semibold text-xs transition-colors hover:bg-blue-700 shadow-sm"
              >
                Menuju Menu Absensi
              </Link>
            </div>
          </div>

          {/* Recent Journal entry list */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#2E7D32]" /> Jurnal Harian Terakhir
              </h4>
              <Link to="/jurnal" className="text-xs font-bold text-[#1565C0] hover:underline">
                Lihat Semua ({totalJournals})
              </Link>
            </div>

            {journals.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-35" />
                <p className="text-xs font-semibold">Belum Ada Jurnal Terdaftar</p>
                <p className="text-[10px] text-gray-400 mt-1">Kirim jurnal kegiatan Anda hari ini.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {journals.slice(0, 3).map((j) => (
                  <div key={j.id} className="py-3.5 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-semibold text-gray-800">{j.tanggal}</span>
                      <span
                        className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          j.status === "approved"
                            ? "bg-green-100 text-[#2E7D32]"
                            : j.status === "rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {j.status === "approved" ? "Disetujui" : j.status === "rejected" ? "Ditolak" : "Tertunda"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2">{j.kegiatan}</p>
                    {j.pembimbingComment && (
                      <p className="text-[10px] italic text-[#2E7D32] bg-green-50 px-3 py-1.5 rounded-lg mt-2 font-medium">
                        Catatan Guru: "{j.pembimbingComment}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Pembimbing (Supervisor) Dashboard
  const renderPembimbingDashboard = () => {
    return (
      <div className="space-y-6">
        {/* Welcome Hero Banner */}
        <div className="bg-white border border-gray-200/80 p-6 sm:p-8 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-12 -translate-y-12 text-[#1565C0]">
            <Users className="w-96 h-96" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 bg-[#1565C0]/5 text-[#1565C0] px-3 py-1 rounded-full text-xs font-semibold w-fit tracking-wide uppercase mb-3">
              <UserCheck className="w-3.5 h-3.5" />
              Pembimbing Terdaftar SMKS Sanjaya
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              Selamat Datang, {user?.name}!
            </h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Gunakan dashboard pembimbing ini untuk memantau kehadiran siswa bimbingan Anda secara real-time, menyetujui laporan jurnal harian, dan mengelola daftar mitra industri PKL.
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-[#1565C0] rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Siswa</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">5 Siswa</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Butuh Review</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{pendingJournals} Jurnal</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-50 text-[#2E7D32] rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Mitra Industri</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{placements.length} Perusahaan</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Kehadiran Hari Ini</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">100%</h3>
            </div>
          </div>
        </div>

        {/* Ringkasan & Statistik Absensi Siswa Bimbingan */}
        {(() => {
          const myStudents = profiles.filter((p) => p.role === "siswa" && (p.pembimbingId === user?.uid || !user?.pembimbingId));
          const myStudentIds = myStudents.map((s) => s.uid);
          const myAttendance = myStudentIds.length > 0 
            ? attendance.filter((a) => myStudentIds.includes(a.userId)) 
            : attendance;

          const pDays = myAttendance.filter((a) => a.status === "hadir").length;
          const sDays = myAttendance.filter((a) => a.status === "sakit").length;
          const iDays = myAttendance.filter((a) => a.status === "izin").length;
          const aDaysCount = myAttendance.filter((a) => a.status === "alpa").length;

          const tDays = pDays + sDays + iDays + aDaysCount;
          const avgAttendanceRate = tDays > 0 ? Math.round((pDays / tDays) * 100) : 100;

          return (
            <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-[#1565C0]" /> Statistik Kehadiran Siswa Bimbingan (Menyeluruh)
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Ringkasan tingkat kehadiran dan keaktifan seluruh siswa di bawah bimbingan Anda</p>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-50 text-[#1565C0] px-3 py-1.5 rounded-xl font-bold text-xs">
                  Rata-rata Kehadiran: <span className="text-sm font-black text-[#1565C0]">{avgAttendanceRate}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                {/* Cumulated Breakdown */}
                <div className="lg:border-r lg:border-gray-100 lg:pr-6 space-y-4">
                  <div className="text-center bg-gray-50/50 p-4 rounded-xl border border-gray-150">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Rata-rata Kehadiran</div>
                    <div className="text-3xl font-black text-[#1565C0] mt-1">{avgAttendanceRate}%</div>
                    <p className="text-[10px] text-gray-500 mt-1">Dari total {tDays} logs presensi</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-green-50/40 p-2.5 rounded-lg border border-green-100">
                      <div className="text-[9px] font-bold text-green-700 uppercase">Hadir</div>
                      <div className="text-sm font-bold text-[#2E7D32] mt-0.5">{pDays}</div>
                    </div>
                    <div className="bg-red-50/40 p-2.5 rounded-lg border border-red-100">
                      <div className="text-[9px] font-bold text-red-700 uppercase">Sakit</div>
                      <div className="text-sm font-bold text-red-800 mt-0.5">{sDays}</div>
                    </div>
                    <div className="bg-yellow-50/40 p-2.5 rounded-lg border border-yellow-100">
                      <div className="text-[9px] font-bold text-yellow-700 uppercase">Izin</div>
                      <div className="text-sm font-bold text-yellow-800 mt-0.5">{iDays}</div>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      <div className="text-[9px] font-bold text-gray-500 uppercase">Alpa</div>
                      <div className="text-sm font-bold text-gray-800 mt-0.5">{aDaysCount}</div>
                    </div>
                  </div>
                </div>

                {/* Individual student lists */}
                <div className="lg:col-span-3 space-y-3">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detail Presensi per Siswa:</h5>
                  {myStudents.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Belum ada siswa yang ditugaskan di bawah bimbingan Anda.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {myStudents.map((stud) => {
                        const studAttendance = attendance.filter((a) => a.userId === stud.uid);
                        const sHadir = studAttendance.filter((a) => a.status === "hadir").length;
                        const sSakit = studAttendance.filter((a) => a.status === "sakit").length;
                        const sIzin = studAttendance.filter((a) => a.status === "izin").length;
                        const sAlpa = studAttendance.filter((a) => a.status === "alpa").length;
                        
                        const sTotal = sHadir + sSakit + sIzin + sAlpa;
                        const sRate = sTotal > 0 ? Math.round((sHadir / sTotal) * 100) : 100;

                        return (
                          <div key={stud.uid} className="p-3 bg-gray-50/30 hover:bg-gray-50 border border-gray-150/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-gray-800">{stud.name}</span>
                                <span className="text-[9px] bg-blue-100 text-[#1565C0] font-bold px-1.5 py-0.5 rounded uppercase">{stud.kelas || "XII"}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 truncate max-w-xs">{stud.tempatPkl || "Belum ditempatkan"}</p>
                            </div>

                            <div className="flex flex-col sm:items-end gap-1.5 sm:w-60 shrink-0">
                              <div className="flex items-center justify-between text-[10px] w-full">
                                <span className="font-bold text-gray-500">Kehadiran: {sRate}%</span>
                                <span className="text-gray-400 font-medium">H:{sHadir} S:{sSakit} I:{sIzin} A:{sAlpa}</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-250 rounded-full overflow-hidden flex">
                                {sHadir > 0 && <div className="bg-[#2E7D32]" style={{ width: `${(sHadir / (sTotal || 1)) * 100}%` }} />}
                                {sSakit > 0 && <div className="bg-red-500" style={{ width: `${(sSakit / (sTotal || 1)) * 100}%` }} />}
                                {sIzin > 0 && <div className="bg-yellow-500" style={{ width: `${(sIzin / (sTotal || 1)) * 100}%` }} />}
                                {sAlpa > 0 && <div className="bg-gray-800" style={{ width: `${(sAlpa / (sTotal || 1)) * 100}%` }} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Sections for review */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-600" /> Jurnal Siswa Menunggu Persetujuan
              </h4>
              <Link to="/jurnal-review" className="text-xs font-bold text-[#1565C0] hover:underline">
                Tinjau Semua ({pendingJournals})
              </Link>
            </div>

            {journals.filter((j) => j.status === "pending").length === 0 ? (
              <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-[#2E7D32] opacity-80" />
                <p className="text-xs font-semibold text-gray-700">Semua Jurnal Telah Ditinjau</p>
                <p className="text-[10px] text-gray-400 mt-1">Tidak ada pengajuan jurnal tertunda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {journals
                  .filter((j) => j.status === "pending")
                  .slice(0, 2)
                  .map((j) => (
                    <div key={j.id} className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">{j.userName}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{j.tanggal}</span>
                      </div>
                      <p className="text-xs font-semibold text-gray-700 mt-2">Kegiatan:</p>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{j.kegiatan}</p>
                      <div className="mt-4 flex justify-end">
                        <Link
                          to="/jurnal-review"
                          className="text-xs font-bold text-[#1565C0] bg-white border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 shadow-sm"
                        >
                          Tinjau Jurnal
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#2E7D32]" /> Tempat PKL Unggulan
              </h4>
              <div className="space-y-3">
                {placements.slice(0, 3).map((p) => (
                  <div key={p.id} className="p-3 bg-gray-50 rounded-xl border border-gray-150">
                    <p className="text-xs font-bold text-gray-800 truncate">{p.nama}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">{p.alamat}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded">
                        Pimp: {p.pimpinan}
                      </span>
                      <span className="text-[9px] bg-green-100 text-[#2E7D32] font-semibold px-2 py-0.5 rounded">
                        Kuota: {p.kuota} Siswa
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <Link
                to="/tempat-pkl"
                className="w-full inline-flex items-center justify-center bg-[#2E7D32] text-white py-2.5 rounded-xl font-semibold text-xs hover:bg-green-700 shadow-sm"
              >
                Lihat Semua Industri
              </Link>
            </div>
          </div>
        </div>

        {/* Catatan Pembimbing Terbaru Section */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" /> Catatan Perkembangan Bimbingan Terbaru
            </h4>
            <Link to="/catatan-pembimbing" className="text-xs font-bold text-[#1565C0] hover:underline">
              Lihat Semua ({teacherNotes.length})
            </Link>
          </div>

          {teacherNotes.length === 0 ? (
            <div className="py-8 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-250">
              <p className="text-xs font-semibold text-gray-700">Belum ada catatan pembimbing</p>
              <p className="text-[10px] text-gray-400 mt-1">Buat catatan baru di menu Catatan Pembimbing untuk mengawasi perkembangan siswa bimbingan Anda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {teacherNotes.slice(0, 3).map((note) => (
                <div key={note.id} className="p-4 bg-slate-50 border border-gray-150 rounded-xl relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                      {note.category}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(note.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <h5 className="font-bold text-xs text-gray-800 line-clamp-1">{note.title}</h5>
                  <p className="text-[11px] text-gray-500 mt-1">Siswa: <span className="font-bold text-gray-700">{note.studentName}</span></p>
                  <p className="text-[11px] text-gray-600 mt-1.5 line-clamp-2">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render Industri (Industrial Supervisor) Dashboard
  const renderIndustriDashboard = () => {
    const myPendingJournals = journals.filter((j) => j.status === "pending").length;
    return (
      <div className="space-y-6">
        {/* Welcome Hero Banner */}
        <div className="bg-white border border-gray-200/80 p-6 sm:p-8 rounded-2xl relative overflow-hidden shadow-sm">
          <div className="absolute right-0 top-0 opacity-[0.03] pointer-events-none transform translate-x-12 -translate-y-12 text-[#1565C0]">
            <Building2 className="w-96 h-96" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <div className="flex items-center gap-2 bg-amber-500/10 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold w-fit tracking-wide uppercase mb-3">
              <Building2 className="w-3.5 h-3.5" />
              Mitra Industri • {user?.tempatPkl || "Mitra Kerja SMKS Sanjaya"}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              Selamat Datang, {user?.name}!
            </h2>
            <p className="text-sm text-gray-500 mt-2 leading-relaxed">
              Pantau absensi harian dan rekap bimbingan siswa SMKS Sanjaya Bajawa yang ditempatkan di perusahaan Anda. Anda juga dapat memberikan penilaian akhir PKL secara langsung melalui menu yang disediakan.
            </p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-[#1565C0] rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Siswa Terbimbing</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">2 Siswa Aktif</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-yellow-50 text-yellow-600 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Jurnal Tertunda</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{myPendingJournals} Jurnal</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/60 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-green-50 text-[#2E7D32] rounded-xl">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Selesai Dinilai</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">100% Selesai</h3>
            </div>
          </div>
        </div>

        {/* Ringkasan & Statistik Absensi Siswa Mitra Industri */}
        {(() => {
          const myStudents = profiles.filter((p) => p.role === "siswa" && (p.tempatPklId === user?.tempatPklId || p.tempatPkl === user?.tempatPkl));
          const myStudentIds = myStudents.map((s) => s.uid);
          const myAttendance = myStudentIds.length > 0 
            ? attendance.filter((a) => myStudentIds.includes(a.userId)) 
            : attendance;

          const pDays = myAttendance.filter((a) => a.status === "hadir").length;
          const sDays = myAttendance.filter((a) => a.status === "sakit").length;
          const iDays = myAttendance.filter((a) => a.status === "izin").length;
          const aDaysCount = myAttendance.filter((a) => a.status === "alpa").length;

          const tDays = pDays + sDays + iDays + aDaysCount;
          const avgAttendanceRate = tDays > 0 ? Math.round((pDays / tDays) * 100) : 100;

          return (
            <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-amber-600" /> Statistik Kehadiran Siswa PKL Mitra (Menyeluruh)
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Ringkasan kedisplinan harian dan keaktifan seluruh siswa PKL di {user?.tempatPkl || "perusahaan Anda"}</p>
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl font-bold text-xs">
                  Efektivitas Kehadiran: <span className="text-sm font-black text-amber-700">{avgAttendanceRate}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                {/* Cumulated Breakdown */}
                <div className="lg:border-r lg:border-gray-100 lg:pr-6 space-y-4">
                  <div className="text-center bg-gray-50/50 p-4 rounded-xl border border-gray-150">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Persentase Aktif Kerja</div>
                    <div className="text-3xl font-black text-amber-700 mt-1">{avgAttendanceRate}%</div>
                    <p className="text-[10px] text-gray-500 mt-1">Total {tDays} hari kerja terdaftar</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-green-50/40 p-2.5 rounded-lg border border-green-100">
                      <div className="text-[9px] font-bold text-green-700 uppercase">Hadir</div>
                      <div className="text-sm font-bold text-[#2E7D32] mt-0.5">{pDays}</div>
                    </div>
                    <div className="bg-red-50/40 p-2.5 rounded-lg border border-red-100">
                      <div className="text-[9px] font-bold text-red-700 uppercase">Sakit</div>
                      <div className="text-sm font-bold text-red-800 mt-0.5">{sDays}</div>
                    </div>
                    <div className="bg-yellow-50/40 p-2.5 rounded-lg border border-yellow-100">
                      <div className="text-[9px] font-bold text-yellow-700 uppercase">Izin</div>
                      <div className="text-sm font-bold text-yellow-800 mt-0.5">{iDays}</div>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      <div className="text-[9px] font-bold text-gray-500 uppercase">Alpa</div>
                      <div className="text-sm font-bold text-gray-800 mt-0.5">{aDaysCount}</div>
                    </div>
                  </div>
                </div>

                {/* Individual student lists */}
                <div className="lg:col-span-3 space-y-3">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detail Absensi Siswa Magang:</h5>
                  {myStudents.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Belum ada siswa yang ditempatkan di perusahaan Anda saat ini.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {myStudents.map((stud) => {
                        const studAttendance = attendance.filter((a) => a.userId === stud.uid);
                        const sHadir = studAttendance.filter((a) => a.status === "hadir").length;
                        const sSakit = studAttendance.filter((a) => a.status === "sakit").length;
                        const sIzin = studAttendance.filter((a) => a.status === "izin").length;
                        const sAlpa = studAttendance.filter((a) => a.status === "alpa").length;
                        
                        const sTotal = sHadir + sSakit + sIzin + sAlpa;
                        const sRate = sTotal > 0 ? Math.round((sHadir / sTotal) * 100) : 100;

                        return (
                          <div key={stud.uid} className="p-3 bg-gray-50/30 hover:bg-gray-50 border border-gray-150/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-gray-800">{stud.name}</span>
                                <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded uppercase">{stud.kelas || "XII"}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 truncate max-w-xs">NISN: {stud.nisn || "-"}</p>
                            </div>

                            <div className="flex flex-col sm:items-end gap-1.5 sm:w-60 shrink-0">
                              <div className="flex items-center justify-between text-[10px] w-full">
                                <span className="font-bold text-gray-500">Rasio Hadir: {sRate}%</span>
                                <span className="text-gray-400 font-medium">H:{sHadir} S:{sSakit} I:{sIzin} A:{sAlpa}</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-250 rounded-full overflow-hidden flex">
                                {sHadir > 0 && <div className="bg-[#2E7D32]" style={{ width: `${(sHadir / (sTotal || 1)) * 100}%` }} />}
                                {sSakit > 0 && <div className="bg-red-500" style={{ width: `${(sSakit / (sTotal || 1)) * 100}%` }} />}
                                {sIzin > 0 && <div className="bg-yellow-500" style={{ width: `${(sIzin / (sTotal || 1)) * 100}%` }} />}
                                {sAlpa > 0 && <div className="bg-gray-800" style={{ width: `${(sAlpa / (sTotal || 1)) * 100}%` }} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Sections for review */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-5 h-5 text-yellow-600" /> Jurnal Siswa di {user?.tempatPkl || "Mitra"}
              </h4>
              <Link to="/jurnal-review" className="text-xs font-bold text-[#1565C0] hover:underline">
                Tinjau Semua ({myPendingJournals})
              </Link>
            </div>

            {journals.filter((j) => j.status === "pending").length === 0 ? (
              <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-[#2E7D32] opacity-80" />
                <p className="text-xs font-semibold text-gray-700">Semua Jurnal Telah Ditinjau</p>
                <p className="text-[10px] text-gray-400 mt-1">Tidak ada jurnal bimbingan siswa yang tertunda.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {journals
                  .filter((j) => j.status === "pending")
                  .slice(0, 2)
                  .map((j) => (
                    <div key={j.id} className="p-4 bg-yellow-50/50 border border-yellow-100 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800">{j.userName}</span>
                        <span className="text-[10px] text-gray-400 font-mono">{j.tanggal}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2 line-clamp-2">{j.kegiatan}</p>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Menu Akses Cepat
            </h4>
            <div className="space-y-3">
              <Link
                to="/jurnal-review"
                className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-200/40 transition-colors"
              >
                <span className="text-xs font-bold text-gray-700">Persetujuan Jurnal Harian</span>
                <span className="material-icons text-gray-400 text-[18px]">chevron_right</span>
              </Link>
              <Link
                to="/rekap-kehadiran"
                className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-200/40 transition-colors"
              >
                <span className="text-xs font-bold text-gray-700">Absensi Siswa Bimbingan</span>
                <span className="material-icons text-gray-400 text-[18px]">chevron_right</span>
              </Link>
              <Link
                to="/penilaian"
                className="flex items-center justify-between p-3.5 bg-gray-50 hover:bg-gray-100/80 rounded-xl border border-gray-200/40 transition-colors"
              >
                <span className="text-xs font-bold text-emerald-700">Pengisian Nilai Siswa PKL</span>
                <span className="material-icons text-emerald-600 text-[18px]">star</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Admin Dashboard
  const renderAdminDashboard = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200/80 p-6 sm:p-8 rounded-2xl shadow-sm">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Panel Kontrol Administrator</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            Selamat datang di sistem manajemen pusat SMKS Sanjaya Bajawa. Di sini Anda memiliki otorisasi penuh untuk mengelola pendaftaran tempat PKL Industri, penempatan siswa, dan memonitor data presensi-jurnal global.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Siswa Terdaftar</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">{profiles.filter((p) => p.role === "siswa").length} Siswa</h3>
            </div>
            <div className="p-4 bg-blue-50 text-[#1565C0] rounded-2xl">
              <Users className="w-8 h-8" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Mitra Industri</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">{placements.length} Perusahaan</h3>
            </div>
            <div className="p-4 bg-green-50 text-[#2E7D32] rounded-2xl">
              <Building2 className="w-8 h-8" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Pengajuan Jurnal</p>
              <h3 className="text-2xl font-bold text-gray-900 mt-2">{totalJournals} Total</h3>
            </div>
            <div className="p-4 bg-yellow-50 text-yellow-600 rounded-2xl">
              <FileText className="w-8 h-8" />
            </div>
          </div>
        </div>

        {/* Ringkasan & Statistik Absensi Global Sekolah */}
        {(() => {
          const myStudents = profiles.filter((p) => p.role === "siswa");
          const pDays = attendance.filter((a) => a.status === "hadir").length;
          const sDays = attendance.filter((a) => a.status === "sakit").length;
          const iDays = attendance.filter((a) => a.status === "izin").length;
          const aDaysCount = attendance.filter((a) => a.status === "alpa").length;

          const tDays = pDays + sDays + iDays + aDaysCount;
          const avgAttendanceRate = tDays > 0 ? Math.round((pDays / tDays) * 100) : 100;

          return (
            <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <CalendarCheck className="w-5 h-5 text-[#1565C0]" /> Rekap & Statistik Kehadiran Siswa PKL (Global Sekolah)
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">Analisis persentase keaktifan dan kehadiran seluruh siswa PKL SMKS Sanjaya Bajawa</p>
                </div>
                <div className="flex items-center gap-1.5 bg-blue-50 text-[#1565C0] px-3 py-1.5 rounded-xl font-bold text-xs">
                  Rata-rata Kehadiran Global: <span className="text-sm font-black text-[#1565C0]">{avgAttendanceRate}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                {/* Cumulated Breakdown */}
                <div className="lg:border-r lg:border-gray-100 lg:pr-6 space-y-4">
                  <div className="text-center bg-gray-50/50 p-4 rounded-xl border border-gray-150">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kehadiran Kumulatif</div>
                    <div className="text-3xl font-black text-[#1565C0] mt-1">{avgAttendanceRate}%</div>
                    <p className="text-[10px] text-gray-500 mt-1">Total {tDays} logs presensi siswa</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-green-50/40 p-2.5 rounded-lg border border-green-100">
                      <div className="text-[9px] font-bold text-green-700 uppercase">Hadir</div>
                      <div className="text-sm font-bold text-[#2E7D32] mt-0.5">{pDays}</div>
                    </div>
                    <div className="bg-red-50/40 p-2.5 rounded-lg border border-red-100">
                      <div className="text-[9px] font-bold text-red-700 uppercase">Sakit</div>
                      <div className="text-sm font-bold text-red-800 mt-0.5">{sDays}</div>
                    </div>
                    <div className="bg-yellow-50/40 p-2.5 rounded-lg border border-yellow-100">
                      <div className="text-[9px] font-bold text-yellow-700 uppercase">Izin</div>
                      <div className="text-sm font-bold text-yellow-800 mt-0.5">{iDays}</div>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      <div className="text-[9px] font-bold text-gray-500 uppercase">Alpa</div>
                      <div className="text-sm font-bold text-gray-800 mt-0.5">{aDaysCount}</div>
                    </div>
                  </div>
                </div>

                {/* Individual student lists */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detail Presensi per Siswa PKL:</h5>
                    <Link to="/kehadiran-manajemen" className="text-[10px] font-bold text-[#1565C0] hover:underline">
                      Kelola Manual & Cetak →
                    </Link>
                  </div>
                  {myStudents.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Belum ada siswa yang terdaftar di sistem.</p>
                  ) : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {myStudents.map((stud) => {
                        const studAttendance = attendance.filter((a) => a.userId === stud.uid);
                        const sHadir = studAttendance.filter((a) => a.status === "hadir").length;
                        const sSakit = studAttendance.filter((a) => a.status === "sakit").length;
                        const sIzin = studAttendance.filter((a) => a.status === "izin").length;
                        const sAlpa = studAttendance.filter((a) => a.status === "alpa").length;
                        
                        const sTotal = sHadir + sSakit + sIzin + sAlpa;
                        const sRate = sTotal > 0 ? Math.round((sHadir / sTotal) * 100) : 100;

                        return (
                          <div key={stud.uid} className="p-3 bg-gray-50/30 hover:bg-gray-50 border border-gray-150/70 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-gray-800">{stud.name}</span>
                                <span className="text-[9px] bg-blue-100 text-[#1565C0] font-bold px-1.5 py-0.5 rounded uppercase">{stud.kelas || "XII"}</span>
                              </div>
                              <p className="text-[10px] text-gray-400 truncate max-w-xs">{stud.tempatPkl || "Belum ditempatkan"}</p>
                            </div>

                            <div className="flex flex-col sm:items-end gap-1.5 sm:w-60 shrink-0">
                              <div className="flex items-center justify-between text-[10px] w-full">
                                <span className="font-bold text-gray-500">Kehadiran: {sRate}%</span>
                                <span className="text-gray-400 font-medium">H:{sHadir} S:{sSakit} I:{sIzin} A:{sAlpa}</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-250 rounded-full overflow-hidden flex">
                                {sHadir > 0 && <div className="bg-[#2E7D32]" style={{ width: `${(sHadir / (sTotal || 1)) * 100}%` }} />}
                                {sSakit > 0 && <div className="bg-red-500" style={{ width: `${(sSakit / (sTotal || 1)) * 100}%` }} />}
                                {sIzin > 0 && <div className="bg-yellow-500" style={{ width: `${(sIzin / (sTotal || 1)) * 100}%` }} />}
                                {sAlpa > 0 && <div className="bg-gray-800" style={{ width: `${(sAlpa / (sTotal || 1)) * 100}%` }} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Akses Manajemen Cepat
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/tempat-pkl"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-150 text-center transition-colors"
              >
                <Building2 className="w-8 h-8 text-[#1565C0] mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-800">Manajemen Mitra</p>
              </Link>
              <Link
                to="/siswa-monitoring"
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-150 text-center transition-colors"
              >
                <Users className="w-8 h-8 text-[#2E7D32] mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-800">Monitoring Siswa</p>
              </Link>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
              Log Kehadiran Global Terbaru
            </h4>
            {attendance.length === 0 ? (
              <p className="text-xs text-gray-400">Belum ada aktivitas hari ini.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {attendance.slice(0, 3).map((a) => (
                  <div key={a.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-gray-800">{a.userName}</p>
                      <p className="text-[10px] text-gray-400">{a.tanggal} • {a.jamMasuk}</p>
                    </div>
                    <span className="bg-green-100 text-[#2E7D32] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Catatan Pembimbing Terbaru (Admin View) */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm mt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" /> Catatan Pembimbing Terbaru (Seluruh Sekolah)
            </h4>
            <Link to="/catatan-pembimbing" className="text-xs font-bold text-[#1565C0] hover:underline">
              Lihat Semua ({teacherNotes.length})
            </Link>
          </div>

          {teacherNotes.length === 0 ? (
            <div className="py-8 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-250">
              <p className="text-xs font-semibold text-gray-700">Belum ada catatan pembimbing global</p>
              <p className="text-[10px] text-gray-400 mt-1">Ketika guru bimbingan menulis catatan monitoring, maka akan muncul disini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {teacherNotes.slice(0, 3).map((note) => (
                <div key={note.id} className="p-4 bg-slate-50 border border-gray-150 rounded-xl relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] bg-indigo-50/10 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                      {note.category}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(note.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <h5 className="font-bold text-xs text-gray-800 line-clamp-1">{note.title}</h5>
                  <p className="text-[11px] text-gray-500 mt-1">Siswa: <span className="font-bold text-gray-700">{note.studentName}</span></p>
                  <p className="text-[11px] text-gray-400">Guru: <span className="font-medium text-gray-600">{note.teacherName}</span></p>
                  <p className="text-[11px] text-gray-600 mt-1.5 line-clamp-2">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6" id="dashboard-stage">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard Utama</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase font-semibold tracking-wider">
            {schoolSettings?.namaSekolah || SCHOOL_NAME}
          </p>
        </div>
        <div className="text-xs bg-white border border-gray-200 py-1.5 px-3 rounded-xl shadow-sm text-gray-600 font-semibold font-mono flex items-center gap-2 w-fit">
          <Clock className="w-4 h-4 text-[#1565C0]" />
          <span>{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</span>
        </div>
      </div>

      {/* Dynamic School Profile Information Card */}
      {schoolSettings && (
        <div className="bg-white border border-gray-200/80 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row gap-5 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full">
            {schoolSettings.logoSekolah ? (
              <img
                src={schoolSettings.logoSekolah}
                alt="Logo Sekolah"
                referrerPolicy="no-referrer"
                className="w-14 h-14 object-contain rounded-2xl bg-gray-50 p-1 border border-gray-200/60 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#1565C0]/5 text-[#1565C0] flex items-center justify-center border border-[#1565C0]/10 shrink-0">
                <span className="material-icons text-2xl">school</span>
              </div>
            )}
            <div className="space-y-1 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 justify-center sm:justify-start">
                <h3 className="font-bold text-gray-900 text-sm">
                  {schoolSettings.namaSekolah || "SMKS Sanjaya Bajawa"}
                </h3>
                {schoolSettings.npsnSekolah && (
                  <span className="text-[9px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100 w-fit mx-auto sm:mx-0">
                    NPSN: {schoolSettings.npsnSekolah}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                {schoolSettings.alamatSekolah || "Bajawa, Flores, NTT"}
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-[11px] text-gray-400 font-semibold pt-1">
                {schoolSettings.emailSekolah && (
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-[13px] text-gray-400">mail</span> {schoolSettings.emailSekolah}
                  </span>
                )}
                {schoolSettings.websiteSekolah && (
                  <span className="flex items-center gap-1 text-[#1565C0] hover:underline">
                    <span className="material-icons text-[13px] text-gray-400">public</span> 
                    <a href={`https://${schoolSettings.websiteSekolah}`} target="_blank" rel="noopener noreferrer">
                      {schoolSettings.websiteSekolah}
                    </a>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {user?.role === "siswa" && renderSiswaDashboard()}
      {user?.role === "pembimbing" && renderPembimbingDashboard()}
      {user?.role === "industri" && renderIndustriDashboard()}
      {user?.role === "admin" && renderAdminDashboard()}
    </div>
  );
};
export default Dashboard;
