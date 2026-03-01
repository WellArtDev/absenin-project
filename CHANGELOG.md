# Changelog

Catatan rilis project Absenin (format SemVer).

## [Unreleased]
### Changed
- Penyesuaian lanjutan dashboard, gating fitur paket, dan editor blog berbasis Tiptap UI Components.

## [v3.3.0] - 2026-03-01
### Added
- Integrasi **Tiptap UI Components (Simple Editor)** untuk editor artikel.
- Mekanisme hide/disable fitur sesuai paket (feature gating frontend + backend).
- Penyesuaian fitur paket agar kontrol akses per menu/per fitur lebih ketat.

### Changed
- Perapihan tampilan landing/blog dan konsistensi menu/header/footer.

### Fixed
- Perbaikan bug terkait blog dan upload image.

## [v3.2.0] - 2026-03-01
### Added
- Modul **Blog** (manajemen artikel + halaman publik).
- SEO enhancement: metadata, sitemap/robots/blog discoverability.
- Logo/branding update.
- Database migration untuk kebutuhan blog.

### Changed
- Upgrade Next.js ke seri `14.2.x`.

### Fixed
- Perbaikan proses migrate dan stabilisasi halaman blog.

## [v3.1.0] - 2026-02-28
### Added
- Fitur dashboard inti: lokasi/GPS, shift, broadcast, QR attendance, payroll.
- Helper WhatsApp dan penguatan alur webhook Fonnte.
- Improvement UI/theme dashboard.

### Changed
- Penyempurnaan settings dan konfigurasi deployment (termasuk nginx).

### Fixed
- Rangkaian besar bugfix syntax/build/dashboard/backend.
- Patch error lembur dan payroll.

## [v3.0.0] - 2026-02-27
### Added
- Initial release (fondasi project).
- Arsitektur awal v3.
- Integrasi WhatsApp dasar.
- Inisialisasi database awal.

## Referensi Commit
- `v3.0.0`: `5dd25dd` ... `53b369b`
- `v3.1.0`: `63f9eb1` ... `dc1afa1`
- `v3.2.0`: `e7f0dbd` ... `9ed28c9`
- `v3.3.0`: `00005ab` ... `8fd2a72`
