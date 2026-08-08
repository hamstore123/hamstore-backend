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

const GRADE_DEFAULT = { A: 99, B: 85, C: 70, D: 40 };

const DEDUCTIONS = [
  { key: "tanpa_dus", label: "Tanpa Dus", pct: 10 },
  { key: "tanpa_charger", label: "Tanpa Charger", pct: 2 },
  { key: "tanpa_nota", label: "Tanpa Nota Pembelian", pct: 2 },
  { key: "garansi_habis", label: "Garansi Habis", pct: 3 },
  { key: "lcd_shadow", label: "LCD Bayangan/Shadow", pct: 10 },
  { key: "lcd_burnin", label: "LCD Burn-in/Spot", pct: 10 },
  { key: "lcd_retak", label: "LCD Retak/Pecah", pct: 25 },
  { key: "baterai", label: "Baterai di bawah 80%", pct: 7 },
  { key: "ex_inter", label: "EX INTER / NON RESMI", pct: 40 },
  { key: "port", label: "Port Charger Bermasalah", pct: 5 },
  { key: "kamera", label: "Kamera Blur/Bermasalah", pct: 5 },
  { key: "speaker", label: "Speaker Pecah", pct: 5 },
  { key: "mic", label: "Mic Bermasalah", pct: 8 },
  { key: "fingerprint", label: "Fingerprint/FaceID Mati", pct: 10 },
  { key: "sinyal", label: "Sinyal Lemah", pct: 8 },
  { key: "body", label: "Body Penyok/Bengkok", pct: 10 },
  { key: "servis", label: "Sudah Pernah Servis", pct: 10 },
];
const MAX_TOTAL = 80;

