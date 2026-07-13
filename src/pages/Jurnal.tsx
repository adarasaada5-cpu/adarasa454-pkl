import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import { JurnalEntry } from "../models/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, CheckCircle2, AlertCircle, Calendar, PlusCircle, HelpCircle, Camera, Trash2, X } from "lucide-react";
import * as z from "zod";

// Zod Schema for Jurnal Validation
const journalSchema = z.object({
  tanggal: z.string().min(1, { message: "Tanggal wajib diisi" }),
  kegiatan: z
    .string()
    .min(15, { message: "Deskripsi kegiatan minimal harus 15 karakter agar informatif" })
    .max(1000, { message: "Maksimal 1000 karakter" }),
  kendala: z
    .string()
    .min(5, { message: "Tulis kendala minimal 5 karakter (atau tulis 'Tidak ada kendala' jika lancar)" }),
  solusi: z
    .string()
    .min(5, { message: "Tulis solusi minimal 5 karakter (atau tulis 'Tidak ada' jika tidak berkendala)" }),
});

type JournalFormValues = z.infer<typeof journalSchema>;

export const Jurnal: React.FC = () => {
  const { user } = useAuth();
  const [journals, setJournals] = useState<JurnalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States for Photo Upload
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState<string>("");
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JournalFormValues>({
    resolver: zodResolver(journalSchema),
    defaultValues: {
      tanggal: todayStr,
      kegiatan: "",
      kendala: "",
      solusi: "",
    },
  });

  const loadJournals = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const list = await pklService.getJurnal(user.uid);
      setJournals(list);
    } catch (err) {
      console.error("Error loading journals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJournals();
  }, [user]);

  // Photo Handling Handlers
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processPhoto(file);
  };

  const processPhoto = (file: File) => {
    if (!file.type.startsWith("image/")) {
      if ((window as any).showToast) {
        (window as any).showToast("Format file harus berupa gambar (JPEG, PNG, dll)!", "error");
      }
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      if ((window as any).showToast) {
        (window as any).showToast("Ukuran foto tidak boleh melebihi 2MB!", "error");
      }
      return;
    }

    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhoto(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processPhoto(e.dataTransfer.files[0]);
    }
  };

  const onSubmit = async (data: JournalFormValues) => {
    if (!user) return;
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      // Check if journal for this date already exists
      const alreadyExists = journals.some((j) => j.tanggal === data.tanggal);
      if (alreadyExists) {
        throw new Error(`Jurnal untuk tanggal ${data.tanggal} sudah dikirim sebelumnya.`);
      }

      await pklService.createJurnal({
        userId: user.uid,
        userName: user.name,
        tanggal: data.tanggal,
        kegiatan: data.kegiatan,
        kendala: data.kendala,
        solusi: data.solusi,
        fotoUrl: photo || undefined,
      });

      if ((window as any).showToast) {
        (window as any).showToast("Laporan Jurnal Harian berhasil diserahkan untuk ditinjau!", "success");
      }
      reset({
        tanggal: todayStr,
        kegiatan: "",
        kendala: "",
        solusi: "",
      });
      setPhoto(null);
      setPhotoName("");
      await loadJournals();
    } catch (err: any) {
      if ((window as any).showToast) {
        (window as any).showToast(err?.message || "Gagal mengirim jurnal harian.", "error");
      }
    }
  };

  if (loading && journals.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
          </div>
          <div className="lg:col-span-7 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Jurnal Harian Praktik</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase font-semibold tracking-wider">
          Laporkan deskripsi tugas, kendala lapangan, dan penyelesaian harian Anda
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Panel */}
        <div className="lg:col-span-5 bg-white dark:bg-[#111827] p-6 rounded-2xl border border-gray-200/60 dark:border-gray-800/80 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-5 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-[#1565C0] dark:text-[#60A5FA]" /> Buat Laporan Jurnal Baru
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" id="form-jurnal">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Tanggal Kegiatan
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  {...register("tanggal")}
                  type="date"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
                  id="input-jurnal-tanggal"
                />
              </div>
              {errors.tanggal && (
                <p className="text-xs text-red-500 mt-1">{errors.tanggal.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Deskripsi Kegiatan Pekerjaan
              </label>
              <textarea
                {...register("kegiatan")}
                placeholder="Rincian lengkap pekerjaan harian. Contoh: Melakukan penarikan kabel fiber optik sejauh 50 meter dari tiang distribusi, mengupas core kabel, melakukan splicing optik, serta menguji sinyal dbm menggunakan OPM."
                className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all h-28 resize-none"
                id="input-jurnal-kegiatan"
              />
              {errors.kegiatan && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.kegiatan.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Kendala Lapangan yang Dihadapi
              </label>
              <textarea
                {...register("kendala")}
                placeholder="Contoh: Terjadi redaman sinyal yang terlalu tinggi pada core no 3 (mencapai -28dbm) atau tulis 'Tidak ada kendala'."
                className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all h-20 resize-none"
                id="input-jurnal-kendala"
              />
              {errors.kendala && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.kendala.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Solusi / Penyelesaian Masalah
              </label>
              <textarea
                {...register("solusi")}
                placeholder="Contoh: Membersihkan ujung konektor pigtail dengan tisu alkohol khusus dan melakukan pemotongan ulang fiber optik untuk splicing ulang agar redaman turun menjadi -19dbm."
                className="w-full bg-gray-50 border border-gray-200/80 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all h-20 resize-none"
                id="input-jurnal-solusi"
              />
              {errors.solusi && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errors.solusi.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Foto Dokumentasi Kegiatan (Opsional)
              </label>
              
              {!photo ? (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                    dragActive
                      ? "border-[#1565C0] bg-blue-50/20"
                      : "border-gray-200 bg-gray-50/50 hover:bg-white hover:border-gray-300"
                  }`}
                  onClick={() => document.getElementById("file-photo-jurnal")?.click()}
                >
                  <input
                    type="file"
                    id="file-photo-jurnal"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    <Camera className="w-7 h-7 text-gray-400" />
                    <div>
                      <p className="text-xs font-bold text-gray-700">Pilih atau Seret Foto Kegiatan</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">JPEG, PNG, atau WebP (Maks. 2MB)</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative border border-gray-200 rounded-xl p-2.5 bg-gray-50 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg bg-gray-100 border overflow-hidden shrink-0">
                    <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{photoName || "dokumentasi_jurnal.jpg"}</p>
                    <p className="text-[10px] text-green-600 font-semibold mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Terlampir & siap dikirim
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoName("");
                    }}
                    className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors border border-transparent hover:border-red-150"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full bg-[#1565C0] hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md hover:shadow-lg mt-4"
              id="btn-jurnal-submit"
            >
              Kirim Jurnal Harian
            </button>
          </form>
        </div>

        {/* History Panel */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#2E7D32]" /> Riwayat Laporan Jurnal Harian
            </h3>

            {journals.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-35" />
                <p className="text-xs font-semibold">Belum Ada Jurnal Terdaftar</p>
                <p className="text-[10px] text-gray-400 mt-1">Kirim rincian kegiatan Anda hari ini menggunakan formulir kiri.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {journals.map((j) => (
                  <div
                    key={j.id}
                    className="p-4 rounded-2xl border border-gray-150 bg-gray-50/50 hover:bg-white transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        {j.tanggal}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase px-2.5 py-1 rounded-full ${
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

                    <div className="mt-3.5 space-y-2">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Kegiatan Pekerjaan</p>
                        <p className="text-xs text-gray-700 mt-0.5 whitespace-pre-line">{j.kegiatan}</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Kendala Lapangan</p>
                          <p className="text-xs text-gray-600 mt-0.5 italic">{j.kendala || "-"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Solusi Penyelesaian</p>
                          <p className="text-xs text-gray-600 mt-0.5">{j.solusi || "-"}</p>
                        </div>
                      </div>

                      {j.fotoUrl && (
                        <div className="pt-2.5 border-t border-gray-100 mt-2">
                          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1.5">Foto Kegiatan</p>
                          <div 
                            className="relative group overflow-hidden rounded-xl border border-gray-250 bg-gray-100 max-w-xs cursor-pointer"
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

                    {/* Pembimbing comment feedback */}
                    {j.pembimbingComment && (
                      <div className="mt-3 pt-3 border-t border-gray-150 bg-green-50/40 p-2.5 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-green-800 tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
                          Umpan Balik Guru Pembimbing
                        </p>
                        <p className="text-xs text-[#2E7D32] mt-1 font-medium italic">
                          "{j.pembimbingComment}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

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
export default Jurnal;
