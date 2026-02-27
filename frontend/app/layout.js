import './globals.css';
export const metadata = { title: 'Absenin - Absensi Karyawan via WhatsApp', description: 'Sistem absensi karyawan lengkap: selfie, GPS, lembur, cuti, multi-tenant via WhatsApp.' };
export default function RootLayout({ children }) {
  return (<html lang="id"><head><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /></head><body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body></html>);
}
