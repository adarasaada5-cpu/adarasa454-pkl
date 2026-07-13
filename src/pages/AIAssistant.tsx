import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import {
  Sparkles,
  Send,
  Brain,
  FileText,
  Clock,
  UserX,
  PlusCircle,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  TrendingUp,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export const AIAssistant: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Halo! Saya adalah **Asisten AI PKL SMKS Sanjaya Bajawa**. Saya siap membantu Anda merangkum jurnal, menganalisis kedisiplinan, melacak pengisian jurnal siswa, serta menyusun draft laporan PKL berdasarkan data terbaru di sistem. Ada yang bisa saya bantu hari ini?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Loaded system data context
  const [students, setStudents] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [placements, setPlacements] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // Load all system data to provide full context to Gemini
  const loadSystemContext = async () => {
    try {
      setLoadingData(true);
      const [allUsers, allJournals, allAttendance, allPlacements, allAssessments] = await Promise.all([
        pklService.getAllUserProfiles(),
        pklService.getJurnal(),
        pklService.getKehadiran(),
        pklService.getTempatPkl(),
        pklService.getPenilaian(),
      ]);

      // Filter only users with role 'siswa'
      const activeStudents = allUsers.filter((u: any) => u.role === "siswa");

      setStudents(activeStudents);
      setJournals(allJournals);
      setAttendance(allAttendance);
      setPlacements(allPlacements);
      setAssessments(allAssessments);
      setDataLoaded(true);
    } catch (error) {
      console.error("Gagal memuat konteks data untuk AI:", error);
      if ((window as any).showToast) {
        (window as any).showToast("Gagal menyinkronkan data dengan AI Assistant.", "error");
      }
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadSystemContext();
  }, []);

  // Auto scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    if ((window as any).showToast) {
      (window as any).showToast("Teks berhasil disalin ke clipboard!", "success");
    }
  };

  const executeAiQuery = async (promptText: string) => {
    if (!promptText.trim()) return;

    // Add user message
    const userMsgId = `u_${Date.now()}`;
    const userMessage: Message = {
      id: userMsgId,
      sender: "user",
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      // Refresh context before making a call to ensure newest edits are present
      await loadSystemContext();

      const response = await fetch("/api/ai/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: promptText,
          context: {
            students,
            journals,
            attendance,
            placements,
            assessments,
          },
        }),
      });

      if (!response.ok) {
        let errMsg = "Gagal menghubungi API AI.";
        try {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
          } else {
            const textResponse = await response.text();
            errMsg = textResponse || `Error ${response.status}: ${response.statusText}`;
          }
        } catch (e) {
          errMsg = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errMsg);
      }

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        throw new Error("Respon dari server tidak valid atau tidak berformat JSON.");
      }

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        sender: "ai",
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error("AI Error:", error);
      const errorMessage: Message = {
        id: `err_${Date.now()}`,
        sender: "ai",
        text: `⚠️ **Error:** ${error.message || "Terjadi kesalahan koneksi ke server AI. Mohon pastikan kunci API telah dikonfigurasi di Settings > Secrets."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    executeAiQuery(inputMessage);
  };

  // Pre-configured task triggers
  const coreTasks = [
    {
      title: "Rangkum Jurnal Siswa",
      description: "Buat rangkuman capaian, kegiatan harian, dan kendala utama siswa.",
      icon: <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      prompt: "Rangkum jurnal kegiatan siswa yang telah dikirimkan, kelompokkan berdasarkan jenis kegiatannya dan sebutkan kendala/solusi penting yang perlu saya perhatikan.",
    },
    {
      title: "Analisis Kedisiplinan",
      description: "Evaluasi tingkat kehadiran, keterlambatan, dan keaktifan jurnal.",
      icon: <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      prompt: "Analisis kedisiplinan seluruh siswa berdasarkan rekaman absensi (alpa, sakit, izin, terlambat) serta ketepatan waktu pengisian jurnal harian mereka.",
    },
    {
      title: "Belum Isi Jurnal Hari Ini",
      description: "Identifikasi cepat siswa yang lalai mengisi laporan jurnal hari ini.",
      icon: <UserX className="w-5 h-5 text-red-600 dark:text-red-400" />,
      prompt: "Berdasarkan data hari ini (2026-07-08), cari dan sebutkan siapa saja siswa yang belum membuat atau mengisi jurnal kegiatan hari ini.",
    },
    {
      title: "Draft Laporan Guru",
      description: "Susun naskah laporan bimbingan PKL berkala secara otomatis.",
      icon: <PlusCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
      prompt: "Buat draft laporan berkala guru pembimbing PKL yang profesional untuk koordinator PKL sekolah, merangkum performa siswa, tingkat kehadiran, kendala di lapangan, serta saran tindak lanjut bimbingan.",
    },
  ];

  // Specific preset questions
  const presetQuestions = [
    "Siapa yang belum mengisi jurnal hari ini?",
    "Berapa siswa yang belum dinilai?",
    "Industri mana yang belum mengisi penilaian?",
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Panel */}
      <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl shadow-sm">
            <Brain className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
              Asisten AI PKL
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full flex items-center gap-1 uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Gemini 3.5
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Optimalkan monitoring dan laporan PKL siswa dengan dukungan analisis cerdas berbasis AI.
            </p>
          </div>
        </div>

        {/* Sync Data Indicator */}
        <div className="flex items-center gap-3">
          <button
            onClick={loadSystemContext}
            disabled={loadingData}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all border border-gray-200/50 dark:border-gray-750"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? "animate-spin text-blue-600" : ""}`} />
            {loadingData ? "Menyinkronkan..." : "Sinkronkan Data PKL"}
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${dataLoaded ? "bg-green-500 animate-pulse" : "bg-amber-500"}`}></span>
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              {dataLoaded ? "Konteks Siap" : "Memuat data..."}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Core Capability Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {coreTasks.map((task, i) => (
          <button
            key={i}
            onClick={() => executeAiQuery(task.prompt)}
            disabled={loading || !dataLoaded}
            className="text-left bg-white dark:bg-[#111827] hover:bg-gray-50 dark:hover:bg-gray-800/80 p-5 rounded-2xl border border-gray-100 dark:border-gray-850 hover:border-blue-200 dark:hover:border-blue-900 transition-all shadow-sm hover:shadow-md group flex flex-col justify-between h-40 relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-750 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 group-hover:border-blue-100 dark:group-hover:border-blue-900 transition-all">
                {task.icon}
              </div>
              <Sparkles className="w-4 h-4 text-gray-200 dark:text-gray-700 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {task.title}
              </h3>
              <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Main UI: Chat & Presets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Preset Questions Panel */}
        <div className="lg:col-span-4 space-y-4 flex flex-col h-full justify-start">
          <div className="bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-widest flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-500" /> Pertanyaan Populer
            </h2>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Pilih pertanyaan siap pakai di bawah ini untuk menganalisis data PKL secara langsung:
            </p>
            <div className="flex flex-col gap-2 pt-1">
              {presetQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => executeAiQuery(q)}
                  disabled={loading || !dataLoaded}
                  className="text-left px-4 py-3 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 bg-gray-50 dark:bg-gray-800/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 border border-gray-100 dark:border-gray-750 hover:border-blue-100 dark:hover:border-blue-900 rounded-xl transition-all flex items-center justify-between group"
                >
                  <span className="flex-1 pr-2">{q}</span>
                  <Send className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-500 dark:text-blue-400 transition-all shrink-0 translate-x-1 group-hover:translate-x-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Context Summary Status */}
          <div className="bg-gradient-to-br from-blue-50/60 to-emerald-50/20 dark:from-gray-900 dark:to-gray-900/60 rounded-2xl border border-blue-50/30 dark:border-gray-800 p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-extrabold text-gray-800 dark:text-gray-200 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" /> Status Database PKL
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white dark:bg-[#1f2937]/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800">
                <span className="block text-lg font-black text-blue-600 dark:text-blue-400">{students.length}</span>
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Siswa Aktif</span>
              </div>
              <div className="bg-white dark:bg-[#1f2937]/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800">
                <span className="block text-lg font-black text-emerald-600 dark:text-emerald-400">{journals.length}</span>
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Total Jurnal</span>
              </div>
              <div className="bg-white dark:bg-[#1f2937]/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800">
                <span className="block text-lg font-black text-purple-600 dark:text-purple-400">{placements.length}</span>
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Mitra Industri</span>
              </div>
              <div className="bg-white dark:bg-[#1f2937]/50 rounded-xl p-2.5 border border-gray-100 dark:border-gray-800">
                <span className="block text-lg font-black text-amber-600 dark:text-amber-400">{assessments.length}</span>
                <span className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Sudah Dinilai</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chat Conversation Box */}
        <div className="lg:col-span-8 bg-white dark:bg-[#111827] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col h-[520px] overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                <Sparkles className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-gray-800 dark:text-gray-100">Live Workspace AI</h3>
                <span className="text-[9px] text-green-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Terhubung ke Jurnal & Absensi
                </span>
              </div>
            </div>

            {/* Clear Conversation Option */}
            <button
              onClick={() => {
                setMessages([
                  {
                    id: "welcome_reset",
                    sender: "ai",
                    text: "Halo kembali! Riwayat obrolan telah dibersihkan. Ada yang bisa saya analisis kembali?",
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  },
                ]);
              }}
              className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase tracking-wider transition-colors"
            >
              Reset Obrolan
            </button>
          </div>

          {/* Messages Display */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.map((msg) => {
              const isAi = msg.sender === "ai";
              return (
                <div key={msg.id} className={`flex ${isAi ? "justify-start" : "justify-end"} items-start gap-2.5`}>
                  {isAi && (
                    <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm mt-1">
                      <Brain className="w-4 h-4" />
                    </div>
                  )}

                  <div className="flex flex-col max-w-[85%]">
                    <div
                      className={`rounded-2xl px-4 py-3 text-xs leading-relaxed border shadow-sm ${
                        isAi
                          ? "bg-gray-50/50 dark:bg-gray-800/40 text-gray-800 dark:text-gray-200 border-gray-100 dark:border-gray-800 prose dark:prose-invert"
                          : "bg-blue-600 text-white border-blue-600 dark:border-blue-700"
                      }`}
                    >
                      {/* Render simple custom markdown representation */}
                      <div className="whitespace-pre-line space-y-2">
                        {renderMessageText(msg.text)}
                      </div>

                      {/* AI Utilities Bar (Copy to Clipboard) */}
                      {isAi && (
                        <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-end">
                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="flex items-center gap-1 text-[9px] font-bold text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 uppercase tracking-widest transition-colors"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-green-500" /> Tersalin!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Salin Teks
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[8px] font-semibold text-gray-400 mt-1 px-1.5 ${
                        isAi ? "text-left" : "text-right"
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Loader animation when AI is processing */}
            {loading && (
              <div className="flex justify-start items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm animate-spin">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="bg-gray-50/50 dark:bg-gray-800/40 rounded-2xl px-5 py-3 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                    Asisten AI sedang berpikir & menganalisis...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <form
            onSubmit={handleSend}
            className="p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-850/10 flex gap-2 items-center"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={loading || !dataLoaded}
              placeholder={
                dataLoaded
                  ? "Tanyakan apa saja kepada AI, atau pilih preset di kiri..."
                  : "Menghubungkan data..."
              }
              className="flex-1 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-750 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-4 py-2.5 text-xs transition-all outline-none dark:text-white placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim() || !dataLoaded}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:dark:bg-gray-800 text-white disabled:text-gray-400 dark:disabled:text-gray-600 font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-md hover:shadow-lg"
            >
              <span>Kirim</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Helper function to render primitive markdown styling natively (bold and italic elements)
function renderMessageText(text: string) {
  if (!text) return null;

  // Split lines
  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    // Process markdown headers
    if (line.startsWith("### ")) {
      return (
        <h4 key={lineIdx} className="text-xs font-black text-gray-800 dark:text-white mt-3 mb-1 uppercase tracking-wider">
          {line.substring(4)}
        </h4>
      );
    }
    if (line.startsWith("## ")) {
      return (
        <h3 key={lineIdx} className="text-sm font-black text-blue-600 dark:text-blue-400 mt-4 mb-2">
          {line.substring(3)}
        </h3>
      );
    }
    if (line.startsWith("# ")) {
      return (
        <h2 key={lineIdx} className="text-base font-black text-blue-700 dark:text-blue-300 mt-4 mb-2">
          {line.substring(2)}
        </h2>
      );
    }

    // Process bold text elements
    let parts: React.ReactNode[] = [];
    let currentText = line;
    let index = 0;

    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;

    while ((match = boldRegex.exec(currentText)) !== null) {
      if (match.index > lastIndex) {
        parts.push(currentText.substring(lastIndex, match.index));
      }
      parts.push(
        <strong key={index++} className="font-bold text-gray-900 dark:text-white">
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }

    if (lastIndex < currentText.length) {
      parts.push(currentText.substring(lastIndex));
    }

    // Render bullet points nicely
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const isBullet = line.trim().substring(2);
      return (
        <div key={lineIdx} className="flex items-start gap-1.5 ml-3 my-1">
          <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
          <span className="flex-1">{isBullet}</span>
        </div>
      );
    }

    return (
      <p key={lineIdx} className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed my-0.5">
        {parts.length > 0 ? parts : line}
      </p>
    );
  });
}
