import { useEffect, useState, useCallback } from "react";
import api, { fmtIDR } from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search } from "lucide-react";

// columns: [{key,label,money,render}]  fields: [{name,label,type,options,money,required}]
export default function CrudResource({
  title, subtitle, endpoint, columns, fields, searchable = true,
  canCreate = true, canEdit = true, canDelete = true, transform,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(endpoint, { params: q && searchable ? { q } : {} });
      setRows(Array.isArray(data) ? data : data.items || []);
    } catch (e) {
      toast.error("Gagal memuat data");
    } finally { setLoading(false); }
  }, [endpoint, q, searchable]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    const init = {};
    fields.forEach((f) => (init[f.name] = f.type === "number" ? 0 : f.default ?? ""));
    setForm(init); setEditing(null); setOpen(true);
  };
  const openEdit = (row) => {
    const init = {};
    fields.forEach((f) => (init[f.name] = row[f.name] ?? (f.type === "number" ? 0 : "")));
    setForm(init); setEditing(row); setOpen(true);
  };

  const save = async () => {
    for (const f of fields)
      if (f.required && (form[f.name] === "" || form[f.name] == null))
        return toast.error(`${f.label} wajib diisi`);
    setSaving(true);
    try {
      let payload = { ...form };
      fields.forEach((f) => { if (f.type === "number") payload[f.name] = Number(payload[f.name] || 0); });
      if (transform) payload = transform(payload, editing);
      if (editing) await api.put(`${endpoint}/${editing.id}`, payload);
      else await api.post(endpoint, payload);
      toast.success(editing ? "Berhasil diperbarui" : "Berhasil ditambahkan");
      setOpen(false); load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const del = async (row) => {
    if (!window.confirm("Hapus data ini?")) return;
    try { await api.delete(`${endpoint}/${row.id}`); toast.success("Dihapus"); load(); }
    catch { toast.error("Gagal menghapus"); }
  };

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle}>
        {canCreate && (
          <Button onClick={openCreate} data-testid="crud-add-btn" className="bg-sky-600 hover:bg-sky-700">
            <Plus className="w-4 h-4 mr-1.5" /> Tambah
          </Button>
        )}
      </PageHeader>

      {searchable && (
        <div className="relative mb-4 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari..." className="pl-9" data-testid="crud-search" />
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className={`px-4 py-3 font-medium text-slate-500 ${c.money ? "text-right" : "text-left"}`}>{c.label}</th>
                ))}
                {(canEdit || canDelete) && <th className="px-4 py-3 text-right font-medium text-slate-500">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={columns.length + 1}><Loading /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={columns.length + 1}><Empty /></td></tr>
              ) : rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 text-slate-700 ${c.money ? "text-right font-mono-num" : ""}`}>
                      {c.render ? c.render(row) : c.money ? fmtIDR(row[c.key]) : (row[c.key] ?? "-")}
                    </td>
                  ))}
                  {(canEdit || canDelete) && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {canEdit && (
                        <button onClick={() => openEdit(row)} data-testid={`edit-${row.id}`} className="p-1.5 text-slate-500 hover:text-sky-600">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => del(row)} data-testid={`delete-${row.id}`} className="p-1.5 text-slate-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Tambah"} {title}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            {fields.map((f) => (
              <div key={f.name} className={f.full ? "col-span-2" : "col-span-1"}>
                <Label className="text-xs text-slate-500">{f.label}{f.required && " *"}</Label>
                {f.type === "select" ? (
                  <Select value={String(form[f.name] ?? "")} onValueChange={(v) => setForm({ ...form, [f.name]: v })}>
                    <SelectTrigger className="mt-1" data-testid={`field-${f.name}`}><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => (
                        <SelectItem key={o.value ?? o} value={String(o.value ?? o)}>{o.label ?? o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={form[f.name] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    className="mt-1" data-testid={`field-${f.name}`}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving} className="bg-sky-600 hover:bg-sky-700" data-testid="crud-save-btn">
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
