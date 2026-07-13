import { db, isFirebaseActive } from "../firebase/config";
import {
  ChatRoom,
  ChatMessage,
  InboxMessage,
  Announcement,
  BroadcastMessage,
  UserProfile,
} from "../models/types";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { pklService } from "./pklService";

enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: localStorage.getItem("pkl_current_user")
        ? JSON.parse(localStorage.getItem("pkl_current_user")!).uid
        : "unknown",
      email: localStorage.getItem("pkl_current_user")
        ? JSON.parse(localStorage.getItem("pkl_current_user")!).email
        : "unknown",
    },
    operationType,
    path,
  };
  console.error("Firestore Error in Communication: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial seed data for Communication Center
const SEED_CHAT_ROOMS: ChatRoom[] = [
  {
    roomId: "room_siswa_guru_1",
    type: "direct",
    participants: ["siswa_sanjaya_123", "pembimbing_sergius_456"],
    lastMessage: "Selamat pagi pak Drs. Sergius Nono, saya ingin bertanya terkait pengisian jurnal harian hari ini.",
    lastMessageAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    roomId: "room_guru_industri_1",
    type: "direct",
    participants: ["pembimbing_sergius_456", "penyelia_mitra_999"],
    lastMessage: "Halo Pak Yosef Sanjaya, bagaimana perkembangan absensi siswa kami di Sanjaya Motor Bajawa?",
    lastMessageAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  }
];

const SEED_CHAT_MESSAGES: ChatMessage[] = [
  {
    messageId: "msg_1",
    roomId: "room_siswa_guru_1",
    senderId: "siswa_sanjaya_123",
    senderName: "Siswa Sanjaya Bajawa",
    senderRole: "siswa",
    receiverId: "pembimbing_sergius_456",
    message: "Selamat pagi pak Drs. Sergius Nono, saya ingin bertanya terkait pengisian jurnal harian hari ini.",
    messageType: "text",
    isRead: true,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    messageId: "msg_2",
    roomId: "room_guru_industri_1",
    senderId: "pembimbing_sergius_456",
    senderName: "Drs. Sergius Nono",
    senderRole: "pembimbing",
    receiverId: "penyelia_mitra_999",
    message: "Halo Pak Yosef Sanjaya, bagaimana perkembangan absensi siswa kami di Sanjaya Motor Bajawa?",
    messageType: "text",
    isRead: false,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  }
];

const SEED_INBOX: InboxMessage[] = [
  {
    id: "inbox_1",
    senderId: "admin_pkl_789",
    senderName: "Admin PKL SMKS Sanjaya",
    senderRole: "admin",
    receiverId: "pembimbing_sergius_456",
    receiverName: "Drs. Sergius Nono",
    receiverRole: "pembimbing",
    subject: "Koordinasi Pembagian Tugas Monitoring Lapangan Semester Genap",
    body: "Selamat pagi Bapak Drs. Sergius Nono. Sehubungan dengan dimulainya PKL periode Juni-Desember 2026, berikut kami lampirkan file Excel pembagian monitoring siswa. Mohon untuk segera di-review.",
    isRead: false,
    isStarred: true,
    isArchived: false,
    isTrashed: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: "inbox_2",
    senderId: "pembimbing_sergius_456",
    senderName: "Drs. Sergius Nono",
    senderRole: "pembimbing",
    receiverId: "siswa_sanjaya_123",
    receiverName: "Siswa Sanjaya Bajawa",
    receiverRole: "siswa",
    subject: "Revisi Jurnal Harian Tanggal 3 Juli 2026",
    body: "Halo Siswa, harap segera merevisi jurnal harian kamu tanggal 3 Juli 2026. Solusi kendala yang kamu masukkan masih kurang detail dan kurang teknis. Terima kasih.",
    isRead: false,
    isStarred: false,
    isArchived: false,
    isTrashed: false,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  }
];

const SEED_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann_1",
    title: "Pengumpulan Berita Acara Monitoring PKL Periode 1",
    content: "Diinfokan kepada seluruh Guru Pembimbing untuk segera mengunggah dan menyerahkan Berita Acara Monitoring PKL paling lambat tanggal 15 Juli 2026 ke bagian kurikulum SMKS Sanjaya Bajawa.",
    targetRole: "pembimbing",
    publishDate: new Date().toISOString().split("T")[0],
    expireDate: "2026-07-20",
    createdBy: "admin_pkl_789",
    createdByName: "Admin PKL SMKS Sanjaya",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: "ann_2",
    title: "Kewajiban Pengisian Presensi Harian PKL Sebelum Jam 08.00 WITA",
    content: "Pemberitahuan kepada semua Siswa PKL bahwa pengisian presensi masuk wajib dilakukan sebelum jam 08.00 WITA dengan melampirkan foto selfie dan koordinat GPS lokasi PKL yang akurat.",
    targetRole: "siswa",
    publishDate: new Date().toISOString().split("T")[0],
    expireDate: "2026-07-31",
    createdBy: "admin_pkl_789",
    createdByName: "Admin PKL SMKS Sanjaya",
    createdAt: new Date(Date.now() - 3600000 * 10).toISOString(),
  }
];

