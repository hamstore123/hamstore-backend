import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api, { fmtIDR } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  TrendingUp, ShoppingCart, Package, Wallet, AlertTriangle, Users, Boxes, Receipt,
  Eye, Heart, MessageCircle,
} from "lucide-react";

const Stat = ({ icon: Icon, label, value, sub, tone = "sky", delay = 0 }) => {
  const tones = {
    sky: "bg-sky-50 text-sky-600", green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -7, scale: 1.015 }}
      className="dashboard-stat bg-white p-5 rounded-xl border border-slate-200 shadow-sm" data-testid={`kpi-${label.toLowerCase().replace(/ /g, "-")}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide font-medium text-slate-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tones[tone]}`}><Icon className="w-5 h-5" /></div>
      </div>
      <div className="mt-3 text-2xl font-semibold font-mono-num text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </motion.div>
  );
};

const Row = ({ label, value, tone = "text-slate-800" }) => (
  <div className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
    <span className="text-slate-500">{label}</span>
    <span className={`font-mono-num font-medium ${tone}`}>{value}</span>
  </div>
);

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard/summary").then(({ data }) => setD(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  const s = d || {};

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Ringkasan operasional toko" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat delay={0.04} icon={ShoppingCart} label="Penjualan Hari Ini" value={fmtIDR(s.sales_today)} sub={`${s.tx_today || 0} transaksi`} tone="sky" />
        <Stat delay={0.09} icon={Wallet} label="Penjualan Bulan Ini" value={fmtIDR(s.sales_month)} tone="sky" />
        <Stat delay={0.14} icon={TrendingUp} label="Laba Bersih Bulan Ini" value={fmtIDR(s.profit_month)} sub={`Kotor ${fmtIDR(s.gross_profit)}`} tone="green" />
        <Stat delay={0.19} icon={Receipt} label="Pengeluaran Bulan Ini" value={fmtIDR(s.expense_month)} tone="red" />
        <Stat delay={0.24} icon={Package} label="Total Produk" value={s.products_count ?? 0} tone="slate" />
        <Stat delay={0.29} icon={Users} label="Total Pelanggan" value={s.customers_count ?? 0} tone="slate" />
        <Stat delay={0.34} icon={AlertTriangle} label="Stok Menipis" value={s.low_stock_count ?? 0} tone="amber" />
        <Stat delay={0.39} icon={Boxes} label="Laba PPOB Bulan Ini" value={fmtIDR(s.ppob_profit)} tone="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <motion.div initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }} className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm dashboard-panel">
          <h3 className="font-medium text-slate-800 mb-4">Tren Penjualan 7 Hari</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={s.trend_7d || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} width={40} />
              <Tooltip formatter={(v) => fmtIDR(v)} />
              <Line type="monotone" dataKey="total" stroke="#0284c7" strokeWidth={3} dot={{ r: 4, fill: "#0284c7" }} isAnimationActive animationDuration={1200} animationEasing="ease-out" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-medium text-slate-800 mb-3">Konten Viral / FYP (Uploaded)</h3>
          {(s.top_content || []).filter((c) => (c.views || c.likes || c.comments)).length === 0 ? (
            <div className="text-sm text-slate-400 py-6 text-center">Belum ada metrik konten. Isi views/like/komen di halaman Jadwal Konten setelah upload.</div>
          ) : (
            <div className="space-y-2">
              {(s.top_content || []).map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0" data-testid={`viral-${c.id}`}>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{c.title || "(tanpa judul)"}</div>
                    <div className="text-xs text-slate-400 capitalize">{c.platform} · {c.staff_name}{c.link && <a href={c.link} target="_blank" rel="noreferrer" className="text-sky-600 ml-2">buka</a>}</div>
                  </div>
                  <div className="flex gap-4 text-xs font-mono-num shrink-0">
                    <span className="flex items-center gap-1 text-slate-600"><Eye className="w-3.5 h-3.5 text-sky-500" />{(c.views || 0).toLocaleString("id-ID")}</span>
                    <span className="flex items-center gap-1 text-slate-600"><Heart className="w-3.5 h-3.5 text-red-500" />{(c.likes || 0).toLocaleString("id-ID")}</span>
                    <span className="flex items-center gap-1 text-slate-600"><MessageCircle className="w-3.5 h-3.5 text-green-500" />{(c.comments || 0).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-medium text-slate-800 mb-3">Keuangan</h3>
          <div className="space-y-1 text-sm">
            <Row label="Total Piutang" value={fmtIDR(s.total_piutang)} tone="text-amber-600" />
            <Row label="Total Hutang" value={fmtIDR(s.total_hutang)} tone="text-red-600" />
            <Row label="Laba Kotor" value={fmtIDR(s.gross_profit)} tone="text-green-600" />
            <Row label="Laba PPOB" value={fmtIDR(s.ppob_profit)} tone="text-green-600" />
            <Row label="Pengeluaran" value={fmtIDR(s.expense_month)} tone="text-red-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
