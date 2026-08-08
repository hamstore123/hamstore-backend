import { useEffect, useState } from "react";
import api, { fmtDate, fmtIDR } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, Loading, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ClipboardCheck, Boxes, Wallet, TrendingUp, Package, AlertTriangle } from "lucide-react";

const Card = ({ icon: Icon, label, value, tone = "bg-slate-100 text-slate-600", grad }) => (
  <div className={`rounded-xl border shadow-sm p-4 ${grad ? "text-white border-transparent " + grad : "bg-white border-slate-200"}`} data-testid={`stock-${label.toLowerCase().replace(/[^a-z]/g, "-")}`}>
    <div className={`flex items-center gap-2 text-xs uppercase tracking-wide font-medium ${grad ? "opacity-90" : "text-slate-500"}`}>
      {!grad && <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone}`}><Icon className="w-4 h-4" /></span>}
      {grad && <Icon className="w-4 h-4" />} {label}
    </div>
    <div className={`text-xl font-semibold font-mono-num mt-2 ${grad ? "" : "text-slate-900"}`}>{value}</div>
  </div>
);

export default function Stock() {
  const { isOwner } = useAuth();
  const [moves, setMoves] = useState([]);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [phys, setPhys] = useState({});

  const load = () => {
    setLoading(true);
    api.get("/stock/movements").then(({ data }) => setMoves(data)).finally(() => setLoading(false));
    api.get("/stock/summary").then(({ data }) => setSummary(data)).catch(() => {});
  };
  useEffect(() => { load(); api.get("/products").then(({ data }) => setProducts(data)); }, []);

  const saveOpname = async () => {
    const items = products.filter((p) => phys[p.id] !== undefined && phys[p.id] !== "").map((p) => ({
      product_id: p.id, product_name: p.name, system_stock: p.stock, physical_stock: Number(phys[p.id]),
    }));
    if (items.length === 0) return toast.error("Isi minimal 1 stok fisik");
    await api.post("/stock/opname", { note: "Opname", items });
    toast.success("Opname tersimpan"); setOpen(false); setPhys({}); load();
    api.get("/products").then(({ data }) => setProducts(data));
  };

  const KIND = { sale: "Penjualan", purchase: "Pembelian", opname: "Opname", trade_in: "Tukar Tambah" };
  const s = summary || {};

  return (
    <div>
      <PageHeader title="Stok & Opname" subtitle="Nilai stok, mutasi & stock opname">
        <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700" data-testid="opname-btn"><ClipboardCheck className="w-4 h-4 mr-1.5" /> Stock Opname</Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card icon={Package} label="Total SKU" value={s.total_products ?? 0} tone="bg-slate-100 text-slate-600" />
        <Card icon={Boxes} label="Total Unit" value={s.total_units ?? 0} tone="bg-sky-50 text-sky-600" />
        <Card icon={Wallet} label="Total Modal Stok" value={fmtIDR(s.total_modal)} grad="bg-gradient-to-br from-slate-700 to-slate-800" />
        <Card icon={TrendingUp} label="Nilai Jual (Omset Potensial)" value={fmtIDR(s.total_nilai_jual)} grad="bg-gradient-to-br from-sky-600 to-sky-700" />
        {isOwner && <Card icon={TrendingUp} label="Potensi Laba" value={fmtIDR(s.potensi_laba)} grad="bg-gradient-to-br from-green-600 to-green-700" />}
        <Card icon={AlertTriangle} label="Stok Menipis" value={s.low_stock_count ?? 0} tone="bg-amber-50 text-amber-600" />
        <Card icon={AlertTriangle} label="Stok Habis" value={s.out_of_stock ?? 0} tone="bg-red-50 text-red-600" />
      </div>

      <h3 className="font-medium text-slate-800 mb-3">Mutasi Stok Terakhir</h3>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Tanggal", "Produk", "Jenis", "Perubahan", "Referensi"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5}><Loading /></td></tr>
              : moves.length === 0 ? <tr><td colSpan={5}><Empty /></td></tr>
              : moves.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">{fmtDate(m.date)}</td>
                  <td className="px-4 py-3">{m.product_name}</td>
                  <td className="px-4 py-3">{KIND[m.kind] || m.kind}</td>
                  <td className={`px-4 py-3 font-mono-num font-medium ${m.delta >= 0 ? "text-green-600" : "text-red-600"}`}>{m.delta > 0 ? "+" : ""}{m.delta}</td>
                  <td className="px-4 py-3 font-mono-num text-xs text-slate-400">{m.ref}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Stock Opname</DialogTitle></DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0"><tr>
                {["Produk", "Sistem", "Fisik", "Selisih"].map((h) => <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const v = phys[p.id]; const diff = v === undefined || v === "" ? null : Number(v) - p.stock;
                  return (
                    <tr key={p.id}>
                      <td className="px-3 py-2">{p.name}</td>
                      <td className="px-3 py-2 font-mono-num">{p.stock}</td>
                      <td className="px-3 py-2"><Input type="number" value={v ?? ""} onChange={(e) => setPhys({ ...phys, [p.id]: e.target.value })} className="h-8 w-24" /></td>
                      <td className={`px-3 py-2 font-mono-num ${diff === null ? "text-slate-300" : diff === 0 ? "text-slate-400" : diff > 0 ? "text-green-600" : "text-red-600"}`}>{diff === null ? "-" : diff}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={saveOpname} className="bg-sky-600 hover:bg-sky-700" data-testid="opname-save-btn">Simpan Opname</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
