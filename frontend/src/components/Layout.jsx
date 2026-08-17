import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Users, Boxes,
  Wrench, Tags, Smartphone, HandCoins, Receipt, CalendarClock,
  UserCog, ListTodo, Megaphone, TrendingUp, Zap, FileBarChart,
  LogOut, Menu, Banknote, History, PackageSearch, ScrollText,
} from "lucide-react";
import logo from "@/assets/ham-logo.png";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { section: "Transaksi" },
  { to: "/kasir", label: "Kasir / Penjualan", icon: ShoppingCart },
  { to: "/riwayat-penjualan", label: "Riwayat Penjualan", icon: History },
  { to: "/cash-drawer", label: "Cash Drawer / Shift", icon: Banknote },
  { to: "/ppob", label: "PPOB", icon: Zap },
  { to: "/pembelian", label: "Pembelian", icon: Truck, owner: true },
  { section: "Inventaris" },
  { to: "/produk", label: "Produk", icon: Package },
  { to: "/stok", label: "Stok & Opname", icon: Boxes },
  { to: "/analisis-stok", label: "Analisis Stok", icon: PackageSearch },
  { to: "/harga-hp", label: "Harga HP (Tukar)", icon: Smartphone },
  { section: "Service" },
  { to: "/service", label: "Data Service", icon: Wrench },
  { to: "/harga-service", label: "Master Harga Service", icon: Tags },
  { section: "Relasi" },
  { to: "/pelanggan", label: "Pelanggan", icon: Users },
  { to: "/supplier", label: "Supplier", icon: Truck, owner: true },
  { to: "/hutang-piutang", label: "Hutang / Piutang", icon: HandCoins, owner: true },
  { to: "/pengeluaran", label: "Pengeluaran", icon: Receipt, owner: true },
  { section: "Karyawan" },
  { to: "/absensi", label: "Absensi", icon: CalendarClock },
  { to: "/jobdesk", label: "Jobdesk / Task", icon: ListTodo },
  { to: "/konten", label: "Jadwal Konten", icon: Megaphone },
  { to: "/staf", label: "Karyawan", icon: UserCog, owner: true },
  { to: "/kinerja", label: "Kinerja Karyawan", icon: TrendingUp, owner: true },
  { to: "/log-aktivitas", label: "Log Aktivitas", icon: ScrollText, owner: true },
  { section: "Laporan", owner: true },
  { to: "/laporan", label: "Laporan Keuangan", icon: FileBarChart, owner: true },
  { to: "/aset", label: "Aset Toko", icon: Boxes },
  { to: "/imei", label: "Cek IMEI", icon: PackageSearch },
];

export default function Layout({ children }) {
  const { user, logout, isOwner, isStaff } = useAuth();
  const STAFF_ALLOWED = new Set([
    "/kasir",
    "/riwayat-penjualan",
    "/cash-drawer",
    "/ppob",
    "/produk",
    "/stok",
    "/analisis-stok",
    "/harga-hp",
    "/aset",
    "/imei",
    "/service",
    "/harga-service",
    "/pelanggan",
    "/pengeluaran",
    "/absensi",
    "/jobdesk",
    "/konten",
  ]);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const Sidebar = (
    <aside className="w-64 sidebar-shell text-slate-300 flex flex-col h-full shrink-0">
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10 sidebar-brand">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center p-1 shrink-0">
          <img src={logo} alt="HAM Store" className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="text-white font-semibold leading-tight">HAM Store</div>
          <div className="text-[11px] text-slate-400">Manajemen Toko HP</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV.map((item, i) => {
          if (item.section) {
            if (item.owner && !isOwner) return null;
            return (
              <div key={i} className="px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {item.section}
              </div>
            );
          }
            if (item.owner && !isOwner) return null;
            if (isStaff && item.to && !STAFF_ALLOWED.has(item.to)) return null;
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setOpen(false)}
              data-testid={`nav-${item.to.replace(/\//g, "") || "dashboard"}`}
              className={({ isActive }) =>
                `nav-item flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                  isActive ? "nav-item-active text-white font-medium" : "hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon className="w-[18px] h-[18px]" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <div className="hidden lg:block">{Sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ x: -280, opacity: 0.7 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0.7 }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="absolute left-0 top-0 h-full"
          >{Sidebar}</motion.div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 app-topbar flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
          <button className="lg:hidden p-2" onClick={() => setOpen(true)} data-testid="mobile-menu-btn">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden md:block text-sm text-slate-500">
            {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-800">{user?.name}</div>
              <div className="text-[11px] uppercase text-sky-600 font-semibold">{user?.role}</div>
            </div>
            <div className="w-9 h-9 rounded-xl avatar-chip flex items-center justify-center font-semibold">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <button
              onClick={logout}
              data-testid="logout-btn"
              className="p-2 rounded-md hover:bg-slate-100 text-slate-500"
              title="Keluar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 overflow-y-auto app-main p-4 md:p-6"
        >{children}</motion.main>
      </div>
    </div>
  );
}
