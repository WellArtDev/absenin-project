const express = require('express');
const router = express.Router();
const locationService = require('../services/locationService');
const { authenticate, requireFeature } = require('../middleware/auth');

router.use(authenticate, requireFeature('office_locations'));

// Get all locations for company
router.get('/', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const locations = await locationService.getLocations(companyId);
    res.json({ success: true, data: locations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get location by ID
router.get('/:id', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const location = await locationService.getLocationById(req.params.id, companyId);
    res.json({ success: true, data: location });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// Create location
router.post('/', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const location = await locationService.createLocation(companyId, req.body);
    res.json({ success: true, message: 'Lokasi berhasil dibuat', data: location });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update location
router.put('/:id', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const location = await locationService.updateLocation(req.params.id, companyId, req.body);
    res.json({ success: true, message: 'Lokasi berhasil diupdate', data: location });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete location
router.delete('/:id', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    await locationService.deleteLocation(req.params.id, companyId);
    res.json({ success: true, message: 'Lokasi berhasil dihapus' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Validate location (public endpoint for check-in)
router.post('/validate', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, message: 'Latitude dan longitude wajib diisi' });
    }

    const result = await locationService.validateLocation(latitude, longitude, companyId);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get check-in history for location
router.get('/:id/checkins', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const checkins = await locationService.getLocationCheckIns(req.params.id, companyId);
    res.json({ success: true, data: checkins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get location statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const stats = await locationService.getLocationStats(companyId);
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
