import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ensureStoreLocation } from "@/lib/geofence";
import { LogIn, LogOut, Coffee, CupSoda, CalendarOff } from "lucide-react";

const KIND_LABEL = { in: "Masuk", out: "Keluar", break_start: "Mulai Istirahat", break_end: "Selesai Istirahat", libur: "Libur" };
const KIND_TONE = { in: "text-green-600", out: "text-slate-500", break_start: "text-amber-600", break_end: "text-amber-600", libur: "text-red-600" };

export default function Attendance() {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState("");
  const [shift, setShift] = useState("pagi");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [summaryView, setSummaryView] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      await api.get("/staff").then(({ data }) => setStaff(data)).catch(() => {});
      if (summaryView) {
        const params = {};
        if (start) params.start = start;
        if (end) params.end = end;
        if (sel) params.staff_id = sel;
        const { data } = await api.get("/attendance/daily", { params });
        setRows(data || []);
      } else {
        const { data } = await api.get("/attendance", { params: { start, end } });
        setRows(data || []);
      }
    } catch (e) { }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [summaryView]);

  const record = async (kind) => {
    if (!sel) return toast.error("Pilih karyawan");
    try {
      await ensureStoreLocation();
      await api.post("/attendance", { staff_id: sel, kind, shift });
      toast.success(`${KIND_LABEL[kind]} tercatat`);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Gagal mencatat absensi");
    }
  };

  const BTN = [
    { kind: "in", label: "Masuk", icon: LogIn, cls: "bg-green-600 hover:bg-green-700" },
    { kind: "out", label: "Keluar", icon: LogOut, cls: "bg-slate-600 hover:bg-slate-700" },
    { kind: "break_start", label: "Mulai Istirahat", icon: Coffee, cls: "bg-amber-500 hover:bg-amber-600" },
    { kind: "break_end", label: "Selesai Istirahat", icon: CupSoda, cls: "bg-amber-600 hover:bg-amber-700" },
    { kind: "libur", label: "Libur", icon: CalendarOff, cls: "bg-red-500 hover:bg-red-600" },
  ];

  return (
    <div>
      <PageHeader title="Absensi Staf" subtitle="Catat kehadiran, istirahat & libur karyawan (WIB)" />
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="md:col-span-2">
            <Label className="text-xs text-slate-500">Karyawan</Label>
            <Select value={sel} onValueChange={setSel}>
              <SelectTrigger className="mt-1" data-testid="att-staff"><SelectValue placeholder="Pilih karyawan" /></SelectTrigger>
              <SelectContent>{staff.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Shift</Label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pagi">Pagi</SelectItem><SelectItem value="siang">Siang</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {BTN.map((b) => {
            const Icon = b.icon;
            return (
              <Button key={b.kind} onClick={() => record(b.kind)} className={b.cls} data-testid={`att-${b.kind}`}>
                <Icon className="w-4 h-4 mr-1.5" /> {b.label}
              </Button>
            );
          })}
        </div>
        <div className="mt-3 flex gap-2 items-center">
          <Label className="text-xs text-slate-500">Dari</Label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          <Label className="text-xs text-slate-500">Sampai</Label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border rounded px-2 py-1 text-sm" />
          <Button onClick={load} className="ml-auto">Terapkan</Button>
          <Button variant="outline" onClick={() => setSummaryView((s) => !s)}>{summaryView ? 'Lihat Mentah' : 'Lihat Rekap'}</Button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
            <tr>
              { ["Karyawan","Tanggal","Shift","Masuk","Mulai Istirahat","Selesai Istirahat","Pulang","Total Jam","Terlambat","Lembur"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>) }
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={10}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={10}><Empty /></td></tr>
              : rows.map((r, idx) => (
                <tr key={`${r.staff_id}-${r.date}-${idx}`} className={`hover:bg-slate-50 ${idx%2===0? 'bg-white':'bg-slate-50'}`}>
                  <td className="px-4 py-3 font-medium">{r.staff_name}</td>
                  <td className="px-4 py-3">{r.date}</td>
                  <td className="px-4 py-3 capitalize">{r.shift}</td>
                  <td className="px-4 py-3 font-mono-num">{r.in_time || '-'}</td>
                  <td className="px-4 py-3 font-mono-num">{r.break_start || '-'}</td>
                  <td className="px-4 py-3 font-mono-num">{r.break_end || '-'}</td>
                  <td className="px-4 py-3 font-mono-num">{r.out_time || '-'}</td>
                  <td className="px-4 py-3 font-mono-num">{r.total_minutes ? `${Math.round((r.total_minutes||0)/60*100)/100} jam` : '-'}</td>
                  <td className="px-4 py-3 font-mono-num text-red-600">{r.late_minutes ? `${r.late_minutes}m` : '-'}</td>
                  <td className="px-4 py-3 font-mono-num text-green-600">{r.overtime_minutes ? `${r.overtime_minutes}m` : '-'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
