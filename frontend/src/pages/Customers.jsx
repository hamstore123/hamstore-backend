import CrudResource from "@/components/CrudResource";

export default function Customers() {
  return (
    <CrudResource
      title="Data Pelanggan"
      subtitle="Daftar pelanggan toko"
      endpoint="/customers"
      searchable={false}
      columns={[
        { key: "name", label: "Nama" },
        { key: "phone", label: "Telepon" },
        { key: "device_type", label: "Tipe HP" },
        { key: "imei", label: "IMEI" },
        { key: "address", label: "Alamat" },
      ]}
      fields={[
        { name: "name", label: "Nama Pelanggan", required: true, full: true },
        { name: "phone", label: "Telepon" },
        { name: "email", label: "Email" },
        { name: "device_type", label: "Tipe HP Dibeli" },
        { name: "imei", label: "IMEI" },
        { name: "address", label: "Alamat", full: true },
        { name: "note", label: "Catatan", full: true },
      ]}
    />
  );
}
