import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, Loading, Empty, StatusBadge } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const NEXT = { todo: "in_progress", in_progress: "done" };

export default function Tasks() {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignee_id: "", priority: "normal" });

  const load = () => { setLoading(true); api.get("/tasks").then(({ data }) => setRows(data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); api.get("/staff").then(({ data }) => setStaff(data)).catch(() => {}); }, []);

  const create = async () => {
    if (!form.title || !form.assignee_id) return toast.error("Judul & penanggung jawab wajib");
    await api.post("/tasks", form); toast.success("Task dibuat"); setOpen(false);
    setForm({ title: "", description: "", assignee_id: "", priority: "normal" }); load();
  };
  const advance = async (r) => { const n = NEXT[r.status]; if (!n) return; await api.put(`/tasks/${r.id}/status`, { status: n }); load(); };
  const del = async (id) => { if (!window.confirm("Hapus?")) return; await api.delete(`/tasks/${id}`); load(); };

  return (
    <div>
      <PageHeader title="Jobdesk / Task" subtitle="Microtask & penugasan karyawan">
        <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700" data-testid="task-add-btn"><Plus className="w-4 h-4 mr-1.5" /> Tambah Task</Button>
      </PageHeader>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Judul", "Penanggung Jawab", "Prioritas", "Status", "Aksi"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={5}><Empty /></td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">{r.title}<div className="text-xs text-slate-400">{r.description}</div></td>
                  <td className="px-4 py-3">{r.assignee_name}</td>
                  <td className="px-4 py-3 capitalize">{r.priority}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {NEXT[r.status] && <Button size="sm" variant="outline" className="text-xs mr-1" onClick={() => advance(r)} data-testid={`task-advance-${r.id}`}>→ {NEXT[r.status].replace("_", " ")}</Button>}
                    <button onClick={() => del(r.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Task</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className="text-xs text-slate-500">Judul</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Deskripsi</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Penanggung Jawab</Label>
              <Select value={form.assignee_id} onValueChange={(v) => setForm({ ...form, assignee_id: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs text-slate-500">Prioritas</Label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Batal</Button><Button onClick={create} className="bg-sky-600 hover:bg-sky-700" data-testid="task-save-btn">Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
