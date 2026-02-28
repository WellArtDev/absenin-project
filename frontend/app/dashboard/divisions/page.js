'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';

export default function DivisionsPage() {
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await (api.getDivisions ? api.getDivisions() : api.get('/divisions'));
      setDivisions(r.data || []);
    } catch (e) { setMsg('❌ ' + e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const fd = new FormData(e.target);
      const data = { name: fd.get('div_name'), description: fd.get('div_desc') };
      if (!data.name) throw new Error('Nama divisi wajib diisi');

      if (editing) {
        await (api.updateDivision ? api.updateDivision(editing.id, data) : api.put(`/divisions/${editing.id}`, data));
        setMsg('✅ Divisi diupdate!');
      } else {
        await (api.createDivision ? api.createDivision(data) : api.post('/divisions', data));
        setMsg('✅ Divisi ditambahkan!');
      }
      setShowForm(false); setEditing(null); load();
    } catch (err) { setMsg('❌ ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (div) => {
    if (!confirm(`Hapus divisi "${div.name}"?`)) return;
    try {
      await (api.deleteDivision ? api.deleteDivision(div.id) : api.delete(`/divisions/${div.id}`));
      setMsg('✅ Dihapus'); load();
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const IC = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500";

  if (loading) return <div className="p-6 flex justify-center"><div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏢 Divisi</h1>
          <p className="text-sm text-gray-500 mt-1">{divisions.length} divisi</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-gradient-to-r from-wa-primary to-wa-dark text-white px-6 py-3 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
        >
          + Tambah Divisi
        </button>
      </div>

      {msg && <div className={`px-4 py-3 rounded-xl text-sm flex justify-between ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}><span>{msg}</span><button onClick={() => setMsg('')}>&times;</button></div>}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{editing ? '✏️ Edit' : '➕ Tambah'} Divisi</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="div_name" className="block text-sm font-medium mb-1">Nama Divisi *</label>
                <input id="div_name" name="div_name" type="text" required defaultValue={editing?.name || ''} placeholder="IT, Marketing, dll" className={IC} />
              </div>
              <div>
                <label htmlFor="div_desc" className="block text-sm font-medium mb-1">Deskripsi</label>
                <textarea id="div_desc" name="div_desc" defaultValue={editing?.description || ''} rows={3} placeholder="Deskripsi divisi..." className={IC} />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-wa-dark disabled:opacity-50 flex-1">{saving ? '⏳...' : editing ? '💾 Update' : '➕ Tambah'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl text-sm">Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {divisions.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border">Belum ada divisi</div>
        ) : divisions.map(div => (
          <div key={div.id} className="bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{div.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{div.description || 'Tidak ada deskripsi'}</p>
                {div.employee_count !== undefined && <p className="text-xs text-gray-400 mt-2">👥 {div.employee_count} karyawan</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(div); setShowForm(true); }} className="text-blue-500 hover:text-blue-700 text-sm">✏️</button>
                <button onClick={() => handleDelete(div)} className="text-red-400 hover:text-red-600 text-sm">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
