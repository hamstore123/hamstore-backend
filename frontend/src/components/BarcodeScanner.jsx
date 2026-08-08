import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function BarcodeScanner({ open, onClose, onScan }) {
  const ref = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const id = "barcode-reader";
    const start = async () => {
      try {
        const scanner = new Html5Qrcode(id);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 160 } },
          (decoded) => {
            if (!active) return;
            active = false;
            onScan(decoded);
            stop();
          },
          () => {}
        );
      } catch (e) {
        toast.error("Tidak bisa mengakses kamera. Izinkan akses kamera / masukkan manual.");
      }
    };
    const stop = async () => {
      try {
        if (scannerRef.current?.isScanning) await scannerRef.current.stop();
        scannerRef.current?.clear();
      } catch {}
      onClose();
    };
    const t = setTimeout(start, 200);
    return () => { active = false; clearTimeout(t); if (scannerRef.current?.isScanning) scannerRef.current.stop().catch(() => {}); };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Scan Barcode / IMEI</DialogTitle></DialogHeader>
        <div id="barcode-reader" ref={ref} className="w-full rounded-lg overflow-hidden bg-slate-100 min-h-[240px]" data-testid="barcode-reader" />
        <p className="text-xs text-slate-500 text-center">Arahkan kamera ke barcode/QR pada dus atau IMEI.</p>
      </DialogContent>
    </Dialog>
  );
}
