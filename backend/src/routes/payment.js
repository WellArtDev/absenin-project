const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authenticate } = require('../middleware/auth');

// Public: get plans and bank accounts
router.get('/plans', async (req, res) => {
  try {
    const result = await query('SELECT id,name,slug,price,max_employees,duration_days,features,description FROM plans WHERE is_active=true ORDER BY sort_order');
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

router.get('/banks', async (req, res) => {
  try {
    const result = await query('SELECT id,bank_name,account_number,account_name FROM bank_accounts WHERE is_active=true ORDER BY sort_order');
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// Create payment
router.post('/', authenticate, async (req, res) => {
  try {
    const { plan_id, bank_name, bank_account_name, transfer_date } = req.body;
    if (!plan_id) return res.status(400).json({ success: false, message: 'Pilih paket.' });
    
    const plan = await query('SELECT * FROM plans WHERE id=$1 AND is_active=true', [plan_id]);
    if (plan.rows.length === 0) return res.status(404).json({ success: false, message: 'Paket tidak ditemukan.' });
    
    const pl = plan.rows[0];
    const invoiceNumber = `INV-${Date.now()}-${req.user.companyId}`;
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + (pl.duration_days || 30));

    const result = await query(
      `INSERT INTO payments (company_id,plan_id,amount,status,payment_method,bank_name,bank_account_name,transfer_date,invoice_number,period_start,period_end) 
       VALUES ($1,$2,$3,'pending','bank_transfer',$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.companyId, plan_id, pl.price, bank_name || null, bank_account_name || null, transfer_date || null, invoiceNumber, periodStart, periodEnd]);
    
    res.status(201).json({ success: true, message: 'Pembayaran dibuat! Transfer ke rekening yang tersedia lalu konfirmasi.', data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// Confirm transfer (user marks as transferred)
router.put('/:id/confirm-transfer', authenticate, async (req, res) => {
  try {
    const { bank_name, bank_account_name, transfer_date, note } = req.body;
    const result = await query(
      `UPDATE payments SET status='waiting_confirmation', bank_name=COALESCE($1,bank_name), bank_account_name=COALESCE($2,bank_account_name), 
        transfer_date=COALESCE($3,transfer_date), note=$4, updated_at=CURRENT_TIMESTAMP 
       WHERE id=$5 AND company_id=$6 AND status='pending' RETURNING *`,
      [bank_name, bank_account_name, transfer_date || new Date(), note || null, req.params.id, req.user.companyId]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
    res.json({ success: true, message: 'Konfirmasi transfer diterima. Menunggu verifikasi admin.', data: result.rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

// Get my payments
router.get('/my', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT p.*, pl.name as plan_name FROM payments p LEFT JOIN plans pl ON pl.id=p.plan_id 
       WHERE p.company_id=$1 ORDER BY p.created_at DESC`, [req.user.companyId]);
    res.json({ success: true, data: result.rows });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: 'Server error.' }); }
});

module.exports = router;
