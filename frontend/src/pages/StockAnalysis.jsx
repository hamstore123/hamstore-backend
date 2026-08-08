import { useEffect, useState, useCallback } from "react";
import api, { fmtIDR, fmtDate } from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";
import { AlertTriangle, PackageSearch } from "lucide-react";

export default function StockAnalysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(() => {
    setLoading(true);
    api.get("/stock/analysis", { params: { days } }).then(({ data }) => setData(data)).finally(() => setLoading(false));
  }, [days]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <PageHeader title="Analisis Stok" subtitle="Deteksi unit stok lama (perputaran modal)">
        <div className="flex gap-2">
          {[30, 60, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} data-testid={`days-${d}`} className={`px-3 py-1.5 rounded-md text-sm ${days === d ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>&gt; {d} hari</button>
          ))}
        </div>
      </PageHeader>

      {loading ? <Loading /> : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 max-w-xl">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <div className="flex items-center gap-2 text-xs uppercase text-slate-500 font-medium"><PackageSearch className="w-4 h-4 text-amber-500" /> Unit Stok Lama</div>
              <div className="text-2xl font-semibold font-mono-num mt-1" data-testid="old-count">{data?.count ?? 0} unit</div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-sm p-4 text-white">
              <div className="flex items-center gap-2 text-xs uppercase font-medium opacity-90"><AlertTriangle className="w-4 h-4" /> Modal Tertahan</div>
              <div className="text-2xl font-semibold font-mono-num mt-1" data-testid="tied-capital">{fmtIDR(data?.total_modal)}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200"><tr>
                {["Nama Unit", "IMEI", "Tgl Masuk", "Umur", "Stok", "Modal", "Status"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.items || []).length === 0 ? <tr><td colSpan={7}><Empty text="Tidak ada stok lama 🎉 Perputaran barang sehat." /></td></tr>
                  : data.items.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 font-mono-num text-xs">{p.imei || "-"}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(p.created_at)}</td>
                      <td className="px-4 py-3 font-mono-num font-semibold text-red-600">{p.age_days} hari</td>
                      <td className="px-4 py-3 font-mono-num">{p.stock}</td>
                      <td className="px-4 py-3 font-mono-num">{fmtIDR(p.modal)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${p.age_days >= 60 ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-800 border-amber-200"}`}>
                          {p.age_days >= 60 ? "Perlu Promo" : "Stok Lama"}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
