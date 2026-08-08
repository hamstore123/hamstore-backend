import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.ITF,
];

export default function BarcodeScanner({ open, onClose, onScan }) {
  const scannerRef = useRef(null);
  const [status, setStatus] = useState("Meminta akses kamera...");

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    const elId = "barcode-reader";

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(elId, { formatsToSupport: FORMATS, verbose: false });
        scannerRef.current = scanner;
        const onSuccess = (decoded) => {
          if (stopped) return;
          stopped = true;
          onScan(decoded);
          cleanup();
        };
        const config = { fps: 10, qrbox: { width: 260, height: 160 }, aspectRatio: 1.4 };
        // Prefer back camera on mobile; fall back to any available camera by deviceId.
        try {
          await scanner.start({ facingMode: { exact: "environment" } }, config, onSuccess, () => {});
          setStatus("");
        } catch {
          const cams = await Html5Qrcode.getCameras();
          if (!cams || cams.length === 0) { setStatus("Kamera tidak ditemukan. Masukkan IMEI manual."); return; }
          const back = cams.find((c) => /back|rear|environment/i.test(c.label)) || cams[cams.length - 1];
          await scanner.start({ deviceId: { exact: back.id } }, config, onSuccess, () => {});
          setStatus("");
        }
      } catch (e) {
        setStatus("Tidak bisa mengakses kamera. Izinkan akses kamera di browser, atau masukkan IMEI manual.");
      }
    };

    const cleanup = async () => {
      try {
        if (scannerRef.current) {
          if (scannerRef.current.isScanning) await scannerRef.current.stop();
          await scannerRef.current.clear();
        }
      } catch {}
      scannerRef.current = null;
      onClose();
    };

    const t = setTimeout(start, 250);
    return () => {
      stopped = true;
      clearTimeout(t);
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(() => {});
      }
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Scan Barcode / IMEI</DialogTitle></DialogHeader>
        <div id="barcode-reader" className="w-full rounded-lg overflow-hidden bg-black min-h-[240px]" data-testid="barcode-reader" />
        <p className="text-xs text-slate-500 text-center min-h-[1rem]">{status || "Arahkan kamera ke barcode / QR IMEI pada dus HP."}</p>
      </DialogContent>
    </Dialog>
  );
}
