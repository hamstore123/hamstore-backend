import { useEffect, useState } from "react";
import api from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LogIn, LogOut, Coffee, CupSoda, CalendarOff } from "lucide-react";

const KIND_LABEL = { in: "Masuk", out: "Keluar", break_start: "Mulai Istirahat", break_end: "Selesai Istirahat", libur: "Libur" };
const KIND_TONE = { in: "text-green-600", out: "text-slate-500", break_start: "text-amber-600", break_end: "text-amber-600", libur: "text-red-600" };

export default function Attendance() {
  const [rows, setRows] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState("");
  const [shift, setShift] = useState("pagi");

  const load = () => { setLoading(true); api.get("/attendance").then(({ data }) => setRows(data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); api.get("/staff").then(({ data }) => setStaff(data)).catch(() => {}); }, []);

  const record = async (kind) => {
    if (!sel) return toast.error("Pilih karyawan");
    await api.post("/attendance", { staff_id: sel, kind, shift });
    toast.success(`${KIND_LABEL[kind]} tercatat`); load();
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
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Karyawan", "Aktivitas", "Shift", "Waktu (WIB)", "Terlambat", "Lembur", "Tanggal"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={7}><Empty /></td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{r.staff_name}</td>
                  <td className="px-4 py-3"><span className={KIND_TONE[r.kind] || "text-slate-600"}>{KIND_LABEL[r.kind] || r.kind}</span></td>
                  <td className="px-4 py-3 capitalize">{r.shift}</td>
                  <td className="px-4 py-3 font-mono-num">{r.wib_time}</td>
                  <td className="px-4 py-3 font-mono-num text-red-600">{r.late_minutes ? `${r.late_minutes}m` : "-"}</td>
                  <td className="px-4 py-3 font-mono-num text-green-600">{r.overtime_minutes ? `${r.overtime_minutes}m` : "-"}</td>
                  <td className="px-4 py-3 text-slate-500">{r.wib_date}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
