export const waDate = (d) =>
  d.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

export function buildNota({ customerName, unit, imei }) {
  const today = new Date();
  const plus14 = new Date(today.getTime() + 14 * 86400000);
  return `Halo Kak ${customerName || ""}! 👋 Terima kasih sudah berbelanja di ham store, senang bisa melayani kakak! 😊
Berikut detail pembeliannya:
📱 Unit: ${unit || "-"}
🆔 IMEI: ${imei || "-"}
📅 Tanggal: ${waDate(today)}
🛡️ Garansi Toko: 14 Hari (s.d ${waDate(plus14)})

Ketentuan Garansi:
✅ 1 minggu pertama: Ganti Unit
✅ 1 minggu kedua: Service
⚠️ Garansi tidak menanggung human error ya kak.

Simpan pesan ini sebagai bukti garansi ya, Kak! 📂 Jika ada pertanyaan atau membutuhkan sesuatu bisa langsung chat kami kembali. 💬

Mohon bantuannya untuk rating bintang 5 di Google Maps ya Kak ⭐⭐⭐⭐⭐, dan jangan lupa follow sosial media kami untuk update terbaru:
📸 IG: @iphonetegal1
🎬 TikTok: hamstore2 & iphonetegal1

Sehat selalu buat Kakak! 🙏✨`;
}

export function openWhatsApp(phone, text) {
  let p = (phone || "").replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  const base = p ? `https://wa.me/${p}` : "https://wa.me/";
  window.open(`${base}?text=${encodeURIComponent(text)}`, "_blank");
}
