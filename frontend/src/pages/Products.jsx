import CrudResource from "@/components/CrudResource";

export default function Products() {
  return (
    <CrudResource
      title="Produk"
      subtitle="Kelola produk & inventaris"
      endpoint="/products"
      columns={[
        { key: "name", label: "Nama" },
        { key: "brand", label: "Brand" },
        { key: "category", label: "Kategori" },
        { key: "stock", label: "Stok", render: (r) => (
          <span className={r.stock <= (r.min_stock || 0) ? "text-red-600 font-medium" : ""}>{r.stock}</span>
        ) },
        { key: "cost_price", label: "Modal", money: true },
        { key: "sell_price", label: "Jual", money: true },
      ]}
      fields={[
        { name: "name", label: "Nama Produk", required: true, full: true },
        { name: "brand", label: "Brand" },
        { name: "category", label: "Kategori", default: "Handphone" },
        { name: "sku", label: "SKU" },
        { name: "imei", label: "IMEI" },
        { name: "stock", label: "Stok", type: "number" },
        { name: "min_stock", label: "Stok Minimum", type: "number", default: 1 },
        { name: "cost_price", label: "Harga Modal", type: "number" },
        { name: "sell_price", label: "Harga Jual", type: "number" },
        { name: "description", label: "Deskripsi", full: true },
      ]}
    />
  );
}
