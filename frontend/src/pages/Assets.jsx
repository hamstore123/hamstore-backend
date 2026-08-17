import CrudResource from "@/components/CrudResource";
import { fmtDate } from "@/lib/api";

export default function AssetsPage() {
  const columns = [
    { key: "name", label: "Nama" },
    { key: "category", label: "Kategori" },
    { key: "quantity", label: "Jumlah", money: false },
    { key: "condition", label: "Kondisi" },
    { key: "acquired_date", label: "Tanggal Perolehan", render: (r) => fmtDate(r.acquired_date) },
    { key: "location", label: "Lokasi" },
    { key: "value", label: "Nilai", money: true },
  ];

  const fields = [
    { name: "name", label: "Nama", required: true },
    { name: "category", label: "Kategori" },
    { name: "quantity", label: "Jumlah", type: "number", required: true },
    { name: "condition", label: "Kondisi", type: "select", options: ["Baik", "Rusak", "Butuh Servis"] },
    { name: "acquired_date", label: "Tanggal Perolehan" },
    { name: "location", label: "Lokasi" },
    { name: "value", label: "Nilai", type: "number" },
    { name: "note", label: "Catatan", full: true },
  ];

  return (
    <CrudResource
      title="Aset Toko"
      subtitle="Kelola inventaris aset toko"
      endpoint="/assets"
      columns={columns}
      fields={fields}
      searchable
    />
  );
}
