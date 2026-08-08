import { useEffect, useState, useCallback } from "react";
import api, { fmtIDR } from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Calculator, Pencil, Trash2 } from "lucide-react";

const GRADES = { A: 0.85, B: 0.75, C: 0.6, D: 0.4 };

export default function HpPrices() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ brand: "", model: "", market_price: 0, note: "" });
  const [calc, setCalc] = useState({ id: "", grade: "A" });

  const load = useCallback(() => {
    setLoading(true);
    api.get("/hp-prices", { params: q ? { q } : {} }).then(({ data }) => setRows(data)).finally(() => setLoading(false));
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const save = async () => {
    if (!form.brand || !form.model) return toast.error("Brand & model wajib");
    try {
      const payload = { ...form, market_price: Number(form.market_price || 0) };
      if (editing) await api.put(`/hp-prices/${editing.id}`, payload);
      else await api.post("/hp-prices", payload);
      toast.success("Tersimpan"); setOpen(false); setEditing(null); load();
    } catch { toast.error("Gagal menyimpan"); }
  };
  const del = async (id) => { if (!window.confirm("Hapus?")) return; await api.delete(`/hp-prices/${id}`); load(); };

  const selected = rows.find((r) => r.id === calc.id);
  const estimate = selected ? selected.market_price * GRADES[calc.grade] : 0;

  return (
    <div>
      <PageHeader title="Harga HP (Tukar Tambah)" subtitle="Master harga pasaran & kalkulator grade">
        <Button onClick={() => { setEditing(null); setForm({ brand: "", model: "", market_price: 0, note: "" }); setOpen(true); }} className="bg-sky-600 hover:bg-sky-700" data-testid="hp-add-btn">
          <Plus className="w-4 h-4 mr-1.5" /> Tambah
        </Button>
      </PageHeader>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
        <div className="flex items-center gap-2 font-medium text-slate-800 mb-3"><Calculator className="w-5 h-5 text-sky-600" /> Kalkulator Harga Tukar</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <Label className="text-xs text-slate-500">Model HP</Label>
            <Select value={calc.id} onValueChange={(v) => setCalc({ ...calc, id: v })}>
              <SelectTrigger className="mt-1" data-testid="calc-model"><SelectValue placeholder="Pilih model" /></SelectTrigger>
              <SelectContent>{rows.map((r) => <SelectItem key={r.id} value={r.id}>{r.brand} {r.model}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Grade Kondisi</Label>
            <Select value={calc.grade} onValueChange={(v) => setCalc({ ...calc, grade: v })}>
              <SelectTrigger className="mt-1" data-testid="calc-grade"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(GRADES).map((g) => <SelectItem key={g} value={g}>Grade {g} ({GRADES[g] * 100}%)</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="bg-sky-50 rounded-lg p-3 text-center">
            <div className="text-xs text-sky-600">Estimasi Harga Tukar</div>
            <div className="text-xl font-semibold font-mono-num text-sky-700" data-testid="calc-result">{fmtIDR(estimate)}</div>
          </div>
        </div>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari model / brand..." className="pl-9" data-testid="hp-search" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Brand", "Model", "Harga Pasaran", "Catatan", "Aksi"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={5}><Empty /></td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{r.brand}</td>
                  <td className="px-4 py-3 font-medium">{r.model}</td>
                  <td className="px-4 py-3 font-mono-num">{fmtIDR(r.market_price)}</td>
                  <td className="px-4 py-3 text-slate-500">{r.note}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setEditing(r); setForm(r); setOpen(true); }} className="p-1.5 text-slate-500 hover:text-sky-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => del(r.id)} className="p-1.5 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Harga HP</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs text-slate-500">Brand</Label><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Model</Label><Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Harga Pasaran</Label><Input type="number" value={form.market_price} onChange={(e) => setForm({ ...form, market_price: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Catatan</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} className="bg-sky-600 hover:bg-sky-700" data-testid="hp-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
