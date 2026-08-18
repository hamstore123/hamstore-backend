import { useEffect, useState } from "react";
import api, { fmtIDR, fmtDate } from "@/lib/api";
import { PageHeader, Loading, Empty } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ensureStoreLocation } from "@/lib/geofence";
import { Plus, Trash2, ScanLine } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";

export default function Purchases() {
  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", brand: "", category: "Handphone", cost_price: 0, sell_price: 0 });
  const [supplier, setSupplier] = useState("umum");
  const [supplierQuickOpen, setSupplierQuickOpen] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ name: "", phone: "", address: "" });
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [paid, setPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const [items, setItems] = useState([]);
  const [unitModal, setUnitModal] = useState({ open: false, itemId: null });
  const [scanOpen, setScanOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); api.get("/purchases").then(({ data }) => setRows(data)).finally(() => setLoading(false)); };
  useEffect(() => { load(); api.get("/products").then(({ data }) => setProducts(data)); api.get("/suppliers").then(({ data }) => setSuppliers(data)); }, []);

  const addItem = (pid) => {
    const p = products.find((x) => x.id === pid); if (!p) return;
    if (items.find((i) => i.product_id === pid)) return;
    setItems([...items, { product_id: p.id, product_name: p.name, qty: 1, cost_price: p.cost_price, units: [{ imei: "", color: "" }] }]);
  };
  const createSupplierQuick = async () => {
    if (!supplierForm.name.trim()) return toast.error("Nama supplier wajib");
    setSupplierSaving(true);
    try {
      const { data } = await api.post("/suppliers", supplierForm);
      setSuppliers((current) => [data, ...current]);
      setSupplier(data.id);
      setSupplierQuickOpen(false);
      setSupplierForm({ name: "", phone: "", address: "" });
      toast.success("Supplier ditambahkan");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menambahkan supplier");
    } finally { setSupplierSaving(false); }
  };

  const createProductInline = async () => {
    try {
      await ensureStoreLocation();
      const { data } = await api.post("/products", newProduct);
      setProducts((p) => [data, ...p]);
      setCreateProductOpen(false);
      // add as item
      setItems((it) => [{ product_id: data.id, product_name: data.name, qty: 1, cost_price: data.cost_price }, ...it]);
      setNewProduct({ name: "", brand: "", category: "Handphone", cost_price: 0, sell_price: 0 });
      toast.success("Produk dibuat dan ditambahkan ke pembelian");
    } catch (e) { toast.error("Gagal membuat produk"); }
  };
  const upd = (id, k, v) => setItems(items.map((i) => i.product_id === id ? { ...i, [k]: Number(v) } : i));
  const updImeis = (id, text) => {
    const arr = text.split(",").map((s) => s.trim()).filter(Boolean);
    setItems(items.map((i) => i.product_id === id ? { ...i, units: arr.map((a) => ({ imei: a, color: i.color || "" })), qty: arr.length || i.qty } : i));
  };

  const openUnits = (itemId) => setUnitModal({ open: true, itemId });
  const closeUnits = () => setUnitModal({ open: false, itemId: null });
  const setUnit = (itemId, idx, key, val) => setItems(items.map((it) => {
    if (it.product_id !== itemId) return it;
    const units = (it.units || []).slice();
    units[idx] = { ...(units[idx] || { imei: "", color: "" }), [key]: val };
    return { ...it, units, qty: units.length };
  }));
  const addUnit = (itemId) => setItems(items.map((it) => it.product_id === itemId ? { ...it, units: [...(it.units || []), { imei: "", color: "" }], qty: (it.units || []).length + 1 } : it));
  const removeUnit = (itemId, idx) => setItems(items.map((it) => {
    if (it.product_id !== itemId) return it;
    const units = (it.units || []).slice(); units.splice(idx, 1);
    return { ...it, units, qty: units.length };
  }));
  const total = items.reduce((s, i) => s + i.qty * i.cost_price, 0);

  const scanAdd = async (code) => {
    setScanOpen(false);
    try {
      const { data } = await api.get("/products", { params: { q: code } });
      if (data && data.length) { addItem(data[0].id); toast.success(`Produk ditemukan: ${data[0].name}`); }
      else toast.error("Produk tidak ditemukan untuk kode: " + code);
    } catch { toast.error("Gagal mencari produk"); }
  };

  const save = async () => {
    if (items.length === 0) return toast.error("Tambah minimal 1 item");
    setSaving(true);
    try {
      await ensureStoreLocation();
      const sup = suppliers.find((s) => s.id === supplier);
      const payloadItems = items.map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name,
        qty: (it.units && it.units.length) ? it.units.length : Number(it.qty || 0),
        cost_price: Number(it.cost_price || 0),
        units: it.units || [],
      }));
      await api.post("/purchases", {
        supplier_id: supplier === "umum" ? null : supplier,
        supplier_name: sup?.name || "Umum",
        items: payloadItems,
        paid: Number(paid || 0),
        payment_method: paymentMethod,
        note,
      });
      toast.success("Pembelian tersimpan dan stok diperbarui");
      setOpen(false); setItems([]); setPaid(0); setPaymentMethod("cash"); setNote(""); load();
      api.get("/products").then(({ data }) => setProducts(data));
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Gagal menyimpan pembelian");
    } finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Pembelian Barang" subtitle="Catat pembelian stok dari supplier">
        <Button onClick={() => setOpen(true)} className="bg-sky-600 hover:bg-sky-700" data-testid="purchase-add-btn"><Plus className="w-4 h-4 mr-1.5" /> Pembelian Baru</Button>
      </PageHeader>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200"><tr>
            {["Invoice", "Supplier", "Item", "Total", "Terbayar", "Sisa", "Tanggal"].map((h) => <th key={h} className="px-4 py-3 text-left font-medium text-slate-500">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? <tr><td colSpan={7}><Loading /></td></tr>
              : rows.length === 0 ? <tr><td colSpan={7}><Empty /></td></tr>
              : rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono-num text-xs">{r.invoice}</td>
                  <td className="px-4 py-3">{r.supplier_name}</td>
                  <td className="px-4 py-3">{r.items?.length || 0} item</td>
                  <td className="px-4 py-3 font-mono-num">{fmtIDR(r.total)}</td>
                  <td className="px-4 py-3 font-mono-num text-green-600">{fmtIDR(r.paid)}</td>
                  <td className="px-4 py-3 font-mono-num text-red-600">{fmtIDR(r.due)}</td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(r.date)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Pembelian Baru</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-500">Supplier</Label>
                <div className="mt-1 flex gap-2">
                  <Select value={supplier} onValueChange={setSupplier}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="umum">Umum</SelectItem>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={() => setSupplierQuickOpen(true)} className="shrink-0">+ Supplier</Button>
                </div>
              </div>
              <div>
                <Label className="text-xs text-slate-500">Tambah Produk</Label>
                <div className="mt-1 flex gap-2">
                  <div className="flex-1">
                    <Select value="" onValueChange={addItem}>
                      <SelectTrigger data-testid="purchase-add-item"><SelectValue placeholder="Pilih produk" /></SelectTrigger>
                      <SelectContent>{products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="shrink-0" onClick={() => setScanOpen(true)} data-testid="purchase-scan-btn">
                      <ScanLine className="w-4 h-4" />
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setCreateProductOpen(true)}>Buat Produk Baru</Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {items.map((i) => (
                <div key={i.product_id} className="flex items-center gap-2 text-sm border-b border-slate-100 pb-2">
                  <div className="flex-1 truncate">{i.product_name}</div>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={i.qty} onChange={(e) => upd(i.product_id, "qty", e.target.value)} className="w-20 h-8" placeholder="Qty" />
                    <Input type="number" value={i.cost_price} onChange={(e) => upd(i.product_id, "cost_price", e.target.value)} className="w-28 h-8" placeholder="Modal" />
                    <Button type="button" variant="outline" onClick={() => openUnits(i.product_id)}>Kelola Unit ({(i.units||[]).length})</Button>
                    <button onClick={() => setItems(items.filter((x) => x.product_id !== i.product_id))} className="p-1 text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <div className="font-mono-num text-lg font-semibold md:col-span-2">Total: {fmtIDR(total)}</div>
              <div><Label className="text-xs text-slate-500">Bayar</Label><Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} className="w-full h-9" /></div>
              <div><Label className="text-xs text-slate-500">Metode Pembayaran</Label><Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="cash">Cash</SelectItem><SelectItem value="transfer_bank">Transfer Bank</SelectItem><SelectItem value="qris">QRIS</SelectItem><SelectItem value="edc">EDC / Kartu</SelectItem>
              </SelectContent></Select></div>
              <div className="md:col-span-2"><Label className="text-xs text-slate-500">Catatan Pembelian</Label><Input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" placeholder="Contoh: invoice dan garansi supplier" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving} className="bg-sky-600 hover:bg-sky-700" data-testid="purchase-save-btn">{saving ? "Menyimpan..." : "Simpan Pembelian"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={supplierQuickOpen} onOpenChange={setSupplierQuickOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Supplier Baru</DialogTitle></DialogHeader>
          <div className="grid gap-3 py-2">
            <div><Label className="text-xs text-slate-500">Nama Supplier *</Label><Input value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} className="mt-1" autoFocus /></div>
            <div><Label className="text-xs text-slate-500">Telepon</Label><Input value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Alamat</Label><Input value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setSupplierQuickOpen(false)}>Batal</Button><Button onClick={createSupplierQuick} disabled={supplierSaving}>{supplierSaving ? "Menyimpan..." : "Simpan Supplier"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createProductOpen} onOpenChange={setCreateProductOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Produk Baru untuk Pembelian</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2"><Label className="text-xs text-slate-500">Nama Produk *</Label><Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} className="mt-1" autoFocus placeholder="Contoh: iPhone 13 128 GB" /></div>
            <div><Label className="text-xs text-slate-500">Brand</Label><Input value={newProduct.brand} onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs text-slate-500">Harga Modal</Label><Input type="number" value={newProduct.cost_price} onChange={(e) => setNewProduct({ ...newProduct, cost_price: e.target.value })} className="mt-1" /></div>
            <div className="col-span-2"><Label className="text-xs text-slate-500">Harga Jual</Label><Input type="number" value={newProduct.sell_price} onChange={(e) => setNewProduct({ ...newProduct, sell_price: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateProductOpen(false)}>Batal</Button><Button onClick={createProductInline} disabled={!newProduct.name.trim()} data-testid="purchase-create-product-save">Simpan & Tambahkan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Units editor dialog */}
      <Dialog open={unitModal.open} onOpenChange={(o) => { if (!o) closeUnits(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Kelola Unit</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto py-2">
            {(items.find((it) => it.product_id === unitModal.itemId)?.units || []).map((u, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input placeholder="IMEI" value={u.imei} onChange={(e) => setUnit(unitModal.itemId, idx, 'imei', e.target.value)} />
                <Input placeholder="Warna" value={u.color || ""} onChange={(e) => setUnit(unitModal.itemId, idx, 'color', e.target.value)} />
                <Button variant="outline" onClick={() => removeUnit(unitModal.itemId, idx)}>Hapus</Button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => addUnit(unitModal.itemId)}>Tambah Unit</Button>
            <Button onClick={closeUnits}>Selesai</Button>
          </div>
        </DialogContent>
      </Dialog>
      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={scanAdd} />
    </div>
  );
}
