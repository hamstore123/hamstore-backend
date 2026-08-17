import { useEffect, useState } from "react";
import api, { fmtIDR, fileUrl } from "@/lib/api";
import { PageHeader } from "@/components/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search, Plus, Minus, Trash2, ShoppingCart, Repeat, ScanLine } from "lucide-react";
import BarcodeScanner from "@/components/BarcodeScanner";

export default function Kasir() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [custQ, setCustQ] = useState("");
  const [custOpen, setCustOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState("umum");
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [method, setMethod] = useState("cash");
  const [tradeIn, setTradeIn] = useState(false);
  const [ti, setTi] = useState({ device_name: "", imei: "", condition: "", trade_value: 0, cost_price: 0 });
  const [saving, setSaving] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const loadProducts = (query = "") => api.get("/products", { params: query ? { q: query } : {} }).then(({ data }) => setProducts(data));
  const loadCustomers = () => api.get("/customers").then(({ data }) => setCustomers(data));
  useEffect(() => { loadProducts(); loadCustomers(); }, []);
  useEffect(() => { const t = setTimeout(() => loadProducts(q), 300); return () => clearTimeout(t); }, [q]);

  const add = (p) => {
    if (p.stock <= 0) return toast.error("Stok habis");
    setCart((c) => {
      const ex = c.find((i) => i.product_id === p.id);
      if (ex) return c.map((i) => i.product_id === p.id ? { ...i, qty: Math.min(i.qty + 1, p.stock) } : i);
      return [...c, { product_id: p.id, product_name: p.name, qty: 1, price: p.sell_price, cost_price: p.cost_price, max: p.stock }];
    });
  };
  const setQty = (id, qty) => setCart((c) => c.map((i) => i.product_id === id ? { ...i, qty: Math.max(1, Math.min(qty, i.max)) } : i));
  const remove = (id) => setCart((c) => c.filter((i) => i.product_id !== id));

  const subtotal = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const tradeValue = tradeIn ? Number(ti.trade_value || 0) : 0;
  const total = Math.max(0, subtotal - Number(discount || 0) - tradeValue);

  const checkout = async () => {
    if (cart.length === 0) return toast.error("Keranjang kosong");
    setSaving(true);
    const cust = customers.find((c) => c.id === customer);
    try {
      const { data } = await api.post("/sales", {
        customer_id: customer === "umum" ? null : customer,
        customer_name: cust?.name || "Umum",
        items: cart.map(({ product_id, product_name, qty, price, cost_price }) => ({ product_id, product_name, qty, price, cost_price })),
        discount: Number(discount || 0), tax: 0, paid: Number(paid || 0),
        payment_method: method, mode: tradeIn ? "tukar_tambah" : "jual",
        trade_in: tradeIn ? { ...ti, trade_value: Number(ti.trade_value || 0), cost_price: Number(ti.cost_price || 0) } : null,
      });
      toast.success(`Transaksi ${data.invoice} berhasil`);
      setCart([]); setDiscount(0); setPaid(0); setTradeIn(false);
      setTi({ device_name: "", imei: "", condition: "", trade_value: 0, cost_price: 0 });
      loadProducts(q);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan transaksi");
    } finally { setSaving(false); }
  };

  const createCustomer = async () => {
    if (!newCustomer.name) return toast.error("Nama pelanggan wajib");
    try {
      const { data } = await api.post("/customers", newCustomer);
      toast.success("Pelanggan tersimpan");
      setCustOpen(false);
      await loadCustomers();
      setCustomer(data.id);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menambahkan pelanggan");
    }
  };

  const scanFind = async (code) => {
    setScanOpen(false);
    try {
      const { data } = await api.get("/products", { params: { q: code } });
      if (data && data.length) {
        add(data[0]);
        toast.success(`Ditambahkan: ${data[0].name}`);
      } else {
        setQ(code);
        toast.error("Produk tidak ditemukan untuk kode: " + code);
      }
    } catch { toast.error("Gagal mencari produk"); }
  };

  return (
    <div>
      <PageHeader title="Kasir / Penjualan" subtitle="Buat transaksi penjualan" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* products */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari / scan produk (nama, SKU, IMEI)..." className="pl-9" data-testid="kasir-search" />
            </div>
            <Button type="button" variant="outline" onClick={() => setScanOpen(true)} data-testid="kasir-scan-btn">
              <ScanLine className="w-4 h-4 mr-1.5" /> Scan
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[calc(100vh-230px)] overflow-y-auto pr-1">
            {products.map((p) => (
              <button key={p.id} onClick={() => add(p)} disabled={p.stock <= 0}
                data-testid={`product-${p.id}`}
                className="text-left bg-white p-3 rounded-lg border border-slate-200 hover:border-sky-400 hover:shadow-sm transition-all disabled:opacity-40">
                {p.image_url
                  ? <img src={fileUrl(p.image_url)} alt="" className="w-full h-20 object-cover rounded-md mb-2" />
                  : <div className="w-full h-20 rounded-md bg-slate-100 mb-2 flex items-center justify-center text-slate-300 text-xs">No Img</div>}
                <div className="font-medium text-sm text-slate-800 line-clamp-2 min-h-[2.5rem]">{p.name}</div>
                <div className="text-sky-600 font-mono-num font-semibold mt-1">{fmtIDR(p.sell_price)}</div>
                <div className="text-xs text-slate-400 mt-0.5">Stok: {p.stock}</div>
              </button>
            ))}
          </div>
        </div>

        {/* cart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col h-fit sticky top-20">
          <div className="flex items-center gap-2 font-medium text-slate-800 mb-3">
            <ShoppingCart className="w-5 h-5 text-sky-600" /> Keranjang ({cart.length})
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
            {cart.length === 0 && <div className="text-sm text-slate-400 text-center py-6">Keranjang kosong</div>}
            {cart.map((i) => (
              <div key={i.product_id} className="flex items-center gap-2 text-sm border-b border-slate-100 pb-2">
                <div className="flex-1 min-w-0">
                  <div className="truncate text-slate-700">{i.product_name}</div>
                  <div className="text-xs text-slate-400 font-mono-num">{fmtIDR(i.price)}</div>
                </div>
                <button onClick={() => setQty(i.product_id, i.qty - 1)} className="p-1 hover:bg-slate-100 rounded"><Minus className="w-3.5 h-3.5" /></button>
                <span className="w-6 text-center font-mono-num">{i.qty}</span>
                <button onClick={() => setQty(i.product_id, i.qty + 1)} className="p-1 hover:bg-slate-100 rounded"><Plus className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(i.product_id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <Label className="text-xs text-slate-500">Pelanggan</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input placeholder="Cari pelanggan..." className="mb-2" value={custQ} onChange={(e) => setCustQ(e.target.value)} />
                  <Select value={customer} onValueChange={setCustomer}>
                    <SelectTrigger className="mt-1" data-testid="kasir-customer"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="umum">Umum</SelectItem>
                      {customers.filter((c) => !custQ || c.name.toLowerCase().includes(custQ.toLowerCase()) || (c.phone || "").includes(custQ)).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-28">
                  <Button onClick={() => { setNewCustomer({ name: "", phone: "" }); setCustOpen(true); }} className="w-full" variant="outline"><Plus className="w-4 h-4 mr-1" />Tambah</Button>
                </div>
              </div>
            </div>

            <button onClick={() => setTradeIn((v) => !v)} className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium border ${tradeIn ? "bg-sky-50 border-sky-300 text-sky-700" : "border-slate-200 text-slate-500"}`} data-testid="kasir-tradein-toggle">
              <Repeat className="w-3.5 h-3.5" /> Tukar Tambah {tradeIn ? "AKTIF" : ""}
            </button>
            {tradeIn && (
              <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-md">
                <Input placeholder="Nama HP bekas" className="col-span-2 h-8 text-xs" value={ti.device_name} onChange={(e) => setTi({ ...ti, device_name: e.target.value })} />
                <Input placeholder="Kondisi" className="h-8 text-xs" value={ti.condition} onChange={(e) => setTi({ ...ti, condition: e.target.value })} />
                <Input placeholder="IMEI" className="h-8 text-xs" value={ti.imei} onChange={(e) => setTi({ ...ti, imei: e.target.value })} />
                <Input type="number" placeholder="Nilai tukar" className="h-8 text-xs" value={ti.trade_value} onChange={(e) => setTi({ ...ti, trade_value: e.target.value })} />
                <Input type="number" placeholder="HPP masuk" className="h-8 text-xs" value={ti.cost_price} onChange={(e) => setTi({ ...ti, cost_price: e.target.value })} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs text-slate-500">Diskon</Label><Input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="mt-1 h-9" data-testid="kasir-discount" /></div>
              <div><Label className="text-xs text-slate-500">Bayar</Label><Input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} className="mt-1 h-9" data-testid="kasir-paid" /></div>
            </div>
            <div>
              <Label className="text-xs text-slate-500">Metode</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="hutang">Hutang</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-1 font-mono-num">
              <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{fmtIDR(subtotal)}</span></div>
              {tradeValue > 0 && <div className="flex justify-between text-amber-600"><span>Tukar Tambah</span><span>-{fmtIDR(tradeValue)}</span></div>}
              <div className="flex justify-between text-lg font-semibold text-slate-900"><span>Total</span><span>{fmtIDR(total)}</span></div>
              {Number(paid) > 0 && <div className="flex justify-between text-green-600"><span>Kembalian</span><span>{fmtIDR(Math.max(0, Number(paid) - total))}</span></div>}
            </div>
            <Button onClick={checkout} disabled={saving} className="w-full bg-sky-600 hover:bg-sky-700 mt-1" data-testid="kasir-checkout">
              {saving ? "Memproses..." : "Buat Transaksi"}
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={custOpen} onOpenChange={setCustOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Pelanggan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-2 py-2">
            <Label className="text-xs text-slate-500">Nama</Label>
            <Input value={newCustomer.name} onChange={(e) => setNewCustomer((s) => ({ ...s, name: e.target.value }))} />
            <Label className="text-xs text-slate-500">No. HP</Label>
            <Input value={newCustomer.phone} onChange={(e) => setNewCustomer((s) => ({ ...s, phone: e.target.value }))} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCustOpen(false)}>Batal</Button>
            <Button onClick={createCustomer} className="bg-sky-600 hover:bg-sky-700">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <BarcodeScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={scanFind} />
    </div>
  );
}
