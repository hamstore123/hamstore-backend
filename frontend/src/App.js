import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Kasir from "@/pages/Kasir";
import Purchases from "@/pages/Purchases";
import PPOB from "@/pages/PPOB";
import Stock from "@/pages/Stock";
import HpPrices from "@/pages/HpPrices";
import Assets from "@/pages/Assets";
import Services from "@/pages/Services";
import ServicePrices from "@/pages/ServicePrices";
import Customers from "@/pages/Customers";
import Suppliers from "@/pages/Suppliers";
import Debts from "@/pages/Debts";
import Expenses from "@/pages/Expenses";
import Attendance from "@/pages/Attendance";
import Staff from "@/pages/Staff";
import Tasks from "@/pages/Tasks";
import ContentSchedule from "@/pages/ContentSchedule";
import Performance from "@/pages/Performance";
import Reports from "@/pages/Reports";
import CashDrawer from "@/pages/CashDrawer";
import SalesHistory from "@/pages/SalesHistory";
import StockAnalysis from "@/pages/StockAnalysis";
import ActivityLog from "@/pages/ActivityLog";
import IMEICheck from "@/pages/IMEICheck";

const Protected = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

const OwnerRoute = ({ children }) => {
  const { user, isOwner } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isOwner) return <Layout><Navigate to="/" replace /></Layout>;
  return <Layout>{children}</Layout>;
};

const ROUTES = [
  ["/", Dashboard],
  ["/kasir", Kasir],
  ["/riwayat-penjualan", SalesHistory],
  ["/cash-drawer", CashDrawer],
  ["/ppob", PPOB],
  ["/pembelian", Purchases, true],
  ["/produk", Products],
  ["/stok", Stock],
  ["/analisis-stok", StockAnalysis],
  ["/harga-hp", HpPrices],
  ["/aset", Assets],
  ["/service", Services],
  ["/harga-service", ServicePrices],
  ["/pelanggan", Customers],
  ["/supplier", Suppliers, true],
  ["/hutang-piutang", Debts, true],
  ["/pengeluaran", Expenses, true],
  ["/absensi", Attendance],
  ["/staf", Staff, true],
  ["/jobdesk", Tasks],
  ["/konten", ContentSchedule],
  ["/kinerja", Performance, true],
  ["/log-aktivitas", ActivityLog, true],
  ["/laporan", Reports, true],
  ["/imei", IMEICheck],
];

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          {ROUTES.map(([path, C, owner]) => (
            <Route
              key={path}
              path={path}
              element={owner ? <OwnerRoute><C /></OwnerRoute> : <Protected><C /></Protected>}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
