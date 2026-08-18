import CrudResource from "@/components/CrudResource";
import { fmtDate } from "@/lib/api";

export default function AssetsPage() {
  const columns = [
    { key: "name", label: "Nama" },
    { key: "category", label: "Kategori" },
    { key: "quantity", label: "Jumlah", money: false },
    { key: "condition", label: "Kondisi" },
    { key: "acquired_date", label: "Tanggal Perolehan", render: (r) => fmtDate(r.acquired_date) },
    { key: "purchase_source", label: "Dibeli Dari" },
    { key: "supplier_name", label: "Supplier" },
    { key: "invoice_number", label: "No. Invoice" },
    { key: "purchase_price", label: "Harga Beli", money: true },
    { key: "warranty_until", label: "Garansi Sampai" },
    { key: "location", label: "Lokasi" },
    { key: "value", label: "Nilai", money: true },
  ];

  const fields = [
    { name: "name", label: "Nama", required: true },
    { name: "category", label: "Kategori" },
    { name: "quantity", label: "Jumlah", type: "number", required: true },
    { name: "condition", label: "Kondisi", type: "select", options: ["Baik", "Rusak", "Butuh Servis"] },
    { name: "acquired_date", label: "Tanggal Perolehan", type: "date" },
    { name: "purchase_source", label: "Dibeli Dari", placeholder: "Contoh: Supplier / Toko Online" },
    { name: "supplier_name", label: "Nama Supplier" },
    { name: "invoice_number", label: "Nomor Invoice" },
    { name: "purchase_price", label: "Harga Beli", type: "number" },
    { name: "warranty_until", label: "Garansi Sampai", type: "date" },
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
