import React from "react";
import { motion } from "motion/react";
import { SCHOOL_NAME } from "../constants";

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-[#F8F9FA] flex flex-col items-center justify-center z-50 p-6">
      <div className="flex flex-col items-center max-w-sm text-center">
        {/* Animated Icon Container */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative w-28 h-28 mb-6 flex items-center justify-center bg-white rounded-3xl shadow-xl border border-gray-100"
        >
          {/* Main Logo Text Badge */}
          <div className="absolute inset-0 flex flex-col items-center justify-center font-bold text-[#1565C0] text-3xl select-none">
            <span className="tracking-widest">SJB</span>
            <span className="text-[10px] uppercase font-semibold text-[#2E7D32] tracking-wider mt-1">
              Bajawa
            </span>
          </div>

          {/* Elegant Circular Glow/Ring Animation */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 border-4 border-t-[#1565C0] border-r-[#2E7D32] border-b-transparent border-l-transparent rounded-3xl"
          />
        </motion.div>

        {/* School / Application Name */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-xl font-bold text-gray-900 tracking-tight"
        >
          PKL SANJAYA BAJAWA
        </motion.h1>

        <motion.p
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 0.7 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-xs font-medium text-gray-500 mt-2 uppercase tracking-widest"
        >
          {SCHOOL_NAME}
        </motion.p>

        {/* Loading Progress Bar */}
        <div className="w-48 h-1.5 bg-gray-200 rounded-full mt-8 overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
            className="w-full h-full bg-gradient-to-r from-[#1565C0] to-[#2E7D32] rounded-full"
          />
        </div>
      </div>
    </div>
  );
};
export default LoadingScreen;
