const fetch = require('node-fetch');

class GeoLocationService {
  constructor() {
    this.nominatimUrl = process.env.OSM_NOMINATIM_URL || 'https://nominatim.openstreetmap.org';
    this.lastRequestTime = 0;
  }

  async reverseGeocode(latitude, longitude) {
    try {
      if (!latitude || !longitude) return null;
      const now = Date.now();
      if (now - this.lastRequestTime < 1100) {
        await new Promise(r => setTimeout(r, 1100 - (now - this.lastRequestTime)));
      }
      this.lastRequestTime = Date.now();
      const url = `${this.nominatimUrl}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=id`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Absenin/3.0 (attendance-system)', 'Accept': 'application/json' },
        timeout: 10000,
      });
      if (!response.ok) return null;
      const data = await response.json();
      return {
        display_name: data.display_name || '',
        road: data.address?.road || data.address?.pedestrian || '',
        village: data.address?.village || data.address?.suburb || data.address?.neighbourhood || '',
        district: data.address?.city_district || data.address?.county || '',
        city: data.address?.city || data.address?.town || data.address?.municipality || '',
        state: data.address?.state || '',
        postcode: data.address?.postcode || '',
        country: data.address?.country || 'Indonesia',
        short_address: this.buildShortAddress(data.address),
        raw: data.address,
      };
    } catch (error) {
      console.error('❌ Geocode error:', error.message);
      return null;
    }
  }

  buildShortAddress(addr) {
    if (!addr) return 'Lokasi tidak diketahui';
    const parts = [];
    if (addr.road || addr.pedestrian) parts.push(addr.road || addr.pedestrian);
    if (addr.village || addr.suburb || addr.neighbourhood) parts.push(addr.village || addr.suburb || addr.neighbourhood);
    if (addr.city_district || addr.county) parts.push(addr.city_district || addr.county);
    if (addr.city || addr.town || addr.municipality) parts.push(addr.city || addr.town || addr.municipality);
    return parts.length > 0 ? parts.join(', ') : 'Lokasi terdeteksi';
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }

  isWithinRadius(empLat, empLon, officeLat, officeLon, radiusMeters) {
    if (!officeLat || !officeLon || !radiusMeters) return { allowed: true, distance: 0 };
    const distance = this.calculateDistance(empLat, empLon, officeLat, officeLon);
    return { allowed: distance <= radiusMeters, distance, maxRadius: radiusMeters };
  }

  getMapLink(lat, lon) { return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`; }
}

module.exports = new GeoLocationService();
