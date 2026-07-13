import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoadingScreen } from "./components/LoadingScreen";
import { DashboardLayout } from "./layouts/DashboardLayout";

// Import Pages
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Presensi } from "./pages/Presensi";
import { Jurnal } from "./pages/Jurnal";
import { JurnalReview } from "./pages/JurnalReview";
import { TempatPkl } from "./pages/TempatPkl";
import { SiswaMonitoring } from "./pages/SiswaMonitoring";
import { Profile } from "./pages/Profile";
import { Penilaian } from "./pages/Penilaian";
import { Pengaturan } from "./pages/Pengaturan";
import { NotFound } from "./pages/NotFound";
import { KehadiranManajemen } from "./pages/ManajemenAbsensi";
import { ManajemenSiswa } from "./pages/ManajemenSiswa";
import { ManajemenPembimbing } from "./pages/ManajemenPembimbing";
import { CatatanPembimbing } from "./pages/CatatanPembimbing";
import { AIAssistant } from "./pages/AIAssistant";
import { Monitoring } from "./pages/Monitoring";
import { AdminMonitoring } from "./pages/AdminMonitoring";
import { CommunicationCenter } from "./pages/CommunicationCenter";

// Material UI Theming
import { ThemeProvider, createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1565C0", // requested primary
    },
    secondary: {
      main: "#2E7D32", // requested secondary
    },
    background: {
      default: "#F8F9FA", // requested background
    },
  },
  typography: {
    fontFamily: "Poppins, sans-serif",
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
  },
});

// Protected Route Guard Component
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ("siswa" | "pembimbing" | "industri" | "admin")[];
}> = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    // Redirect to login if unauthenticated
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If authenticated but unauthorized, redirect to safe main dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
};

// Main Routing Container
const AppRoutes: React.FC = () => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public Login Route */}
      <Route path="/login" element={<Login />} />

      {/* Protected Main Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Navigate to="/dashboard" replace />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Siswa only routes */}
      <Route
        path="/presensi"
        element={
          <ProtectedRoute allowedRoles={["siswa"]}>
            <Presensi />
          </ProtectedRoute>
        }
      />

      <Route
        path="/jurnal"
        element={
          <ProtectedRoute allowedRoles={["siswa"]}>
            <Jurnal />
          </ProtectedRoute>
        }
      />

      {/* Guru / Pembimbing or Admin or Industri routes */}
      <Route
        path="/jurnal-review"
        element={
          <ProtectedRoute allowedRoles={["pembimbing", "industri", "admin"]}>
            <JurnalReview />
          </ProtectedRoute>
        }
      />

      <Route
        path="/rekap-kehadiran"
        element={
          <ProtectedRoute allowedRoles={["pembimbing", "industri", "admin"]}>
            <SiswaMonitoring />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tempat-pkl"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <TempatPkl />
          </ProtectedRoute>
        }
      />

      <Route
        path="/siswa-monitoring"
        element={
          <ProtectedRoute allowedRoles={["admin", "pembimbing"]}>
            <SiswaMonitoring />
          </ProtectedRoute>
        }
      />

      <Route
        path="/catatan-pembimbing"
        element={
          <ProtectedRoute allowedRoles={["admin", "pembimbing"]}>
            <CatatanPembimbing />
          </ProtectedRoute>
        }
      />

      <Route
        path="/ai-assistant"
        element={
          <ProtectedRoute allowedRoles={["admin", "pembimbing"]}>
            <AIAssistant />
          </ProtectedRoute>
        }
      />

      <Route
        path="/monitoring"
        element={
          <ProtectedRoute allowedRoles={["admin", "pembimbing"]}>
            <Monitoring />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/monitoring"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminMonitoring />
          </ProtectedRoute>
        }
      />

      {/* Shared routes across all roles */}
      <Route
        path="/penilaian"
        element={
          <ProtectedRoute allowedRoles={["siswa", "pembimbing", "industri", "admin"]}>
            <Penilaian />
          </ProtectedRoute>
        }
      />

      {/* Admin specific configuration route */}
      <Route
        path="/pengaturan"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Pengaturan />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manajemen-absensi"
        element={
          <ProtectedRoute allowedRoles={["admin", "pembimbing", "industri"]}>
            <KehadiranManajemen />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manajemen-siswa"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ManajemenSiswa />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manajemen-pembimbing"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <ManajemenPembimbing />
          </ProtectedRoute>
        }
      />

      {/* Shared Profile Route */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      {/* Communication Center Route */}
      <Route
        path="/communication-center"
        element={
          <ProtectedRoute allowedRoles={["siswa", "pembimbing", "industri", "admin"]}>
            <CommunicationCenter />
          </ProtectedRoute>
        }
      />

      {/* 404 Catch All Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
