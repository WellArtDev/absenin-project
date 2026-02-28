import './globals.css';
const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://absenin.com';
export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Absenin - Absensi Karyawan via WhatsApp',
    template: '%s | Absenin'
  },
  description: 'Sistem absensi karyawan lengkap: selfie, GPS, lembur, cuti, multi-tenant via WhatsApp.',
  icons: {
    icon: '/logo-absenin.svg',
    shortcut: '/logo-absenin.svg',
    apple: '/logo-absenin.svg'
  },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'id_ID',
    url: siteUrl,
    siteName: 'Absenin',
    title: 'Absenin - Absensi Karyawan via WhatsApp',
    description: 'Sistem absensi karyawan lengkap: selfie, GPS, lembur, cuti, multi-tenant via WhatsApp.'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Absenin - Absensi Karyawan via WhatsApp',
    description: 'Sistem absensi karyawan lengkap: selfie, GPS, lembur, cuti, multi-tenant via WhatsApp.'
  },
  robots: {
    index: true,
    follow: true
  }
};
export default function RootLayout({ children }) {
  return (<html lang="id"><head><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" /></head><body className="bg-gray-50 text-gray-900 min-h-screen">{children}</body></html>);
}
