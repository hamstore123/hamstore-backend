import { useEffect, useState, useCallback } from "react";
import api, { fmtIDR, fmtDate } from "@/lib/api";
import { PageHeader, Loading, Empty, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Ban } from "lucide-react";

const NEXT = { antre: "diproses", diproses: "selesai", selesai: "diambil" };

export default function Services() {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [filter, setFilter] = useState("");
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/services", { params: filter ? { status: filter } : {} })
      .then(({ data }) => setRows(data)).finally(() => setLoading(false));
  }, [filter]);
  useEffect(() => { load(); api.get("/staff").then(({ data }) => setStaff(data)).catch(() => {}); }, [load]);

  const create = async () => {
    if (!form.customer_name || !form.device_name || !form.complaint) return toast.error("Lengkapi data pelanggan, perangkat & keluhan");
    try {
      const tech = staff.find((s) => s.id === form.technician_id);
      await api.post("/services", {
        ...form,
        technician_name: tech?.name || "",
        service_price: Number(form.service_price || 0),
        sparepart_cost: Number(form.sparepart_cost || 0),
        dp: Number(form.dp || 0),
      });
      toast.success("Service tersimpan"); setOpen(false); setForm({}); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };

  const advance = async (row) => {
    const next = NEXT[row.status];
    if (!next) return;
    await api.put(`/services/${row.id}/status`, { status: next, note: "" });
    toast.success(`Status → ${next}`); load();
  };

  const cancelService = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.post(`/services/${cancelTarget.id}/cancel`, { note: cancelNote });
      toast.success("Service dibatalkan");
      setCancelTarget(null); setCancelNote(""); load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal membatalkan service");
    } finally { setCancelling(false); }
  };

  return (
    <div>
      <PageHeader title="Data Service" subtitle="Kelola order service / reparasi">
        <Button onClick={() => { setForm({ technician_id: "" }); setOpen(true); }} className="bg-sky-600 hover:bg-sky-700" data-testid="service-add-btn">
          <Plus className="w-4 h-4 mr-1.5" /> Service Baru
        </Button>
      </PageHeader>

      <div className="flex gap-2 mb-4">

        {["", "antre", "diproses", "selesai", "diambil", "batal"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1.5 rounded-md text-sm capitalize ${filter === s ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
            {s || "Semua"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Invoice", "Pelanggan", "Perangkat", "Keluhan", "Teknisi", "Total", "Sisa", "Status", "Aksi"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={9}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={9}><Empty /></td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono-num text-xs">{r.invoice}</td>
                  <td className="px-4 py-3">{r.customer_name}<div className="text-xs text-slate-400">{r.customer_phone}</div></td>
                  <td className="px-4 py-3">{r.device_name}</td>
                  <td className="px-4 py-3 max-w-[200px] truncate text-slate-500">{r.complaint}</td>
                  <td className="px-4 py-3">{r.technician_name || "-"}</td>
                  <td className="px-4 py-3 font-mono-num text-right">{fmtIDR(r.total_price)}</td>
                  <td className="px-4 py-3 font-mono-num text-right text-amber-600">{fmtIDR(r.remaining)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {NEXT[r.status] && <Button size="sm" variant="outline" onClick={() => advance(r)} data-testid={`advance-${r.id}`} className="text-xs">→ {NEXT[r.status]}</Button>}
                      {r.status !== "batal" && <Button size="sm" variant="outline" onClick={() => { setCancelTarget(r); setCancelNote(""); }} data-testid={`cancel-service-${r.id}`} className="text-xs text-red-700 border-red-200 hover:bg-red-50"><Ban className="w-3.5 h-3.5 mr-1" /> Batalkan</Button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Formulir Service</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <Field label="Nama Pelanggan" v={form.customer_name} on={(v) => setForm({ ...form, customer_name: v })} />
            <Field label="Telepon" v={form.customer_phone} on={(v) => setForm({ ...form, customer_phone: v })} />
            <Field label="Perangkat" v={form.device_name} on={(v) => setForm({ ...form, device_name: v })} />
            <Field label="IMEI" v={form.imei} on={(v) => setForm({ ...form, imei: v })} />
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Keluhan</Label>
              <Textarea value={form.complaint || ""} onChange={(e) => setForm({ ...form, complaint: e.target.value })} className="mt-1" data-testid="service-complaint" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-slate-500">Teknisi</Label>
              <Select value={form.technician_id || ""} onValueChange={(v) => setForm({ ...form, technician_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih teknisi" /></SelectTrigger>
                <SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Field label="Jenis Service" v={form.service_type} on={(v) => setForm({ ...form, service_type: v })} />
            <Field label="Harga Service" type="number" v={form.service_price} on={(v) => setForm({ ...form, service_price: v })} />
            <Field label="Biaya Sparepart" type="number" v={form.sparepart_cost} on={(v) => setForm({ ...form, sparepart_cost: v })} />
            <Field label="DP" type="number" v={form.dp} on={(v) => setForm({ ...form, dp: v })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={create} className="bg-sky-600 hover:bg-sky-700" data-testid="service-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cancelTarget} onOpenChange={(open) => { if (!open) { setCancelTarget(null); setCancelNote(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Batalkan Service?</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">Service <b>{cancelTarget?.invoice}</b> akan berubah menjadi Dibatalkan.</p>
            <div><Label className="text-xs text-slate-500">Alasan (opsional)</Label><Input value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} className="mt-1" placeholder="Contoh: pelanggan tidak jadi service" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCancelTarget(null)}>Tidak</Button><Button onClick={cancelService} disabled={cancelling} className="bg-red-600 hover:bg-red-700" data-testid="confirm-cancel-service">{cancelling ? "Membatalkan..." : "Ya, Batalkan"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Field = ({ label, v, on, type = "text" }) => (
  <div>
    <Label className="text-xs text-slate-500">{label}</Label>
    <Input type={type} value={v ?? ""} onChange={(e) => on(e.target.value)} className="mt-1" />
  </div>
);
