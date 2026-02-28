'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import api from '@/lib/api';

export default function DashboardHeader({ title, subtitle, showUser = true }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await api.getMe();
        setUser(u.data);
      } catch (e) {
        if (e.message?.includes('Sesi')) {
          router.push('/login');
        }
      }
    };
    loadUser();
  }, [router]);

  const handleLogout = () => {
    api.logout();
  };

  const mainTabs = [
    { id: 'overview', l: '📊 Overview', path: '/dashboard' },
    { id: 'employees', l: '👥 Karyawan', path: '/dashboard/employees' },
    { id: 'attendance', l: '📅 Absensi', path: '/dashboard' },
    { id: 'overtime', l: '🕐 Lembur', path: '/dashboard/overtime' },
    { id: 'leaves', l: '🏖️ Cuti', path: '/dashboard/leaves' },
    { id: 'reports', l: '📤 Laporan', path: '/dashboard/reports' },
    { id: 'settings', l: '⚙️ Pengaturan', path: '/dashboard/settings' },
    { id: 'payment', l: '💰 Paket', path: '/dashboard/payment' },
  ];

  return (
    <>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-wa-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs sm:text-sm">A</span>
              </div>
              <span className="text-sm sm:text-lg font-bold">Absenin</span>
              {user?.plan && (
                <span className="text-[10px] sm:text-xs text-wa-primary font-medium bg-wa-light px-1.5 sm:px-2 py-0.5 rounded-full">
                  {user.plan}
                </span>
              )}
            </Link>

            {/* Desktop Tabs */}
            <div className="hidden lg:flex items-center gap-1">
              {mainTabs.map(t => (
                <Link
                  key={t.id}
                  href={t.path}
                  className="px-2 sm:px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  {t.l}
                </Link>
              ))}
            </div>

            {/* User Info & Mobile Menu Toggle */}
            <div className="flex items-center gap-2 sm:gap-3">
              {showUser && user && (
                <div className="hidden sm:block text-right">
                  <p className="text-xs sm:text-sm font-medium truncate max-w-[100px] sm:max-w-none">
                    {user.name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                    {user.company_name}
                  </p>
                </div>
              )}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden text-gray-600 hover:text-gray-900 p-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              {showUser && (
                <button
                  onClick={handleLogout}
                  className="text-xs sm:text-sm text-wa-primary font-medium px-2 sm:px-3 py-1.5 rounded-lg hover:bg-wa-light hidden sm:block"
                >
                  Keluar
                </button>
              )}
            </div>
          </div>

          {/* Page Title */}
          {(title || subtitle) && (
            <div className="pb-3 border-b border-gray-100">
              {title && <h1 className="text-lg sm:text-xl font-bold">{title}</h1>}
              {subtitle && <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-2 space-y-1">
            {mainTabs.map(t => (
              <Link
                key={t.id}
                href={t.path}
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                {t.l}
              </Link>
            ))}
            {showUser && (
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-wa-primary hover:bg-wa-light sm:hidden"
              >
                Keluar
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
