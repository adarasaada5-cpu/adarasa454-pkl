import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import { TempatPkl } from "../models/types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, CheckCircle2, AlertCircle, Sparkles, Award, ShieldCheck, Mail, Building } from "lucide-react";
import * as z from "zod";

// Zod Schema for Profile Validation
const profileSchema = z.object({
  name: z.string().min(3, { message: "Nama lengkap minimal 3 karakter" }),
  nisn: z.string().optional(),
  kelas: z.string().optional(),
  tempatPkl: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [placements, setPlacements] = useState<TempatPkl[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      nisn: user?.nisn || "",
      kelas: user?.kelas || "",
      tempatPkl: user?.tempatPkl || "",
    },
  });

  useEffect(() => {
    const fetchPlacements = async () => {
      try {
        const list = await pklService.getTempatPkl();
        setPlacements(list);
      } catch (err) {
        console.error("Error loading placements for profile:", err);
      }
    };
    fetchPlacements();
  }, []);

  // Update form default values when user loads
  useEffect(() => {
    if (user) {
      setValue("name", user.name);
      setValue("nisn", user.nisn || "");
      setValue("kelas", user.kelas || "");
      setValue("tempatPkl", user.tempatPkl || "");
    }
  }, [user, setValue]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setIsSaving(true);
    setSuccessMsg(null);
    try {
      await updateProfile({
        name: data.name,
        nisn: data.nisn || undefined,
        kelas: data.kelas || undefined,
        tempatPkl: data.tempatPkl || undefined,
      });
      setSuccessMsg("Profil Anda berhasil diperbarui secara permanen!");
    } catch (err) {
      console.error("Error updating profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Profil Pengguna</h1>
        <p className="text-xs text-gray-500 mt-1 uppercase font-semibold tracking-wider">
          Kelola rincian identitas dan informasi akademik sistem PKL Anda
        </p>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 text-[#2E7D32] p-4 rounded-xl flex items-center gap-3 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-[#2E7D32]" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        {/* User Badge Banner */}
        <div className="h-28 bg-gradient-to-r from-[#1565C0] to-[#2E7D32] relative">
          <div className="absolute -bottom-10 left-6">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-3xl ring-4 ring-white shadow">
                {user?.name?.substring(0, 1) || "U"}
              </div>
            )}
          </div>
        </div>

        {/* Profile Card Body */}
        <div className="pt-14 p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-[10px] uppercase font-bold text-[#1565C0] tracking-widest bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-md">
              Akses: {user?.role === "siswa" ? "Siswa Praktik" : user?.role === "pembimbing" ? "Guru Pembimbing" : "Super Admin"}
            </span>
            <h3 className="text-lg font-bold text-gray-900 mt-3">{user?.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {user?.email}
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border-t border-gray-100 pt-6" id="form-profile-edit">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Nama Lengkap
              </label>
              <input
                {...register("name")}
                type="text"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
                id="input-profile-name"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            {user?.role === "siswa" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      NISN (Nomor Induk Siswa Nasional)
                    </label>
                    <input
                      {...register("nisn")}
                      type="text"
                      placeholder="Contoh: 0081234567"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
                      id="input-profile-nisn"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                      Kelas & Kompetensi Keahlian
                    </label>
                    <input
                      {...register("kelas")}
                      type="text"
                      placeholder="Contoh: XII TKJ 1"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
                      id="input-profile-kelas"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-[#2E7D32]" /> Penempatan Lokasi Industri (Mitra)
                  </label>
                  <select
                    {...register("tempatPkl")}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-[#1565C0] outline-none transition-all"
                    id="input-profile-tempat"
                  >
                    <option value="">-- Pilih Instansi / Perusahaan --</option>
                    {placements.map((p) => (
                      <option key={p.id} value={p.nama}>
                        {p.nama} ({p.alamat})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="bg-[#1565C0] hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl text-xs transition-all shadow-md hover:shadow-lg flex items-center gap-2 disabled:bg-gray-300"
                id="btn-profile-save"
              >
                {isSaving ? "Menyimpan..." : "Simpan Pembaruan Profil"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
export default Profile;
