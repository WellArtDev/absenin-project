'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
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
        phone: fd.get('emp_phone'),
        division_id: fd.get('emp_division') || null,
        position_id: fd.get('emp_position') || null,
        join_date: fd.get('emp_join_date') || null,
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

  const handleEdit = (emp) => { setEditing(emp); setShowForm(true); };

  const filtered = employees.filter(e =>
    e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_id?.toLowerCase().includes(search.toLowerCase()) ||
    e.phone?.includes(search)
  );

  const IC = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500";

  if (loading) return <div className="p-6 flex justify-center"><div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">👥 Karyawan</h1>
          <p className="text-sm text-gray-500">{employees.length} karyawan terdaftar</p>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-red-500 text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-red-600">
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
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{editing ? '✏️ Edit' : '➕ Tambah'} Karyawan</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="emp_name" className="block text-sm font-medium mb-1">Nama Lengkap *</label>
                <input id="emp_name" name="emp_name" type="text" required defaultValue={editing?.name || ''} placeholder="John Doe" className={IC} autoComplete="name" />
              </div>
              <div>
                <label htmlFor="emp_eid" className="block text-sm font-medium mb-1">ID Karyawan</label>
                <input id="emp_eid" name="emp_eid" type="text" defaultValue={editing?.employee_id || ''} placeholder="EMP-001" className={IC} />
              </div>
              <div>
                <label htmlFor="emp_email" className="block text-sm font-medium mb-1">Email</label>
                <input id="emp_email" name="emp_email" type="email" defaultValue={editing?.email || ''} placeholder="john@email.com" className={IC} autoComplete="email" />
              </div>
              <div>
                <label htmlFor="emp_phone" className="block text-sm font-medium mb-1">Nomor Telepon (WhatsApp)</label>
                <input id="emp_phone" name="emp_phone" type="tel" defaultValue={editing?.phone || ''} placeholder="628123456789" className={IC} autoComplete="tel" />
                <p className="text-xs text-gray-400 mt-1">Format: 628xxx (untuk notifikasi WA)</p>
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
                <label htmlFor="emp_join_date" className="block text-sm font-medium mb-1">Tanggal Bergabung</label>
                <input id="emp_join_date" name="emp_join_date" type="date" defaultValue={editing?.join_date?.split('T')[0] || ''} className={IC} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="bg-red-500 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50 flex-1">
                  {saving ? '⏳...' : editing ? '💾 Update' : '➕ Tambah'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl text-sm font-semibold">Batal</button>
              </div>
            </form>
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
                    <button onClick={() => handleEdit(emp)} className="text-blue-500 hover:text-blue-700 text-xs mr-3">✏️ Edit</button>
                    <button onClick={() => handleDelete(emp)} className="text-red-400 hover:text-red-600 text-xs">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
