export const STORE_LOCATION = Object.freeze({
  latitude: -6.8687702,
  longitude: 109.1384065,
  radiusMeters: 500,
});

const toRadians = (value) => (value * Math.PI) / 180;

export const distanceToStore = (latitude, longitude) => {
  const earthRadius = 6371000;
  const dLat = toRadians(latitude - STORE_LOCATION.latitude);
  const dLon = toRadians(longitude - STORE_LOCATION.longitude);
  const lat1 = toRadians(STORE_LOCATION.latitude);
  const lat2 = toRadians(latitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const locationMessage = (error) => {
  if (error?.code === 1) return "Izin lokasi diperlukan untuk melanjutkan.";
  if (error?.code === 2) return "Lokasi tidak dapat ditemukan. Aktifkan GPS lalu coba lagi.";
  if (error?.code === 3) return "Lokasi terlalu lama didapatkan. Coba lagi.";
  return "Lokasi toko belum dapat diverifikasi.";
};

export const ensureStoreLocation = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error("Browser tidak mendukung lokasi."));
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      const distance = distanceToStore(latitude, longitude);
      if (distance > STORE_LOCATION.radiusMeters) {
        reject(new Error("Anda berada di luar jangkauan toko."));
        return;
      }
      resolve({ latitude, longitude, distance });
    },
    (error) => reject(new Error(locationMessage(error))),
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
  );
});
