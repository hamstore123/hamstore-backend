import { useEffect, useState, useCallback } from "react";
import api, { fmtIDR, fileUrl } from "@/lib/api";
import { PageHeader, Loading, Empty, SkeletonTable } from "@/components/common";
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
import { Plus, Pencil, Trash2, Search, ScanLine } from "lucide-react";
import { ensureStoreLocation } from "@/lib/geofence";
import BarcodeScanner from "@/components/BarcodeScanner";

// columns: [{key,label,money,render}]  fields: [{name,label,type,options,money,required}]
export default function CrudResource({
  title, subtitle, endpoint, columns, fields, searchable = true,
  canCreate = true, canEdit = true, canDelete = true, transform, totalField, scanSearch = false,
  requiresLocation = false,
  filters = [], sortOptions = [], // filters: [{name,label,type,options}], sortOptions: [{value,label}]
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dynamicOptions, setDynamicOptions] = useState({});
  const [filtersState, setFiltersState] = useState({});
  const [sortBy, setSortBy] = useState("");
  const [sortDir, setSortDir] = useState(-1);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalItems, setTotalItems] = useState(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierField, setSupplierField] = useState(null);
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", address: "" });
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scan, setScan] = useState(null);

  const uploadImage = async (e, name) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setUploading(true);
    try {
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      const url = data?.url || data?.path || data?.file_url || data;
      setForm((prev) => ({ ...prev, [name]: url }));
      toast.success("Foto diunggah");
    } catch (err) {
      toast.error("Gagal upload foto");
    } finally {
      setUploading(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchable && q) params.q = q;
      // attach filters
      Object.entries(filtersState || {}).forEach(([k, v]) => { if (v !== "" && v != null) params[k] = v; });
      if (sortBy) {
        if (typeof sortBy === "string" && sortBy.startsWith("-")) {
          params.sort_by = sortBy.slice(1);
          params.sort_dir = -1;
        } else {
          params.sort_by = sortBy;
          params.sort_dir = sortDir;
        }
      }
      if (page) params.page = page;
      if (limit) params.limit = limit;
      const { data } = await api.get(endpoint, { params });
      const items = Array.isArray(data) ? data : data.items || [];
      setRows(items);
      if (!Array.isArray(data) && data.limit) setTotalItems((data.page || 1) * data.limit + (items.length || 0));
    } catch (e) {
      toast.error("Gagal memuat data");
    } finally { setLoading(false); }
  }, [endpoint, q, searchable, filtersState, sortBy, sortDir, page, limit]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => { setPage(1); }, [q, JSON.stringify(filtersState), sortBy, sortDir]);

  useEffect(() => {
    const map = {};
    (fields || []).forEach((f) => {
      if (f.options) map[f.name] = f.options;
      else if (f.type === "supplier") map[f.name] = [];
    });
    setDynamicOptions(map);
  }, [fields]);

  const createSupplier = async () => {
    if (!supplierField) return;
    if (!supplierForm.name) return toast.error("Nama supplier wajib");
    setSupplierSaving(true);
    try {
      const { data } = await api.post("/suppliers", supplierForm);
      const entry = { value: data.id, label: data.name };
      setDynamicOptions((prev) => ({ ...prev, [supplierField]: [...(prev[supplierField] || []), entry] }));
      setForm((prev) => ({ ...prev, [supplierField]: data.id, supplier_name: data.name }));
      setSupplierOpen(false);
      toast.success("Supplier ditambahkan");
    } catch (e) {
      toast.error("Gagal menambahkan supplier");
    } finally { setSupplierSaving(false); }
  };

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
      if (requiresLocation) await ensureStoreLocation();
      let payload = { ...form };
      fields.forEach((f) => { if (f.type === "number") payload[f.name] = Number(payload[f.name] || 0); });
      if (transform) payload = transform(payload, editing);

      // preserve scroll position
      const prevScroll = typeof window !== "undefined" ? window.scrollY : 0;

      if (editing) {
        // optimistic update for edit
        await api.put(`${endpoint}/${editing.id}`, payload);
        setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)));
      } else {
        // create: use server return if available
        const { data } = await api.post(endpoint, payload);
        const newItem = data || payload;
        setRows((prev) => [newItem, ...prev]);
      }

      toast.success(editing ? "Berhasil diperbarui" : "Berhasil ditambahkan");
      setOpen(false);
      // restore scroll
      if (typeof window !== "undefined") setTimeout(() => window.scrollTo({ top: prevScroll }), 50);
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const del = async (row) => {
    if (!window.confirm("Hapus data ini?")) return;
    try {
      await api.delete(`${endpoint}/${row.id}`);
      // remove from current list without full reload
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("Dihapus");
    }
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
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          {searchable && (
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari..." className="pl-9" data-testid="crud-search" />
            </div>
          )}
          {scanSearch && (
            <Button type="button" variant="outline" onClick={() => setScan({ search: true })} data-testid="crud-scan-btn">
              <ScanLine className="w-4 h-4" />
            </Button>
          )}
          {sortOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border rounded px-2 py-1 text-sm">
                <option value="">Urutkan</option>
                {sortOptions.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button onClick={() => setSortDir((d) => (d === -1 ? 1 : -1))} className="px-2 py-1 border rounded">{sortDir === -1 ? "↓" : "↑"}</button>
            </div>
          )}
        </div>
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <div key={f.name} className="flex items-center gap-2">
                <label className="text-xs text-slate-500">{f.label}</label>
                {f.type === "select" ? (
                  <select value={filtersState[f.name] ?? ""} onChange={(e) => setFiltersState((p) => ({ ...p, [f.name]: e.target.value }))} className="border rounded px-2 py-1 text-sm">
                    <option value="">Semua</option>
                    {(f.options || []).map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
                  </select>
                ) : (
                  <Input value={filtersState[f.name] ?? ""} onChange={(e) => setFiltersState((p) => ({ ...p, [f.name]: e.target.value }))} placeholder={f.label} className="text-sm" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {totalField && (
        <div className="mb-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4 inline-flex items-center gap-3" data-testid="crud-total">
          <span className="text-xs uppercase tracking-wide font-medium text-slate-500">{totalField.label || "Total"}</span>
          <span className="text-xl font-semibold font-mono-num text-sky-700">
            {fmtIDR(rows.reduce((s, r) => s + Number(r[totalField.key] || 0), 0))}
          </span>
          <span className="text-xs text-slate-400">({rows.length} data)</span>
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
                <tr><td colSpan={columns.length + 1}><SkeletonTable rows={6} cols={columns.length + 1} /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={columns.length + 1}><Empty text={`Belum ada ${String(title || '').toLowerCase()}`} /></td></tr>
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
        <div className="px-4 py-3 border-t bg-slate-50 flex items-center justify-between">
          <div className="text-sm text-slate-500">{rows.length} item{rows.length !== 1 ? 's' : ''}</div>
          <div className="flex items-center gap-2">
            <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} variant="outline">Prev</Button>
            <div className="text-sm">Halaman {page}</div>
            <Button disabled={rows.length < limit} onClick={() => setPage((p) => p + 1)} variant="outline">Next</Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden p-0 flex flex-col">
            <div className="flex flex-col min-h-0 flex-1">
              <DialogHeader className="px-6 pt-6 pb-3 shrink-0"><DialogTitle>{editing ? "Edit" : "Tambah"} {title}</DialogTitle></DialogHeader>
              <div className="overflow-y-auto flex-1 px-6">
                <div className="grid grid-cols-2 gap-4 py-2">
                  {fields.map((f) => (
                    <div key={f.name} className={f.full ? "col-span-2" : "col-span-1"}>
                      <Label className="text-xs text-slate-500">{f.label}{f.required && " *"}</Label>
                      {f.type === "select" ? (
                        <Select value={String(form[f.name] ?? "")} onValueChange={(v) => setForm({ ...form, [f.name]: v })}>
                          <SelectTrigger className="mt-1" data-testid={`field-${f.name}`}><SelectValue placeholder="Pilih" /></SelectTrigger>
                          <SelectContent>
                            {(dynamicOptions[f.name] || f.options || []).map((o) => (
                              <SelectItem key={o.value ?? o} value={String(o.value ?? o)}>{o.label ?? o}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : f.type === "supplier" ? (
                        <div className="mt-1 flex gap-2 items-center">
                          <Select value={String(form[f.name] ?? "")} onValueChange={(v) => setForm({ ...form, [f.name]: v })}>
                            <SelectTrigger className="mt-1" data-testid={`field-${f.name}`}><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                            <SelectContent>
                              {(dynamicOptions[f.name] || []).map((o) => (
                                <SelectItem key={o.value ?? o} value={String(o.value ?? o)}>{o.label ?? o}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" onClick={() => { setSupplierField(f.name); setSupplierForm({ name: "", phone: "", address: "" }); setSupplierOpen(true); }}>
                            Tambah
                          </Button>
                        </div>
                      ) : f.type === "image" ? (
                        <div className="mt-1 flex items-center gap-3">
                          {form[f.name]
                            ? <img src={fileUrl(form[f.name])} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
                            : <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-[10px]">No Img</div>}
                          <input type="file" accept="image/*" onChange={(e) => uploadImage(e, f.name)} data-testid={`field-${f.name}`} className="text-xs" />
                          {uploading && <span className="text-xs text-slate-400">Mengupload...</span>}
                        </div>
                      ) : f.scannable ? (
                        <div className="mt-1 flex gap-2">
                          <Input type="text" value={form[f.name] ?? ""} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} data-testid={`field-${f.name}`} />
                          <Button type="button" variant="outline" className="shrink-0" onClick={() => setScan({ field: f.name })} data-testid={`scan-${f.name}`}>
                            <ScanLine className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Input
                          type={f.type === "number" ? "number" : f.type === "color" ? "color" : "text"}
                          value={form[f.name] ?? ""}
                          placeholder={f.placeholder || ""}
                          onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                          className="mt-1" data-testid={`field-${f.name}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="save-footer">
                <div style={{ marginRight: 'auto' }}>
                  <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                </div>
                <div>
                  <Button onClick={save} disabled={saving} className="bg-sky-600 hover:bg-sky-700 btn-shadow" data-testid="crud-save-btn">
                    {saving ? "Menyimpan..." : "Simpan"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
      </Dialog>

      <Dialog open={supplierOpen} onOpenChange={setSupplierOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Tambah Supplier</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-2">
            <Label className="text-xs text-slate-500">Nama</Label>
            <Input value={supplierForm.name} onChange={(e) => setSupplierForm((s) => ({ ...s, name: e.target.value }))} />
            <Label className="text-xs text-slate-500">Telepon</Label>
            <Input value={supplierForm.phone} onChange={(e) => setSupplierForm((s) => ({ ...s, phone: e.target.value }))} />
            <Label className="text-xs text-slate-500">Alamat</Label>
            <Input value={supplierForm.address} onChange={(e) => setSupplierForm((s) => ({ ...s, address: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSupplierOpen(false)}>Batal</Button>
            <Button onClick={createSupplier} disabled={supplierSaving} className="bg-sky-600 hover:bg-sky-700">{supplierSaving ? "Menyimpan..." : "Simpan Supplier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BarcodeScanner open={!!scan} onClose={() => setScan(null)} onScan={(code) => {
        if (scan?.search) setQ(code);
        else if (scan?.field) setForm((f) => ({ ...f, [scan.field]: code }));
        setScan(null);
        toast.success("Kode terbaca: " + code);
      }} />
    </div>
  );
}
