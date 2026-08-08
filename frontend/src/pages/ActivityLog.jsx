import { useEffect, useState } from "react";
import api, { fmtDate } from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";

const CAT = {
  penjualan: "bg-sky-100 text-sky-700",
  produk: "bg-violet-100 text-violet-700",
  shift: "bg-amber-100 text-amber-700",
  umum: "bg-slate-100 text-slate-700",
};

export default function ActivityLog() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get("/activity-logs").then(({ data }) => setRows(data)).finally(() => setLoading(false)); }, []);

  return (
    <div>
      <PageHeader title="Log Aktivitas Karyawan" subtitle="Jejak aktivitas transaksi & operasional" />
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Waktu", "Karyawan", "Role", "Aktivitas", "Detail"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={5}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={5}><Empty /></td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50" data-testid={`log-${r.id}`}>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3 font-medium">{r.user_name}</td>
                  <td className="px-4 py-3"><span className="text-xs uppercase text-slate-500">{r.role}</span></td>
                  <td className="px-4 py-3"><span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${CAT[r.category] || CAT.umum}`}>{r.action}</span></td>
                  <td className="px-4 py-3 text-slate-600">{r.detail}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
