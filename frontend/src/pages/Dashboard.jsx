import { useEffect, useState } from "react";
import api, { fmtIDR } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  TrendingUp, ShoppingCart, Package, Wallet, AlertTriangle, Users, Boxes, Receipt,
} from "lucide-react";

const Stat = ({ icon: Icon, label, value, sub, tone = "sky" }) => {
  const tones = {
    sky: "bg-sky-50 text-sky-600", green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600", red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm" data-testid={`kpi-${label.toLowerCase().replace(/ /g, "-")}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide font-medium text-slate-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${tones[tone]}`}><Icon className="w-5 h-5" /></div>
      </div>
      <div className="mt-3 text-2xl font-semibold font-mono-num text-slate-900">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
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
        <Stat icon={ShoppingCart} label="Penjualan Hari Ini" value={fmtIDR(s.sales_today)} sub={`${s.tx_today || 0} transaksi`} tone="sky" />
        <Stat icon={Wallet} label="Penjualan Bulan Ini" value={fmtIDR(s.sales_month)} tone="sky" />
        <Stat icon={TrendingUp} label="Laba Bersih Bulan Ini" value={fmtIDR(s.profit_month)} sub={`Kotor ${fmtIDR(s.gross_profit)}`} tone="green" />
        <Stat icon={Receipt} label="Pengeluaran Bulan Ini" value={fmtIDR(s.expense_month)} tone="red" />
        <Stat icon={Package} label="Total Produk" value={s.products_count ?? 0} tone="slate" />
        <Stat icon={Users} label="Total Pelanggan" value={s.customers_count ?? 0} tone="slate" />
        <Stat icon={AlertTriangle} label="Stok Menipis" value={s.low_stock_count ?? 0} tone="amber" />
        <Stat icon={Boxes} label="Laba PPOB Bulan Ini" value={fmtIDR(s.ppob_profit)} tone="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-medium text-slate-800 mb-4">Tren Penjualan 7 Hari</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={s.trend_7d || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}k`} width={40} />
              <Tooltip formatter={(v) => fmtIDR(v)} />
              <Line type="monotone" dataKey="total" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
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
