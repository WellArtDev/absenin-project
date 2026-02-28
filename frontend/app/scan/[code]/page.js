'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

export default function PublicQRScanPage() {
  const params = useParams();
  const code = useMemo(() => String(params?.code || '').trim(), [params]);

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('Menyiapkan WhatsApp...');
  const [waLink, setWaLink] = useState('');

  useEffect(() => {
    let canceled = false;

    const run = async () => {
      if (!code) {
        setMsg('QR code tidak valid.');
        setLoading(false);
        return;
      }

      try {
        const baseApi = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const response = await fetch(`${baseApi}/api/qr/public/${encodeURIComponent(code)}`);
        const payload = await response.json();

        if (!response.ok || !payload?.success || !payload?.data?.wa_device_number) {
          throw new Error(payload?.message || 'QR tidak bisa diproses');
        }

        const phone = String(payload.data.wa_device_number).replace(/[^0-9]/g, '');
        const url = `https://wa.me/${phone}?text=${encodeURIComponent('HADIR')}`;
        if (canceled) return;

        setWaLink(url);
        setMsg('Mengarahkan ke WhatsApp...');

        if (typeof window !== 'undefined') {
          window.location.href = url;
        }
      } catch (err) {
        if (canceled) return;
        setMsg(err.message || 'Gagal membuka WhatsApp.');
      } finally {
        if (!canceled) setLoading(false);
      }
    };

    run();
    return () => { canceled = true; };
  }, [code]);

  return (
    <div className="min-h-screen bg-[#f4f7f5] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-wa-dark mb-2">QR Absensi</h1>
        <p className="text-sm text-gray-600 mb-6">{msg}</p>

        {waLink && (
          <a
            href={waLink}
            className="btn-wa-primary w-full"
          >
            Buka WhatsApp Manual
          </a>
        )}

        {!loading && !waLink && (
          <p className="text-xs text-red-600">Silakan hubungi admin jika masalah berlanjut.</p>
        )}
      </div>
    </div>
  );
}
