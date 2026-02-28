'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import DashboardHeader from '@/components/DashboardHeader';

const DetailRow = ({ label, value, capitalize = false, highlight = false }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="text-xs text-gray-500 font-medium w-32 flex-shrink-0">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-wa-primary' : 'text-gray-900'} ${capitalize ? 'capitalize' : ''}`}>
        {value}
      </span>
    </div>
  );
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const [empR, divR, posR] = await Promise.all([
        api.getEmployees ? api.getEmployees() : api.get('/employees'),
        api.getDivisions ? api.getDivisions() : api.get('/divisions').catch(() => ({ data: [] })),
        api.getPositions ? api.getPositions() : api.get('/positions').catch(() => ({ data: [] })),
      ]);
      setEmployees(empR.data || []);
      setDivisions(divR.data || []);
      setPositions(posR.data || []);
    } catch (e) { setMsg('❌ ' + e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const fd = new FormData(e.target);
      const data = {
        name: fd.get('emp_name'),
        employee_id: fd.get('emp_eid'),
        email: fd.get('emp_email'),
        phone: fd.get('emp_work_phone'),
        division_id: fd.get('emp_division') || null,
        position_id: fd.get('emp_position') || null,
        join_date: fd.get('emp_join_date') || null,
        employment_status: fd.get('emp_status') || 'tetap',
        base_salary: fd.get('emp_salary') ? parseInt(fd.get('emp_salary')) : null,
        ktp_number: fd.get('emp_ktp'),
        date_of_birth: fd.get('emp_dob') || null,
        personal_email: fd.get('emp_personal_email'),
        npwp: fd.get('emp_npwp'),
      };

      if (!data.name) throw new Error('Nama wajib diisi');

      if (editing) {
        await (api.updateEmployee ? api.updateEmployee(editing.id, data) : api.put(`/employees/${editing.id}`, data));
        setMsg('✅ Karyawan diupdate!');
      } else {
        await (api.createEmployee ? api.createEmployee(data) : api.post('/employees', data));
        setMsg('✅ Karyawan ditambahkan!');
      }
      setShowForm(false); setEditing(null);
      load();
    } catch (err) { setMsg('❌ ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (emp) => {
    if (!confirm(`Hapus ${emp.name}?`)) return;
    try {
      await (api.deleteEmployee ? api.deleteEmployee(emp.id) : api.delete(`/employees/${emp.id}`));
      setMsg('✅ Dihapus'); load();
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const handleExport = async () => {
    try {
      const headers = ['Nama', 'Employee ID', 'Email Perusahaan', 'No. WA', 'Divisi', 'Jabatan', 'Tanggal Mulai', 'Status', 'Gaji Pokok', 'No. KTP', 'Tanggal Lahir', 'Email Pribadi', 'NPWP'];
      const rows = employees.map(e => [
        e.name || '',
        e.employee_id || '',
        e.email || '',
        e.phone || '',
        e.division_name || '',
        e.position_name || '',
        e.join_date?.split('T')[0] || '',
        e.employment_status || 'tetap',
        e.base_salary || '',
        e.ktp_number || '',
        e.date_of_birth?.split('T')[0] || '',
        e.personal_email || '',
        e.npwp || '',
      ]);
      const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `karyawan_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setMsg('✅ Data berhasil di-export!');
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) throw new Error('File CSV kosong atau tidak valid');

      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('nama'));
      const phoneIdx = headers.findIndex(h => h.includes('wa') || h.includes('telepon'));

      let successCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
        if (values.length < 2) continue;

        const name = values[nameIdx] || values[0];
        const phone = values[phoneIdx] || values.find(v => v.match(/^628/)) || '';

        if (!name) continue;

        try {
          await api.createEmployee({ name, phone: phone.replace(/[^0-9]/g, '') });
          successCount++;
        } catch (err) {
          console.error(`Gagal import baris ${i}:`, err);
        }
      }
      setMsg(`✅ Berhasil import ${successCount} karyawan!`);
      load();
    } catch (e) { setMsg('❌ ' + e.message); }
    e.target.value = '';
  };

  const handleEdit = (emp) => { setEditing(emp); setShowForm(true); };
  const handleView = (emp) => { setSelectedEmployee(emp); setShowDetail(true); };

  const filtered = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    e.phone?.includes(search)
  );

  const IC = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500";

  if (loading) return <div className="p-6 flex justify-center"><div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <>
      <DashboardHeader
        title="👥 Karyawan"
        subtitle={`${employees.length} karyawan terdaftar`}
      />
      <div className="p-4 md:p-6">
        {/* Action Buttons */}
        <div className="flex flex-wrap justify-end gap-3 mb-6">
          <button onClick={() => router.push('/dashboard/divisions')} className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-gray-200">
            🏢 Divisi
          </button>
          <button onClick={handleExport} className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-gray-200">
            📤 Export CSV
          </button>
          <button onClick={() => document.getElementById('import_file').click()} className="bg-gray-100 text-gray-700 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-gray-200">
            📥 Import CSV
          </button>
          <input id="import_file" type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-wa-dark">
            + Tambah Karyawan
          </button>
        </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm mb-4 flex justify-between ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span>{msg}</span>
          <button onClick={() => setMsg('')}>&times;</button>
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <label htmlFor="emp_search" className="sr-only">Cari karyawan</label>
        <input id="emp_search" name="emp_search" type="text" placeholder="🔍 Cari nama, ID, atau telepon..." value={search} onChange={e => setSearch(e.target.value)} className={IC} />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{editing ? '✏️ Edit' : '➕ Tambah'} Karyawan</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informasi Pekerjaan */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b">💼 Informasi Pekerjaan</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="emp_name" className="block text-sm font-medium mb-1">Nama Lengkap *</label>
                    <input id="emp_name" name="emp_name" type="text" required defaultValue={editing?.name || ''} placeholder="John Doe" className={IC} autoComplete="name" />
                  </div>
                  <div>
                    <label htmlFor="emp_eid" className="block text-sm font-medium mb-1">Employee ID</label>
                    <input id="emp_eid" name="emp_eid" type="text" defaultValue={editing?.employee_id || ''} placeholder="EMP-001" className={IC} />
                  </div>
                  <div>
                    <label htmlFor="emp_email" className="block text-sm font-medium mb-1">Email Perusahaan</label>
                    <input id="emp_email" name="emp_email" type="email" defaultValue={editing?.email || ''} placeholder="john@company.com" className={IC} autoComplete="email" />
                  </div>
                  <div>
                    <label htmlFor="emp_work_phone" className="block text-sm font-medium mb-1">No. Kontak (WA) *</label>
                    <input id="emp_work_phone" name="emp_work_phone" type="tel" required defaultValue={editing?.phone || ''} placeholder="628123456789" className={IC} autoComplete="tel" />
                  </div>
                  <div>
                    <label htmlFor="emp_division" className="block text-sm font-medium mb-1">Divisi</label>
                    <select id="emp_division" name="emp_division" defaultValue={editing?.division_id || ''} className={IC}>
                      <option value="">-- Pilih Divisi --</option>
                      {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="emp_position" className="block text-sm font-medium mb-1">Jabatan</label>
                    <select id="emp_position" name="emp_position" defaultValue={editing?.position_id || ''} className={IC}>
                      <option value="">-- Pilih Jabatan --</option>
                      {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="emp_join_date" className="block text-sm font-medium mb-1">Tanggal Mulai Kerja</label>
                    <input id="emp_join_date" name="emp_join_date" type="date" defaultValue={editing?.join_date?.split('T')[0] || ''} className={IC} />
                  </div>
                  <div>
                    <label htmlFor="emp_status" className="block text-sm font-medium mb-1">Status Karyawan</label>
                    <select id="emp_status" name="emp_status" defaultValue={editing?.employment_status || 'tetap'} className={IC}>
                      <option value="tetap">Tetap</option>
                      <option value="kontrak">Kontrak</option>
                      <option value="magang">Magang</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="emp_salary" className="block text-sm font-medium mb-1">Gaji Pokok</label>
                    <input id="emp_salary" name="emp_salary" type="number" defaultValue={editing?.base_salary || ''} placeholder="5000000" className={IC} />
                  </div>
                </div>
              </div>

              {/* Informasi Pribadi */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3 pb-2 border-b">👤 Informasi Pribadi</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="emp_ktp" className="block text-sm font-medium mb-1">Nomor KTP</label>
                    <input id="emp_ktp" name="emp_ktp" type="text" defaultValue={editing?.ktp_number || ''} placeholder="3201xxxxxxxxxxxxxx" className={IC} />
                  </div>
                  <div>
                    <label htmlFor="emp_dob" className="block text-sm font-medium mb-1">Tanggal Lahir</label>
                    <input id="emp_dob" name="emp_dob" type="date" defaultValue={editing?.date_of_birth?.split('T')[0] || ''} className={IC} />
                  </div>
                  <div>
                    <label htmlFor="emp_personal_email" className="block text-sm font-medium mb-1">Email Pribadi</label>
                    <input id="emp_personal_email" name="emp_personal_email" type="email" defaultValue={editing?.personal_email || ''} placeholder="personal@gmail.com" className={IC} />
                  </div>
                  <div>
                    <label htmlFor="emp_npwp" className="block text-sm font-medium mb-1">NPWP</label>
                    <input id="emp_npwp" name="emp_npwp" type="text" defaultValue={editing?.npwp || ''} placeholder="" className={IC} />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark disabled:opacity-50 flex-1">
                  {saving ? '⏳...' : editing ? '💾 Update' : '➕ Tambah'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl text-sm font-semibold">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowDetail(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-wa-light rounded-full flex items-center justify-center">
                  <span className="text-2xl font-bold text-wa-dark">{selectedEmployee.name?.charAt(0) || 'E'}</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedEmployee.name}</h2>
                  <p className="text-sm text-gray-500">{selectedEmployee.employee_id || 'No Employee ID'}</p>
                </div>
              </div>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Informasi Pekerjaan */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-4 pb-2 border-b flex items-center gap-2">
                  💼 Informasi Pekerjaan
                </h3>
                <div className="space-y-3">
                  <DetailRow label="Employee ID" value={selectedEmployee.employee_id} />
                  <DetailRow label="Email Perusahaan" value={selectedEmployee.email} />
                  <DetailRow label="No. WhatsApp" value={selectedEmployee.phone} highlight />
                  <DetailRow label="Divisi" value={selectedEmployee.division_name} />
                  <DetailRow label="Jabatan" value={selectedEmployee.position_name} />
                  <DetailRow label="Tanggal Mulai" value={selectedEmployee.join_date?.split('T')[0]} />
                  <DetailRow label="Status" value={selectedEmployee.employment_status} capitalize />
                  <DetailRow label="Gaji Pokok" value={selectedEmployee.base_salary ? `Rp${Number(selectedEmployee.base_salary).toLocaleString('id-ID')}` : null} />
                </div>
              </div>

              {/* Informasi Pribadi */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-4 pb-2 border-b flex items-center gap-2">
                  👤 Informasi Pribadi
                </h3>
                <div className="space-y-3">
                  <DetailRow label="Nomor KTP" value={selectedEmployee.ktp_number} />
                  <DetailRow label="Tanggal Lahir" value={selectedEmployee.date_of_birth?.split('T')[0]} />
                  <DetailRow label="Email Pribadi" value={selectedEmployee.personal_email} />
                  <DetailRow label="NPWP" value={selectedEmployee.npwp} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-6 border-t">
              <button onClick={() => { setShowDetail(false); handleEdit(selectedEmployee); }} className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-wa-dark flex-1">
                ✏️ Edit Karyawan
              </button>
              <button onClick={() => setShowDetail(false)} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl text-sm font-semibold">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Nama</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">ID</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Telepon</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Divisi</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Jabatan</th>
                <th className="text-right px-4 py-3 font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">{search ? 'Tidak ditemukan' : 'Belum ada karyawan'}</td></tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-xs text-gray-400 sm:hidden">{emp.phone || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{emp.employee_id || '-'}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {emp.phone ? (
                      <span className="text-green-600">{emp.phone}</span>
                    ) : (
                      <span className="text-red-400 text-xs">⚠️ Belum diisi</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{emp.division_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{emp.position_name || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleView(emp)} className="text-wa-primary hover:text-wa-dark text-xs mr-2">👁️ Lihat</button>
                    <button onClick={() => handleEdit(emp)} className="text-blue-500 hover:text-blue-700 text-xs mr-2">✏️ Edit</button>
                    <button onClick={() => handleDelete(emp)} className="text-red-400 hover:text-red-600 text-xs">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
