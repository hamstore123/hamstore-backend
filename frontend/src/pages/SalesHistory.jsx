import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api, { fmtIDR, fmtDate } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Loading, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { buildNota, openWhatsApp } from "@/lib/waNota";
import { MessageCircle, ShoppingCart, TrendingUp, Ban } from "lucide-react";

export default function SalesHistory() {
  const { isOwner } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nota, setNota] = useState(null);
  const [form, setForm] = useState({ customerName: "", phone: "", unit: "", imei: "" });
  const [q, setQ] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState(-1);
  const [page, setPage] = useState(1);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/sales", { params: { q: q || undefined, start: start || undefined, end: end || undefined, sort_by: sortBy, sort_dir: sortDir, page, limit: 50 } })
      .then(({ data }) => setRows(data.items || data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [q, start, end, sortBy, sortDir, page]);

  const omset = rows.reduce((s, r) => s + (r.status === "dibatalkan" ? 0 : (r.total || 0)), 0);
  const profit = rows.reduce((s, r) => s + (r.status === "dibatalkan" ? 0 : (r.profit || 0)), 0);

  const cancelSale = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.post(`/sales/${cancelTarget.id}/cancel`, { note: cancelNote });
      toast.success("Transaksi dibatalkan dan stok dikembalikan");
      setCancelTarget(null); setCancelNote(""); load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal membatalkan transaksi");
    } finally { setCancelling(false); }
  };

  const openNota = (sale) => {
    const first = (sale.items || [])[0] || {};
    setForm({ customerName: sale.customer_name === "Umum" ? "" : (sale.customer_name || ""), phone: "", unit: first.product_name || "", imei: first.imei || "" });
    setNota(sale);
  };
  const sendNota = () => {
    const text = buildNota(form);
    openWhatsApp(form.phone, text);
    setNota(null);
  };

  return (
    <div>
      <PageHeader title="Riwayat Penjualan" subtitle="Semua transaksi penjualan & nota WhatsApp" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 max-w-2xl">
        <div className="col-span-3 max-w-2xl">
          <div className="mb-3 flex gap-2">
            <Input placeholder="Cari (invoice, pelanggan, produk)" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Tanggal</SelectItem>
                <SelectItem value="customer_name">Pelanggan</SelectItem>
                <SelectItem value="total">Total</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(sortDir)} onValueChange={(v) => setSortDir(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">Desc</SelectItem>
                <SelectItem value="1">Asc</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} whileHover={{ y: -6 }} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 text-xs uppercase text-slate-500 font-medium"><ShoppingCart className="w-4 h-4 text-sky-500" /> Total Transaksi</div>
          <div className="text-2xl font-semibold font-mono-num mt-1">{rows.length}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }} whileHover={{ y: -6 }} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="text-xs uppercase text-slate-500 font-medium">Total Omset</div>
          <div className="text-2xl font-semibold font-mono-num text-sky-700 mt-1">{fmtIDR(omset)}</div>
        </motion.div>
        {isOwner && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} whileHover={{ y: -6 }} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4" data-testid="sales-profit-card">
            <div className="flex items-center gap-2 text-xs uppercase text-slate-500 font-medium"><TrendingUp className="w-4 h-4 text-green-500" /> Total Keuntungan</div>
            <div className="text-2xl font-semibold font-mono-num text-green-600 mt-1">{fmtIDR(profit)}</div>
          </motion.div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Invoice", "Tanggal", "Pelanggan", "Barang", "Total", ...(isOwner ? ["Laba"] : []), "Bayar", "Aksi"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={8}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={8}><Empty /></td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono-num text-xs">{r.invoice}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3">{r.customer_name}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[220px] truncate">{(r.items || []).map((i) => `${i.product_name} x${i.qty}`).join(", ")}</td>
                  <td className="px-4 py-3 font-mono-num">{fmtIDR(r.total)}</td>
                  {isOwner && <td className="px-4 py-3 font-mono-num text-green-600">{fmtIDR(r.profit)}</td>}
                  <td className="px-4 py-3"><span className={`text-xs capitalize ${r.status === "dibatalkan" ? "text-red-600" : r.status === "paid" ? "text-green-600" : "text-amber-600"}`}>{r.status === "dibatalkan" ? "Dibatalkan" : `${r.payment_method} · ${r.status}`}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {r.status !== "dibatalkan" && <Button size="sm" variant="outline" className="text-xs text-red-700 border-red-200 hover:bg-red-50" onClick={() => { setCancelTarget(r); setCancelNote(""); }} data-testid={`cancel-sale-${r.id}`}><Ban className="w-3.5 h-3.5 mr-1" /> Batalkan</Button>}
                      <Button size="sm" variant="outline" className="text-xs text-green-700 border-green-200" onClick={() => openNota(r)} data-testid={`nota-${r.id}`}>
                        <MessageCircle className="w-3.5 h-3.5 mr-1" /> Nota WA
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="p-3 flex items-center justify-between">
          <div className="text-sm text-slate-500">Halaman {page}</div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <Button size="sm" onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>

      <Dialog open={!!nota} onOpenChange={(o) => !o && setNota(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Kirim Nota WhatsApp</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div><Label className="text-xs text-slate-500">Nama Pelanggan</Label><Input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} className="mt-1" data-testid="nota-name" /></div>
            <div><Label className="text-xs text-slate-500">No. WhatsApp</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" placeholder="08xxx" data-testid="nota-phone" /></div>
            <div><Label className="text-xs text-slate-500">Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">IMEI</Label><Input value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} className="mt-1" /></div>
            <div className="col-span-2 bg-slate-50 rounded-lg p-3 text-xs text-slate-500 max-h-40 overflow-y-auto whitespace-pre-wrap">{buildNota(form)}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNota(null)}>Batal</Button>
            <Button onClick={sendNota} className="bg-green-600 hover:bg-green-700" data-testid="nota-send"><MessageCircle className="w-4 h-4 mr-1.5" /> Buka WhatsApp</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) { setCancelTarget(null); setCancelNote(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Batalkan Transaksi?</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">Transaksi <b>{cancelTarget?.invoice}</b> akan berstatus Dibatalkan dan stok barang terjual dikembalikan otomatis.</p>
            <div><Label className="text-xs text-slate-500">Alasan (opsional)</Label><Input value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} className="mt-1" placeholder="Contoh: pelanggan membatalkan pesanan" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCancelTarget(null)}>Tidak</Button><Button onClick={cancelSale} disabled={cancelling} className="bg-red-600 hover:bg-red-700" data-testid="confirm-cancel-sale">{cancelling ? "Membatalkan..." : "Ya, Batalkan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
