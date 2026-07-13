import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import { uploadFile } from "../firebase/storage";
import { UserProfile, TeacherNote, TeacherNoteCategory, TeacherNoteStatus } from "../models/types";
import { 
  FileText, 
  Search, 
  Plus, 
  Filter, 
  Calendar, 
  Tag, 
  ShieldAlert, 
  Paperclip, 
  Download, 
  Trash2, 
  Pencil, 
  Eye, 
  X, 
  AlertCircle, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  Upload,
  User,
  Activity,
  Award,
  AlertOctagon,
  Users,
  MessageCircle,
  Clock
} from "lucide-react";

export const CatatanPembimbing: React.FC = () => {
  const { user } = useAuth();
  
  // State
  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [studentFilter, setStudentFilter] = useState<string>("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Form Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Selected notes for editing/viewing/deleting
  const [selectedNote, setSelectedNote] = useState<TeacherNote | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<TeacherNote | null>(null);
  
  // Form Fields
  const [formStudentId, setFormStudentId] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<TeacherNoteCategory>("Monitoring");
  const [formStatus, setFormStatus] = useState<TeacherNoteStatus>("Baik");
  const [formContent, setFormContent] = useState("");
  const [formAttachment, setFormAttachment] = useState<File | null>(null);
  const [existingAttachmentUrl, setExistingAttachmentUrl] = useState<string | null>(null);
  const [existingAttachmentName, setExistingAttachmentName] = useState<string | null>(null);
  
  // Toast notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load students and notes
  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // Load all profiles
      const allProfiles = await pklService.getAllUserProfiles();
      
      // Filter to get only students (role = 'siswa')
      let studentProfiles = allProfiles.filter(p => p.role === "siswa");
      
      // If user is a teacher (pembimbing), they can only select/see their bimbingan students
      if (user.role === "pembimbing") {
        studentProfiles = studentProfiles.filter(p => p.pembimbingId === user.uid);
      }
      setStudents(studentProfiles);

      // Load notes
      // Admin sees everything, pembimbing only sees their own notes
      const notesList = await pklService.getTeacherNotes(user.role, user.uid);
      setNotes(notesList);
    } catch (err) {
      console.error("Gagal memuat data catatan pembimbing:", err);
      showToast("Gagal memuat data dari database", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Helper to show custom toasts
  const showToast = (msg: string, severity: "success" | "error") => {
    if (severity === "success") {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  // Drag and drop attachment handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFormAttachment(e.dataTransfer.files[0]);
    }
  };

  // Form submit (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!formStudentId) {
      showToast("Silakan pilih siswa terlebih dahulu.", "error");
      return;
    }
    if (!formTitle.trim()) {
      showToast("Silakan masukkan judul catatan.", "error");
      return;
    }
    if (!formContent.trim()) {
      showToast("Silakan masukkan isi catatan.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // 1. Find student profile to populate name and class
      const targetStudent = students.find(s => s.uid === formStudentId);
      if (!targetStudent) {
        showToast("Siswa tidak valid.", "error");
        return;
      }

      // 2. Upload file if exist
      let attachmentUrl = existingAttachmentUrl;
      let attachmentName = existingAttachmentName;

      if (formAttachment) {
        setUploadProgress(true);
        try {
          attachmentUrl = await uploadFile(formAttachment, "teacher_notes_attachments");
          attachmentName = formAttachment.name;
        } catch (storageErr) {
          console.error("Gagal mengunggah file:", storageErr);
          showToast("Gagal mengunggah file lampiran.", "error");
          setUploadProgress(false);
          setIsSubmitting(false);
          return;
        }
        setUploadProgress(false);
      }

      const noteData = {
        studentId: formStudentId,
        studentName: targetStudent.name,
        studentClass: targetStudent.kelas || "Tidak Diketahui",
        teacherId: selectedNote ? selectedNote.teacherId : user.uid,
        teacherName: selectedNote ? selectedNote.teacherName : (user.name || "Guru Pembimbing"),
        title: formTitle,
        category: formCategory,
        status: formStatus,
        content: formContent,
        tanggal: formDate,
        attachmentUrl,
        attachmentName,
        createdBy: selectedNote ? selectedNote.createdBy : user.uid,
      };

      if (selectedNote) {
        // Update existing note
        await pklService.updateTeacherNote(selectedNote.id, noteData);
        showToast("Catatan berhasil diperbarui!", "success");
      } else {
        // Create new note
        await pklService.createTeacherNote(noteData);
        showToast("Catatan baru berhasil disimpan!", "success");
      }

      // Reset form & reload
      closeForm();
      loadData();
    } catch (err) {
      console.error("Gagal menyimpan catatan:", err);
      showToast("Gagal menyimpan catatan bimbingan.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Soft delete note execution
  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    try {
      await pklService.deleteTeacherNote(noteToDelete.id);
      showToast("Catatan berhasil dihapus.", "success");
      setIsDeleteOpen(false);
      setNoteToDelete(null);
      loadData();
    } catch (err) {
      console.error("Gagal menghapus catatan:", err);
      showToast("Gagal menghapus catatan bimbingan.", "error");
    }
  };

  // Open form for writing a new note
  const openNewForm = () => {
    setSelectedNote(null);
    setFormStudentId("");
    setFormTitle("");
    setFormCategory("Monitoring");
    setFormStatus("Baik");
    setFormContent("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormAttachment(null);
    setExistingAttachmentUrl(null);
    setExistingAttachmentName(null);
    setIsFormOpen(true);
  };

  // Open form for editing a note
  const openEditForm = (note: TeacherNote) => {
    setSelectedNote(note);
    setFormStudentId(note.studentId);
    setFormTitle(note.title);
    setFormCategory(note.category);
    setFormStatus(note.status);
    setFormContent(note.content);
    setFormDate(note.tanggal || note.createdAt.split("T")[0]);
    setFormAttachment(null);
    setExistingAttachmentUrl(note.attachmentUrl);
    setExistingAttachmentName(note.attachmentName);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedNote(null);
  };

  // View Details helper
  const openDetails = (note: TeacherNote) => {
    setSelectedNote(note);
    setIsDetailOpen(true);
  };

  // Soft Delete Trigger helper
  const triggerDelete = (note: TeacherNote) => {
    setNoteToDelete(note);
    setIsDeleteOpen(true);
  };

  // Category Theme Mapping
  const getCategoryIcon = (category: TeacherNoteCategory) => {
    switch (category) {
      case "Monitoring": return <Activity className="w-4 h-4" />;
      case "Prestasi": return <Award className="w-4 h-4" />;
      case "Pelanggaran": return <ShieldAlert className="w-4 h-4" />;
      case "Konseling": return <MessageCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getCategoryStyles = (category: TeacherNoteCategory) => {
    switch (category) {
      case "Monitoring": return "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200/50";
      case "Prestasi": return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/50";
      case "Pelanggaran": return "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-200/50";
      case "Konseling": return "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/50";
      default: return "bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 border border-slate-200/50";
    }
  };

  const getStatusBadge = (status: TeacherNoteStatus) => {
    switch (status) {
      case "Sangat Baik":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400">Sangat Baik</span>;
      case "Baik":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/30 dark:text-sky-400">Baik</span>;
      case "Cukup":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400">Cukup</span>;
      case "Perlu Pembinaan":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">Perlu Pembinaan</span>;
      case "Kritis":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 animate-pulse">Kritis</span>;
      default:
        return null;
    }
  };

  // Query and Filtering Logic
  const filteredNotes = notes.filter(note => {
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = 
      note.studentName.toLowerCase().includes(searchLower) ||
      note.title.toLowerCase().includes(searchLower) ||
      note.teacherName.toLowerCase().includes(searchLower) ||
      note.content.toLowerCase().includes(searchLower);
    
    const matchCategory = categoryFilter === "" || note.category === categoryFilter;
    const matchStatus = statusFilter === "" || note.status === statusFilter;
    const matchStudent = studentFilter === "" || note.studentId === studentFilter;

    return matchSearch && matchCategory && matchStatus && matchStudent;
  });

  // Pagination calculation
  const totalItems = filteredNotes.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredNotes.slice(indexOfFirstItem, indexOfLastItem);

  // Auto-reset page when filtering changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, statusFilter, studentFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" id="catatan_pembimbing_page">
      
      {/* Toast Feedbacks */}
      {successMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500 text-white rounded-xl shadow-lg animate-bounce" id="toast_success">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-red-500 text-white rounded-xl shadow-lg animate-bounce" id="toast_error">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Header section with minimal branding */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            Catatan Perkembangan Siswa (Pembimbing)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Modul pengawasan, bimbingan konseling, monitoring, dan pencatatan prestasi siswa PKL Sanjaya Bajawa.
          </p>
        </div>
        
        {/* Create new note button */}
        <button
          onClick={openNewForm}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all active:scale-95 text-sm"
          id="btn_add_catatan"
        >
          <Plus className="w-4 h-4" />
          Buat Catatan Baru
        </button>
      </div>

      {/* Dynamic Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-indigo-400">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Total Catatan</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">{notes.length}</p>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Catatan Prestasi</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">
              {notes.filter(n => n.category === "Prestasi").length}
            </p>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Catatan Pelanggaran</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">
              {notes.filter(n => n.category === "Pelanggaran").length}
            </p>
          </div>
        </div>
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Konseling</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">
              {notes.filter(n => n.category === "Konseling").length}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/50 p-4 shadow-sm space-y-4" id="search_filters_section">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Cari berdasarkan nama siswa, judul, guru, atau konten..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all dark:text-white"
            />
          </div>

          <div className="flex flex-wrap md:flex-nowrap gap-2">
            {/* Student Filter */}
            <div className="relative">
              <select
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                className="appearance-none bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-800 rounded-xl py-2.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-700 dark:text-gray-300 min-w-[150px]"
              >
                <option value="">Semua Siswa</option>
                {students.map((student) => (
                  <option key={student.uid} value={student.uid}>{student.name}</option>
                ))}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Category filter */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-800 rounded-xl py-2.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-700 dark:text-gray-300"
              >
                <option value="">Semua Kategori</option>
                <option value="Monitoring">Monitoring</option>
                <option value="Prestasi">Prestasi</option>
                <option value="Pelanggaran">Pelanggaran</option>
                <option value="Konseling">Konseling</option>
                <option value="Lainnya">Lainnya</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Tag className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Status Filter */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-gray-50 dark:bg-gray-800/50 border border-gray-200/80 dark:border-gray-800 rounded-xl py-2.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-gray-700 dark:text-gray-300"
              >
                <option value="">Semua Status</option>
                <option value="Sangat Baik">Sangat Baik</option>
                <option value="Baik">Baik</option>
                <option value="Cukup">Cukup</option>
                <option value="Perlu Pembinaan">Perlu Pembinaan</option>
                <option value="Kritis">Kritis</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Filter className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Main Listing in Card Bento Layout */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4" id="loading_spinner">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
          <p className="text-gray-500 text-sm">Sedang memuat data catatan...</p>
        </div>
      ) : currentItems.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-12 text-center rounded-2xl shadow-sm" id="empty_state">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500 mb-4">
            <FileText className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Tidak ada Catatan Ditemukan</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-md mx-auto">
            Tidak ada catatan bimbingan atau hasil monitoring yang cocok dengan penyaringan yang Anda lakukan.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="notes_grid">
            {currentItems.map((note) => {
              const borderAccentColor = 
                note.category === "Prestasi" ? "border-t-4 border-t-emerald-500" :
                note.category === "Pelanggaran" ? "border-t-4 border-t-red-500" :
                note.category === "Konseling" ? "border-t-4 border-t-amber-500" :
                "border-t-4 border-t-indigo-500";

              return (
                <div
                  key={note.id}
                  className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden relative ${borderAccentColor}`}
                  id={`note_card_${note.id}`}
                >
                  {/* Card Header Profile */}
                  <div className="p-5 border-b border-gray-50 dark:border-gray-800/50">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-slate-600 dark:text-gray-300">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-gray-800 dark:text-white line-clamp-1">{note.studentName}</h4>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{note.studentClass}</span>
                        </div>
                      </div>
                      
                      {/* Status badge */}
                      {getStatusBadge(note.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {/* Category chip */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${getCategoryStyles(note.category)}`}>
                        {getCategoryIcon(note.category)}
                        {note.category}
                      </span>
                      
                      {/* Date Indicator */}
                      <span className="inline-flex items-center gap-1 text-[11px] text-gray-400 ml-auto font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(note.tanggal || note.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                  </div>

                  {/* Card Content body */}
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-gray-800 dark:text-white text-base leading-snug line-clamp-1 mb-2">
                      {note.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed flex-1 line-clamp-4">
                      {note.content}
                    </p>

                    {/* Attachment preview if any */}
                    {note.attachmentUrl && (
                      <div className="mt-4 p-2 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400">
                        <div className="flex items-center gap-2 overflow-hidden mr-2">
                          <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="font-medium truncate">{note.attachmentName || "Lampiran"}</span>
                        </div>
                        <a
                          href={note.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          referrerPolicy="no-referrer"
                          className="p-1 rounded-lg hover:bg-white dark:hover:bg-gray-800 text-indigo-600 dark:text-indigo-400 flex-shrink-0 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Card Actions Footer */}
                  <div className="px-5 py-3.5 bg-gray-50/50 dark:bg-gray-800/10 border-t border-gray-50 dark:border-gray-800/50 flex items-center justify-between gap-2 mt-auto text-xs">
                    <span className="text-[10px] text-gray-400 italic">
                      Oleh: {note.teacherName}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openDetails(note)}
                        className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 dark:text-indigo-400 transition-all hover:scale-105"
                        title="Lihat Rincian"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      
                      {/* Teacher can edit/delete their own, admin can edit/delete any */}
                      {(user.role === "admin" || note.teacherId === user.uid) && (
                        <>
                          <button
                            onClick={() => openEditForm(note)}
                            className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 dark:text-amber-400 transition-all hover:scale-105"
                            title="Ubah Catatan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => triggerDelete(note)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:text-red-400 transition-all hover:scale-105"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-6" id="pagination_bar">
              <span className="text-xs text-gray-500 font-medium">
                Menampilkan <span className="font-bold text-gray-700 dark:text-gray-300">{indexOfFirstItem + 1}</span> - <span className="font-bold text-gray-700 dark:text-gray-300">{Math.min(indexOfLastItem, totalItems)}</span> dari <span className="font-bold text-gray-700 dark:text-gray-300">{totalItems}</span> catatan
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="p-2 border border-gray-200/80 dark:border-gray-800 rounded-xl text-gray-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                      currentPage === page
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "border border-gray-200/80 dark:border-gray-800 text-gray-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="p-2 border border-gray-200/80 dark:border-gray-800 rounded-xl text-gray-600 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE & EDIT FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity" id="form_modal">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-xl shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                {selectedNote ? "Ubah Catatan Perkembangan" : "Buat Catatan Baru"}
              </h2>
              <button
                onClick={closeForm}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1">
              {/* Student Dropdown selector */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Siswa PKL
                </label>
                <select
                  required
                  value={formStudentId}
                  onChange={(e) => setFormStudentId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                >
                  <option value="">-- Pilih Siswa --</option>
                  {students.map((student) => (
                    <option key={student.uid} value={student.uid}>
                      {student.name} ({student.kelas || "Tanpa Kelas"})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  {user?.role === "pembimbing" 
                    ? "* Menampilkan siswa yang dibimbing oleh Anda." 
                    : "* Menampilkan semua siswa terdaftar di database."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Input */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Tanggal Catatan
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                    />
                  </div>
                </div>

                {/* Category Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Kategori Catatan
                  </label>
                  <select
                    required
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as TeacherNoteCategory)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                  >
                    <option value="Monitoring">Monitoring</option>
                    <option value="Prestasi">Prestasi</option>
                    <option value="Pelanggaran">Pelanggaran</option>
                    <option value="Konseling">Konseling</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
              </div>

              {/* Status & Title Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status selector */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Status Perkembangan
                  </label>
                  <select
                    required
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as TeacherNoteStatus)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                  >
                    <option value="Sangat Baik">Sangat Baik</option>
                    <option value="Baik">Baik</option>
                    <option value="Cukup">Cukup</option>
                    <option value="Perlu Pembinaan">Perlu Pembinaan</option>
                    <option value="Kritis">Kritis</option>
                  </select>
                </div>

                {/* Title */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                    Judul Catatan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Hambatan instalasi LAN, Prestasi koding..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white"
                  />
                </div>
              </div>

              {/* Note Content Textarea */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Isi Catatan Pembimbing
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Tuliskan catatan perkembangan secara detail disini..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:text-white font-sans leading-relaxed"
                />
              </div>

              {/* Attachment File Input Drag and Drop */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  Dokumen / Foto Lampiran (Opsional)
                </label>
                
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl p-4 text-center cursor-pointer bg-gray-50 dark:bg-gray-800/20 hover:bg-indigo-50/10 transition-colors"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setFormAttachment(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <Upload className="w-6 h-6 text-indigo-500 mx-auto mb-1.5" />
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {formAttachment ? formAttachment.name : "Seret & lepas berkas, atau klik untuk memilih"}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Format dokumen yang diizinkan (PDF, PNG, JPG, JPEG)
                  </p>
                </div>

                {existingAttachmentUrl && !formAttachment && (
                  <div className="mt-2 p-2 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900 rounded-xl flex items-center justify-between text-xs text-indigo-700 dark:text-indigo-400">
                    <span className="truncate flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5" />
                      Ada lampiran: {existingAttachmentName || "Lampiran"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setExistingAttachmentUrl(null);
                        setExistingAttachmentName(null);
                      }}
                      className="p-1 text-red-500 hover:bg-white rounded"
                      title="Hapus lampiran yang sudah ada"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Progress Bar of Upload */}
              {uploadProgress && (
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800 rounded-xl text-xs text-indigo-700 dark:text-indigo-400 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-indigo-600 border-t-transparent"></div>
                  Mengunggah berkas lampiran...
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2.5 border border-gray-200/80 dark:border-gray-800 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors text-sm font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold py-2.5 px-4 rounded-xl shadow-sm hover:shadow-md transition-all text-sm disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
                  {selectedNote ? "Simpan Perubahan" : "Simpan Catatan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {isDetailOpen && selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity" id="details_modal">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Rincian Catatan Perkembangan
              </h2>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              {/* Header profile details info */}
              <div className="p-4 bg-slate-50 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center font-bold">
                    {selectedNote.studentName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base">{selectedNote.studentName}</h3>
                    <p className="text-xs text-gray-500 font-medium">{selectedNote.studentClass}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-200/50 dark:border-gray-800 pt-3 text-xs">
                  <div>
                    <p className="text-gray-400">Guru Pembimbing</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{selectedNote.teacherName}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Tanggal Catatan</p>
                    <p className="font-semibold text-gray-700 dark:text-gray-300 mt-0.5">
                      {new Date(selectedNote.tanggal || selectedNote.createdAt).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status & Category Row */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getCategoryStyles(selectedNote.category)}`}>
                  {getCategoryIcon(selectedNote.category)}
                  Kategori: {selectedNote.category}
                </span>

                <span className="ml-auto flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">Status:</span>
                  {getStatusBadge(selectedNote.status)}
                </span>
              </div>

              {/* Note details */}
              <div className="space-y-2">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  {selectedNote.title}
                </h3>
                <div className="bg-slate-50 dark:bg-gray-800/20 border border-slate-100 dark:border-gray-800/80 rounded-2xl p-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedNote.content}
                </div>
              </div>

              {/* Attachments */}
              {selectedNote.attachmentUrl && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Berkas Lampiran</h4>
                  <div className="p-3 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400">
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      <Paperclip className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium truncate">{selectedNote.attachmentName || "Lampiran"}</span>
                    </div>
                    <a
                      href={selectedNote.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      referrerPolicy="no-referrer"
                      className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-bold transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Unduh Lampiran
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/10 flex items-center justify-end">
              <button
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors text-sm font-semibold shadow-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {isDeleteOpen && noteToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-opacity" id="delete_modal">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 flex items-center justify-center">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Konfirmasi Hapus Catatan</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Apakah Anda yakin ingin menghapus catatan perkambangan siswa <span className="font-semibold text-gray-800 dark:text-white">"{noteToDelete.studentName}"</span>? Tindakan ini bersifat lunak (soft delete) namun akan menyembunyikan catatan dari list monitoring.
                </p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800/50 flex items-center justify-end gap-2.5 bg-gray-50/30 dark:bg-gray-800/5">
              <button
                onClick={() => {
                  setIsDeleteOpen(false);
                  setNoteToDelete(null);
                }}
                className="px-4 py-2.5 border border-gray-200/80 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors text-sm font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteNote}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-xl shadow-sm hover:shadow-md transition-all text-sm font-semibold"
              >
                Hapus Catatan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
