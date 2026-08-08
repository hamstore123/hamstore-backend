import { useEffect, useState } from "react";
import api, { fmtIDR, fmtDate } from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DoorOpen, DoorClosed, Banknote, CreditCard, Smartphone, Landmark } from "lucide-react";

const Field = ({ label, icon: Icon, value, onChange }) => (
  <div>
    <Label className="text-xs text-slate-500 flex items-center gap-1.5"><Icon className="w-3.5 h-3.5" /> {label}</Label>
    <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
  </div>
);

export default function CashDrawer() {
  const [shift, setShift] = useState(undefined);
  const [history, setHistory] = useState([]);
  const [openingCash, setOpeningCash] = useState(0);
  const [close, setClose] = useState({ cash_actual: 0, edc_actual: 0, brilink_actual: 0, bank_actual: 0, note: "" });
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get("/shifts/current").then(({ data }) => setShift(data)).catch(() => setShift(null));
    api.get("/shifts").then(({ data }) => setHistory(data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const openShift = async () => {
    setBusy(true);
    try { await api.post("/shifts/open", { opening_cash: Number(openingCash || 0) }); toast.success("Shift dibuka"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Gagal buka shift"); } finally { setBusy(false); }
  };
  const closeShift = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/shifts/close", {
        cash_actual: Number(close.cash_actual || 0), edc_actual: Number(close.edc_actual || 0),
        brilink_actual: Number(close.brilink_actual || 0), bank_actual: Number(close.bank_actual || 0), note: close.note,
      });
      toast.success(`Shift ditutup. Selisih kas: ${fmtIDR(data.cash_diff)}`);
      setClose({ cash_actual: 0, edc_actual: 0, brilink_actual: 0, bank_actual: 0, note: "" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal tutup shift"); } finally { setBusy(false); }
  };

  if (shift === undefined) return <Loading />;

  return (
    <div>
      <PageHeader title="Cash Drawer / Shift" subtitle="Buka & tutup shift kas — laci, EDC, BRILink, Bank" />

      {!shift ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-md">
          <div className="flex items-center gap-2 font-medium text-slate-800 mb-4"><DoorOpen className="w-5 h-5 text-green-600" /> Buka Shift</div>
          <Label className="text-xs text-slate-500">Modal Laci Awal (Cash)</Label>
          <Input type="number" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} className="mt-1" data-testid="opening-cash" />
          <Button onClick={openShift} disabled={busy} className="w-full mt-4 bg-green-600 hover:bg-green-700" data-testid="open-shift-btn">Buka Shift</Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-medium text-slate-800"><DoorClosed className="w-5 h-5 text-red-500" /> Tutup Shift</div>
            <div className="text-xs text-slate-400">Dibuka {fmtDate(shift.opened_at)} · Modal laci {fmtIDR(shift.opening_cash)}</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Uang Cash di Laci (aktual)" icon={Banknote} value={close.cash_actual} onChange={(v) => setClose({ ...close, cash_actual: v })} />
            <Field label="Total EDC (mesin gesek)" icon={CreditCard} value={close.edc_actual} onChange={(v) => setClose({ ...close, edc_actual: v })} />
            <Field label="Total Aplikasi BRILink" icon={Smartphone} value={close.brilink_actual} onChange={(v) => setClose({ ...close, brilink_actual: v })} />
            <Field label="Total Saldo Bank / Transfer" icon={Landmark} value={close.bank_actual} onChange={(v) => setClose({ ...close, bank_actual: v })} />
            <div className="col-span-2"><Label className="text-xs text-slate-500">Catatan</Label><Input value={close.note} onChange={(e) => setClose({ ...close, note: e.target.value })} className="mt-1" /></div>
          </div>
          <Button onClick={closeShift} disabled={busy} className="w-full mt-4 bg-red-600 hover:bg-red-700" data-testid="close-shift-btn">Tutup Shift & Rekap</Button>
        </div>
      )}

      <h3 className="font-medium text-slate-800 mt-8 mb-3">Riwayat Shift</h3>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Kasir", "Buka", "Tutup", "Modal", "Penj. Cash", "Kas Seharusnya", "Cash Aktual", "EDC", "BRILink", "Bank", "Selisih"].map((h) => <th key={h} className="px-3 py-2.5 text-left font-medium text-slate-500 whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {history.length === 0 ? <tr><td colSpan={11}><Empty /></td></tr>
              : history.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 font-mono-num">
                  <td className="px-3 py-2 font-sans">{s.opened_by_name}</td>
                  <td className="px-3 py-2 text-xs">{fmtDate(s.opened_at)}</td>
                  <td className="px-3 py-2 text-xs">{s.closed_at ? fmtDate(s.closed_at) : <span className="text-green-600 font-sans">Aktif</span>}</td>
                  <td className="px-3 py-2">{fmtIDR(s.opening_cash)}</td>
                  <td className="px-3 py-2">{fmtIDR(s.cash_sales)}</td>
                  <td className="px-3 py-2">{fmtIDR(s.expected_cash)}</td>
                  <td className="px-3 py-2">{fmtIDR(s.cash_actual)}</td>
                  <td className="px-3 py-2">{fmtIDR(s.edc_actual)}</td>
                  <td className="px-3 py-2">{fmtIDR(s.brilink_actual)}</td>
                  <td className="px-3 py-2">{fmtIDR(s.bank_actual)}</td>
                  <td className={`px-3 py-2 font-semibold ${s.cash_diff < 0 ? "text-red-600" : s.cash_diff > 0 ? "text-amber-600" : "text-green-600"}`}>{s.closed_at ? fmtIDR(s.cash_diff) : "-"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