// Initialize local storage seeds if needed
const initLocalStorageComm = () => {
  if (!localStorage.getItem("pkl_chat_rooms")) {
    localStorage.setItem("pkl_chat_rooms", JSON.stringify(SEED_CHAT_ROOMS));
  }
  if (!localStorage.getItem("pkl_chat_messages")) {
    localStorage.setItem("pkl_chat_messages", JSON.stringify(SEED_CHAT_MESSAGES));
  }
  if (!localStorage.getItem("pkl_inbox_messages")) {
    localStorage.setItem("pkl_inbox_messages", JSON.stringify(SEED_INBOX));
  }
  if (!localStorage.getItem("pkl_announcements")) {
    localStorage.setItem("pkl_announcements", JSON.stringify(SEED_ANNOUNCEMENTS));
  }
  if (!localStorage.getItem("pkl_broadcasts")) {
    localStorage.setItem("pkl_broadcasts", JSON.stringify([]));
  }
};

initLocalStorageComm();

export const communicationService = {
  // --- CHAT ROOMS ---
  async getChatRooms(userId: string): Promise<ChatRoom[]> {
    if (isFirebaseActive && db) {
      const path = "chat_rooms";
      try {
        const q = query(
          collection(db, path),
          where("participants", "array-contains", userId)
        );
        const snap = await getDocs(q);
        const rooms: ChatRoom[] = [];
        snap.forEach((docSnap) => {
          rooms.push({ roomId: docSnap.id, ...docSnap.data() } as ChatRoom);
        });
        return rooms.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const stored = localStorage.getItem("pkl_chat_rooms");
      const list: ChatRoom[] = stored ? JSON.parse(stored) : [];
      return list
        .filter((r) => r.participants.includes(userId))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
  },

  async getOrCreateChatRoom(userIds: string[]): Promise<ChatRoom> {
    const sortedIds = [...userIds].sort();
    if (isFirebaseActive && db) {
      const path = "chat_rooms";
      try {
        const q = query(
          collection(db, path),
          where("participants", "==", sortedIds)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          return { roomId: docSnap.id, ...docSnap.data() } as ChatRoom;
        }

        // Create new room
        const newRoomData = {
          type: "direct",
          participants: sortedIds,
          lastMessage: "",
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const docRef = await addDoc(collection(db, path), newRoomData);
        return { roomId: docRef.id, ...newRoomData } as ChatRoom;
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_chat_rooms");
      const list: ChatRoom[] = stored ? JSON.parse(stored) : [];
      const existing = list.find(
        (r) =>
          r.participants.length === sortedIds.length &&
          r.participants.every((p, idx) => p === sortedIds[idx])
      );
      if (existing) return existing;

      const newRoom: ChatRoom = {
        roomId: `room_${Date.now()}`,
        type: "direct",
        participants: sortedIds,
        lastMessage: "",
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.push(newRoom);
      localStorage.setItem("pkl_chat_rooms", JSON.stringify(list));
      return newRoom;
    }
  },

  // --- REALTIME CHAT SUBSCRIBERS ---
  subscribeChatRooms(userId: string, callback: (rooms: ChatRoom[]) => void) {
    if (isFirebaseActive && db) {
      const path = "chat_rooms";
      const q = query(
        collection(db, path),
        where("participants", "array-contains", userId)
      );
      return onSnapshot(
        q,
        (snap) => {
          const rooms: ChatRoom[] = [];
          snap.forEach((docSnap) => {
            rooms.push({ roomId: docSnap.id, ...docSnap.data() } as ChatRoom);
          });
          callback(rooms.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    } else {
      let lastRoomsJson = "";
      const handleStorageChange = () => {
        const stored = localStorage.getItem("pkl_chat_rooms");
        const list: ChatRoom[] = stored ? JSON.parse(stored) : [];
        const filtered = list
          .filter((r) => r.participants.includes(userId))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        
        const currentJson = JSON.stringify(filtered);
        if (currentJson !== lastRoomsJson) {
          lastRoomsJson = currentJson;
          callback(filtered);
        }
      };

      window.addEventListener("storage", handleStorageChange);
      // Also interval to poll inside same tab
      const interval = setInterval(handleStorageChange, 1500);
      handleStorageChange(); // initial call

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        clearInterval(interval);
      };
    }
  },

  subscribeMessages(roomId: string, callback: (messages: ChatMessage[]) => void) {
    if (isFirebaseActive && db) {
      const path = "messages";
      const q = query(
        collection(db, path),
        where("roomId", "==", roomId),
        orderBy("createdAt", "asc")
      );
      return onSnapshot(
        q,
        (snap) => {
          const list: ChatMessage[] = [];
          snap.forEach((docSnap) => {
            list.push({ messageId: docSnap.id, ...docSnap.data() } as ChatMessage);
          });
          callback(list);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, path);
        }
      );
    } else {
      let lastMessagesJson = "";
      const handleStorageChange = () => {
        const stored = localStorage.getItem("pkl_chat_messages");
        const list: ChatMessage[] = stored ? JSON.parse(stored) : [];
        const filtered = list
          .filter((m) => m.roomId === roomId)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        
        const currentJson = JSON.stringify(filtered);
        if (currentJson !== lastMessagesJson) {
          lastMessagesJson = currentJson;
          callback(filtered);
        }
      };

      window.addEventListener("storage", handleStorageChange);
      const interval = setInterval(handleStorageChange, 1000);
      handleStorageChange();

      return () => {
        window.removeEventListener("storage", handleStorageChange);
        clearInterval(interval);
      };
    }
  },

  // --- SEND CHAT MESSAGE ---
  async sendChatMessage(
    roomId: string,
    msg: Omit<ChatMessage, "messageId" | "createdAt" | "isRead" | "roomId">
  ): Promise<ChatMessage> {
    const newMsgData = {
      ...msg,
      roomId,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseActive && db) {
      const path = "messages";
      try {
        const docRef = await addDoc(collection(db, path), newMsgData);
        // Update room last message
        const roomRef = doc(db, "chat_rooms", roomId);
        await updateDoc(roomRef, {
          lastMessage: msg.messageType === "text" ? msg.message : `[Lampiran: ${msg.attachmentName || "File"}]`,
          lastMessageAt: newMsgData.createdAt,
          updatedAt: newMsgData.createdAt,
        });

        // Create System Notification for receiver
        try {
          await pklService.createNotification({
            title: `Pesan baru dari ${msg.senderName}`,
            content: msg.messageType === "text" ? msg.message : `Mengirimkan lampiran file: ${msg.attachmentName}`,
            time: "Baru saja",
            read: false,
            userId: msg.receiverId,
          });
        } catch (ne) {}

        return { messageId: docRef.id, ...newMsgData };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const storedMsgs = localStorage.getItem("pkl_chat_messages");
      const listMsgs: ChatMessage[] = storedMsgs ? JSON.parse(storedMsgs) : [];
      const newMsg: ChatMessage = {
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        ...newMsgData,
      };
      listMsgs.push(newMsg);
      localStorage.setItem("pkl_chat_messages", JSON.stringify(listMsgs));

      // Update room
      const storedRooms = localStorage.getItem("pkl_chat_rooms");
      const listRooms: ChatRoom[] = storedRooms ? JSON.parse(storedRooms) : [];
      const rIdx = listRooms.findIndex((r) => r.roomId === roomId);
      if (rIdx !== -1) {
        listRooms[rIdx].lastMessage = msg.messageType === "text" ? msg.message : `[Lampiran: ${msg.attachmentName || "File"}]`;
        listRooms[rIdx].lastMessageAt = newMsg.createdAt;
        listRooms[rIdx].updatedAt = newMsg.createdAt;
        localStorage.setItem("pkl_chat_rooms", JSON.stringify(listRooms));
      }

      // Create notification
      try {
        await pklService.createNotification({
          title: `Pesan baru dari ${msg.senderName}`,
          content: msg.messageType === "text" ? msg.message : `Mengirimkan lampiran file: ${msg.attachmentName}`,
          time: "Baru saja",
          read: false,
          userId: msg.receiverId,
        });
      } catch (ne) {}

      return newMsg;
    }
  },

  async markChatMessagesRead(roomId: string, userId: string): Promise<void> {
    if (isFirebaseActive && db) {
      // Find unread messages where receiver is userId and update them
      const path = "messages";
      try {
        const q = query(
          collection(db, path),
          where("roomId", "==", roomId),
          where("receiverId", "==", userId),
          where("isRead", "==", false)
        );
        const snap = await getDocs(q);
        snap.forEach(async (docSnap) => {
          await updateDoc(doc(db, "messages", docSnap.id), {
            isRead: true,
            readAt: new Date().toISOString(),
          });
        });
      } catch (error) {
        console.error("Failed to mark messages as read:", error);
      }
    } else {
      const stored = localStorage.getItem("pkl_chat_messages");
      if (stored) {
        const list: ChatMessage[] = JSON.parse(stored);
        let updated = false;
        list.forEach((m) => {
          if (m.roomId === roomId && m.receiverId === userId && !m.isRead) {
            m.isRead = true;
            m.readAt = new Date().toISOString();
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem("pkl_chat_messages", JSON.stringify(list));
        }
      }
    }
  },

  async deleteChatRoom(roomId: string): Promise<void> {
    if (isFirebaseActive && db) {
      const path = `chat_rooms/${roomId}`;
      try {
        await deleteDoc(doc(db, "chat_rooms", roomId));
        // Delete messages
        const q = query(collection(db, "messages"), where("roomId", "==", roomId));
        const snap = await getDocs(q);
        snap.forEach(async (docSnap) => {
          await deleteDoc(doc(db, "messages", docSnap.id));
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const storedRooms = localStorage.getItem("pkl_chat_rooms");
      if (storedRooms) {
        const rooms: ChatRoom[] = JSON.parse(storedRooms);
        localStorage.setItem("pkl_chat_rooms", JSON.stringify(rooms.filter(r => r.roomId !== roomId)));
      }
      const storedMsgs = localStorage.getItem("pkl_chat_messages");
      if (storedMsgs) {
        const msgs: ChatMessage[] = JSON.parse(storedMsgs);
        localStorage.setItem("pkl_chat_messages", JSON.stringify(msgs.filter(m => m.roomId !== roomId)));
      }
    }
  },

  // --- INBOX EMAIL-LIKE SYSTEM ---
  async getInboxMessages(userId: string): Promise<InboxMessage[]> {
    if (isFirebaseActive && db) {
      const path = "inbox_messages";
      try {
        const q = query(
          collection(db, path),
          where("receiverId", "==", userId),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        const msgs: InboxMessage[] = [];
        snap.forEach((docSnap) => {
          msgs.push({ id: docSnap.id, ...docSnap.data() } as InboxMessage);
        });
        
        // Also get sent messages to show in Sent folder
        const qSent = query(
          collection(db, path),
          where("senderId", "==", userId),
          orderBy("createdAt", "desc")
        );
        const snapSent = await getDocs(qSent);
        snapSent.forEach((docSnap) => {
          if (!msgs.some(m => m.id === docSnap.id)) {
            msgs.push({ id: docSnap.id, ...docSnap.data() } as InboxMessage);
          }
        });

        return msgs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const stored = localStorage.getItem("pkl_inbox_messages");
      const list: InboxMessage[] = stored ? JSON.parse(stored) : [];
      return list
        .filter((m) => m.receiverId === userId || m.senderId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  async sendInboxMessage(msg: Omit<InboxMessage, "id" | "createdAt" | "isRead" | "isStarred" | "isArchived" | "isTrashed">): Promise<InboxMessage> {
    const newMsgData = {
      ...msg,
      isRead: false,
      isStarred: false,
      isArchived: false,
      isTrashed: false,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseActive && db) {
      const path = "inbox_messages";
      try {
        const docRef = await addDoc(collection(db, path), newMsgData);
        
        // Create System Notification
        try {
          await pklService.createNotification({
            title: `Surat baru: ${msg.subject}`,
            content: `Anda menerima pesan inbox baru dari ${msg.senderName}`,
            time: "Baru saja",
            read: false,
            userId: msg.receiverId,
          });
        } catch (ne) {}

        return { id: docRef.id, ...newMsgData };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_inbox_messages");
      const list: InboxMessage[] = stored ? JSON.parse(stored) : [];
      const newMsg: InboxMessage = {
        id: `inbox_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        ...newMsgData,
      };
      list.unshift(newMsg);
      localStorage.setItem("pkl_inbox_messages", JSON.stringify(list));

      // Create notification
      try {
        await pklService.createNotification({
          title: `Surat baru: ${msg.subject}`,
          content: `Anda menerima pesan inbox baru dari ${msg.senderName}`,
          time: "Baru saja",
          read: false,
          userId: msg.receiverId,
        });
      } catch (ne) {}

      return newMsg;
    }
  },

  async updateInboxMessage(id: string, updates: Partial<InboxMessage>): Promise<void> {
    if (isFirebaseActive && db) {
      const path = `inbox_messages/${id}`;
      try {
        const cleanUpdates = { ...updates };
        delete (cleanUpdates as any).id;
        await updateDoc(doc(db, "inbox_messages", id), cleanUpdates);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
      }
    } else {
      const stored = localStorage.getItem("pkl_inbox_messages");
      if (stored) {
        const list: InboxMessage[] = JSON.parse(stored);
        const idx = list.findIndex(m => m.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], ...updates };
          localStorage.setItem("pkl_inbox_messages", JSON.stringify(list));
        }
      }
    }
  },

  // --- ANNOUNCEMENTS ---
  async getAnnouncements(): Promise<Announcement[]> {
    if (isFirebaseActive && db) {
      const path = "announcements";
      try {
        const q = query(collection(db, path), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const list: Announcement[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Announcement);
        });
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const stored = localStorage.getItem("pkl_announcements");
      return stored ? JSON.parse(stored) : SEED_ANNOUNCEMENTS;
    }
  },

  async createAnnouncement(ann: Omit<Announcement, "id" | "createdAt">): Promise<Announcement> {
    const newAnnData = {
      ...ann,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseActive && db) {
      const path = "announcements";
      try {
        const docRef = await addDoc(collection(db, path), newAnnData);
        
        // Notify targeted users
        try {
          const profiles = await pklService.getAllUserProfiles();
          let targetUsers: UserProfile[] = [];
          if (ann.targetRole === "all") {
            targetUsers = profiles;
          } else if (ann.targetRole === "siswa") {
            targetUsers = profiles.filter(p => p.role === "siswa" && (!ann.targetClass || p.kelas === ann.targetClass) && (!ann.targetIndustry || p.tempatPklId === ann.targetIndustry));
          } else {
            targetUsers = profiles.filter(p => p.role === ann.targetRole);
          }

          targetUsers.forEach(async (u) => {
            await pklService.createNotification({
              title: "Pengumuman Baru",
              content: ann.title,
              time: "Baru saja",
              read: false,
              userId: u.uid,
            });
          });
        } catch (ne) {}

        return { id: docRef.id, ...newAnnData };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_announcements");
      const list: Announcement[] = stored ? JSON.parse(stored) : [];
      const newAnn: Announcement = {
        id: `ann_${Date.now()}`,
        ...newAnnData,
      };
      list.unshift(newAnn);
      localStorage.setItem("pkl_announcements", JSON.stringify(list));

      // Trigger local notification to targets
      try {
        const profiles = await pklService.getAllUserProfiles();
        let targetUsers: UserProfile[] = [];
        if (ann.targetRole === "all") {
          targetUsers = profiles;
        } else if (ann.targetRole === "siswa") {
          targetUsers = profiles.filter(p => p.role === "siswa" && (!ann.targetClass || p.kelas === ann.targetClass) && (!ann.targetIndustry || p.tempatPklId === ann.targetIndustry));
        } else {
          targetUsers = profiles.filter(p => p.role === ann.targetRole);
        }

        targetUsers.forEach(async (u) => {
          await pklService.createNotification({
            title: "Pengumuman Baru",
            content: ann.title,
            time: "Baru saja",
            read: false,
            userId: u.uid,
          });
        });
      } catch (ne) {}

      return newAnn;
    }
  },

  async deleteAnnouncement(id: string): Promise<void> {
    if (isFirebaseActive && db) {
      const path = `announcements/${id}`;
      try {
        await deleteDoc(doc(db, "announcements", id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
    } else {
      const stored = localStorage.getItem("pkl_announcements");
      if (stored) {
        const list: Announcement[] = JSON.parse(stored);
        localStorage.setItem("pkl_announcements", JSON.stringify(list.filter(a => a.id !== id)));
      }
    }
  },

  // --- BROADCASTS ---
  async getBroadcasts(): Promise<BroadcastMessage[]> {
    if (isFirebaseActive && db) {
      const path = "broadcasts";
      try {
        const q = query(collection(db, path), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        const list: BroadcastMessage[] = [];
        snap.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as BroadcastMessage);
        });
        return list;
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
        return [];
      }
    } else {
      const stored = localStorage.getItem("pkl_broadcasts");
      return stored ? JSON.parse(stored) : [];
    }
  },

  async createBroadcast(broad: Omit<BroadcastMessage, "id" | "createdAt">): Promise<BroadcastMessage> {
    const newBroadData = {
      ...broad,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseActive && db) {
      const path = "broadcasts";
      try {
        const docRef = await addDoc(collection(db, path), newBroadData);
        
        // Push actual messages and chat rooms / inbox emails to targets
        try {
          const profiles = await pklService.getAllUserProfiles();
          let targetUsers: UserProfile[] = [];
          if (broad.target === "all_students") {
            targetUsers = profiles.filter(p => p.role === "siswa");
          } else if (broad.target === "all_teachers") {
            targetUsers = profiles.filter(p => p.role === "pembimbing");
          } else if (broad.target === "all_industries") {
            targetUsers = profiles.filter(p => p.role === "industri");
          } else if (broad.target === "class" && broad.targetValue) {
            targetUsers = profiles.filter(p => p.role === "siswa" && p.kelas === broad.targetValue);
          } else if (broad.target === "tempat_pkl" && broad.targetValue) {
            targetUsers = profiles.filter(p => p.tempatPklId === broad.targetValue);
          }

          // Trigger System Notifications & Chat Messages!
          targetUsers.forEach(async (u) => {
            // Send standard notification
            await pklService.createNotification({
              title: `Pesan Siaran (Broadcast): ${broad.title}`,
              content: broad.message,
              time: "Baru saja",
              read: false,
              userId: u.uid,
            });

            // Auto send inbox message
            await this.sendInboxMessage({
              senderId: broad.senderId,
              senderName: broad.senderName,
              senderRole: "system",
              receiverId: u.uid,
              receiverName: u.name,
              receiverRole: u.role,
              subject: `[BROADCAST] ${broad.title}`,
              body: broad.message,
              attachmentUrl: broad.attachmentUrl,
              attachmentName: broad.attachmentName,
            });

            // Or direct chat
            try {
              const room = await this.getOrCreateChatRoom([broad.senderId, u.uid]);
              await this.sendChatMessage(room.roomId, {
                senderId: broad.senderId,
                senderName: `${broad.senderName} (Broadcast)`,
                senderRole: "system",
                receiverId: u.uid,
                message: `📢 *${broad.title}*\n\n${broad.message}`,
                messageType: broad.attachmentUrl ? "file" : "text",
                attachmentUrl: broad.attachmentUrl,
                attachmentName: broad.attachmentName,
              });
            } catch (ce) {}
          });
        } catch (ne) {}

        return { id: docRef.id, ...newBroadData };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, path);
        throw error;
      }
    } else {
      const stored = localStorage.getItem("pkl_broadcasts");
      const list: BroadcastMessage[] = stored ? JSON.parse(stored) : [];
      const newBroad: BroadcastMessage = {
        id: `broad_${Date.now()}`,
        ...newBroadData,
      };
      list.unshift(newBroad);
      localStorage.setItem("pkl_broadcasts", JSON.stringify(list));

      // Trigger local notifications, inbox, and chats for targets
      try {
        const profiles = await pklService.getAllUserProfiles();
        let targetUsers: UserProfile[] = [];
        if (broad.target === "all_students") {
          targetUsers = profiles.filter(p => p.role === "siswa");
        } else if (broad.target === "all_teachers") {
          targetUsers = profiles.filter(p => p.role === "pembimbing");
        } else if (broad.target === "all_industries") {
          targetUsers = profiles.filter(p => p.role === "industri");
        } else if (broad.target === "class" && broad.targetValue) {
          targetUsers = profiles.filter(p => p.role === "siswa" && p.kelas === broad.targetValue);
        } else if (broad.target === "tempat_pkl" && broad.targetValue) {
          targetUsers = profiles.filter(p => p.tempatPklId === broad.targetValue);
        }

        targetUsers.forEach(async (u) => {
          await pklService.createNotification({
            title: `Pesan Siaran (Broadcast): ${broad.title}`,
            content: broad.message,
            time: "Baru saja",
            read: false,
            userId: u.uid,
          });

          await this.sendInboxMessage({
            senderId: broad.senderId,
            senderName: broad.senderName,
            senderRole: "system",
            receiverId: u.uid,
            receiverName: u.name,
            receiverRole: u.role,
            subject: `[BROADCAST] ${broad.title}`,
            body: broad.message,
            attachmentUrl: broad.attachmentUrl,
            attachmentName: broad.attachmentName,
          });

          try {
            const room = await this.getOrCreateChatRoom([broad.senderId, u.uid]);
            await this.sendChatMessage(room.roomId, {
              senderId: broad.senderId,
              senderName: `${broad.senderName} (Broadcast)`,
              senderRole: "system",
              receiverId: u.uid,
              message: `📢 *${broad.title}*\n\n${broad.message}`,
              messageType: broad.attachmentUrl ? "file" : "text",
              attachmentUrl: broad.attachmentUrl,
              attachmentName: broad.attachmentName,
            });
          } catch (ce) {}
        });
      } catch (ne) {}

      return newBroad;
    }
  },
};
