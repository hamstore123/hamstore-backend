import CrudResource from "@/components/CrudResource";
import { fileUrl } from "@/lib/api";

export default function Products() {
  return (
    <CrudResource
      title="Produk"
      subtitle="Kelola produk & inventaris"
      endpoint="/products"
      columns={[
        { key: "image_url", label: "Foto", render: (r) => (
          r.image_url
            ? <img src={fileUrl(r.image_url)} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
            : <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-[9px]">No Img</div>
        ) },
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
        { name: "image_url", label: "Foto Produk", type: "image", full: true },
        { name: "name", label: "Nama Produk", required: true, full: true },
        { name: "brand", label: "Brand" },
        { name: "category", label: "Kategori", default: "Handphone" },
        { name: "sku", label: "SKU", scannable: true },
        { name: "imei", label: "IMEI", scannable: true },
        { name: "stock", label: "Stok", type: "number" },
        { name: "min_stock", label: "Stok Minimum", type: "number", default: 1 },
        { name: "cost_price", label: "Harga Modal", type: "number" },
        { name: "sell_price", label: "Harga Jual", type: "number" },
        { name: "description", label: "Deskripsi", full: true },
      ]}
    />
  );
}
