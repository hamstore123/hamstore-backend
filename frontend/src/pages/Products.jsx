import CrudResource from "@/components/CrudResource";
import api, { fileUrl } from "@/lib/api";
import { useEffect, useState } from "react";

export default function Products() {
  const [suppliers, setSuppliers] = useState([]);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await (await import("@/lib/api")).default.get("/suppliers");
        setSuppliers((data || []).map((s) => ({ value: s.id, label: s.name })));
      } catch (e) { setSuppliers([]); }
    })();
  }, []);

  const transform = (payload, editing) => {
    if (payload.supplier_id) {
      const s = suppliers.find((x) => x.value === payload.supplier_id);
      payload.supplier_name = s ? s.label : payload.supplier_name || "";
    }
    return payload;
  };

  return (
    <CrudResource
      title="Produk"
      subtitle="Kelola produk & inventaris"
      endpoint="/products"
      scanSearch
      transform={transform}
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
        { key: "supplier_name", label: "Supplier" },
        { key: "battery_health", label: "Battery" },
        { key: "condition", label: "Kondisi" },
        { key: "internet_type", label: "Tipe Internet" },
        { key: "device_status", label: "Status Perangkat" },
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
        { name: "battery_health", label: "Battery Health", type: "text" },
        { name: "condition", label: "Kondisi", type: "select", options: ["Baru", "Bekas", "Like New"] },
        { name: "internet_type", label: "Tipe Internet", type: "select", options: ["WiFi Only", "All Operator"] },
        { name: "device_status", label: "Status Perangkat", type: "select", options: ["Bea Cukai (resmi)", "iBox", "Lainnya"] },
        { name: "supplier_id", label: "Supplier", type: "supplier", options: suppliers },
        { name: "color", label: "Warna", type: "color" },
        { name: "description", label: "Deskripsi", full: true },
      ]}
    />
  );
}
