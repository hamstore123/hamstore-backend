import { useEffect, useState } from "react";
import api, { fmtIDR, fmtDate } from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

const KINDS = [["pulsa", "Pulsa"], ["token_pln", "Token PLN"], ["paket_data", "Paket Data"], ["bpjs", "BPJS"], ["pdam", "PDAM"]];

export default function PPOB() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: "pulsa", customer_number: "", customer_name: "", nominal: 0, price: 0, cost: 0, payment_method: "cash" });

  const load = () => { setLoading(true); api.get("/ppob").then(({ data }) => setRows(data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.customer_number || !form.price) return toast.error("Nomor & harga wajib");
    await api.post("/ppob", { ...form, nominal: Number(form.nominal), price: Number(form.price), cost: Number(form.cost) });
    toast.success("Transaksi PPOB tersimpan"); setOpen(false);
    setForm({ kind: "pulsa", customer_number: "", customer_name: "", nominal: 0, price: 0, cost: 0, payment_method: "cash" }); load();
  };

  return (
    <div>
      <PageHeader title="PPOB" subtitle="Transaksi pulsa, token, paket data, BPJS, PDAM">
        <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700" data-testid="ppob-add-btn"><Plus className="w-4 h-4 mr-1.5" /> Transaksi Baru</Button>
      </PageHeader>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Invoice", "Jenis", "No. Pelanggan", "Nominal", "Harga", "Modal", "Laba", "Tanggal"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={8}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={8}><Empty /></td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono-num text-xs">{r.invoice}</td>
                  <td className="px-4 py-3 capitalize">{r.kind.replace("_", " ")}</td>
                  <td className="px-4 py-3 font-mono-num">{r.customer_number}</td>
                  <td className="px-4 py-3 font-mono-num">{fmtIDR(r.nominal)}</td>
                  <td className="px-4 py-3 font-mono-num">{fmtIDR(r.price)}</td>
                  <td className="px-4 py-3 font-mono-num text-slate-500">{fmtIDR(r.cost)}</td>
                  <td className="px-4 py-3 font-mono-num text-green-600">{fmtIDR(r.profit)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(r.date)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Transaksi PPOB</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2"><Label className="text-xs text-slate-500">Jenis</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs text-slate-500">No. Pelanggan</Label><Input value={form.customer_number} onChange={(e) => setForm({ ...form, customer_number: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Nama</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Nominal</Label><Input type="number" value={form.nominal} onChange={(e) => setForm({ ...form, nominal: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Harga Jual</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Modal</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={create} className="bg-sky-600 hover:bg-sky-700" data-testid="ppob-save-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
