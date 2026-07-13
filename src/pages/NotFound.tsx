import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft, Home } from "lucide-react";
import { SCHOOL_NAME } from "../constants";

export const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-center items-center p-6 text-center font-sans">
      <div className="max-w-md flex flex-col items-center">
        {/* Animated Icon badge */}
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-bold text-3xl shadow-md border border-red-100 mb-6 animate-pulse">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <h1 className="text-6xl font-black text-gray-900 tracking-tight">404</h1>
        <h2 className="text-xl font-bold text-gray-800 mt-4">Halaman Tidak Ditemukan</h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Maaf, alamat URL atau halaman yang Anda tuju di sistem PKL SMKS Sanjaya Bajawa tidak tersedia atau telah dipindahkan.
        </p>

        {/* Back navigation buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8 w-full">
          <Link
            to="/dashboard"
            className="w-full inline-flex items-center justify-center gap-2 bg-[#1565C0] hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md hover:shadow-lg"
          >
            <Home className="w-4 h-4" />
            Kembali ke Dashboard
          </Link>
          <Link
            to="/login"
            className="w-full inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 font-semibold py-2.5 px-4 rounded-xl text-xs transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Ke Halaman Login
          </Link>
        </div>

        <div className="mt-12 text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
          {SCHOOL_NAME}
        </div>
      </div>
    </div>
  );
};
export default NotFound;
