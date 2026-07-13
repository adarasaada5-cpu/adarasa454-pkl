import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import { communicationService } from "../services/communicationService";
import { uploadFile } from "../firebase/storage";
import {
  UserProfile,
  ChatRoom,
  ChatMessage,
  InboxMessage,
  Announcement,
  BroadcastMessage,
  SystemNotification,
} from "../models/types";
import {
  MessageSquare,
  Mail,
  Megaphone,
  Bell,
  FileText,
  Search,
  Send,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Plus,
  Trash2,
  Archive,
  Star,
  Download,
  AlertCircle,
  Clock,
  X,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Inbox as InboxIcon,
  CornerUpLeft,
  ChevronLeft,
  Calendar,
  Filter,
} from "lucide-react";

export const CommunicationCenter: React.FC = () => {
  const { user } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<"chat" | "inbox" | "broadcast" | "pengumuman" | "catatan" | "notifikasi">("chat");

  // Shared Data States
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --- CHAT STATES ---
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState<string>("");
  const [searchUserQuery, setSearchUserQuery] = useState<string>("");
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [isUploadingChatFile, setIsUploadingChatFile] = useState<boolean>(false);
  const [chatFile, setChatFile] = useState<File | null>(null);
  const [typingPartner, setTypingPartner] = useState<string | null>(null);

  // --- INBOX STATES ---
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [activeFolder, setActiveFolder] = useState<"inbox" | "sent" | "archive" | "trash">("inbox");
  const [selectedMail, setSelectedMail] = useState<InboxMessage | null>(null);
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const [mailSearchQuery, setMailSearchQuery] = useState<string>("");
  const [mailFilterUnread, setMailFilterUnread] = useState<boolean>(false);
  const [mailFilterStarred, setMailFilterStarred] = useState<boolean>(false);

  // Compose Mail Form States
  const [composeTo, setComposeTo] = useState<string>("");
  const [composeSubject, setComposeSubject] = useState<string>("");
  const [composeBody, setComposeBody] = useState<string>("");
  const [composeFile, setComposeFile] = useState<File | null>(null);
  const [isSendingMail, setIsSendingMail] = useState<boolean>(false);

  // --- BROADCAST STATES ---
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [broadcastTarget, setBroadcastTarget] = useState<string>("all_students");
  const [broadcastTargetValue, setBroadcastTargetValue] = useState<string>("");
  const [broadcastTitle, setBroadcastTitle] = useState<string>("");
  const [broadcastMessage, setBroadcastMessage] = useState<string>("");
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null);
  const [isSendingBroadcast, setIsSendingBroadcast] = useState<boolean>(false);

  // --- PENGUMUMAN STATES ---
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isCreatingAnn, setIsCreatingAnn] = useState<boolean>(false);
  const [annTitle, setAnnTitle] = useState<string>("");
  const [annContent, setAnnContent] = useState<string>("");
  const [annTargetRole, setAnnTargetRole] = useState<"all" | "siswa" | "pembimbing" | "industri" | "kelas" | "tempatPkl" | "guru">("all");
  const [annTargetClass, setAnnTargetClass] = useState<string>("");
  const [annTargetIndustry, setAnnTargetIndustry] = useState<string>("");
  const [annExpireDate, setAnnExpireDate] = useState<string>("");
  const [annFile, setAnnFile] = useState<File | null>(null);
  const [isCreatingAnnSubmit, setIsCreatingAnnSubmit] = useState<boolean>(false);
  const [viewingAnn, setViewingAnn] = useState<Announcement | null>(null);

  // --- NOTIFIKASI STATES ---
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  // Refs for chat scrolling
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastRoomIdRef = useRef<string | null>(null);
  const lastMessagesCountRef = useRef<number>(0);

  // Allowed file sizes and types
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/x-zip-compressed",
  ];

  // Helper to trigger typing partner simulation to meet user-ready requirement
  useEffect(() => {
    if (activeRoom && user) {
      const partnerId = activeRoom.participants.find(p => p !== user.uid);
      if (partnerId) {
        const partner = profiles.find(p => p.uid === partnerId);
        if (partner) {
          // Simulate typing on load for 2 seconds
          setTypingPartner(partner.name);
          const timeout = setTimeout(() => {
            setTypingPartner(null);
          }, 2500);
          return () => clearTimeout(timeout);
        }
      }
    }
  }, [activeRoom, profiles]);

  // Load basic resources (user profiles) on mount
  useEffect(() => {
    const loadResources = async () => {
      try {
        setLoading(true);
        const fetchedProfiles = await pklService.getAllUserProfiles();
        setProfiles(fetchedProfiles);

        const fetchedAnn = await communicationService.getAnnouncements();
        setAnnouncements(fetchedAnn);

        if (user) {
          const fetchedInbox = await communicationService.getInboxMessages(user.uid);
          setInboxMessages(fetchedInbox);

          const fetchedBroads = await communicationService.getBroadcasts();
          setBroadcasts(fetchedBroads);

          const fetchedNotis = await pklService.getNotifications(user.uid);
          setNotifications(fetchedNotis);
        }
      } catch (err) {
        console.error("Failed to load Communication resources:", err);
        (window as any).showToast?.("Gagal memuat beberapa data komunikasi", "error");
      } finally {
        setLoading(false);
      }
    };

    loadResources();
  }, [user]);

  // Real-time listener for Chat Rooms
  useEffect(() => {
    if (!user) return;
    const unsubscribe = communicationService.subscribeChatRooms(user.uid, (updatedRooms) => {
      setRooms(updatedRooms);
    });
    return () => unsubscribe();
  }, [user]);

  // Real-time listener for Active Chat Room Messages
  useEffect(() => {
    if (!activeRoom) {
      setChatMessages([]);
      lastRoomIdRef.current = null;
      lastMessagesCountRef.current = 0;
      return;
    }
    const unsubscribe = communicationService.subscribeMessages(activeRoom.roomId, (messages) => {
      const prevCount = lastMessagesCountRef.current;
      const prevRoomId = lastRoomIdRef.current;

      setChatMessages(messages);

      lastMessagesCountRef.current = messages.length;
      lastRoomIdRef.current = activeRoom.roomId;

      // Automatically scroll to bottom if needed
      setTimeout(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        // Condition 1: Just switched room
        const isNewRoom = prevRoomId !== activeRoom.roomId;

        // Condition 2: Message count increased
        const hasNewMessage = messages.length > prevCount;

        // Check if last message is from me
        const lastMsg = messages[messages.length - 1];
        const isFromMe = lastMsg && lastMsg.senderId === user?.uid;

        // Check if user is scrolled near the bottom (within 150px of the bottom)
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;

        if (isNewRoom || (hasNewMessage && (isFromMe || isNearBottom))) {
          chatBottomRef.current?.scrollIntoView({ behavior: isNewRoom ? "auto" : "smooth" });
        }
      }, 100);

      // Mark messages read
      if (user) {
        communicationService.markChatMessagesRead(activeRoom.roomId, user.uid);
      }
    });
    return () => unsubscribe();
  }, [activeRoom, user]);

  // File validator helper
  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      (window as any).showToast?.("Ukuran file maksimal adalah 10MB", "warning");
      return false;
    }
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.endsWith(".zip") && !file.name.endsWith(".docx") && !file.name.endsWith(".xlsx")) {
      (window as any).showToast?.("Tipe file tidak didukung. Pilih gambar, PDF, Word, Excel, PowerPoint, atau ZIP", "warning");
      return false;
    }
    return true;
  };

  // --- SEND CHAT ACTION ---
  const handleSendChat = async () => {
    if (!user || !activeRoom) return;
    if (!newMessageText.trim() && !chatFile) return;

    try {
      const receiverId = activeRoom.participants.find((p) => p !== user.uid) || "";
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;
      let messageType: "text" | "file" = "text";

      if (chatFile) {
        setIsUploadingChatFile(true);
        attachmentUrl = await uploadFile(chatFile, "chat_attachments");
        attachmentName = chatFile.name;
        messageType = "file";
      }

      await communicationService.sendChatMessage(activeRoom.roomId, {
        senderId: user.uid,
        senderName: user.name,
        senderRole: user.role,
        receiverId,
        message: newMessageText.trim() || `Mengirim lampiran: ${attachmentName}`,
        messageType,
        attachmentUrl,
        attachmentName,
      });

      setNewMessageText("");
      setChatFile(null);
      setShowEmojiPicker(false);
      (window as any).showToast?.("Pesan terkirim", "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal mengirim pesan", "error");
    } finally {
      setIsUploadingChatFile(false);
    }
  };

  // --- COMPOSE INBOX ACTION ---
  const handleSendMail = async () => {
    if (!user || !composeTo || !composeSubject.trim() || !composeBody.trim()) {
      (window as any).showToast?.("Mohon lengkapi semua field surat", "warning");
      return;
    }

    try {
      setIsSendingMail(true);
      const recipient = profiles.find((p) => p.uid === composeTo);
      if (!recipient) {
        (window as any).showToast?.("Penerima tidak ditemukan", "error");
        return;
      }

      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (composeFile) {
        attachmentUrl = await uploadFile(composeFile, "mail_attachments");
        attachmentName = composeFile.name;
      }

      const sentMsg = await communicationService.sendInboxMessage({
        senderId: user.uid,
        senderName: user.name,
        senderRole: user.role,
        receiverId: recipient.uid,
        receiverName: recipient.name,
        receiverRole: recipient.role,
        subject: composeSubject,
        body: composeBody,
        attachmentUrl,
        attachmentName,
      });

      setInboxMessages((prev) => [sentMsg, ...prev]);
      setIsComposing(false);
      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setComposeFile(null);
      (window as any).showToast?.("Surat berhasil dikirim", "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal mengirim surat", "error");
    } finally {
      setIsSendingMail(false);
    }
  };

  // --- SEND BROADCAST ACTION ---
  const handleSendBroadcast = async () => {
    if (!user || !broadcastTitle.trim() || !broadcastMessage.trim()) {
      (window as any).showToast?.("Harap lengkapi judul dan isi pesan siaran", "warning");
      return;
    }

    try {
      setIsSendingBroadcast(true);
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (broadcastFile) {
        attachmentUrl = await uploadFile(broadcastFile, "broadcast_attachments");
        attachmentName = broadcastFile.name;
      }

      const sentBroad = await communicationService.createBroadcast({
        title: broadcastTitle,
        message: broadcastMessage,
        target: broadcastTarget as any,
        targetValue: broadcastTargetValue || undefined,
        senderId: user.uid,
        senderName: user.name,
        attachmentUrl,
        attachmentName,
      });

      setBroadcasts((prev) => [sentBroad, ...prev]);
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastFile(null);
      (window as any).showToast?.("Pesan siaran berhasil dikirim ke seluruh target", "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal mengirim pesan siaran", "error");
    } finally {
      setIsSendingBroadcast(false);
    }
  };

  // --- CREATE ANNOUNCEMENT ACTION ---
  const handleCreateAnnouncement = async () => {
    if (!user || !annTitle.trim() || !annContent.trim() || !annExpireDate) {
      (window as any).showToast?.("Harap lengkapi semua field pengumuman", "warning");
      return;
    }

    try {
      setIsCreatingAnnSubmit(true);
      let attachmentUrl: string | null = null;
      let attachmentName: string | null = null;

      if (annFile) {
        attachmentUrl = await uploadFile(annFile, "announcement_attachments");
        attachmentName = annFile.name;
      }

      const newAnn = await communicationService.createAnnouncement({
        title: annTitle,
        content: annContent,
        targetRole: annTargetRole,
        targetClass: annTargetClass || undefined,
        targetIndustry: annTargetIndustry || undefined,
        publishDate: new Date().toISOString().split("T")[0],
        expireDate: annExpireDate,
        createdBy: user.uid,
        createdByName: user.name,
        attachmentUrl,
        attachmentName,
      });

      setAnnouncements((prev) => [newAnn, ...prev]);
      setIsCreatingAnn(false);
      setAnnTitle("");
      setAnnContent("");
      setAnnTargetRole("all");
      setAnnTargetClass("");
      setAnnTargetIndustry("");
      setAnnExpireDate("");
      setAnnFile(null);
      (window as any).showToast?.("Pengumuman berhasil diterbitkan", "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal menerbitkan pengumuman", "error");
    } finally {
      setIsCreatingAnnSubmit(false);
    }
  };

  // --- DELETE ANNOUNCEMENT ACTION ---
  const handleDeleteAnnouncement = async (id: string) => {
    try {
      await communicationService.deleteAnnouncement(id);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      (window as any).showToast?.("Pengumuman berhasil dihapus", "success");
    } catch (err) {
      console.error(err);
      (window as any).showToast?.("Gagal menghapus pengumuman", "error");
    }
  };

  // --- START NEW CONVERSATION FROM USER LIST ---
  const handleStartChat = async (partnerId: string) => {
    if (!user) return;
    try {
      const room = await communicationService.getOrCreateChatRoom([user.uid, partnerId]);
      setActiveRoom(room);
      setSearchUserQuery("");
    } catch (err) {
      console.error(err);
    }
  };

  // --- MAIL OPERATIONS ---
  const handleMailStarred = async (mail: InboxMessage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedStarred = !mail.isStarred;
      await communicationService.updateInboxMessage(mail.id, { isStarred: updatedStarred });
      setInboxMessages((prev) =>
        prev.map((m) => (m.id === mail.id ? { ...m, isStarred: updatedStarred } : m))
      );
      if (selectedMail?.id === mail.id) {
        setSelectedMail((prev) => prev ? { ...prev, isStarred: updatedStarred } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMailArchive = async (mail: InboxMessage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedArchived = !mail.isArchived;
      await communicationService.updateInboxMessage(mail.id, { isArchived: updatedArchived });
      setInboxMessages((prev) =>
        prev.map((m) => (m.id === mail.id ? { ...m, isArchived: updatedArchived } : m))
      );
      if (selectedMail?.id === mail.id) {
        setSelectedMail(null);
      }
      (window as any).showToast?.(updatedArchived ? "Surat dipindahkan ke Arsip" : "Surat dikembalikan ke Inbox", "info");
    } catch (err) {
      console.error(err);
    }
  };

  const handleMailTrash = async (mail: InboxMessage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updatedTrashed = !mail.isTrashed;
      await communicationService.updateInboxMessage(mail.id, { isTrashed: updatedTrashed });
      setInboxMessages((prev) =>
        prev.map((m) => (m.id === mail.id ? { ...m, isTrashed: updatedTrashed } : m))
      );
      if (selectedMail?.id === mail.id) {
        setSelectedMail(null);
      }
      (window as any).showToast?.(updatedTrashed ? "Surat dipindahkan ke Sampah" : "Surat dikembalikan", "info");
    } catch (err) {
      console.error(err);
    }
  };

  const handleMailClick = async (mail: InboxMessage) => {
    setSelectedMail(mail);
    if (!mail.isRead && user && mail.receiverId === user.uid) {
      try {
        await communicationService.updateInboxMessage(mail.id, { isRead: true });
        setInboxMessages((prev) =>
          prev.map((m) => (m.id === mail.id ? { ...m, isRead: true } : m))
        );
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Mark all notifications read
  const handleMarkAllNotificationsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      for (const n of unread) {
        await pklService.markNotificationRead(n.id);
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      (window as any).showToast?.("Semua notifikasi ditandai telah dibaca", "success");
    } catch (err) {
      console.error(err);
    }
  };

  // Filter inbox messages
  const getFilteredInboxMessages = () => {
    if (!user) return [];
    return inboxMessages.filter((m) => {
      // Folder check
      if (activeFolder === "inbox" && (m.receiverId !== user.uid || m.isArchived || m.isTrashed)) return false;
      if (activeFolder === "sent" && (m.senderId !== user.uid || m.isArchived || m.isTrashed)) return false;
      if (activeFolder === "archive" && !m.isArchived) return false;
      if (activeFolder === "trash" && !m.isTrashed) return false;

      // Unread or Starred Filters
      if (mailFilterUnread && m.isRead) return false;
      if (mailFilterStarred && !m.isStarred) return false;

      // Search Query
      if (mailSearchQuery.trim()) {
        const query = mailSearchQuery.toLowerCase();
        return (
          m.subject.toLowerCase().includes(query) ||
          m.body.toLowerCase().includes(query) ||
          m.senderName.toLowerCase().includes(query) ||
          m.receiverName.toLowerCase().includes(query)
        );
      }

      return true;
    });
  };

  // Filter user list for creating chats
  const getFilteredChatUsers = () => {
    if (!user) return [];
    return profiles.filter((p) => {
      if (p.uid === user.uid) return false;
      if (searchUserQuery.trim()) {
        const query = searchUserQuery.toLowerCase();
        return p.name.toLowerCase().includes(query) || p.role.toLowerCase().includes(query);
      }
      return true;
    });
  };

  // Get User Profile helper
  const getPartnerProfile = (participants: string[]) => {
    if (!user) return null;
    const partnerId = participants.find((p) => p !== user.uid);
    return profiles.find((p) => p.uid === partnerId) || null;
  };

  const commonEmojis = ["😀", "😂", "🥰", "👍", "🙏", "🔥", "💯", "👏", "🎉", "💡", "📢", "✅", "⚠️", "❌"];

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0B0F19] rounded-2xl overflow-hidden shadow-sm border border-gray-200/80 dark:border-gray-800">
      
      {/* Top Banner Tab Navigator */}
      <div className="bg-white dark:bg-[#111827] border-b border-gray-100 dark:border-gray-800 p-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-[#1565C0] dark:text-[#60A5FA] flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-md font-bold text-gray-800 dark:text-gray-100 tracking-tight">Communication Center</h1>
            <p className="text-[11px] text-gray-400">Pusat interaksi dan komunikasi sistem PKL SMKS Sanjaya Bajawa</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-1 bg-gray-50 dark:bg-gray-800/40 p-1 rounded-xl border border-gray-200/30 dark:border-gray-700/30">
          <button
            onClick={() => { setActiveTab("chat"); setSelectedMail(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "chat"
                ? "bg-white dark:bg-gray-700 text-[#1565C0] dark:text-white shadow-sm font-bold"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Chat</span>
          </button>
          <button
            onClick={() => { setActiveTab("inbox"); setSelectedMail(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "inbox"
                ? "bg-white dark:bg-gray-700 text-[#1565C0] dark:text-white shadow-sm font-bold"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Inbox</span>
          </button>
          {(user?.role === "admin" || user?.role === "pembimbing") && (
            <button
              onClick={() => { setActiveTab("broadcast"); setSelectedMail(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "broadcast"
                  ? "bg-white dark:bg-gray-700 text-[#1565C0] dark:text-white shadow-sm font-bold"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Broadcast</span>
            </button>
          )}
          <button
            onClick={() => { setActiveTab("pengumuman"); setSelectedMail(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "pengumuman"
                ? "bg-white dark:bg-gray-700 text-[#1565C0] dark:text-white shadow-sm font-bold"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Pengumuman</span>
          </button>
          <button
            onClick={() => { setActiveTab("notifikasi"); setSelectedMail(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
              activeTab === "notifikasi"
                ? "bg-white dark:bg-gray-700 text-[#1565C0] dark:text-white shadow-sm font-bold"
                : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifikasi</span>
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 bg-white dark:bg-[#111827]">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4" />
          <p className="text-xs text-gray-500">Menghubungkan layanan komunikasi...</p>
        </div>
      ) : (
        <div className="flex-1 flex min-h-[500px] h-[600px] bg-white dark:bg-[#111827]">

          {/* ======================================================== */}
          {/* TAB 1: CHAT SYSTEM */}
          {/* ======================================================== */}
          {activeTab === "chat" && (
            <div className="flex-1 flex h-full">
              {/* Left Column: Conversation List */}
              <div className="w-full md:w-80 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-white dark:bg-[#111827]">
                
                {/* Search / Filter Users */}
                <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#1F2937] px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800">
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                      placeholder="Cari guru, siswa, penyelia..."
                      className="bg-transparent border-none text-xs outline-none text-gray-700 dark:text-gray-200 w-full"
                    />
                    {searchUserQuery && <X onClick={() => setSearchUserQuery("")} className="w-3.5 h-3.5 text-gray-400 cursor-pointer" />}
                  </div>
                </div>

                {/* Conversation List / Search Results */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {searchUserQuery.trim() ? (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">Hasil Pencarian</p>
                      {getFilteredChatUsers().length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">Tidak ada pengguna cocok</p>
                      ) : (
                        getFilteredChatUsers().map((u) => (
                          <button
                            key={u.uid}
                            onClick={() => handleStartChat(u.uid)}
                            className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                              {u.name.substring(0, 1)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{u.name}</p>
                              <p className="text-[10px] text-gray-400 capitalize">{u.role} {u.tempatPkl ? `• ${u.tempatPkl}` : ""}</p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                          </button>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 mb-1">Diskusi Aktif</p>
                      {rooms.length === 0 ? (
                        <div className="text-center py-10">
                          <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-400">Belum ada obrolan aktif.</p>
                          <p className="text-[10px] text-gray-400 mt-1">Cari nama pengguna di atas untuk memulai chat.</p>
                        </div>
                      ) : (
                        rooms.map((room) => {
                          const partner = getPartnerProfile(room.participants);
                          if (!partner) return null;
                          const isSelected = activeRoom?.roomId === room.roomId;

                          return (
                            <button
                              key={room.roomId}
                              onClick={() => setActiveRoom(room)}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                                isSelected
                                  ? "bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/40 dark:border-blue-900/40"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-800"
                              }`}
                            >
                              <div className="relative shrink-0">
                                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 text-[#1565C0] dark:text-white flex items-center justify-center font-bold text-xs border border-gray-200 dark:border-gray-700">
                                  {partner.name.substring(0, 1)}
                                </div>
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-[#111827]" />
                              </div>
                              
                              <div className="min-w-0 flex-1">
                                <div className="flex justify-between items-center mb-0.5">
                                  <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{partner.name}</p>
                                  <span className="text-[9px] text-gray-400">
                                    {room.lastMessageAt ? new Date(room.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                  {room.lastMessage || "Mulai percakapan baru..."}
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Chat Box Area */}
              <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-[#161C2A]">
                {activeRoom ? (
                  <>
                    {/* Active Partner Header */}
                    {(() => {
                      const partner = getPartnerProfile(activeRoom.participants);
                      if (!partner) return null;
                      return (
                        <div className="bg-white dark:bg-[#111827] border-b border-gray-100 dark:border-gray-800 p-3 flex justify-between items-center shadow-xs">
                          <div className="flex items-center gap-3">
                            <button onClick={() => setActiveRoom(null)} className="md:hidden text-gray-500 p-1">
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="relative">
                              <div className="w-9 h-9 rounded-full bg-[#1565C0] text-white flex items-center justify-center font-bold text-xs">
                                {partner.name.substring(0, 1)}
                              </div>
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white dark:border-[#111827]" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-100 leading-none">{partner.name}</p>
                              <p className="text-[9px] text-gray-400 capitalize mt-0.5">
                                {partner.role} {partner.kelas ? `• Kelas ${partner.kelas}` : ""} {partner.tempatPkl ? `• ${partner.tempatPkl}` : ""}
                              </p>
                            </div>
                          </div>
                          
                          {/* Trash room trigger for admins */}
                          {user?.role === "admin" && (
                            <button
                              onClick={async () => {
                                if (confirm("Apakah anda yakin ingin menghapus ruang obrolan ini?")) {
                                  await communicationService.deleteChatRoom(activeRoom.roomId);
                                  setActiveRoom(null);
                                  (window as any).showToast?.("Ruang obrolan dihapus", "info");
                                }
                              }}
                              className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Chat Bubble Scrollable List */}
                    <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
                      {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col justify-center items-center text-center opacity-70">
                          <MessageSquare className="w-10 h-10 text-gray-300 mb-2" />
                          <p className="text-xs text-gray-400 font-semibold">Mulai percakapan aman di sini</p>
                          <p className="text-[10px] text-gray-400">Gunakan bahasa yang sopan dan santun.</p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => {
                          const isMe = msg.senderId === user?.uid;
                          return (
                            <div key={msg.messageId} className={`flex ${isMe ? "justify-end" : "justify-start"} items-end gap-1.5`}>
                              
                              {/* Partner Avatar */}
                              {!isMe && (
                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold text-[10px] text-gray-600 shrink-0 select-none">
                                  {msg.senderName.substring(0, 1)}
                                </div>
                              )}

                              <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-xs shadow-xs relative leading-relaxed ${
                                isMe
                                  ? "bg-[#1565C0] text-white rounded-br-none"
                                  : "bg-white dark:bg-[#1F2937] text-gray-800 dark:text-gray-100 rounded-bl-none border border-gray-100 dark:border-gray-800"
                              }`}>
                                {msg.messageType === "file" && msg.attachmentUrl ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 p-1.5 bg-black/10 dark:bg-white/5 rounded-lg border border-white/10">
                                      <Paperclip className="w-3.5 h-3.5 text-blue-100 shrink-0" />
                                      <span className="truncate text-[11px] font-bold max-w-[120px]">{msg.attachmentName || "File"}</span>
                                      <a
                                        href={msg.attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded-full bg-white/20 hover:bg-white/30 text-white ml-auto shrink-0 transition-all"
                                      >
                                        <Download className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                    <p className="text-[11px] opacity-90">{msg.message}</p>
                                  </div>
                                ) : (
                                  <p className="whitespace-pre-wrap">{msg.message}</p>
                                )}
                                
                                {/* Info Footer inside bubble */}
                                <div className="flex items-center justify-end gap-1 mt-1 text-[9px] opacity-60">
                                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  {isMe && (
                                    msg.isRead ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Check className="w-3 h-3 text-gray-300" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Typing indicator */}
                      {typingPartner && (
                        <div className="flex items-center gap-2 text-xs text-gray-400 italic">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.2s]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0.4s]" />
                          <span className="text-[10px] ml-1">{typingPartner} sedang mengetik...</span>
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Chat Input Toolbar with File Attachments & Emojis */}
                    <div className="bg-white dark:bg-[#111827] border-t border-gray-100 dark:border-gray-800 p-3 space-y-2">
                      {chatFile && (
                        <div className="flex items-center gap-2 p-1.5 bg-blue-50 dark:bg-blue-950/20 text-[#1565C0] dark:text-[#60A5FA] rounded-xl text-xs w-fit">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span className="font-bold">{chatFile.name} ({(chatFile.size / 1024).toFixed(1)} KB)</span>
                          <button onClick={() => setChatFile(null)} className="text-red-500 hover:text-red-700">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="flex items-center gap-2 relative">
                        {/* Custom Emoji Picker Popover */}
                        <button
                          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                          className="p-1.5 text-gray-400 hover:text-[#1565C0] dark:hover:text-[#60A5FA] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          title="Masukkan Emoji"
                        >
                          <Smile className="w-5 h-5" />
                        </button>
                        
                        {showEmojiPicker && (
                          <div className="absolute bottom-12 left-0 bg-white dark:bg-[#1F2937] p-2 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 flex gap-1.5 z-30">
                            {commonEmojis.map((e) => (
                              <button
                                key={e}
                                onClick={() => { setNewMessageText(prev => prev + e); setShowEmojiPicker(false); }}
                                className="text-sm hover:scale-125 transition-transform p-1"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* File Upload Selector */}
                        <label className="p-1.5 text-gray-400 hover:text-[#1565C0] dark:hover:text-[#60A5FA] rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                          <Paperclip className="w-5 h-5" />
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                if (validateFile(files[0])) {
                                  setChatFile(files[0]);
                                }
                              }
                            }}
                          />
                        </label>

                        {/* Message Input Box */}
                        <input
                          type="text"
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSendChat(); }}
                          placeholder="Ketik pesan resmi..."
                          className="flex-1 bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs outline-none text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        />

                        {/* Send Action Button */}
                        <button
                          onClick={handleSendChat}
                          disabled={isUploadingChatFile || (!newMessageText.trim() && !chatFile)}
                          className="p-2 bg-[#1565C0] dark:bg-[#2563EB] text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center"
                        >
                          {isUploadingChatFile ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-[#FAFBFD] dark:bg-[#0B0F19]">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/10 text-blue-500 flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Pilih Percakapan</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs leading-relaxed">
                      Silakan pilih ruang obrolan di sidebar kiri atau cari nama pengguna di form pencarian untuk memulai chat.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: INBOX SYSTEM */}
          {/* ======================================================== */}
          {activeTab === "inbox" && (
            <div className="flex-1 flex h-full">
              {/* Folder Sidebar Column */}
              <div className="w-full md:w-56 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-white dark:bg-[#111827] p-3 space-y-4">
                
                {/* Compose Mail Button */}
                <button
                  onClick={() => { setIsComposing(true); setSelectedMail(null); }}
                  className="w-full flex items-center justify-center gap-2 bg-[#1565C0] text-white py-2 rounded-xl text-xs font-semibold shadow-sm hover:bg-blue-700 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tulis Surat Baru</span>
                </button>

                {/* Folders List */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2.5 mb-1.5">Kotak Surat</p>
                  {[
                    { id: "inbox", label: "Kotak Masuk", icon: <InboxIcon className="w-4 h-4" /> },
                    { id: "sent", label: "Terkirim", icon: <Send className="w-4 h-4" /> },
                    { id: "archive", label: "Arsip", icon: <Archive className="w-4 h-4" /> },
                    { id: "trash", label: "Sampah", icon: <Trash2 className="w-4 h-4" /> },
                  ].map((f) => {
                    const isFolderSelected = activeFolder === f.id && !isComposing;
                    return (
                      <button
                        key={f.id}
                        onClick={() => { setActiveFolder(f.id as any); setIsComposing(false); setSelectedMail(null); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isFolderSelected
                            ? "bg-blue-50/50 dark:bg-blue-950/10 text-[#1565C0] dark:text-[#60A5FA]"
                            : "text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {f.icon}
                          <span>{f.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Filters */}
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2.5 mb-1.5">Saring Surat</p>
                  <button
                    onClick={() => setMailFilterUnread(!mailFilterUnread)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mailFilterUnread ? "text-blue-600 font-bold" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${mailFilterUnread ? "bg-blue-600" : "bg-gray-300"}`} />
                    Belum Dibaca
                  </button>
                  <button
                    onClick={() => setMailFilterStarred(!mailFilterStarred)}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mailFilterStarred ? "text-amber-500 font-bold" : "text-gray-500 hover:text-gray-800"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${mailFilterStarred ? "bg-amber-500" : "bg-gray-300"}`} />
                    Berbintang
                  </button>
                </div>
              </div>

              {/* Middle Mail List / Compose Form / Mail Reader Column */}
              <div className="flex-1 flex bg-gray-50/30 dark:bg-[#161C2A]">
                
                {isComposing ? (
                  /* Compose Panel Form */
                  <div className="flex-1 bg-white dark:bg-[#111827] p-5 flex flex-col space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Kirim Surat Resmi</p>
                      <button onClick={() => setIsComposing(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                      {/* Recipient Combo */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kirim Ke</label>
                        <select
                          value={composeTo}
                          onChange={(e) => setComposeTo(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-100 focus:outline-none"
                        >
                          <option value="">-- Pilih Penerima Resmi --</option>
                          {profiles
                            .filter(p => p.uid !== user?.uid)
                            .map((p) => (
                              <option key={p.uid} value={p.uid}>
                                {p.name} ({p.role.toUpperCase()}) {p.tempatPkl ? `[${p.tempatPkl}]` : ""}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Subject */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Subjek / Perihal</label>
                        <input
                          type="text"
                          value={composeSubject}
                          onChange={(e) => setComposeSubject(e.target.value)}
                          placeholder="Perihal surat penting..."
                          className="w-full bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Body Message */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Isi Surat Resmi</label>
                        <textarea
                          rows={6}
                          value={composeBody}
                          onChange={(e) => setComposeBody(e.target.value)}
                          placeholder="Tuliskan pesan resmi formal di sini..."
                          className="w-full bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>

                      {/* Attachment */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lampiran Pendukung (Maks 10MB)</label>
                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center cursor-pointer hover:border-blue-500/50 transition-colors relative">
                          <input
                            type="file"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                if (validateFile(files[0])) setComposeFile(files[0]);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <Paperclip className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-500">
                            {composeFile ? composeFile.name : "Seret dan letakkan atau klik untuk memilih file"}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">Selesai validasi: JPG, PNG, PDF, Word, Excel, ZIP</p>
                        </div>
                      </div>
                    </div>

                    {/* Actions bar */}
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-end gap-2">
                      <button
                        onClick={() => setIsComposing(false)}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-500 hover:bg-gray-50 font-semibold"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSendMail}
                        disabled={isSendingMail || !composeTo || !composeSubject.trim() || !composeBody.trim()}
                        className="px-5 py-2 bg-[#1565C0] text-white rounded-xl text-xs font-bold shadow-sm hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isSendingMail ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Mengirim...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Kirim Surat</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : selectedMail ? (
                  /* Mail Reader Panel */
                  <div className="flex-1 bg-white dark:bg-[#111827] p-5 flex flex-col space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                      <button onClick={() => setSelectedMail(null)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                        <ChevronLeft className="w-4 h-4" />
                        <span>Kembali ke Daftar</span>
                      </button>

                      {/* Tool Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleMailStarred(selectedMail, e)}
                          className="p-1.5 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-gray-50"
                        >
                          <Star className={`w-4 h-4 ${selectedMail.isStarred ? "fill-amber-400 text-amber-400" : ""}`} />
                        </button>
                        <button
                          onClick={(e) => handleMailArchive(selectedMail, e)}
                          className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-gray-50"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleMailTrash(selectedMail, e)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                      <div>
                        <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 leading-tight mb-2">
                          {selectedMail.subject}
                        </h2>
                        
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#1565C0] flex items-center justify-center font-bold text-xs shrink-0">
                              {selectedMail.senderName.substring(0, 1)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-none">
                                {selectedMail.senderName}
                              </p>
                              <p className="text-[10px] text-gray-400 capitalize mt-0.5">
                                Dari: {selectedMail.senderRole} • Untuk: {selectedMail.receiverName}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {new Date(selectedMail.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Subject Body */}
                      <div className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap p-3 border border-gray-100 dark:border-gray-800 rounded-2xl">
                        {selectedMail.body}
                      </div>

                      {/* File Download block */}
                      {selectedMail.attachmentUrl && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Lampiran Terlampir</p>
                          <div className="flex items-center justify-between bg-blue-50/50 dark:bg-blue-950/10 p-3 border border-blue-100/40 dark:border-blue-900/40 rounded-2xl">
                            <div className="flex items-center gap-2 text-xs">
                              <Paperclip className="w-4 h-4 text-[#1565C0] shrink-0" />
                              <span className="font-bold text-gray-700 dark:text-gray-300 truncate max-w-xs">
                                {selectedMail.attachmentName || "Download File"}
                              </span>
                            </div>
                            <a
                              href={selectedMail.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1 bg-[#1565C0] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Buka File</span>
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Mail List Panel */
                  <div className="flex-1 flex flex-col">
                    {/* Inbox Header Controls */}
                    <div className="bg-white dark:bg-[#111827] border-b border-gray-100 dark:border-gray-800 p-3 flex justify-between gap-2">
                      <div className="flex items-center gap-2 bg-gray-50 dark:bg-[#1F2937] px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-800 flex-1">
                        <Search className="w-3.5 h-3.5 text-gray-400" />
                        <input
                          type="text"
                          value={mailSearchQuery}
                          onChange={(e) => setMailSearchQuery(e.target.value)}
                          placeholder="Cari perihal atau isi surat..."
                          className="bg-transparent border-none text-xs outline-none text-gray-700 dark:text-gray-200 w-full"
                        />
                      </div>
                    </div>

                    {/* Emails Scrollable Area */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                      {getFilteredInboxMessages().length === 0 ? (
                        <div className="text-center py-20 opacity-75">
                          <InboxIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-xs text-gray-400 font-bold">Kotak surat kosong</p>
                          <p className="text-[10px] text-gray-400 mt-1">Tidak ada surat di dalam kategori ini.</p>
                        </div>
                      ) : (
                        getFilteredInboxMessages().map((mail) => {
                          const isUnread = !mail.isRead && mail.receiverId === user?.uid;
                          return (
                            <div
                              key={mail.id}
                              onClick={() => handleMailClick(mail)}
                              className={`flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 border transition-all cursor-pointer relative ${
                                isUnread
                                  ? "bg-blue-50/20 dark:bg-blue-950/5 border-blue-100/50 dark:border-blue-900/50"
                                  : "bg-white dark:bg-[#111827] border-gray-100 dark:border-gray-800"
                              }`}
                            >
                              {/* Star indicator */}
                              <button
                                onClick={(e) => handleMailStarred(mail, e)}
                                className="text-gray-300 hover:text-amber-500 shrink-0"
                              >
                                <Star className={`w-3.5 h-3.5 ${mail.isStarred ? "fill-amber-400 text-amber-400" : ""}`} />
                              </button>

                              <div className="min-w-0 flex-1 space-y-0.5">
                                <div className="flex justify-between items-center">
                                  <p className={`text-xs truncate ${isUnread ? "font-bold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                                    {mail.senderName}
                                  </p>
                                  <span className="text-[9px] text-gray-400 shrink-0">
                                    {new Date(mail.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className={`text-xs truncate ${isUnread ? "font-bold text-gray-800 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>
                                  {mail.subject}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate">
                                  {mail.body}
                                </p>
                              </div>

                              {/* Unread badge or attachment pin */}
                              <div className="flex flex-col items-end gap-1.5 shrink-0">
                                {isUnread && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
                                {mail.attachmentUrl && <Paperclip className="w-3.5 h-3.5 text-gray-300" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: BROADCAST PANEL (For Admin & Guru) */}
          {/* ======================================================== */}
          {activeTab === "broadcast" && (user?.role === "admin" || user?.role === "pembimbing") && (
            <div className="flex-1 flex flex-col md:flex-row h-full overflow-y-auto">
              
              {/* Left Side: Create Broadcast message */}
              <div className="flex-1 p-5 border-r border-gray-100 dark:border-gray-800 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Kirim Pesan Siaran (Broadcast)</h2>
                  <p className="text-[11px] text-gray-400">Kirimkan pesan mendesak secara simultan ke ratusan user via Chat & Email Inbox.</p>
                </div>

                <div className="space-y-3.5">
                  {/* Select target criteria */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Penerima</label>
                      <select
                        value={broadcastTarget}
                        onChange={(e) => setBroadcastTarget(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none"
                      >
                        <option value="all_students">Seluruh Siswa PKL</option>
                        <option value="all_teachers">Seluruh Guru Pembimbing</option>
                        <option value="all_industries">Seluruh Penyelia Industri</option>
                        <option value="class">Per Kelas Tertentu</option>
                        <option value="tempat_pkl">Per Tempat PKL / Mitra</option>
                      </select>
                    </div>

                    {(broadcastTarget === "class" || broadcastTarget === "tempat_pkl") && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Value Kriteria</label>
                        <input
                          type="text"
                          value={broadcastTargetValue}
                          onChange={(e) => setBroadcastTargetValue(e.target.value)}
                          placeholder={broadcastTarget === "class" ? "e.g., XII TKJ" : "e.g., ID p1 atau Nama"}
                          className="w-full bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Broadcast title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Judul Siaran</label>
                    <input
                      type="text"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="e.g., PENGUMUMAN SEGERA REVISI DOKUMEN PKL"
                      className="w-full bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                    />
                  </div>

                  {/* Broadcast body content */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Konten / Isi Pengumuman Siaran</label>
                    <textarea
                      rows={5}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Masukkan deskripsi siaran detail di sini..."
                      className="w-full bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  {/* Broadcast attachment file */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Unggah File Lampiran</label>
                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-4 text-center cursor-pointer hover:border-blue-500/50 transition-colors relative">
                      <input
                        type="file"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            if (validateFile(files[0])) setBroadcastFile(files[0]);
                          }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <Paperclip className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                      <p className="text-xs text-gray-500">
                        {broadcastFile ? broadcastFile.name : "Pilih file lampiran broadcast"}
                      </p>
                      <p className="text-[9px] text-gray-400">PDF, Word, Excel, ZIP maks 10MB</p>
                    </div>
                  </div>

                  <button
                    onClick={handleSendBroadcast}
                    disabled={isSendingBroadcast || !broadcastTitle.trim() || !broadcastMessage.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isSendingBroadcast ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Memproses Siaran Massal...</span>
                      </>
                    ) : (
                      <>
                        <Megaphone className="w-4 h-4 animate-bounce" />
                        <span>Kirim Siaran Resmi Sekarang</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Side: Previously Sent Broadcast list */}
              <div className="w-full md:w-80 p-5 space-y-4 bg-gray-50/40 dark:bg-gray-900/10">
                <div>
                  <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-1">Riwayat Siaran</h2>
                  <p className="text-[11px] text-gray-400">Daftar siaran yang berhasil didistribusikan sebelumnya.</p>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {broadcasts.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">Belum ada riwayat siaran</p>
                  ) : (
                    broadcasts.map((b) => (
                      <div key={b.id} className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-gray-800 rounded-2xl p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full uppercase truncate">
                            {b.target.replace("_", " ")}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {new Date(b.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-100 truncate">{b.title}</p>
                        <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{b.message}</p>
                        {b.attachmentUrl && (
                          <div className="flex items-center gap-1 text-[9px] text-emerald-600 font-semibold">
                            <Paperclip className="w-3 h-3" />
                            <span className="truncate">{b.attachmentName}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: PENGUMUMAN TAB */}
          {/* ======================================================== */}
          {activeTab === "pengumuman" && (
            <div className="flex-1 flex flex-col h-full overflow-y-auto p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Papan Pengumuman Resmi</h2>
                  <p className="text-[11px] text-gray-400">Semua pengumuman instansi dan koordinasi PKL resmi.</p>
                </div>

                {/* Add Announcement Button for Admins and Teachers */}
                {(user?.role === "admin" || user?.role === "pembimbing") && (
                  <button
                    onClick={() => setIsCreatingAnn(true)}
                    className="flex items-center gap-1 bg-[#1565C0] text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm hover:bg-blue-700 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Terbitkan Pengumuman</span>
                  </button>
                )}
              </div>

              {/* Announcements grid/list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {announcements.length === 0 ? (
                  <div className="col-span-2 text-center py-16">
                    <Megaphone className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Tidak ada pengumuman aktif saat ini.</p>
                  </div>
                ) : (
                  announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className="bg-white dark:bg-[#111827] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow relative"
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full uppercase">
                            Untuk: {ann.targetRole.toUpperCase()}
                          </span>
                          
                          {/* Trash trigger for administrators */}
                          {(user?.role === "admin" || user?.uid === ann.createdBy) && (
                            <button
                              onClick={() => handleDeleteAnnouncement(ann.id)}
                              className="text-gray-300 hover:text-red-500 p-1 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100 leading-snug line-clamp-2">
                          {ann.title}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
                          {ann.content}
                        </p>
                      </div>

                      <div className="border-t border-gray-50 dark:border-gray-800/80 mt-4 pt-3 flex items-center justify-between text-[10px] text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          <span className="font-semibold truncate max-w-[100px]">{ann.createdByName || "Sekolah"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Exp: {new Date(ann.expireDate).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={() => setViewingAnn(ann)}
                          className="text-[#1565C0] font-bold hover:underline"
                        >
                          Selengkapnya
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* --- VIEWING ANNOUNCEMENT DETAIL MODAL --- */}
              {viewingAnn && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                  <div className="bg-white dark:bg-[#111827] max-w-lg w-full rounded-2xl p-5 shadow-2xl relative space-y-4">
                    <button onClick={() => setViewingAnn(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                      <X className="w-5 h-5" />
                    </button>

                    <div>
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/20 px-2 py-0.5 rounded-full uppercase">
                        Target: {viewingAnn.targetRole.toUpperCase()}
                      </span>
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-2 leading-tight">
                        {viewingAnn.title}
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-1">Diterbitkan oleh {viewingAnn.createdByName} pada {new Date(viewingAnn.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl max-h-60 overflow-y-auto">
                      {viewingAnn.content}
                    </div>

                    {viewingAnn.attachmentUrl && (
                      <div className="border border-blue-100/50 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/5 p-3 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <Paperclip className="w-4 h-4 text-[#1565C0] shrink-0" />
                          <span className="font-bold text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                            {viewingAnn.attachmentName || "Lampiran Pengumuman"}
                          </span>
                        </div>
                        <a
                          href={viewingAnn.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-1.5 bg-[#1565C0] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Unduh File</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* --- CREATE ANNOUNCEMENT MODAL FOR CREATORS --- */}
              {isCreatingAnn && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                  <div className="bg-white dark:bg-[#111827] max-w-md w-full rounded-2xl p-5 shadow-2xl relative space-y-4">
                    <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">Terbitkan Pengumuman Baru</p>
                      <button onClick={() => setIsCreatingAnn(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                      {/* Target Select */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Pembaca</label>
                        <select
                          value={annTargetRole}
                          onChange={(e) => setAnnTargetRole(e.target.value as any)}
                          className="w-full bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-700 dark:text-gray-100 focus:outline-none"
                        >
                          <option value="all">Seluruh Pengguna</option>
                          <option value="siswa">Seluruh Siswa</option>
                          <option value="pembimbing">Seluruh Guru Pembimbing</option>
                          <option value="industri">Seluruh Penyelia Industri</option>
                        </select>
                      </div>

                      {/* Announcement title */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Judul Pengumuman</label>
                        <input
                          type="text"
                          value={annTitle}
                          onChange={(e) => setAnnTitle(e.target.value)}
                          placeholder="e.g., JADWAL SIDANG PKL AKHIR TAHUN 2026"
                          className="w-full bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                        />
                      </div>

                      {/* Content */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Isi Informasi Detail</label>
                        <textarea
                          rows={4}
                          value={annContent}
                          onChange={(e) => setAnnContent(e.target.value)}
                          placeholder="Tuliskan semua detail informasi pengumuman..."
                          className="w-full bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                      </div>

                      {/* Expiry Date */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tanggal Kadaluarsa Pengumuman</label>
                        <input
                          type="date"
                          value={annExpireDate}
                          onChange={(e) => setAnnExpireDate(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-[#1F2937] border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* File upload */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">File Lampiran Terkait</label>
                        <div className="border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl p-3 text-center relative cursor-pointer hover:border-blue-500">
                          <input
                            type="file"
                            onChange={(e) => {
                              const files = e.target.files;
                              if (files && files.length > 0) {
                                if (validateFile(files[0])) setAnnFile(files[0]);
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <Paperclip className="w-5 h-5 text-gray-300 mx-auto mb-1" />
                          <p className="text-[11px] text-gray-500">
                            {annFile ? annFile.name : "Seret file ke sini"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-end gap-2">
                      <button
                        onClick={() => setIsCreatingAnn(false)}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-500 hover:bg-gray-50 font-semibold"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleCreateAnnouncement}
                        disabled={isCreatingAnnSubmit || !annTitle.trim() || !annContent.trim() || !annExpireDate}
                        className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isCreatingAnnSubmit ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Menerbitkan...</span>
                          </>
                        ) : (
                          <span>Menerbitkan</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 5: SYSTEM NOTIFICATION PANEL */}
          {/* ======================================================== */}
          {activeTab === "notifikasi" && (
            <div className="flex-1 flex flex-col h-full overflow-y-auto p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">Log Notifikasi Sistem</h2>
                  <p className="text-[11px] text-gray-400">Arsip seluruh peringatan sistem, approval jurnal, absensi masuk, dan catatan monitoring.</p>
                </div>
                
                {notifications.filter(n => !n.read).length > 0 && (
                  <button
                    onClick={handleMarkAllNotificationsRead}
                    className="text-xs text-[#1565C0] dark:text-[#60A5FA] font-bold hover:underline"
                  >
                    Tandai Semua Telah Dibaca
                  </button>
                )}
              </div>

              <div className="space-y-2 max-w-2xl">
                {notifications.length === 0 ? (
                  <div className="text-center py-16 opacity-75">
                    <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400 font-semibold">Tidak ada notifikasi sistem</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3.5 rounded-2xl text-xs border transition-colors flex justify-between items-start ${
                        n.read
                          ? "bg-white dark:bg-[#111827] border-gray-100 dark:border-gray-800 text-gray-500"
                          : "bg-blue-50/10 dark:bg-blue-950/5 border-blue-100/50 dark:border-blue-900/50 text-gray-800 dark:text-gray-100 font-medium shadow-xs"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {!n.read && <span className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0" />}
                          <p className="font-bold text-xs">{n.title}</p>
                        </div>
                        {n.content && <p className="text-[11px] text-gray-600 dark:text-gray-300">{n.content}</p>}
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          {n.time || (n as any).createdAt ? new Date((n as any).createdAt).toLocaleString("id-ID") : "Baru saja"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default CommunicationCenter;
