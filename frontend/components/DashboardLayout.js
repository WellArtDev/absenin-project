'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { normalizePlanFeatureKey } from '@/lib/planFeatures';

const BASE_FEATURES = ['attendance', 'selfie', 'gps', 'dashboard', 'export_csv'];
const MENU_FEATURE_MAP = {
  qr: 'qr_attendance',
  shifts: 'shift_management',
  locations: 'office_locations',
  broadcast: 'broadcast',
  notifications: 'notifications',
  payroll: 'payroll',
  slips: 'attendance_slip',
  overtime: 'overtime',
  leaves: 'leave_management',
  reports: 'export_csv'
};

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

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

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('darkMode') : null;
    const enabled = saved === 'true';
    setDarkMode(enabled);
    document.documentElement.classList.toggle('dark', enabled);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('darkMode', String(darkMode));
    }
  }, [darkMode]);

  const handleLogout = () => {
    api.logout();
  };

  const getCompanyFeatures = () => {
    if (user?.role === 'superadmin') return ['*'];
    const raw = Array.isArray(user?.company_features) ? user.company_features : BASE_FEATURES;
    const normalized = raw.map(normalizePlanFeatureKey).filter(Boolean);
    return normalized.length > 0 ? [...new Set(normalized)] : BASE_FEATURES;
  };

  const hasFeature = (featureKey) => {
    if (!featureKey) return true;
    const features = getCompanyFeatures();
    if (features.includes('*')) return true;
    return features.includes(normalizePlanFeatureKey(featureKey));
  };

  const menuItems = [
    { id: 'overview', icon: '📊', label: 'Overview', path: '/dashboard' },
    { id: 'employees', icon: '👥', label: 'Karyawan', path: '/dashboard/employees' },
    { id: 'qr', icon: '📱', label: 'QR Code', path: '/dashboard/qr', feature: MENU_FEATURE_MAP.qr },
    { id: 'shifts', icon: '🕐', label: 'Shift', path: '/dashboard/shifts', feature: MENU_FEATURE_MAP.shifts },
    { id: 'locations', icon: '📍', label: 'Lokasi', path: '/dashboard/locations', feature: MENU_FEATURE_MAP.locations },
    { id: 'broadcast', icon: '📢', label: 'Broadcast', path: '/dashboard/broadcast', feature: MENU_FEATURE_MAP.broadcast },
    { id: 'notifications', icon: '🔔', label: 'Notifikasi', path: '/dashboard/notifications', feature: MENU_FEATURE_MAP.notifications },
    { id: 'payroll', icon: '💰', label: 'Payroll', path: '/dashboard/payroll', feature: MENU_FEATURE_MAP.payroll },
    { id: 'slips', icon: '📄', label: 'Slip Absensi', path: '/dashboard/slips', feature: MENU_FEATURE_MAP.slips },
    { id: 'overtime', icon: '⏰', label: 'Lembur', path: '/dashboard/overtime', feature: MENU_FEATURE_MAP.overtime },
    { id: 'leaves', icon: '🏖️', label: 'Cuti', path: '/dashboard/leaves', feature: MENU_FEATURE_MAP.leaves },
    { id: 'reports', icon: '📈', label: 'Laporan', path: '/dashboard/reports', feature: MENU_FEATURE_MAP.reports },
    { id: 'settings', icon: '⚙️', label: 'Pengaturan', path: '/dashboard/settings' },
    { id: 'payment', icon: '💎', label: 'Paket', path: '/dashboard/payment' },
  ];

  const visibleMenuItems = menuItems.filter((item) => hasFeature(item.feature));

  const isActive = (path) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname?.startsWith(path);
  };

  useEffect(() => {
    if (!pathname) return;
    if (!visibleMenuItems.some((item) => pathname.startsWith(item.path))) {
      router.replace('/dashboard');
    }
  }, [pathname, user]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-[#101828] transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${sidebarCollapsed ? 'lg:w-[92px]' : 'w-[290px]'}`}
      >
        <div className={`flex items-center gap-3 pt-7 pb-6 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/90 p-1">
              <img src="/logo-absenin.svg" alt="Absenin Logo" className="h-full w-full object-contain" />
            </div>
            {!sidebarCollapsed && (
              <div className="leading-tight">
                <p className="text-base font-semibold text-gray-800 dark:text-white">Absenin</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.plan || 'Plan'}</p>
              </div>
            )}
          </Link>
        </div>

        <div className="no-scrollbar flex flex-1 flex-col overflow-y-auto">
          <div className={`${sidebarCollapsed ? 'hidden lg:block text-center' : ''} mb-3`}>
            <p className="px-2 text-[11px] font-medium uppercase tracking-[0.12em] text-gray-400">Menu</p>
          </div>

          <nav className="space-y-1">
            {visibleMenuItems.map((item) => (
              <Link
                key={item.id}
                href={item.path}
                className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5'
                } ${sidebarCollapsed ? 'justify-center' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <span className="text-lg leading-none">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </div>

        <div className="border-t border-gray-200 py-3 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5 ${sidebarCollapsed ? 'justify-center' : ''}`}
            title="Keluar"
          >
            <span className="text-base">↩</span>
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`relative flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto ${sidebarCollapsed ? 'lg:ml-[92px]' : 'lg:ml-[290px]'}`}>
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 lg:hidden dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                ☰
              </button>
              <button
                onClick={() => setSidebarCollapsed((v) => !v)}
                className="hidden h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 lg:inline-flex dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                title="Toggle sidebar"
              >
                {sidebarCollapsed ? '⮞' : '⮜'}
              </button>
              <nav className="hidden items-center gap-2 text-sm sm:flex">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">Dashboard</Link>
                <span className="text-gray-300 dark:text-gray-700">/</span>
                <span className="font-medium text-gray-800 dark:text-white">
                  {visibleMenuItems.find((m) => pathname?.startsWith(m.path))?.label || 'Overview'}
                </span>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDarkMode((v) => !v)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                title="Toggle dark mode"
              >
                {darkMode ? '☀' : '☾'}
              </button>
              <div className="hidden items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 md:flex dark:border-gray-800 dark:bg-gray-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-white">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-gray-800 dark:text-white">{user?.name || 'User'}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{user?.company_name || 'Company'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <div className="mx-auto max-w-[1480px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
