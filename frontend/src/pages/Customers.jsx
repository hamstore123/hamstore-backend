import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";
import BarcodeScanner from "@/components/BarcodeScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, ScanLine } from "lucide-react";

const EMPTY = { name: "", phone: "", email: "", device_type: "", imei: "", address: "", note: "" };

export default function Customers() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [scan, setScan] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/customers").then(({ data }) => setRows(data)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return [r.name, r.phone, r.email, r.device_type, r.imei, r.address].some((f) => (f || "").toLowerCase().includes(s));
  });

  const openCreate = () => { setForm(EMPTY); setEditing(null); setOpen(true); };
  const openEdit = (r) => { setForm({ ...EMPTY, ...r }); setEditing(r); setOpen(true); };

  const save = async () => {
    if (!form.name) return toast.error("Nama wajib diisi");
    try {
      const payload = { name: form.name, phone: form.phone, email: form.email, device_type: form.device_type, imei: form.imei, address: form.address, note: form.note };
      if (editing) await api.put(`/customers/${editing.id}`, payload);
      else await api.post("/customers", payload);
      toast.success(editing ? "Pelanggan diperbarui" : "Pelanggan ditambahkan");
      setOpen(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };

  const del = async (r) => { if (!window.confirm("Hapus pelanggan?")) return; await api.delete(`/customers/${r.id}`); toast.success("Dihapus"); load(); };

  return (
    <div>
      <PageHeader title="Data Pelanggan" subtitle="Daftar pelanggan toko">
        <Button onClick={openCreate} className="bg-sky-600 hover:bg-sky-700" data-testid="customer-add-btn">
          <Plus className="w-4 h-4 mr-1.5" /> Tambah Pelanggan
        </Button>
      </PageHeader>

      <div className="relative mb-4 max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, telepon, IMEI, tipe HP..." className="pl-9" data-testid="customer-search" />
        {q && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{filtered.length} hasil</span>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Nama", "Telepon", "Tipe HP", "IMEI", "Alamat", "Aksi"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={6}><Loading /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={6}><Empty /></td></tr>
              : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 font-mono-num">{r.phone || "-"}</td>
                  <td className="px-4 py-3">{r.device_type || "-"}</td>
                  <td className="px-4 py-3 font-mono-num text-xs">{r.imei || "-"}</td>
                  <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{r.address || "-"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => openEdit(r)} className="p-1.5 text-slate-500 hover:text-sky-600"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => del(r)} className="p-1.5 text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} Pelanggan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2"><Label className="text-xs text-slate-500">Nama *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" data-testid="customer-name" /></div>
            <div><Label className="text-xs text-slate-500">Telepon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Tipe HP Dibeli</Label><Input value={form.device_type} onChange={(e) => setForm({ ...form, device_type: e.target.value })} className="mt-1" /></div>
            <div>
              <Label className="text-xs text-slate-500">IMEI</Label>
              <div className="flex gap-2 mt-1">
                <Input value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} data-testid="customer-imei" />
                <Button type="button" variant="outline" onClick={() => setScan(true)} data-testid="customer-scan-btn" className="shrink-0">
                  <ScanLine className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="col-span-2"><Label className="text-xs text-slate-500">Alamat</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="mt-1" /></div>
            <div className="col-span-2"><Label className="text-xs text-slate-500">Catatan</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} className="bg-sky-600 hover:bg-sky-700" data-testid="customer-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner open={scan} onClose={() => setScan(false)} onScan={(code) => { setForm((f) => ({ ...f, imei: code })); setScan(false); toast.success("Barcode terbaca: " + code); }} />
    </div>
  );
}
