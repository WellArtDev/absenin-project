'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [banks, setBanks] = useState([]);
  const [myPayments, setMyPayments] = useState([]);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [pl, bn, mp] = await Promise.all([
        api.getPlans(),
        api.getBanks(),
        api.getMyPayments(),
      ]);
      setPlans(pl.data || []);
      setBanks(bn.data || []);
      setMyPayments(mp.data || []);
    } catch (e) {
      if (e.message?.includes('Sesi') || e.message?.includes('401')) router.push('/login');
      else setMsg('❌ ' + (e.message || 'Gagal memuat data'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (plan) => {
    setSelectedPlan(plan);
    setShowForm(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');
    try {
      const fd = new FormData(e.target);
      const data = {
        plan_id: selectedPlan.id,
        bank_name: fd.get('bank_name'),
        bank_account_number: fd.get('bank_account_number'),
        bank_account_name: fd.get('bank_account_name'),
        transfer_date: fd.get('transfer_date'),
      };

      // Handle transfer proof upload
      const proofFile = fd.get('transfer_proof');
      if (proofFile && proofFile.size > 0) {
        // Convert to base64 or upload separately
        const reader = new FileReader();
        reader.onload = async (event) => {
          data.transfer_proof = event.target.result;
          await submitPayment(data);
        };
        reader.readAsDataURL(proofFile);
      } else {
        await submitPayment(data);
      }
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal mengirim konfirmasi'));
      setSubmitting(false);
    }
  };

  const submitPayment = async (data) => {
    try {
      await api.createPayment(data);
      setMsg('✅ Konfirmasi pembayaran berhasil dikirim!');
      setShowForm(false);
      setSelectedPlan(null);
      loadData();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal mengirim konfirmasi'));
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      waiting_confirmation: 'bg-wa-light text-wa-dark',
      confirmed: 'bg-wa-primary text-white',
      rejected: 'bg-red-100 text-red-700',
      expired: 'bg-gray-100 text-gray-700',
    };
    const labels = {
      pending: '⏳ Pending',
      waiting_confirmation: '📝 Menunggu Konfirmasi',
      confirmed: '✅ Dikonfirmasi',
      rejected: '❌ Ditolak',
      expired: '⌛ Kadaluarsa',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white";

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">💰 Paket Berlangganan</h1>
        <p className="text-sm text-gray-500 mt-1">Pilih paket yang sesuai dengan kebutuhan perusahaan Anda</p>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm mb-6 flex items-center justify-between ${
          msg.startsWith('✅')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')} className="ml-2 opacity-50 hover:opacity-100 text-lg">&times;</button>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${
              plan.slug === 'pro' ? 'border-wa-primary shadow-lg scale-105' : 'border-gray-200'
            }`}
          >
            {plan.slug === 'pro' && (
              <div className="bg-wa-primary text-white text-center py-1 text-xs font-bold">
                POPULER
              </div>
            )}
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold">
                  {plan.price === 0 ? 'Gratis' : `Rp${plan.price?.toLocaleString('id-ID')}`}
                </span>
                {plan.price > 0 && <span className="text-gray-500 text-sm">/bulan</span>}
              </div>
              <p className="text-sm text-gray-500 mb-4">{plan.description}</p>
              <ul className="space-y-2 mb-6">
                {Array.isArray(plan.features) && plan.features.map((f, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span className="capitalize">{typeof f === 'string' ? f.replace(/_/g, ' ') : f}</span>
                  </li>
                ))}
                <li className="text-sm flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>{plan.max_employees} karyawan</span>
                </li>
              </ul>
              <button
                onClick={() => handleSubscribe(plan)}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${
                  plan.slug === 'pro'
                    ? 'bg-wa-primary text-white hover:bg-wa-dark'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {plan.price === 0 ? 'Gunakan Paket Gratis' : 'Berlangganan'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-2xl border overflow-hidden mb-6">
        <div className="px-6 py-4 border-b">
          <h3 className="font-bold">📋 Riwayat Pembayaran</h3>
        </div>
        {myPayments.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            Belum ada riwayat pembayaran
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">No. Invoice</th>
                  <th className="text-left px-4 py-3 font-medium">Paket</th>
                  <th className="text-left px-4 py-3 font-medium">Jumlah</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {myPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{p.invoice_number || '-'}</td>
                    <td className="px-4 py-3">{p.plan_name || '-'}</td>
                    <td className="px-4 py-3">Rp{p.amount?.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {p.created_at?.split('T')[0]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bank Accounts for Transfer */}
      {banks.length > 0 && (
        <div className="bg-wa-light border border-wa-primary rounded-2xl p-6">
          <h3 className="font-bold text-wa-dark mb-4">🏦 Rekening Tujuan Transfer</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {banks.map((bank) => (
              <div key={bank.id} className="bg-white rounded-xl p-4">
                <p className="font-bold">{bank.bank_name}</p>
                <p className="text-lg font-mono">{bank.account_number}</p>
                <p className="text-sm text-gray-500">{bank.account_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showForm && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">💳 Konfirmasi Pembayaran</h2>
              <button onClick={() => { setShowForm(false); setSelectedPlan(null); }} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <p className="font-bold">{selectedPlan.name}</p>
              <p className="text-2xl font-bold text-wa-primary">Rp{selectedPlan.price?.toLocaleString('id-ID')}</p>
            </div>

            {banks.length > 0 && (
              <div className="mb-4 p-4 bg-wa-light rounded-xl">
                <p className="text-sm font-bold text-wa-dark mb-2">Transfer ke:</p>
                {banks.map((bank) => (
                  <div key={bank.id} className="text-sm">
                    <p><strong>{bank.bank_name}</strong>: {bank.account_number} ({bank.account_name})</p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label htmlFor="bank_name" className="block text-sm font-medium mb-1">Bank Asal *</label>
                <select id="bank_name" name="bank_name" required className={inputCls}>
                  <option value="">-- Pilih Bank --</option>
                  <option value="BCA">BCA</option>
                  <option value="Mandiri">Mandiri</option>
                  <option value="BNI">BNI</option>
                  <option value="BRI">BRI</option>
                  <option value="Jago">Jago</option>
                  <option value="Jenius">Jenius</option>
                  <option value="Other">Lainnya</option>
                </select>
              </div>
              <div>
                <label htmlFor="bank_account_number" className="block text-sm font-medium mb-1">Nomor Rekening *</label>
                <input id="bank_account_number" name="bank_account_number" type="text" required className={inputCls} placeholder="Nomor rekening Anda" />
              </div>
              <div>
                <label htmlFor="bank_account_name" className="block text-sm font-medium mb-1">Nama Pemilik Rekening *</label>
                <input id="bank_account_name" name="bank_account_name" type="text" required className={inputCls} placeholder="Nama sesuai rekening" />
              </div>
              <div>
                <label htmlFor="transfer_date" className="block text-sm font-medium mb-1">Tanggal Transfer *</label>
                <input id="transfer_date" name="transfer_date" type="date" required className={inputCls} />
              </div>
              <div>
                <label htmlFor="transfer_proof" className="block text-sm font-medium mb-1">Bukti Transfer</label>
                <input id="transfer_proof" name="transfer_proof" type="file" accept="image/*" className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">Upload bukti transfer (opsional, tapi disarankan)</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting} className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark disabled:opacity-50 flex-1">
                  {submitting ? '⏳ Mengirim...' : '📤 Kirim Konfirmasi'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setSelectedPlan(null); }} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl text-sm font-semibold">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
