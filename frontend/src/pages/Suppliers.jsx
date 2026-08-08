import CrudResource from "@/components/CrudResource";

export default function Suppliers() {
  return (
    <CrudResource
      title="Supplier"
      subtitle="Daftar pemasok barang"
      endpoint="/suppliers"
      searchable={false}
      canEdit={false}
      columns={[
        { key: "name", label: "Nama" },
        { key: "phone", label: "Telepon" },
        { key: "address", label: "Alamat" },
      ]}
      fields={[
        { name: "name", label: "Nama Supplier", required: true, full: true },
        { name: "phone", label: "Telepon" },
        { name: "address", label: "Alamat", full: true },
      ]}
    />
  );
}
