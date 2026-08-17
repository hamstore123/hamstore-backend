import { useEffect, useState } from "react";
import api, { fmtDate } from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, BarChart3, Eye, Heart, MessageCircle } from "lucide-react";

const PLATFORMS = ["tiktok", "instagram", "facebook", "youtube", "whatsapp"];
// Status pipeline: Konsep -> Schedule -> Edited -> Selesai Edit -> Telah Upload
const STATUSES = [
  { value: "konsep", label: "Konsep" },
  { value: "scheduled", label: "Schedule" },
  { value: "edited", label: "Edited" },
  { value: "selesai_edit", label: "Selesai Edit" },
  { value: "upload", label: "Telah Upload" },
];
const LABEL = STATUSES.reduce((a, s) => ({ ...a, [s.value]: s.label }), {});
const STYLE = {
  konsep: "bg-slate-100 text-slate-700 border-slate-200",
  scheduled: "bg-amber-100 text-amber-800 border-amber-200",
  edited: "bg-blue-100 text-blue-800 border-blue-200",
  selesai_edit: "bg-violet-100 text-violet-800 border-violet-200",
  upload: "bg-green-100 text-green-800 border-green-200",
};

export default function ContentSchedule() {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({ staff_id: "", platform: "tiktok", content_type: "post", title: "", target_time: "", link: "" });
  const [metricFor, setMetricFor] = useState(null);
  const [metric, setMetric] = useState({ views: 0, likes: 0, comments: 0, link: "" });

  const load = () => { setLoading(true); api.get("/content-posts").then(({ data }) => setRows(data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); api.get("/staff").then(({ data }) => setStaff(data)).catch(() => {}); }, []);

  const create = async () => {
    if (!form.staff_id || !form.target_time) return toast.error("Staf & waktu target wajib");
    try {
      const prevScroll = typeof window !== "undefined" ? window.scrollY : 0;
      const { data } = await api.post("/content-posts", { ...form, status: "konsep", target_time: new Date(form.target_time).toISOString() });
      setRows((p) => [data, ...(p || [])]);
      toast.success("Jadwal konten dibuat"); setOpen(false);
      setForm({ staff_id: "", platform: "tiktok", content_type: "post", title: "", target_time: "", link: "" });
      if (typeof window !== "undefined") setTimeout(() => window.scrollTo({ top: prevScroll }), 50);
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal membuat jadwal"); }
  };
  const changeStatus = async (r, status) => {
    try {
      const prevScroll = typeof window !== "undefined" ? window.scrollY : 0;
      await api.put(`/content-posts/${r.id}/status`, { status });
      setRows((p) => p.map((it) => (it.id === r.id ? { ...it, status } : it)));
      toast.success(`Status → ${LABEL[status]}`);
      if (typeof window !== "undefined") setTimeout(() => window.scrollTo({ top: prevScroll }), 50);
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal mengubah status"); }
  };
  const openMetric = (r) => { setMetricFor(r); setMetric({ views: r.views || 0, likes: r.likes || 0, comments: r.comments || 0, link: r.link || "" }); };
  const saveMetric = async () => {
    try {
      const prevScroll = typeof window !== "undefined" ? window.scrollY : 0;
      await api.put(`/content-posts/${metricFor.id}/metrics`, {
        views: Number(metric.views || 0), likes: Number(metric.likes || 0), comments: Number(metric.comments || 0), link: metric.link,
      });
      setRows((p) => p.map((it) => (it.id === metricFor.id ? { ...it, views: Number(metric.views || 0), likes: Number(metric.likes || 0), comments: Number(metric.comments || 0), link: metric.link } : it)));
      toast.success("Metrik konten disimpan"); setMetricFor(null);
      if (typeof window !== "undefined") setTimeout(() => window.scrollTo({ top: prevScroll }), 50);
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan metrik"); }
  };
  const del = async (id) => { if (!window.confirm("Hapus?")) return; await api.delete(`/content-posts/${id}`); load(); };

  const filtered = filter ? rows.filter((r) => r.status === filter) : rows;

  return (
    <div>
      <PageHeader title="Jadwal Konten Sosial" subtitle="Tracking status: Konsep → Schedule → Edited → Selesai Edit → Telah Upload">
        <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700" data-testid="content-add-btn"><Plus className="w-4 h-4 mr-1.5" /> Jadwalkan</Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFilter("")} className={`px-3 py-1.5 rounded-md text-sm ${filter === "" ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>Semua</button>
        {STATUSES.map((s) => (
          <button key={s.value} onClick={() => setFilter(s.value)} className={`px-3 py-1.5 rounded-md text-sm ${filter === s.value ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
            {s.label} <span className="opacity-60">({rows.filter((r) => r.status === s.value).length})</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Staf", "Platform", "Judul", "Target", "Status", "Metrik", "Aksi"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7}><Loading /></td></tr>
              : filtered.length === 0 ? <tr><td colSpan={7}><Empty /></td></tr>
              : filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{r.staff_name}</td>
                  <td className="px-4 py-3 capitalize">{r.platform}</td>
                  <td className="px-4 py-3">{r.title}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(r.target_time)}</td>
                  <td className="px-4 py-3">
                    <Select value={r.status} onValueChange={(v) => changeStatus(r, v)}>
                      <SelectTrigger className={`h-8 w-36 border ${STYLE[r.status] || ""}`} data-testid={`content-status-${r.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    {(r.views || r.likes || r.comments) ? (
                      <div className="flex gap-3 text-xs font-mono-num text-slate-600">
                        <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-sky-500" />{r.views || 0}</span>
                        <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-red-500" />{r.likes || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 text-green-500" />{r.comments || 0}</span>
                      </div>
                    ) : <span className="text-xs text-slate-300">-</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Button size="sm" variant="outline" className="text-xs mr-1" onClick={() => openMetric(r)} data-testid={`content-metric-${r.id}`}><BarChart3 className="w-3.5 h-3.5 mr-1" /> Metrik</Button>
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

      <Dialog open={!!metricFor} onOpenChange={(o) => !o && setMetricFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Metrik Konten (FYP / Viral)</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-3 py-2">
            <div><Label className="text-xs text-slate-500">Views</Label><Input type="number" value={metric.views} onChange={(e) => setMetric({ ...metric, views: e.target.value })} className="mt-1" data-testid="metric-views" /></div>
            <div><Label className="text-xs text-slate-500">Likes</Label><Input type="number" value={metric.likes} onChange={(e) => setMetric({ ...metric, likes: e.target.value })} className="mt-1" data-testid="metric-likes" /></div>
            <div><Label className="text-xs text-slate-500">Komentar</Label><Input type="number" value={metric.comments} onChange={(e) => setMetric({ ...metric, comments: e.target.value })} className="mt-1" data-testid="metric-comments" /></div>
            <div className="col-span-3"><Label className="text-xs text-slate-500">Link Konten</Label><Input value={metric.link} onChange={(e) => setMetric({ ...metric, link: e.target.value })} className="mt-1" placeholder="https://..." /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setMetricFor(null)}>Batal</Button><Button onClick={saveMetric} className="bg-sky-600 hover:bg-sky-700" data-testid="metric-save-btn">Simpan Metrik</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
