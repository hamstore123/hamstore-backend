import { useEffect, useState } from "react";
import api, { fmtIDR } from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";

export default function Performance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get("/performance/summary").then(({ data }) => setData(data)).finally(() => setLoading(false)); }, []);
  if (loading) return <Loading />;
  const staff = data?.staff || [];

  return (
    <div>
      <PageHeader title="Kinerja Karyawan" subtitle="Ringkasan performa 30 hari terakhir" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.length === 0 && <Empty />}
        {staff.map((s) => (
          <div key={s.staff_id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5" data-testid={`perf-${s.staff_id}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-medium text-slate-800">{s.name}</div>
                <div className="text-xs uppercase text-sky-600 font-semibold">{s.role}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold font-mono-num text-sky-700">{s.overall_score}</div>
                <div className="text-[10px] text-slate-400 uppercase">Skor</div>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <Row l="Penjualan" v={`${fmtIDR(s.sales_total)} (${s.sales_count}x)`} />
              <Row l="Laba Penjualan" v={fmtIDR(s.sales_profit)} tone="text-green-600" />
              <Row l="Task Selesai" v={`${s.tasks_done} / ${s.tasks_done + s.tasks_todo + s.tasks_missed}`} />
              <Row l="Konten Upload" v={`${s.content_uploaded} (telat ${s.content_late})`} />
              <Row l="Service Ditangani" v={s.services_handled} />
              <Row l="Hari Hadir" v={s.attendance_days} />
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex gap-3 text-xs">
              <span className="text-slate-500">Task: <b className="text-slate-700">{s.task_score}%</b></span>
              <span className="text-slate-500">Konten: <b className="text-slate-700">{s.content_score}%</b></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
const Row = ({ l, v, tone = "text-slate-700" }) => (
  <div className="flex justify-between"><span className="text-slate-500">{l}</span><span className={`font-mono-num ${tone}`}>{v}</span></div>
);
