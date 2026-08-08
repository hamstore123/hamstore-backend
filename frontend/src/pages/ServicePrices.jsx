import CrudResource from "@/components/CrudResource";

export default function ServicePrices() {
  return (
    <CrudResource
      title="Master Harga Service"
      subtitle="Daftar harga jasa service"
      endpoint="/service-prices"
      searchable={false}
      columns={[
        { key: "name", label: "Nama Jasa" },
        { key: "category", label: "Kategori" },
        { key: "duration_hours", label: "Estimasi (jam)" },
        { key: "price", label: "Harga", money: true },
      ]}
      fields={[
        { name: "name", label: "Nama Jasa", required: true, full: true },
        { name: "category", label: "Kategori", default: "Umum" },
        { name: "duration_hours", label: "Estimasi (jam)", type: "number", default: 1 },
        { name: "price", label: "Harga", type: "number", required: true },
        { name: "description", label: "Deskripsi", full: true },
      ]}
    />
  );
}
