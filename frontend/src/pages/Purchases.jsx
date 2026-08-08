import { useEffect, useState } from "react";
import api, { fmtIDR, fmtDate } from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function Purchases() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState("umum");
  const [paid, setPaid] = useState(0);
  const [items, setItems] = useState([]);

  const load = () => { setLoading(true); api.get("/purchases").then(({ data }) => setRows(data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); api.get("/products").then(({ data }) => setProducts(data)); api.get("/suppliers").then(({ data }) => setSuppliers(data)); }, []);

  const addItem = (pid) => {
    const p = products.find((x) => x.id === pid); if (!p) return;
    if (items.find((i) => i.product_id === pid)) return;
    setItems([...items, { product_id: p.id, product_name: p.name, qty: 1, cost_price: p.cost_price }]);
  };
  const upd = (id, k, v) => setItems(items.map((i) => i.product_id === id ? { ...i, [k]: Number(v) } : i));
  const total = items.reduce((s, i) => s + i.qty * i.cost_price, 0);

  const save = async () => {
    if (items.length === 0) return toast.error("Tambah minimal 1 item");
    const sup = suppliers.find((s) => s.id === supplier);
    await api.post("/purchases", {
      supplier_id: supplier === "umum" ? null : supplier, supplier_name: sup?.name || "Umum",
      items, paid: Number(paid || 0), payment_method: "cash",
    });
    toast.success("Pembelian tersimpan"); setOpen(false); setItems([]); setPaid(0); load();
    api.get("/products").then(({ data }) => setProducts(data));
  };

  return (
    <div>
      <PageHeader title="Pembelian Barang" subtitle="Catat pembelian stok dari supplier">
        <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700" data-testid="purchase-add-btn"><Plus className="w-4 h-4 mr-1.5" /> Pembelian Baru</Button>
      </PageHeader>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Invoice", "Supplier", "Item", "Total", "Terbayar", "Sisa", "Tanggal"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={7}><Empty /></td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono-num text-xs">{r.invoice}</td>
                  <td className="px-4 py-3">{r.supplier_name}</td>
                  <td className="px-4 py-3">{r.items?.length || 0} item</td>
                  <td className="px-4 py-3 font-mono-num">{fmtIDR(r.total)}</td>
                  <td className="px-4 py-3 font-mono-num text-green-600">{fmtIDR(r.paid)}</td>
                  <td className="px-4 py-3 font-mono-num text-red-600">{fmtIDR(r.due)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(r.date)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Pembelian Baru</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-slate-500">Supplier</Label>
                <Select value={supplier} onValueChange={setSupplier}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="umum">Umum</SelectItem>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs text-slate-500">Tambah Produk</Label>
                <Select value="" onValueChange={addItem}>
                  <SelectTrigger className="mt-1" data-testid="purchase-add-item"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                  <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {items.map((i) => (
                <div key={i.product_id} className="flex items-center gap-2 text-sm border-b border-slate-100 pb-2">
                  <div className="flex-1 truncate">{i.product_name}</div>
                  <Input type="number" value={i.qty} onChange={(e) => upd(i.product_id, "qty", e.target.value)} className="w-20 h-8" placeholder="Qty" />
                  <Input type="number" value={i.cost_price} onChange={(e) => upd(i.product_id, "cost_price", e.target.value)} className="w-28 h-8" placeholder="Modal" />
                  <button onClick={() => setItems(items.filter((x) => x.product_id !== i.product_id))} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <div className="font-mono-num text-lg font-semibold">Total: {fmtIDR(total)}</div>
              <div className="flex items-center gap-2"><Label className="text-xs text-slate-500">Bayar</Label><Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} className="w-32 h-9" /></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={save} className="bg-sky-600 hover:bg-sky-700" data-testid="purchase-save-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
