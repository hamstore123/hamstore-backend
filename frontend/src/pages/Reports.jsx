import { useState } from "react";
import api, { fmtIDR } from "@/lib/api";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => new Date().toISOString().slice(0, 8) + "01";

export default function Reports() {
  const [start, setStart] = useState(monthStart());
  const [end, setEnd] = useState(today());
  const [pl, setPl] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/reports/profit-loss", { params: { start, end: end + "T23:59:59" } });
      setPl(data);
    } catch { toast.error("Gagal memuat laporan"); } finally { setLoading(false); }
  };

  return (
    <div>
      <PageHeader title="Laporan Keuangan" subtitle="Laporan laba rugi periode" />
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4 flex flex-wrap items-end gap-3">
        <div><Label className="text-xs text-slate-500">Dari</Label><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" data-testid="report-start" /></div>
        <div><Label className="text-xs text-slate-500">Sampai</Label><Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1" data-testid="report-end" /></div>
        <Button onClick={run} disabled={loading} className="bg-sky-600 hover:bg-sky-700" data-testid="report-run">{loading ? "Memuat..." : "Tampilkan"}</Button>
      </div>

      {pl && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-medium text-slate-800 mb-3">Laba Rugi</h3>
            <div className="space-y-1 text-sm">
              <Row l="Pendapatan Penjualan" v={fmtIDR(pl.revenue)} />
              <Row l="HPP (Modal Terjual)" v={`- ${fmtIDR(pl.hpp)}`} tone="text-red-600" />
              <Row l="Laba Kotor" v={fmtIDR(pl.gross_profit)} tone="text-slate-900 font-semibold" bold />
              <Row l="Laba PPOB" v={fmtIDR(pl.ppob_profit)} tone="text-green-600" />
              <Row l="Total Pengeluaran" v={`- ${fmtIDR(pl.total_expense)}`} tone="text-red-600" />
              <div className="flex justify-between pt-3 mt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-800">Laba Bersih</span>
                <span className={`font-mono-num text-lg font-semibold ${pl.net_profit >= 0 ? "text-green-600" : "text-red-600"}`} data-testid="report-net">{fmtIDR(pl.net_profit)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-medium text-slate-800 mb-3">Rincian Pengeluaran</h3>
            <div className="space-y-1 text-sm">
              {(pl.expense_breakdown || []).length === 0 && <div className="text-slate-400 text-sm">Tidak ada pengeluaran</div>}
              {(pl.expense_breakdown || []).map((e, i) => <Row key={i} l={e.key || e._id || e.category} v={fmtIDR(e.total ?? e.value)} />)}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
              {pl.sales_count} transaksi penjualan · {pl.ppob_count} transaksi PPOB
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const Row = ({ l, v, tone = "text-slate-700" }) => (
  <div className="flex justify-between py-1"><span className="text-slate-500">{l}</span><span className={`font-mono-num ${tone}`}>{v}</span></div>
);
