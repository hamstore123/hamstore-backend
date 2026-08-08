import { useEffect, useState } from "react";
import api, { fmtDate } from "@/lib/api";
import { PageHeader, Loading, Empty, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";

const PLATFORMS = ["tiktok", "instagram", "facebook", "youtube", "whatsapp"];

export default function ContentSchedule() {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ staff_id: "", platform: "tiktok", content_type: "post", title: "", target_time: "", link: "" });

  const load = () => { setLoading(true); api.get("/content-posts").then(({ data }) => setRows(data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); api.get("/staff").then(({ data }) => setStaff(data)).catch(() => {}); }, []);

  const create = async () => {
    if (!form.staff_id || !form.target_time) return toast.error("Staf & waktu target wajib");
    await api.post("/content-posts", { ...form, target_time: new Date(form.target_time).toISOString() });
    toast.success("Jadwal dibuat"); setOpen(false);
    setForm({ staff_id: "", platform: "tiktok", content_type: "post", title: "", target_time: "", link: "" }); load();
  };
  const markUploaded = async (r) => { await api.put(`/content-posts/${r.id}/mark-uploaded`, {}); toast.success("Ditandai upload"); load(); };
  const del = async (id) => { if (!window.confirm("Hapus?")) return; await api.delete(`/content-posts/${id}`); load(); };

  return (
    <div>
      <PageHeader title="Jadwal Konten Sosial" subtitle="Kelola jadwal upload konten karyawan">
        <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700" data-testid="content-add-btn"><Plus className="w-4 h-4 mr-1.5" /> Jadwalkan</Button>
      </PageHeader>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Staf", "Platform", "Tipe", "Judul", "Target", "Status", "Aksi"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={7}><Empty /></td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{r.staff_name}</td>
                  <td className="px-4 py-3 capitalize">{r.platform}</td>
                  <td className="px-4 py-3 capitalize">{r.content_type}</td>
                  <td className="px-4 py-3">{r.title}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(r.target_time)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {r.status === "scheduled" && <Button size="sm" variant="outline" className="text-xs mr-1" onClick={() => markUploaded(r)} data-testid={`content-upload-${r.id}`}><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Upload</Button>}
                    <button onClick={() => del(r.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Jadwalkan Konten</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs text-slate-500">Staf</Label>
              <Select value={form.staff_id} onValueChange={(v) => setForm({ ...form, staff_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-slate-500">Platform</Label>
                <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs text-slate-500">Tipe</Label>
                <Select value={form.content_type} onValueChange={(v) => setForm({ ...form, content_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{["post", "story", "reel", "video"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs text-slate-500">Judul</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Waktu Target</Label><Input type="datetime-local" value={form.target_time} onChange={(e) => setForm({ ...form, target_time: e.target.value })} className="mt-1" data-testid="content-target" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={create} className="bg-sky-600 hover:bg-sky-700" data-testid="content-save-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
