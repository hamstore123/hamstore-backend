import { useEffect, useState } from "react";
import api, { fmtDate } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SkeletonTable } from "@/components/common";

export default function IMEICheck() {
  const [imei, setImei] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/imei-history", { params: q ? { q } : {} });
      setRows(data.items || []);
    } catch (e) { toast.error("Gagal memuat riwayat"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openBeaCukai = async () => {
    if (!imei) return toast.error("Masukkan IMEI terlebih dahulu");
    try {
      await navigator.clipboard.writeText(imei);
      window.open("https://old.beacukai.go.id/websitenewV2/cek-imei.html", "_blank");
      toast.success("IMEI disalin, membuka situs Bea Cukai...");
    } catch (e) {
      window.open("https://old.beacukai.go.id/websitenewV2/cek-imei.html", "_blank");
      toast.success("Membuka situs Bea Cukai");
    }
  };

  const save = async () => {
    if (!imei) return toast.error("IMEI wajib");
    try {
      const { data } = await api.post("/imei-history", { imei, note });
      setRows((r) => [data, ...r]);
      setImei(""); setNote("");
      toast.success("Disimpan ke riwayat");
    } catch (e) { toast.error("Gagal menyimpan"); }
  };

  const del = async (id) => {
    if (!confirm("Hapus catatan ini?")) return;
    try {
      await api.delete(`/imei-history/${id}`);
      setRows((r) => r.filter((x) => x.id !== id));
      toast.success("Dihapus");
    } catch (e) { toast.error("Gagal menghapus"); }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">Cek IMEI (Bea Cukai)</h2>
      <p className="text-sm text-slate-500 mb-4">Masukkan IMEI dan buka situs resmi Bea Cukai. IMEI akan disalin ke clipboard otomatis.</p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="col-span-2">
          <Label>IMEI</Label>
          <Input value={imei} onChange={(e) => setImei(e.target.value)} placeholder="Masukkan IMEI" />
        </div>
        <div className="flex items-end">
          <Button onClick={openBeaCukai} className="w-full bg-sky-600 hover:bg-sky-700">Buka Bea Cukai</Button>
        </div>
      </div>

      <div className="mb-4">
        <Label>Catatan / Hasil (opsional)</Label>
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan singkat" />
        <div className="mt-2">
          <Button onClick={save} className="bg-sky-600 hover:bg-sky-700">Simpan Riwayat</Button>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-slate-500">Riwayat pengecekan</div>
        <div className="flex gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari..." />
          <Button onClick={load} variant="outline">Refresh</Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2 text-left">IMEI</th>
                <th className="px-4 py-2 text-left">Hasil / Catatan</th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Waktu</th>
                <th className="px-4 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5}><SkeletonTable rows={4} cols={5} /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-slate-500">Belum ada riwayat</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2">{r.imei}</td>
                  <td className="px-4 py-2">{r.result || r.note || "-"}</td>
                  <td className="px-4 py-2">{r.user_name}</td>
                  <td className="px-4 py-2">{fmtDate(r.created_at)}</td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="ghost" onClick={() => del(r.id)} className="text-red-600">Hapus</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