export default function HpPrices() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ brand: "", model: "", market_price: 0, note: "" });

  // calculator state
  const [modelId, setModelId] = useState("");
  const [grade, setGrade] = useState("B");
  const [gradePct, setGradePct] = useState(GRADE_DEFAULT.B);
  const [ded, setDed] = useState(() => DEDUCTIONS.reduce((a, d) => ({ ...a, [d.key]: { active: false, pct: d.pct } }), {}));

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

  const onGrade = (g) => { setGrade(g); setGradePct(GRADE_DEFAULT[g]); };
  const toggleDed = (k, v) => setDed({ ...ded, [k]: { ...ded[k], active: v === "ya" } });
  const setDedPct = (k, pct) => setDed({ ...ded, [k]: { ...ded[k], pct: Number(pct) } });

  const selected = rows.find((r) => r.id === modelId);
  const market = selected?.market_price || 0;
  const afterGrade = market * (Number(gradePct) / 100);
  const totalPotongan = Math.min(MAX_TOTAL, DEDUCTIONS.reduce((s, d) => s + (ded[d.key].active ? Number(ded[d.key].pct || 0) : 0), 0));
  const finalPrice = afterGrade * (1 - totalPotongan / 100);
  const recLow = finalPrice * 1.15;
  const recHigh = finalPrice * 1.25;

  return (
    <div>
      <PageHeader title="Kalkulator Harga Beli / Tukar Tambah" subtitle="Estimasi harga beli HP bekas berdasarkan grade & kondisi" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* left: pick + grade + result */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 font-medium text-slate-800 mb-3"><span className="w-6 h-6 rounded bg-sky-100 text-sky-700 text-xs flex items-center justify-center font-semibold">1</span> Pilih HP</div>
            <Label className="text-xs text-slate-500">Model (Merek - Model)</Label>
            <Select value={modelId} onValueChange={setModelId}>
              <SelectTrigger className="mt-1" data-testid="calc-model"><SelectValue placeholder="Pilih model" /></SelectTrigger>
              <SelectContent>{rows.map((r) => <SelectItem key={r.id} value={r.id}>{r.brand} - {r.model}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex justify-between mt-3 text-sm"><span className="text-slate-500">Harga Pasaran</span><span className="font-mono-num font-semibold text-slate-800">{fmtIDR(market)}</span></div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 font-medium text-slate-800 mb-3"><span className="w-6 h-6 rounded bg-sky-100 text-sky-700 text-xs flex items-center justify-center font-semibold">2</span> Grade Kondisi</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Grade</Label>
                <Select value={grade} onValueChange={onGrade}>
                  <SelectTrigger className="mt-1" data-testid="calc-grade"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.keys(GRADE_DEFAULT).map((g) => <SelectItem key={g} value={g}>Grade {g}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-slate-500">% Grade</Label>
                <Input type="number" value={gradePct} onChange={(e) => setGradePct(e.target.value)} className="mt-1" data-testid="calc-grade-pct" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Default: A=99% B=85% C=70% D=40% (bisa diedit)</p>
            <div className="flex justify-between mt-3 text-sm"><span className="text-slate-500">Harga setelah Grade</span><span className="font-mono-num font-semibold text-slate-800">{fmtIDR(afterGrade)}</span></div>
          </div>

          <div className="bg-gradient-to-br from-sky-600 to-sky-700 rounded-xl shadow-sm p-5 text-white">
            <div className="text-xs uppercase tracking-wide opacity-80">Harga Beli / Tukar Tambah Final</div>
            <div className="text-3xl font-semibold font-mono-num mt-1" data-testid="calc-result">{fmtIDR(finalPrice)}</div>
            <div className="text-xs opacity-90 mt-2">Total potongan aktif: <b>{totalPotongan}%</b></div>
            <div className="text-xs opacity-90 mt-1">Rekomendasi jual: {fmtIDR(recLow)} - {fmtIDR(recHigh)}</div>
          </div>
        </div>

        {/* right: condition checklist */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 font-medium text-slate-800 mb-1"><span className="w-6 h-6 rounded bg-sky-100 text-sky-700 text-xs flex items-center justify-center font-semibold">3</span> Kondisi Minus</div>
          <p className="text-[11px] text-slate-400 mb-3">Pilih "Ya" jika ada masalah. Nilai potongan% bisa diedit.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200"><tr>
                <th className="px-3 py-2 text-left font-medium text-slate-500">Item Kerusakan</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500 w-32">Ada?</th>
                <th className="px-3 py-2 text-left font-medium text-slate-500 w-28">Potongan %</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {DEDUCTIONS.map((d) => {
                  const st = ded[d.key];
                  return (
                    <tr key={d.key} className={st.active ? "bg-red-50" : ""}>
                      <td className="px-3 py-1.5 text-slate-700">{d.label}</td>
                      <td className="px-3 py-1.5">
                        <Select value={st.active ? "ya" : "tidak"} onValueChange={(v) => toggleDed(d.key, v)}>
                          <SelectTrigger className="h-8" data-testid={`ded-${d.key}`}><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="tidak">Tidak</SelectItem><SelectItem value="ya">Ya</SelectItem></SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-1.5">
                        <Input type="number" value={st.pct} onChange={(e) => setDedPct(d.key, e.target.value)} className="h-8 w-20 bg-amber-50" />
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-amber-100 font-semibold">
                  <td className="px-3 py-2 text-amber-800">TOTAL POTONGAN AKTIF (maks {MAX_TOTAL}%)</td>
                  <td></td>
                  <td className="px-3 py-2 font-mono-num text-amber-800" data-testid="calc-total-potongan">{totalPotongan}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* master list */}
      <div className="flex items-center justify-between mb-3">
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari model / brand..." className="pl-9" data-testid="hp-search" />
        </div>
        <Button onClick={() => { setEditing(null); setForm({ brand: "", model: "", market_price: 0, note: "" }); setOpen(true); }} className="bg-sky-600 hover:bg-sky-700 ml-3" data-testid="hp-add-btn">
          <Plus className="w-4 h-4 mr-1.5" /> Tambah
        </Button>
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
