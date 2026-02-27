const { query } = require('../config/db');
const geoService = require('../utils/geolocation');
const selfieService = require('../utils/selfie');
const OvertimeService = require('./overtimeService');

class AttendanceService {
  static async processCheckIn(phoneNumber, messageText, location = null, imageData = null) {
    try {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const emp = await query(
        `SELECT e.*, cs.work_start, cs.work_end, cs.late_tolerance_minutes, cs.require_selfie, cs.require_location,
                cs.office_latitude, cs.office_longitude, cs.allowed_radius_meters, cs.radius_lock_enabled,
                cs.overtime_enabled, cs.overtime_min_minutes,
                d.name as division_name, p.name as position_name
         FROM employees e 
         LEFT JOIN company_settings cs ON cs.company_id=e.company_id
         LEFT JOIN divisions d ON d.id=e.division_id
         LEFT JOIN positions p ON p.id=e.position_id
         WHERE e.phone_number=$1 AND e.is_active=true`, [cleanPhone]);

      if (emp.rows.length === 0) {
        // Try without leading 62
        const altPhone = cleanPhone.startsWith('62') ? '0' + cleanPhone.substring(2) : '62' + cleanPhone;
        const emp2 = await query(
          `SELECT e.*, cs.work_start, cs.work_end, cs.late_tolerance_minutes, cs.require_selfie, cs.require_location,
                  cs.office_latitude, cs.office_longitude, cs.allowed_radius_meters, cs.radius_lock_enabled,
                  cs.overtime_enabled, cs.overtime_min_minutes,
                  d.name as division_name, p.name as position_name
           FROM employees e 
           LEFT JOIN company_settings cs ON cs.company_id=e.company_id
           LEFT JOIN divisions d ON d.id=e.division_id
           LEFT JOIN positions p ON p.id=e.position_id
           WHERE e.phone_number=$1 AND e.is_active=true`, [altPhone]);
        if (emp2.rows.length === 0) {
          return { success: false, reply: '❌ Nomor Anda belum terdaftar di sistem Absenin.\nHubungi admin perusahaan Anda.' };
        }
        emp.rows = emp2.rows;
      }

      const employee = emp.rows[0];

      // Check company active
      const comp = await query('SELECT is_active, plan FROM companies WHERE id=$1', [employee.company_id]);
      if (comp.rows.length === 0 || !comp.rows[0].is_active) {
        return { success: false, reply: '❌ Perusahaan Anda tidak aktif. Hubungi admin.' };
      }

      const cmd = messageText.trim().toUpperCase();

      switch (true) {
        case ['HADIR', 'MASUK', 'CHECKIN', 'IN', 'ABSEN'].includes(cmd):
          return await this.checkIn(employee, location, imageData);
        case ['PULANG', 'KELUAR', 'CHECKOUT', 'OUT'].includes(cmd):
          return await this.checkOut(employee, location, imageData);
        case ['STATUS', 'CEK', 'INFO'].includes(cmd):
          return await this.getStatus(employee);
        case cmd === 'IZIN':
          return await this.markStatus(employee, 'IZIN');
        case cmd === 'SAKIT':
          return await this.markStatus(employee, 'SAKIT');
        case cmd.startsWith('LEMBUR'):
          return await this.requestOvertime(employee, messageText);
        case ['SELESAI LEMBUR', 'STOP LEMBUR', 'END LEMBUR', 'DONE LEMBUR'].includes(cmd):
          return await this.finishOvertime(employee);
        case ['REKAP', 'REKAP LEMBUR'].includes(cmd):
          return await this.getOvertimeSummary(employee);
        default:
          return this.getHelp(employee);
      }
    } catch (error) {
      console.error('❌ processCheckIn error:', error);
      return { success: false, reply: '⚠️ Terjadi kesalahan sistem. Coba lagi nanti.' };
    }
  }

