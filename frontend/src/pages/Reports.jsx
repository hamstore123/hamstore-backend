import { useState } from "react";
import { motion } from "framer-motion";
import api, { fmtIDR } from "@/lib/api";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShoppingCart, Zap, Wrench, TrendingUp, Receipt, Wallet } from "lucide-react";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => new Date().toISOString().slice(0, 8) + "01";

const OmsetCard = ({ icon: Icon, label, omset, laba, tone, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }} whileHover={{ y: -6 }} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
    <div className="flex items-center gap-2 mb-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tone}`}><Icon className="w-4 h-4" /></div>
      <span className="font-medium text-slate-800">{label}</span>
    </div>
    <div className="space-y-1 text-sm">
      <div className="flex justify-between"><span className="text-slate-500">Omset</span><span className="font-mono-num font-semibold text-slate-800">{fmtIDR(omset)}</span></div>
      {laba != null && <div className="flex justify-between"><span className="text-slate-500">Laba</span><span className="font-mono-num font-semibold text-green-600">{fmtIDR(laba)}</span></div>}
    </div>
  </motion.div>
);

const LineRow = ({ l, v, tone = "text-slate-700", bold }) => (
  <div className={`flex justify-between py-1.5 ${bold ? "border-t border-slate-200 mt-1 pt-2" : ""}`}>
    <span className={bold ? "font-semibold text-slate-800" : "text-slate-500"}>{l}</span>
    <span className={`font-mono-num ${bold ? "font-semibold" : ""} ${tone}`}>{v}</span>
  </div>
);

export default function Reports() {
  const [start, setStart] = useState(monthStart());
  const [end, setEnd] = useState(today());
  const [r, setR] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/profit-loss", { params: { start, end: end + "T23:59:59" } });
      setR(data);
    } catch { toast.error("Gagal memuat laporan"); } finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title="Laporan Keuangan" subtitle="Laporan omset & laba rugi lengkap per periode" />
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4 flex flex-wrap items-end gap-3">
        <div><Label className="text-xs text-slate-500">Dari</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" data-testid="report-start" /></div>
        <div><Label className="text-xs text-slate-500">Sampai</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1" data-testid="report-end" /></div>
        <Button onClick={run} disabled={loading} className="bg-sky-600 hover:bg-sky-700" data-testid="report-run">{loading ? "Memuat..." : "Tampilkan"}</Button>
      </div>

      {r && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-gradient-to-br from-sky-600 to-sky-700 rounded-xl shadow-sm p-5 text-white">
              <div className="flex items-center gap-2 mb-2"><Wallet className="w-5 h-5" /><span className="font-medium">Total Omset</span></div>
              <div className="text-2xl font-semibold font-mono-num" data-testid="report-total-omset">{fmtIDR(r.total_omset)}</div>
            </div>
            <OmsetCard delay={0.12} icon={ShoppingCart} label="Penjualan HP" omset={r.sales_revenue} laba={r.sales_profit} tone="bg-sky-50 text-sky-600" />
            <OmsetCard delay={0.2} icon={Zap} label="PPOB" omset={r.ppob_revenue} laba={r.ppob_profit} tone="bg-violet-50 text-violet-600" />
            <OmsetCard delay={0.28} icon={Wrench} label="Service" omset={r.service_revenue} laba={r.service_profit} tone="bg-amber-50 text-amber-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-medium text-slate-800 mb-3">Laba Rugi Lengkap</h3>
              <div className="text-sm">
                <LineRow l={`Omset Penjualan HP (${r.sales_count} trx)`} v={fmtIDR(r.sales_revenue)} />
                <LineRow l="HPP / Modal Terjual" v={`- ${fmtIDR(r.sales_hpp)}`} tone="text-red-600" />
                <LineRow l="Laba Penjualan HP" v={fmtIDR(r.sales_profit)} tone="text-green-600" />
                <LineRow l={`Omset PPOB (${r.ppob_count} trx)`} v={fmtIDR(r.ppob_revenue)} />
                <LineRow l="Laba PPOB" v={fmtIDR(r.ppob_profit)} tone="text-green-600" />
                <LineRow l={`Omset Service (${r.service_count} order)`} v={fmtIDR(r.service_revenue)} />
                <LineRow l="Biaya Sparepart Service" v={`- ${fmtIDR(r.service_cost)}`} tone="text-red-600" />
                <LineRow l="Laba Service" v={fmtIDR(r.service_profit)} tone="text-green-600" />
                <LineRow l="Total Laba Kotor" v={fmtIDR(r.total_gross_profit)} tone="text-slate-900" bold />
                <LineRow l="Total Pengeluaran" v={`- ${fmtIDR(r.total_expense)}`} tone="text-red-600" />
                <div className="flex justify-between pt-3 mt-2 border-t-2 border-slate-300">
                  <span className="font-semibold text-slate-800">LABA BERSIH</span>
                  <span className={`font-mono-num text-lg font-semibold ${r.net_profit >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="report-net">{fmtIDR(r.net_profit)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3"><Receipt className="w-4 h-4 text-red-500" /><h3 className="font-medium text-slate-800">Rincian Pengeluaran</h3></div>
                <div className="text-sm">
                  {(r.expense_breakdown || []).length === 0 && <div className="text-slate-400">Tidak ada pengeluaran</div>}
                  {(r.expense_breakdown || []).map((e, i) => <LineRow key={i} l={e.key || e._id || e.category} v={fmtIDR(e.total ?? e.value)} tone="text-red-600" />)}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3"><TrendingUp className="w-4 h-4 text-sky-500" /><h3 className="font-medium text-slate-800">Pembelian Stok</h3></div>
                <LineRow l={`Total Pembelian (${r.purchase_count})`} v={fmtIDR(r.purchase_total)} />
                <p className="text-[11px] text-slate-400 mt-2">Pembelian menambah aset stok (bukan biaya langsung pada laba rugi).</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
