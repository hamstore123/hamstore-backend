import CrudResource from "@/components/CrudResource";
import { fmtDate } from "@/lib/api";

export default function Expenses() {
  return (
    <CrudResource
      title="Biaya Pengeluaran"
      subtitle="Catat pengeluaran operasional"
      endpoint="/expenses"
      searchable={false}
      canEdit={false}
      totalField={{ key: "amount", label: "Total Pengeluaran" }}
      columns={[
        { key: "date", label: "Tanggal", render: (r) => fmtDate(r.date) },
        { key: "category", label: "Kategori" },
        { key: "description", label: "Deskripsi" },
        { key: "amount", label: "Jumlah", money: true },
      ]}
      fields={[
        { name: "category", label: "Kategori", required: true },
        { name: "amount", label: "Jumlah", type: "number", required: true },
        { name: "description", label: "Deskripsi", full: true },
      ]}
    />
  );
}
