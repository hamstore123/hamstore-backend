import { useEffect, useState, useCallback } from "react";
import api, { fmtIDR, fmtDate } from "@/lib/api";
import { PageHeader, Loading, Empty, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, HandCoins } from "lucide-react";

export default function Debts() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ kind: "hutang", party_name: "", amount: 0, note: "" });
  const [payFor, setPayFor] = useState(null);
  const [payAmt, setPayAmt] = useState(0);
  const [payDate, setPayDate] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [paymentsOpenFor, setPaymentsOpenFor] = useState(null);
  const [payments, setPayments] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/debts", { params: kind ? { kind } : {} }).then(({ data }) => setRows(data)).finally(() => setLoading(false));
  }, [kind]);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.party_name || !form.amount) return toast.error("Nama & jumlah wajib");
    await api.post("/debts", { ...form, amount: Number(form.amount) });
    toast.success("Tersimpan"); setOpen(false); setForm({ kind: "hutang", party_name: "", amount: 0, note: "" }); load();
  };
  const pay = async () => {
    const payload = { amount: Number(payAmt), note: "", date: payDate || undefined, method: payMethod };
    await api.post(`/debts/${payFor.id}/pay`, payload);
    toast.success("Pembayaran dicatat"); setPayFor(null); setPayAmt(0); load();
  };

  const loadPayments = async (did) => {
    try {
      const { data } = await api.get(`/debts/${did}/payments`);
      setPayments(data.items || []);
    } catch (e) { setPayments([]); }
  };
  const del = async (id) => { if (!window.confirm("Hapus?")) return; await api.delete(`/debts/${id}`); load(); };

  return (
    <div>
      <PageHeader title="Hutang / Piutang" subtitle="Kelola hutang ke supplier & piutang dari pelanggan">
        <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700" data-testid="debt-add-btn"><Plus className="w-4 h-4 mr-1.5" /> Tambah</Button>
      </PageHeader>
      <div className="flex gap-2 mb-4">
        {[["", "Semua"], ["hutang", "Hutang"], ["piutang", "Piutang"]].map(([v, l]) => (
          <button key={v} onClick={() => setKind(v)} className={`px-3 py-1.5 rounded-md text-sm ${kind === v ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{l}</button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Jenis", "Pihak", "Jumlah", "Terbayar", "Sisa", "Status", "Aksi"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={7}><Empty /></td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><span className={`text-xs font-medium ${r.kind === "hutang" ? "text-red-600" : "text-amber-600"}`}>{r.kind}</span></td>
                  <td className="px-4 py-3">{r.party_name}<div className="text-xs text-slate-400">{r.reference}</div></td>
                  <td className="px-4 py-3 font-mono-num">{fmtIDR(r.amount)}</td>
                  <td className="px-4 py-3 font-mono-num text-green-600">{fmtIDR(r.paid)}</td>
                  <td className="px-4 py-3 font-mono-num text-red-600">{fmtIDR(r.remaining)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status === "paid" ? "done" : "todo"} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.status !== "paid" && <Button size="sm" variant="outline" className="text-xs mr-1" onClick={() => { setPayFor(r); setPayAmt(r.remaining); setPayDate(""); setPayMethod("cash"); }} data-testid={`pay-${r.id}`}>Bayar</Button>}
                    <Button size="sm" variant="outline" className="text-xs mr-1" onClick={() => { setPaymentsOpenFor(r); loadPayments(r.id); }} data-testid={`history-${r.id}`}>Riwayat</Button>
                    <button onClick={() => del(r.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Hutang / Piutang</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs text-slate-500">Jenis</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="hutang">Hutang (kita berhutang)</SelectItem><SelectItem value="piutang">Piutang (orang berhutang)</SelectItem></SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs text-slate-500">Nama Pihak</Label><Input value={form.party_name} onChange={(e) => setForm({ ...form, party_name: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Jumlah</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Catatan</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={create} className="bg-sky-600 hover:bg-sky-700" data-testid="debt-save-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Bayar {payFor?.kind}</DialogTitle></DialogHeader>
          <div className="py-2">
            <div className="text-sm text-slate-500 mb-2">Sisa: <span className="font-mono-num text-red-600">{fmtIDR(payFor?.remaining)}</span></div>
            <Label className="text-xs text-slate-500">Jumlah Bayar</Label>
            <Input type="number" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} className="mt-1" data-testid="pay-amount" />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>
                <Label className="text-xs text-slate-500">Tanggal</Label>
                <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-slate-500">Metode</Label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="mt-1 border rounded px-2 py-1 w-full">
                  <option value="cash">Cash</option>
                  <option value="transfer">Transfer</option>
                  <option value="debt">Cicilan</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPayFor(null)}>Batal</Button><Button onClick={pay} className="bg-sky-600 hover:bg-sky-700" data-testid="pay-save-btn">Bayar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!paymentsOpenFor} onOpenChange={(o) => !o && setPaymentsOpenFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Riwayat Pembayaran - {paymentsOpenFor?.party_name}</DialogTitle></DialogHeader>
          <div className="py-2">
            <div className="mb-3 text-sm text-slate-500">Total: {fmtIDR(paymentsOpenFor?.amount)} • Terbayar: {fmtIDR(paymentsOpenFor?.paid)} • Sisa: {fmtIDR(paymentsOpenFor?.remaining)}</div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-auto max-h-64">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200"><tr>
                  <th className="px-4 py-2 text-left">Tanggal</th>
                  <th className="px-4 py-2 text-left">Jumlah</th>
                  <th className="px-4 py-2 text-left">Sisa Setelah</th>
                  <th className="px-4 py-2 text-left">Metode</th>
                  <th className="px-4 py-2 text-left">Catatan</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.length === 0 ? (
                    <tr><td colSpan={5} className="p-4 text-slate-500">Belum ada pembayaran</td></tr>
                  ) : payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-700">{p.date}</td>
                      <td className="px-4 py-2 font-mono-num">{fmtIDR(p.amount)}</td>
                      <td className="px-4 py-2 font-mono-num text-red-600">{fmtIDR(p.remaining_after)}</td>
                      <td className="px-4 py-2">{p.method}</td>
                      <td className="px-4 py-2 text-slate-500">{p.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setPaymentsOpenFor(null)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
