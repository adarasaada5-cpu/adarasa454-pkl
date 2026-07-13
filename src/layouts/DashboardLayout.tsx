import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { pklService } from "../services/pklService";
import { SCHOOL_NAME, APP_NAME, APP_VERSION, COPYRIGHT_YEAR } from "../constants";
import { motion, AnimatePresence } from "motion/react";
import {
  Menu as MenuIcon,
  ChevronLeft,
  LayoutDashboard,
  CalendarDays,
  FilePenLine,
  Building2,
  Users,
  LogOut,
  User,
  CheckSquare,
  Search,
  Bell,
  Sun,
  Moon,
  Trash2,
} from "lucide-react";
import {
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Badge,
  Popover,
} from "@mui/material";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Custom interface for mock notification
interface SystemNotification {
  id: string;
  title: string;
  content: string;
  time: string;
  read: boolean;
  userId: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("pkl_dark_mode") === "true";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("pkl_dark_mode", String(darkMode));
  }, [darkMode]);

  // Profile menu state (MUI)
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const profileMenuOpen = Boolean(anchorEl);

  // Notifications state
  const [notiAnchorEl, setNotiAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

  useEffect(() => {
    if (user) {
      const loadNotifications = async () => {
        try {
          const fetched = await pklService.getNotifications(user.uid);
          setNotifications(fetched as any[]);
        } catch (e) {
          console.error("Failed to load notifications:", e);
        }
      };
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Global Toast Snackbar State
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastSeverity, setToastSeverity] = useState<"success" | "info" | "warning" | "error">("success");

  // Global Confirm Dialog State
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [onConfirmCallback, setOnConfirmCallback] = useState<() => void>(() => {});

  // Expose toast and confirm globally so pages can call them easily
  useEffect(() => {
    (window as any).showToast = (msg: string, severity: "success" | "info" | "warning" | "error" = "success") => {
      setToastMessage(msg);
      setToastSeverity(severity);
      setToastOpen(true);
    };

    (window as any).showConfirmDialog = (title: string, msg: string, callback: () => void) => {
      setConfirmTitle(title);
      setConfirmMessage(msg);
      setOnConfirmCallback(() => callback);
      setConfirmOpen(true);
    };

    return () => {
      delete (window as any).showToast;
      delete (window as any).showConfirmDialog;
    };
  }, []);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  const handleNotiClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotiAnchorEl(event.currentTarget);
  };

  const handleNotiClose = () => {
    setNotiAnchorEl(null);
  };

  const markAllNotiRead = async () => {
    try {
      const unreads = notifications.filter(n => !n.read);
      for (const n of unreads) {
        await pklService.markNotificationRead(n.id);
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      (window as any).showToast?.("Semua notifikasi ditandai telah dibaca", "info");
    } catch (e) {
      console.error(e);
    }
    handleNotiClose();
  };

  const handleLogout = async () => {
    handleProfileClose();
    await logout();
    navigate("/login");
  };

  // Helper to construct dynamic Breadcrumbs
  const renderBreadcrumbs = () => {
    const pathnames = location.pathname.split("/").filter(x => x);
    if (pathnames.length === 0) return null;

    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium select-none mb-4">
        <Link to="/dashboard" className="hover:text-[#1565C0] transition-colors flex items-center gap-1">
          <span className="material-icons text-[14px]">home</span>
          <span>Beranda</span>
        </Link>
        {pathnames.map((value, index) => {
          const to = `/${pathnames.slice(0, index + 1).join("/")}`;
          const isLast = index === pathnames.length - 1;
          const displayValue = value
            .replace("-", " ")
            .replace(/(^\w|\s\w)/g, m => m.toUpperCase());

          return (
            <React.Fragment key={to}>
              <span className="text-gray-300">/</span>
              {isLast ? (
                <span className="text-gray-700 dark:text-gray-300 font-semibold">{displayValue}</span>
              ) : (
                <Link to={to} className="hover:text-[#1565C0] transition-colors">
                  {displayValue}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // Sidebar items based on roles
  const getNavItems = () => {
    const role = user?.role || "siswa";

    const common = [
      {
        path: "/dashboard",
        label: "Dashboard",
        icon: <span className="material-icons text-[20px]">dashboard</span>,
      },
      {
        path: "/communication-center",
        label: "Communication Center",
        icon: <span className="material-icons text-[20px]">forum</span>,
      },
    ];

    if (role === "siswa") {
      return [
        ...common,
        {
          path: "/presensi",
          label: "Absensi Presensi",
          icon: <span className="material-icons text-[20px]">today</span>,
        },
        {
          path: "/jurnal",
          label: "Jurnal Harian",
          icon: <span className="material-icons text-[20px]">assignment</span>,
        },
        {
          path: "/penilaian",
          label: "Nilai PKL Saya",
          icon: <span className="material-icons text-[20px]">star_rate</span>,
        }
      ];
    }

    if (role === "pembimbing") {
      return [
        ...common,
        {
          path: "/jurnal-review",
          label: "Persetujuan Jurnal",
          icon: <span className="material-icons text-[20px]">fact_check</span>,
        },
        {
          path: "/rekap-kehadiran",
          label: "Rekap Kehadiran",
          icon: <span className="material-icons text-[20px]">rule</span>,
        },
        {
          path: "/manajemen-absensi",
          label: "Manajemen Absensi",
          icon: <span className="material-icons text-[20px]">playlist_add_check</span>,
        },
        {
          path: "/monitoring",
          label: "Form Monitoring",
          icon: <span className="material-icons text-[20px]">assignment_turned_in</span>,
        },
        {
          path: "/catatan-pembimbing",
          label: "Catatan Pembimbing",
          icon: <span className="material-icons text-[20px]">rate_review</span>,
        },
        {
          path: "/ai-assistant",
          label: "AI Assistant",
          icon: <span className="material-icons text-[20px]">smart_toy</span>,
        },
        {
          path: "/penilaian",
          label: "Penilaian Siswa",
          icon: <span className="material-icons text-[20px]">assessment</span>,
        }
      ];
    }

    if (role === "industri") {
      return [
        ...common,
        {
          path: "/jurnal-review",
          label: "Review Jurnal",
          icon: <span className="material-icons text-[20px]">fact_check</span>,
        },
        {
          path: "/rekap-kehadiran",
          label: "Absensi Bimbingan",
          icon: <span className="material-icons text-[20px]">rule</span>,
        },
        {
          path: "/manajemen-absensi",
          label: "Manajemen Absensi",
          icon: <span className="material-icons text-[20px]">playlist_add_check</span>,
        },
        {
          path: "/penilaian",
          label: "Penilaian PKL",
          icon: <span className="material-icons text-[20px]">stars</span>,
        }
      ];
    }

    // admin role
    return [
      ...common,
      {
        path: "/tempat-pkl",
        label: "Manajemen Mitra PKL",
        icon: <span className="material-icons text-[20px]">business</span>,
      },
      {
        path: "/manajemen-siswa",
        label: "Manajemen Akun Siswa",
        icon: <span className="material-icons text-[20px]">group</span>,
      },
      {
        path: "/manajemen-pembimbing",
        label: "Manajemen Akun Pembimbing",
        icon: <span className="material-icons text-[20px]">supervisor_account</span>,
      },
      {
        path: "/siswa-monitoring",
        label: "Monitoring Siswa",
        icon: <span className="material-icons text-[20px]">badge</span>,
      },
      {
        path: "/manajemen-absensi",
        label: "Manajemen Absensi",
        icon: <span className="material-icons text-[20px]">rule</span>,
      },
      {
        path: "/jurnal-review",
        label: "Katalog Jurnal",
        icon: <span className="material-icons text-[20px]">history_edu</span>,
      },
      {
        path: "/catatan-pembimbing",
        label: "Catatan Pembimbing",
        icon: <span className="material-icons text-[20px]">rate_review</span>,
      },
      {
        path: "/admin/monitoring",
        label: "Rekap Monitoring Guru",
        icon: <span className="material-icons text-[20px]">assignment_turned_in</span>,
      },
      {
        path: "/ai-assistant",
        label: "AI Assistant",
        icon: <span className="material-icons text-[20px]">smart_toy</span>,
      },
      {
        path: "/penilaian",
        label: "Manajemen Nilai",
        icon: <span className="material-icons text-[20px]">star_half</span>,
      },
      {
        path: "/pengaturan",
        label: "Pengaturan Sekolah",
        icon: <span className="material-icons text-[20px]">settings_org</span>,
      }
    ];
  };

  const navItems = getNavItems();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white text-[#333333] dark:bg-[#111827]">
      {/* Sidebar Header with Brand Logo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 h-16">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0 animate-pulse">
            A
          </div>
          <div className="flex flex-col select-none">
            <span className="font-bold text-sm tracking-tight text-[#1565C0] dark:text-[#60A5FA] truncate">
              {APP_NAME}
            </span>
            <span className="text-[9px] text-gray-400 uppercase tracking-widest font-semibold truncate">
              {SCHOOL_NAME}
            </span>
          </div>
        </div>

        {/* Toggle Collapse Button for Large Screens */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden md:flex p-1 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors border border-gray-200/40 dark:border-gray-700/40"
          id="btn-sidebar-collapse"
        >
          <ChevronLeft
            className={`w-4 h-4 transition-transform duration-300 ${!sidebarOpen ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {/* User Quick Info Badge (Only when sidebar expanded) */}
      <div className="p-4 bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.name}
              className="w-10 h-10 rounded-lg object-cover ring-2 ring-gray-100 dark:ring-gray-800"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#1565C0] text-white flex items-center justify-center font-bold text-sm shadow-sm border border-white dark:border-gray-800">
              {user?.name?.substring(0, 1) || "P"}
            </div>
          )}
          {sidebarOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-xs text-gray-800 dark:text-gray-200 truncate">{user?.name}</span>
              <span className="text-[9px] text-[#2E7D32] dark:text-[#34D399] font-bold tracking-wider uppercase flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {user?.role === "siswa" ? "Siswa PKL" : user?.role === "pembimbing" ? "Guru Pembimbing" : user?.role === "industri" ? "Penyelia Industri" : "Admin Sekolah"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {sidebarOpen && (
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-2 mb-2">Menu Utama</p>
        )}
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileSidebarOpen(false)}
              id={`nav-item-${item.path.replace("/", "")}`}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                isActive
                  ? "bg-[#1565C0]/10 text-[#1565C0] dark:bg-blue-500/15 dark:text-[#60A5FA]"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
              }`}
            >
              <div className={`flex items-center justify-center ${isActive ? "text-[#1565C0] dark:text-[#60A5FA]" : "text-gray-400"}`}>
                {item.icon}
              </div>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout button in Sidebar */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={handleLogout}
          id="btn-sidebar-logout"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-700 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="w-5 h-5 text-red-500" />
          {sidebarOpen && <span>Keluar Sesi</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FC] dark:bg-[#0B0F19] flex flex-col font-sans" id="app-dashboard-layout">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 h-16 bg-white dark:bg-[#111827] border-b border-gray-200/80 dark:border-gray-800 shadow-sm flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4 flex-1">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
            id="btn-mobile-hamburger"
          >
            <MenuIcon className="w-6 h-6" />
          </button>

          {/* Desktop header brand display (only when sidebar is collapsed) */}
          {!sidebarOpen && (
            <div className="hidden md:flex items-center gap-2 select-none">
              <div className="w-8 h-8 rounded-lg bg-[#1565C0] text-white flex items-center justify-center font-bold text-sm">
                S
              </div>
              <span className="font-bold text-md text-[#1565C0] dark:text-[#60A5FA] tracking-wide">
                {APP_NAME}
              </span>
            </div>
          )}

          {sidebarOpen && (
            <div className="hidden md:block select-none text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 py-1 px-3 rounded-full uppercase tracking-wider">
              System Aplikasi PKL SMK
            </div>
          )}

          {/* Search Box */}
          <div className="hidden lg:flex items-center gap-2 bg-gray-50 dark:bg-[#1F2937] border border-gray-200/60 dark:border-gray-700/60 rounded-xl px-3 py-1.5 w-64 max-w-xs focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all ml-4">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Cari data, jurnal, absensi..."
              className="bg-transparent border-none text-xs outline-none text-gray-700 dark:text-gray-200 w-full"
            />
          </div>
        </div>

        {/* Controls: Dark Mode, Noti Bell, Profile Menu */}
        <div className="flex items-center gap-3">
          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all border border-gray-200/30 dark:border-gray-700/30"
            title={darkMode ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
            id="btn-dark-mode-toggle"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>

          {/* Notification Bell */}
          <button
            onClick={handleNotiClick}
            className="p-2 rounded-xl bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all relative border border-gray-200/30 dark:border-gray-700/30"
            id="btn-noti-bell"
          >
            <Badge badgeContent={unreadCount} color="error" overlap="rectangular">
              <Bell className="w-4 h-4" />
            </Badge>
          </button>

          {/* Notifications Popover */}
          <Popover
            open={Boolean(notiAnchorEl)}
            anchorEl={notiAnchorEl}
            onClose={handleNotiClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: {
                style: {
                  width: "320px",
                  borderRadius: "16px",
                  padding: "12px",
                  marginTop: "8px",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }
              }
            }}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
              <span className="font-bold text-xs text-gray-800 dark:text-gray-200 uppercase tracking-wider">Notifikasi Sistem</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotiRead}
                  className="text-[10px] text-blue-600 hover:underline font-semibold"
                >
                  Tandai dibaca
                </button>
              )}
            </div>
            <div className="py-2 space-y-2 max-h-60 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-gray-400 text-center py-4">Tidak ada notifikasi baru</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl text-xs transition-colors ${n.read ? "bg-transparent text-gray-500" : "bg-blue-50/50 dark:bg-blue-950/10 text-gray-800 dark:text-gray-200 font-medium"}`}
                  >
                    <p className="font-bold">{n.title}</p>
                    {n.content && <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">{n.content}</p>}
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {n.time || (n as any).createdAt ? new Date((n as any).createdAt).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "Baru saja"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Popover>

          {/* User Quick Info */}
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none">{user?.name}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 uppercase font-bold tracking-wider">
              {user?.role === "siswa" ? `Siswa (${user.kelas})` : user?.role === "pembimbing" ? "Guru Pembimbing" : "Super Admin"}
            </span>
          </div>

          <button
            onClick={handleProfileClick}
            className="flex items-center gap-1 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none"
            id="btn-navbar-profile-trigger"
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-100 dark:ring-gray-800"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#1565C0] text-white flex items-center justify-center font-bold text-sm">
                {user?.name?.substring(0, 1) || "U"}
              </div>
            )}
          </button>

          {/* Material UI Profile Menu */}
          <Menu
            anchorEl={anchorEl}
            open={profileMenuOpen}
            onClose={handleProfileClose}
            onClick={handleProfileClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            slotProps={{
              paper: {
                elevation: 3,
                style: {
                  borderRadius: "16px",
                  padding: "4px",
                  minWidth: "200px",
                  marginTop: "8px",
                },
              },
            }}
          >
            <div className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 font-sans">
              <p className="font-semibold text-gray-900 dark:text-gray-100">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
            </div>
            <Divider className="my-1 dark:border-gray-800" />
            <MenuItem onClick={() => navigate("/profile")} className="text-sm gap-2 py-2">
              <ListItemIcon>
                <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </ListItemIcon>
              Profil Saya
            </MenuItem>
            <MenuItem onClick={handleLogout} className="text-sm gap-2 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20">
              <ListItemIcon>
                <LogOut className="w-4 h-4 text-red-500" />
              </ListItemIcon>
              Keluar Aplikasi
            </MenuItem>
          </Menu>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex relative">
        {/* Desktop Sidebar Panel */}
        <aside
          className={`hidden md:block border-r border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#111827] transition-all duration-300 ${
            sidebarOpen ? "w-64" : "w-20"
          }`}
        >
          <div className="h-full sticky top-16" style={{ height: "calc(100vh - 4rem)" }}>
            {sidebarContent}
          </div>
        </aside>

        {/* Mobile Sidebar overlay */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              {/* Dark backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black z-40 md:hidden"
              />
              {/* Sliding sidebar container */}
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.25 }}
                className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-[#111827] z-50 md:hidden shadow-2xl border-r border-gray-200 dark:border-gray-800"
              >
                {sidebarContent}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Stage */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 flex flex-col justify-between">
          <div className="flex-1 pb-12">
            {/* Dynamic Breadcrumbs */}
            {renderBreadcrumbs()}

            {children}
          </div>

          {/* Footer Component */}
          <footer className="mt-auto border-t border-gray-200 dark:border-gray-800 pt-6 pb-2 text-center text-xs text-gray-500 font-sans">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
              <p className="font-semibold text-gray-700 dark:text-gray-300 tracking-wide">
                {SCHOOL_NAME}
              </p>
              <p className="font-mono text-gray-400 dark:text-gray-500">
                Aplikasi PKL {APP_VERSION}
              </p>
              <p>
                &copy; {COPYRIGHT_YEAR} {SCHOOL_NAME}. All Rights Reserved.
              </p>
            </div>
          </footer>
        </main>
      </div>

      {/* GLOBAL TOAST SNACKBAR */}
      <Snackbar
        open={toastOpen}
        autoHideDuration={4000}
        onClose={() => setToastOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToastOpen(false)}
          severity={toastSeverity}
          variant="filled"
          sx={{ borderRadius: "12px", fontSize: "13px" }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>

      {/* GLOBAL CONFIRM DIALOG */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        slotProps={{
          paper: {
            style: {
              borderRadius: "20px",
              padding: "12px",
            }
          }
        }}
      >
        <DialogTitle className="font-bold text-lg text-gray-900 flex items-center gap-2">
          <span className="material-icons text-red-500">warning</span>
          {confirmTitle}
        </DialogTitle>
        <DialogContent>
          <DialogContentText className="text-sm text-gray-600 mt-2">
            {confirmMessage}
          </DialogContentText>
        </DialogContent>
        <DialogActions className="gap-2 p-4">
          <Button
            onClick={() => setConfirmOpen(false)}
            variant="text"
            sx={{ borderRadius: "10px", color: "#64748B", textTransform: "none", fontWeight: 600 }}
          >
            Batal
          </Button>
          <Button
            onClick={() => {
              setConfirmOpen(false);
              onConfirmCallback();
            }}
            variant="contained"
            color="error"
            sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 600 }}
          >
            Hapus Data
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
export default DashboardLayout;
