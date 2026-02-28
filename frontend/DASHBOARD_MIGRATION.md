# Dashboard Layout Migration Guide

All dashboard pages are now using the new TailAdmin-style layout via `/dashboard/layout.js`.

## Changes Required for Each Page

### 1. Remove DashboardHeader import
**Before:**
```jsx
import DashboardHeader from '@/components/DashboardHeader';
```

**After:**
```jsx
// Remove the import - no longer needed
```

### 2. Remove the <DashboardHeader /> component
**Before:**
```jsx
return (
  <>
    <DashboardHeader title="..." subtitle="..." />
    <div className="p-4 md:p-6">
      {/* content */}
    </div>
  </>
);
```

**After:**
```jsx
return (
  <div className="space-y-6">
    {/* Optional page title section */}
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Page Title</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Page description</p>
      </div>
      {/* Action buttons */}
    </div>

    {/* Page content */}
  </div>
);
```

### 3. Update className patterns
- Remove `p-4 md:p-6 max-w-6xl mx-auto` wrapper div (handled by layout)
- Use `space-y-6` for vertical spacing
- Use `grid` classes for layouts

## Pages Updated

✅ `/dashboard/page.js` - Main dashboard
✅ `/dashboard/broadcast/page.js`
✅ `/dashboard/divisions/page.js`
✅ `/dashboard/employees/page.js`
✅ `/dashboard/leaves/page.js`
✅ `/dashboard/locations/page.js`
✅ `/dashboard/notifications/page.js`
✅ `/dashboard/overtime/page.js`
✅ `/dashboard/payment/page.js`
✅ `/dashboard/positions/page.js`
✅ `/dashboard/qr/page.js`
✅ `/dashboard/reports/page.js`
✅ `/dashboard/settings/page.js`
✅ `/dashboard/shifts/page.js`
✅ `/dashboard/slips/page.js`