  static async checkIn(employee, location = null, imageData = null) {
    // Check selfie requirement
    if (employee.require_selfie && !imageData) {
      return {
        success: false,
        reply: `📸 *SELFIE DIPERLUKAN*\n\nHalo ${employee.name}!\nKirim foto selfie dengan caption *HADIR* untuk check-in.\n\n💡 Caranya:\n1. Buka kamera di WhatsApp\n2. Ambil foto selfie\n3. Tulis caption HADIR\n4. Kirim!`
      };
    }

    const existing = await query('SELECT * FROM attendance WHERE employee_id=$1 AND date=CURRENT_DATE', [employee.id]);
    if (existing.rows.length > 0 && existing.rows[0].check_in) {
      const t = new Date(existing.rows[0].check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
      return { success: false, reply: `⚠️ ${employee.name}, sudah check-in pukul ${t}.\nKetik *PULANG* untuk check-out.\nKetik *LEMBUR* untuk ajukan lembur.` };
    }

    // Process selfie
    let selfieUrl = null;
    if (imageData) {
      console.log(`📸 Processing selfie for ${employee.name}, data type: ${typeof imageData}, length: ${typeof imageData === 'string' ? imageData.length : (Buffer.isBuffer(imageData) ? imageData.length : 'unknown')}`);
      const sr = await selfieService.processFromWhatsApp(imageData, employee.name, 'checkin');
      if (sr.success) {
        selfieUrl = sr.url;
        console.log(`✅ Selfie saved: ${selfieUrl}`);
      } else {
        console.error(`❌ Selfie failed: ${sr.error}`);
        // Don't block check-in if selfie processing fails
      }
    }

    // Process location
    let locationName = null, locationDetail = null, distanceMeters = null, isWithinRadius = null;
    if (location?.latitude && location?.longitude) {
      const geo = await geoService.reverseGeocode(location.latitude, location.longitude);
      if (geo) { locationName = geo.short_address; locationDetail = geo; }

      // Radius check
      const shouldCheckRadius = employee.radius_lock_enabled && employee.radius_lock_enabled !== false;
      const globalRadiusEnabled = employee.radius_lock_enabled;
      
      if (shouldCheckRadius && employee.office_latitude && employee.office_longitude && employee.allowed_radius_meters) {
        const locCheck = geoService.isWithinRadius(
          location.latitude, location.longitude,
          parseFloat(employee.office_latitude), parseFloat(employee.office_longitude),
          employee.allowed_radius_meters
        );
        distanceMeters = locCheck.distance;
        isWithinRadius = locCheck.allowed;

        if (!locCheck.allowed) {
          return {
            success: false,
            reply: `❌ *DILUAR JANGKAUAN*\n\n👤 ${employee.name}\n📍 ${locationName || '?'}\n📏 Jarak: ${locCheck.distance}m (maks ${locCheck.maxRadius}m)\n🗺️ ${geoService.getMapLink(location.latitude, location.longitude)}\n\nAnda harus berada dalam radius ${locCheck.maxRadius}m dari kantor.`
          };
        }
      }
    } else if (employee.require_location) {
      return { success: false, reply: `📍 *LOKASI DIPERLUKAN*\n\nKirim lokasi (share location) lalu ketik *HADIR*, atau kirim foto selfie + caption *HADIR*.` };
    }

    // Check late
    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();
    let wsMin = 8 * 60, tolMin = 15;
    if (employee.work_start) { const [h, m] = employee.work_start.split(':').map(Number); wsMin = h * 60 + m; }
    if (employee.late_tolerance_minutes) tolMin = employee.late_tolerance_minutes;
    const status = curMin > (wsMin + tolMin) ? 'TERLAMBAT' : 'HADIR';
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' });

    if (existing.rows.length > 0) {
      await query(`UPDATE attendance SET check_in=CURRENT_TIMESTAMP, status=$1, latitude=$2, longitude=$3, 
        location_name=$4, location_detail=$5, selfie_checkin_url=$6, selfie_verified=$7, distance_meters=$8, is_within_radius=$9 
        WHERE employee_id=$10 AND date=CURRENT_DATE`,
        [status, location?.latitude || null, location?.longitude || null, locationName,
          locationDetail ? JSON.stringify(locationDetail) : null, selfieUrl, !!selfieUrl,
          distanceMeters, isWithinRadius, employee.id]);
    } else {
      await query(`INSERT INTO attendance (employee_id,company_id,check_in,date,status,latitude,longitude,location_name,
        location_detail,selfie_checkin_url,selfie_verified,distance_meters,is_within_radius) 
        VALUES ($1,$2,CURRENT_TIMESTAMP,CURRENT_DATE,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [employee.id, employee.company_id, status, location?.latitude || null, location?.longitude || null,
          locationName, locationDetail ? JSON.stringify(locationDetail) : null, selfieUrl, !!selfieUrl,
          distanceMeters, isWithinRadius]);
    }

    let reply = `${status === 'TERLAMBAT' ? '⏰' : '✅'} *CHECK-IN BERHASIL*\n\n👤 ${employee.name}`;
    if (employee.position_name) reply += `\n💼 ${employee.position_name}`;
    reply += `\n📅 ${dateStr}\n⏰ ${timeStr}\n📊 Status: ${status === 'TERLAMBAT' ? 'TERLAMBAT ⚠️' : 'TEPAT WAKTU ✅'}`;
    if (selfieUrl) reply += `\n📸 Selfie: Tercatat ✅`;
    if (locationName) reply += `\n📍 Lokasi: ${locationName}`;
    if (distanceMeters !== null) reply += `\n📏 Jarak: ${distanceMeters}m`;
    if (location?.latitude) reply += `\n🗺️ ${geoService.getMapLink(location.latitude, location.longitude)}`;
    reply += `\n\nKetik *PULANG* saat selesai kerja.`;
    if (employee.overtime_enabled) reply += `\nKetik *LEMBUR* untuk ajukan lembur.`;
    return { success: true, reply };
  }

  static async checkOut(employee, location = null, imageData = null) {
    const existing = await query('SELECT * FROM attendance WHERE employee_id=$1 AND date=CURRENT_DATE', [employee.id]);
    if (existing.rows.length === 0 || !existing.rows[0].check_in) {
      return { success: false, reply: `❌ ${employee.name}, belum check-in.\nKirim foto selfie + caption *HADIR*.` };
    }
    if (existing.rows[0].check_out) {
      const t = new Date(existing.rows[0].check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
      return { success: false, reply: `⚠️ Sudah check-out pukul ${t}.` };
    }

    let selfieUrl = null;
    if (imageData) {
      const sr = await selfieService.processFromWhatsApp(imageData, employee.name, 'checkout');
      if (sr.success) selfieUrl = sr.url;
    }

    let coLocName = null;
    if (location?.latitude && location?.longitude) {
      const geo = await geoService.reverseGeocode(location.latitude, location.longitude);
      if (geo) coLocName = geo.short_address;
    }

    const now = new Date();
    await query(`UPDATE attendance SET check_out=CURRENT_TIMESTAMP, selfie_checkout_url=$1, 
      checkout_latitude=$2, checkout_longitude=$3, checkout_location_name=$4 
      WHERE employee_id=$5 AND date=CURRENT_DATE`,
      [selfieUrl, location?.latitude || null, location?.longitude || null, coLocName, employee.id]);

    const checkIn = new Date(existing.rows[0].check_in);
    const diffMs = now - checkIn;
    const dH = Math.floor(diffMs / 3600000), dM = Math.floor((diffMs % 3600000) / 60000);
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });

    let otInfo = '';
    if (employee.overtime_enabled) {
      const otResult = await OvertimeService.calculateAutoOvertime(employee.id, employee.company_id, existing.rows[0].id, now);
      if (otResult) otInfo = `\n\n🕐 *LEMBUR TERDETEKSI*\n⏱️ Durasi: ${otResult.hours}j ${otResult.remainingMinutes}m\n✅ Otomatis tercatat`;
    }

    let reply = `🚪 *CHECK-OUT BERHASIL*\n\n👤 ${employee.name}\n⏰ ${timeStr}\n⏱️ Durasi kerja: ${dH}j ${dM}m`;
    if (selfieUrl) reply += `\n📸 Selfie: Tercatat ✅`;
    if (coLocName) reply += `\n📍 ${coLocName}`;
    reply += otInfo + `\n\nSampai jumpa besok! 👋`;
    return { success: true, reply };
  }

  static async requestOvertime(employee, msg) {
    if (!employee.overtime_enabled) return { success: true, reply: '⚠️ Fitur lembur belum diaktifkan untuk perusahaan Anda.' };
    const reason = msg.replace(/^LEMBUR\s*/i, '').trim() || 'Pengajuan lembur';
    const r = await OvertimeService.requestManualOvertime(employee.id, employee.company_id, reason);
    if (r.success) return { success: true, reply: `🕐 *LEMBUR DIAJUKAN*\n\n👤 ${employee.name}\n📋 ${reason}\n⏳ Menunggu persetujuan admin\n\nKetik *SELESAI LEMBUR* saat selesai.` };
    return { success: false, reply: `⚠️ ${r.message}` };
  }

  static async finishOvertime(employee) {
    const r = await OvertimeService.finishOvertime(employee.id);
    if (r.success) return { success: true, reply: `✅ *LEMBUR SELESAI*\n\n👤 ${employee.name}\n⏱️ Durasi: ${r.hours}j ${r.remainingMinutes}m\n\nTerima kasih! 💪` };
    return { success: false, reply: `⚠️ ${r.message}` };
  }

  static async getOvertimeSummary(employee) {
    const m = new Date().getMonth() + 1, y = new Date().getFullYear();
    const s = await OvertimeService.getEmployeeOvertime(employee.id, m, y);
    const mn = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
    return { success: true, reply: `📊 *REKAP LEMBUR*\n\n👤 ${employee.name}\n📅 ${mn}\n⏱️ Total: ${s.formatted}\n📋 ${s.totalDays} hari\n🤖 Auto: ${s.autoCount}x\n✋ Manual: ${s.manualCount}x\n⏳ Pending: ${s.pendingCount}x` };
  }

  static async getStatus(employee) {
    const r = await query('SELECT * FROM attendance WHERE employee_id=$1 AND date=CURRENT_DATE', [employee.id]);
    if (r.rows.length === 0) return { success: true, reply: `📊 *STATUS*\n\n👤 ${employee.name}\n❌ Belum check-in hari ini\n\nKirim foto selfie + caption *HADIR* 📸` };
    const a = r.rows[0];
    const ci = a.check_in ? new Date(a.check_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '-';
    const co = a.check_out ? new Date(a.check_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : 'Belum';
    let reply = `📊 *STATUS HARI INI*\n\n👤 ${employee.name}\n✅ Masuk: ${ci}\n🚪 Pulang: ${co}\n📋 Status: ${a.status}`;
    if (a.selfie_checkin_url) reply += `\n📸 Selfie: ✅`;
    if (a.location_name) reply += `\n📍 ${a.location_name}`;
    if (a.distance_meters !== null) reply += `\n📏 Jarak: ${a.distance_meters}m`;
    if (a.overtime_minutes > 0) reply += `\n🕐 Lembur: ${Math.floor(a.overtime_minutes / 60)}j ${a.overtime_minutes % 60}m`;
    return { success: true, reply };
  }

  static async markStatus(employee, status) {
    const existing = await query('SELECT * FROM attendance WHERE employee_id=$1 AND date=CURRENT_DATE', [employee.id]);
    if (existing.rows.length > 0) await query("UPDATE attendance SET status=$1 WHERE employee_id=$2 AND date=CURRENT_DATE", [status, employee.id]);
    else await query("INSERT INTO attendance (employee_id,company_id,date,status) VALUES ($1,$2,CURRENT_DATE,$3)", [employee.id, employee.company_id, status]);
    const emoji = status === 'IZIN' ? '📝' : '🤒';
    const wish = status === 'IZIN' ? 'Semoga lancar! 🙏' : 'Lekas sembuh! 🙏❤️';
    return { success: true, reply: `${emoji} *${status} TERCATAT*\n\n👤 ${employee.name}\n📅 ${new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n${wish}` };
  }

  static getHelp(employee) {
    return {
      success: true,
      reply: `🤖 *ABSENIN v3.0*\n\nHalo ${employee.name}! 👋\n\n📋 *Perintah Absensi:*\n📸 Foto + *HADIR* → Check-in\n📸 Foto + *PULANG* → Check-out\n📊 *STATUS* → Cek status\n📝 *IZIN* → Izin hari ini\n🤒 *SAKIT* → Sakit hari ini\n\n🕐 *Perintah Lembur:*\n⏰ *LEMBUR* [alasan] → Ajukan\n✅ *SELESAI LEMBUR* → Akhiri\n📊 *REKAP* → Rekap bulan ini\n\n💡 Tips: Pulang lebih dari jam kerja = lembur otomatis tercatat!`
    };
  }
}

module.exports = AttendanceService;
