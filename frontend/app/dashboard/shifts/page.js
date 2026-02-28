'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function ShiftsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // Shifts data
  const [shifts, setShifts] = useState([]);
  const [employeesWithShifts, setEmployeesWithShifts] = useState([]);
  const [showShiftForm, setShowShiftForm] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [activeTab, setActiveTab] = useState('shifts'); // 'shifts' or 'assignments'

  const [shiftForm, setShiftForm] = useState({
    name: '',
    description: '',
    start_time: '',
    end_time: '',
    break_duration_minutes: 0,
    sort_order: 0
  });

  const [assignForm, setAssignForm] = useState({
    employee_id: '',
    shift_id: '',
    effective_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [shiftsData, employeesData] = await Promise.all([
        api.getShifts(),
        api.getEmployeesWithShifts()
      ]);
      setShifts(shiftsData.data || []);
      setEmployeesWithShifts(employeesData.data || []);
    } catch (e) {
      if (e.message?.includes('Sesi') || e.message?.includes('401')) router.push('/login');
      else setMsg('❌ ' + (e.message || 'Gagal memuat data'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitShift = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      if (!shiftForm.name || !shiftForm.start_time || !shiftForm.end_time) {
        throw new Error('Nama, jam mulai, dan jam selesai wajib diisi');
      }

      if (editingShift) {
        await api.updateShift(editingShift.id, shiftForm);
        setMsg('✅ Shift berhasil diupdate');
      } else {
        await api.createShift(shiftForm);
        setMsg('✅ Shift berhasil dibuat');
      }

      setShowShiftForm(false);
      setEditingShift(null);
      setShiftForm({ name: '', description: '', start_time: '', end_time: '', break_duration_minutes: 0, sort_order: 0 });
      loadData();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal menyimpan shift'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      description: shift.description || '',
      start_time: shift.start_time?.substring(0, 5) || '',
      end_time: shift.end_time?.substring(0, 5) || '',
      break_duration_minutes: shift.break_duration_minutes || 0,
      sort_order: shift.sort_order || 0
    });
    setShowShiftForm(true);
  };

  const handleDeleteShift = async (id) => {
    if (!confirm('Hapus shift ini?')) return;
    setMsg('');
    setLoading(true);

    try {
      await api.deleteShift(id);
      setMsg('✅ Shift berhasil dihapus');
      loadData();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal menghapus shift'));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignShift = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);

    try {
      await api.assignShift(assignForm);
      setMsg('✅ Shift berhasil diassign ke karyawan');
      setAssignForm({ ...assignForm, employee_id: '', shift_id: '' });
      loadData();
    } catch (err) {
      setMsg('❌ ' + (err.message || 'Gagal mengassign shift'));
    } finally {
      setLoading(false);
    }
  };

  const closeShiftForm = () => {
    setShowShiftForm(false);
    setEditingShift(null);
    setShiftForm({ name: '', description: '', start_time: '', end_time: '', break_duration_minutes: 0, sort_order: 0 });
  };

  if (loading && shifts.length === 0) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-wa-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const IC = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-wa-primary/20 focus:border-wa-primary bg-white";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🕐 Shift Kerja</h1>
          <p className="text-sm text-gray-500 mt-1">{shifts.length} shift aktif</p>
        </div>
      </div>

        {msg && (
          <div className={`px-4 py-3 rounded-xl text-sm mb-6 flex justify-between ${
            msg.startsWith('✅')
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <span>{msg}</span>
            <button onClick={() => setMsg('')} className="ml-2 opacity-50 hover:opacity-100 text-lg">&times;</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'shifts' ? 'bg-white text-wa-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🕐 Daftar Shift
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'assignments' ? 'bg-white text-wa-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            👥 Assign Shift Karyawan
          </button>
        </div>

        {activeTab === 'shifts' && (
          <>
            {/* Add Shift Button */}
            <div className="flex justify-end mb-6">
              <button
                onClick={() => setShowShiftForm(true)}
                className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark transition-colors"
              >
                + Tambah Shift
              </button>
            </div>

            {/* Shifts Grid */}
            {shifts.length === 0 ? (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <div className="text-6xl mb-4">🕐</div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">Belum Ada Shift</h3>
                <p className="text-gray-500 mb-6">Buat shift kerja pertama untuk perusahaan Anda</p>
                <button
                  onClick={() => setShowShiftForm(true)}
                  className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark"
                >
                  + Buat Shift
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shifts.map((shift) => (
                  <div key={shift.id} className="bg-white rounded-2xl border p-5 hover:shadow-lg transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{shift.name}</h3>
                        {shift.description && <p className="text-sm text-gray-500">{shift.description}</p>}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${shift.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {shift.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">🕐</span>
                        <span className="font-medium text-gray-900">{shift.start_time?.substring(0, 5)}</span>
                        <span className="text-gray-400">-</span>
                        <span className="font-medium text-gray-900">{shift.end_time?.substring(0, 5)}</span>
                      </div>
                      {shift.break_duration_minutes > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-500">☕</span>
                          <span className="text-gray-700">{shift.break_duration_minutes} menit istirahat</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">👥</span>
                        <span className="text-gray-700">{shift.employee_count || 0} karyawan</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3 border-t">
                      <button
                        onClick={() => handleEditShift(shift)}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteShift(shift.id)}
                        className="flex-1 px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'assignments' && (
          <>
            {/* Assign Shift Form */}
            <div className="bg-white rounded-2xl border p-6 mb-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                📋 Assign Shift ke Karyawan
              </h2>

              <form onSubmit={handleAssignShift} className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Karyawan</label>
                  <select
                    value={assignForm.employee_id}
                    onChange={e => setAssignForm({ ...assignForm, employee_id: e.target.value })}
                    className={IC}
                    required
                  >
                    <option value="">-- Pilih Karyawan --</option>
                    {employeesWithShifts.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.employee_id || '-'})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Shift</label>
                  <select
                    value={assignForm.shift_id}
                    onChange={e => setAssignForm({ ...assignForm, shift_id: e.target.value })}
                    className={IC}
                    required
                  >
                    <option value="">-- Pilih Shift --</option>
                    {shifts.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.start_time?.substring(0, 5)} - {s.end_time?.substring(0, 5)})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Tanggal Efektif</label>
                  <input
                    type="date"
                    value={assignForm.effective_date}
                    onChange={e => setAssignForm({ ...assignForm, effective_date: e.target.value })}
                    className={IC}
                    required
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark disabled:opacity-50 transition-colors"
                  >
                    {loading ? '⏳ Menyimpan...' : '💾 Assign Shift'}
                  </button>
                </div>
              </form>
            </div>

            {/* Employees with Shifts Table */}
            <div className="bg-white rounded-2xl border overflow-hidden">
              <div className="px-6 py-4 border-b">
                <h3 className="font-bold">👥 Daftar Shift Karyawan</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Karyawan</th>
                      <th className="text-left px-4 py-3 font-medium">Employee ID</th>
                      <th className="text-left px-4 py-3 font-medium">Shift</th>
                      <th className="text-left px-4 py-3 font-medium">Jam Kerja</th>
                      <th className="text-left px-4 py-3 font-medium">Efektif Sejak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {employeesWithShifts.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                          Belum ada karyawan dengan shift
                        </td>
                      </tr>
                    ) : (
                      employeesWithShifts.map((emp) => (
                        <tr key={emp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{emp.name}</td>
                          <td className="px-4 py-3 text-gray-500">{emp.employee_id || '-'}</td>
                          <td className="px-4 py-3">
                            {emp.shift_name ? (
                              <span className="px-2 py-1 bg-wa-light text-wa-dark rounded-full text-xs font-medium">
                                {emp.shift_name}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">Belum ada shift</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {emp.start_time && emp.end_time ? `${emp.start_time.substring(0, 5)} - ${emp.end_time.substring(0, 5)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {emp.effective_date ? new Date(emp.effective_date).toLocaleDateString('id-ID') : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Shift Form Modal */}
        {showShiftForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">
                  {editingShift ? '✏️ Edit Shift' : '➕ Tambah Shift Baru'}
                </h2>
                <button onClick={closeShiftForm} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>

              <form onSubmit={handleSubmitShift} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nama Shift *</label>
                  <input
                    type="text"
                    value={shiftForm.name}
                    onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })}
                    className={IC}
                    placeholder="Contoh: Shift Pagi"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Deskripsi</label>
                  <input
                    type="text"
                    value={shiftForm.description}
                    onChange={e => setShiftForm({ ...shiftForm, description: e.target.value })}
                    className={IC}
                    placeholder="Contoh: Kerja pagi hari"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Jam Mulai *</label>
                    <input
                      type="time"
                      value={shiftForm.start_time}
                      onChange={e => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                      className={IC}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Jam Selesai *</label>
                    <input
                      type="time"
                      value={shiftForm.end_time}
                      onChange={e => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                      className={IC}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Durasi Istirahat (menit)</label>
                    <input
                      type="number"
                      value={shiftForm.break_duration_minutes}
                      onChange={e => setShiftForm({ ...shiftForm, break_duration_minutes: parseInt(e.target.value) || 0 })}
                      className={IC}
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Urutan Tampil</label>
                    <input
                      type="number"
                      value={shiftForm.sort_order}
                      onChange={e => setShiftForm({ ...shiftForm, sort_order: parseInt(e.target.value) || 0 })}
                      className={IC}
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeShiftForm}
                    className="flex-1 px-6 py-3 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark disabled:opacity-50"
                  >
                    {loading ? '⏳ Menyimpan...' : '💾 Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
