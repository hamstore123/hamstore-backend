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

const Protected = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
};

const ROUTES = [
  ["/", Dashboard],
  ["/kasir", Kasir],
  ["/pembelian", Purchases],
  ["/ppob", PPOB],
  ["/produk", Products],
  ["/stok", Stock],
  ["/harga-hp", HpPrices],
  ["/service", Services],
  ["/harga-service", ServicePrices],
  ["/pelanggan", Customers],
  ["/supplier", Suppliers],
  ["/hutang-piutang", Debts],
  ["/pengeluaran", Expenses],
  ["/absensi", Attendance],
  ["/staf", Staff],
  ["/jobdesk", Tasks],
  ["/konten", ContentSchedule],
  ["/kinerja", Performance],
  ["/laporan", Reports],
];

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<Login />} />
          {ROUTES.map(([path, C]) => (
            <Route key={path} path={path} element={<Protected><C /></Protected>} />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
