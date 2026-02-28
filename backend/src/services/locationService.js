const { query } = require('../config/db');

class LocationService {
  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  // Get all locations for a company
  async getLocations(companyId) {
    const result = await query(`
      SELECT ol.*,
        COUNT(DISTINCT lc.employee_id) as checkin_count
      FROM office_locations ol
      LEFT JOIN location_checkins lc ON lc.location_id = ol.id
      WHERE ol.company_id = $1
      GROUP BY ol.id
      ORDER BY ol.sort_order ASC, ol.name ASC
    `, [companyId]);

    return result.rows;
  }

  // Get location by ID
  async getLocationById(locationId, companyId) {
    const result = await query(
      'SELECT * FROM office_locations WHERE id = $1 AND company_id = $2',
      [locationId, companyId]
    );

    if (result.rows.length === 0) {
      throw new Error('Lokasi tidak ditemukan');
    }

    return result.rows[0];
  }

  // Create new location
  async createLocation(companyId, locationData) {
    const { name, address, latitude, longitude, radius_meters = 500, sort_order = 0 } = locationData;

    if (!name || latitude === undefined || longitude === undefined) {
      throw new Error('Nama, latitude, dan longitude wajib diisi');
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      throw new Error('Latitude harus antara -90 dan 90');
    }
    if (longitude < -180 || longitude > 180) {
      throw new Error('Longitude harus antara -180 dan 180');
    }

    // Check if location name already exists
    const existing = await query(
      'SELECT id FROM office_locations WHERE company_id = $1 AND name = $2',
      [companyId, name]
    );

    if (existing.rows.length > 0) {
      throw new Error('Lokasi dengan nama ini sudah ada');
    }

    const result = await query(`
      INSERT INTO office_locations (company_id, name, address, latitude, longitude, radius_meters, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [companyId, name, address, latitude, longitude, radius_meters, sort_order]);

    return result.rows[0];
  }

  // Update location
  async updateLocation(locationId, companyId, locationData) {
    const { name, address, latitude, longitude, radius_meters, is_active, sort_order } = locationData;

    const existing = await this.getLocationById(locationId, companyId);

    // Check new name uniqueness if changed
    if (name && name !== existing.name) {
      const duplicate = await query(
        'SELECT id FROM office_locations WHERE company_id = $1 AND name = $2 AND id != $3',
        [companyId, name, locationId]
      );

      if (duplicate.rows.length > 0) {
        throw new Error('Lokasi dengan nama ini sudah ada');
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(address);
    }
    if (latitude !== undefined) {
      if (latitude < -90 || latitude > 90) {
        throw new Error('Latitude harus antara -90 dan 90');
      }
      updates.push(`latitude = $${paramCount++}`);
      values.push(latitude);
    }
    if (longitude !== undefined) {
      if (longitude < -180 || longitude > 180) {
        throw new Error('Longitude harus antara -180 dan 180');
      }
      updates.push(`longitude = $${paramCount++}`);
      values.push(longitude);
    }
    if (radius_meters !== undefined) {
      updates.push(`radius_meters = $${paramCount++}`);
      values.push(radius_meters);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramCount++}`);
      values.push(sort_order);
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(locationId);
    values.push(companyId);

    const queryStr = `
      UPDATE office_locations
      SET ${updates.join(', ')}
      WHERE id = $${values.length - 1} AND company_id = $${values.length}
      RETURNING *
    `;

    const result = await query(queryStr, values);
    return result.rows[0];
  }

  // Delete location
  async deleteLocation(locationId, companyId) {
    await query('DELETE FROM office_locations WHERE id = $1 AND company_id = $2', [locationId, companyId]);
  }

  // Validate if employee is within any active location
  async validateLocation(employeeLat, employeeLon, companyId) {
    const locations = await query(`
      SELECT * FROM office_locations
      WHERE company_id = $1 AND is_active = true
    `, [companyId]);

    if (locations.rows.length === 0) {
      // No locations configured - allow check-in (backward compatibility)
      return { valid: true, reason: 'No locations configured' };
    }

    for (const location of locations.rows) {
      const distance = this.calculateDistance(
        employeeLat, employeeLon,
        location.latitude, location.longitude
      );

      if (distance <= location.radius_meters) {
        return {
          valid: true,
          location_id: location.id,
          location_name: location.name,
          distance_meters: Math.round(distance),
          within_radius: true
        };
      }
    }

    // Find closest location for feedback
    let closest = null;
    let minDistance = Infinity;

    for (const location of locations.rows) {
      const distance = this.calculateDistance(
        employeeLat, employeeLon,
        location.latitude, location.longitude
      );
      if (distance < minDistance) {
        minDistance = distance;
        closest = location;
      }
    }

    return {
      valid: false,
      closest_location: closest ? {
        id: closest.id,
        name: closest.name,
        distance_meters: Math.round(minDistance),
        radius_meters: closest.radius_meters
      } : null
    };
  }

  // Log check-in location
  async logCheckIn(attendanceId, employeeId, locationId, employeeLat, employeeLon, companyId) {
    // Get location details
    const location = await query('SELECT * FROM office_locations WHERE id = $1', [locationId]);
    if (location.rows.length === 0) return;

    const distance = this.calculateDistance(
      employeeLat, employeeLon,
      location.rows[0].latitude,
      location.rows[0].longitude
    );

    const withinRadius = distance <= location.rows[0].radius_meters;

    await query(`
      INSERT INTO location_checkins (attendance_id, employee_id, location_id, distance_meters, within_radius)
      VALUES ($1, $2, $3, $4, $5)
    `, [attendanceId, employeeId, locationId, Math.round(distance), withinRadius]);
  }

  // Get location check-in history
  async getLocationCheckIns(locationId, companyId) {
    const result = await query(`
      SELECT lc.*,
        e.name as employee_name,
        e.employee_id as employee_code
      FROM location_checkins lc
      JOIN employees e ON e.id = lc.employee_id
      JOIN office_locations ol ON ol.id = lc.location_id
      WHERE lc.location_id = $1 AND ol.company_id = $2
      ORDER BY lc.checked_in_at DESC
      LIMIT 100
    `, [locationId, companyId]);

    return result.rows;
  }

  // Get location statistics
  async getLocationStats(companyId) {
    const result = await query(`
      SELECT
        COUNT(DISTINCT ol.id) as total_locations,
        COUNT(DISTINCT ol.id) FILTER (WHERE ol.is_active = true) as active_locations,
        COUNT(DISTINCT lc.employee_id) as total_checkins
      FROM office_locations ol
      LEFT JOIN location_checkins lc ON lc.location_id = ol.id
        AND lc.checked_in_at >= CURRENT_DATE
      WHERE ol.company_id = $1
    `, [companyId]);

    return result.rows[0];
  }
}

module.exports = new LocationService();
