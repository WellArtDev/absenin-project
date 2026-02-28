'use client';
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import DashboardHeader from '@/components/DashboardHeader';

export default function PositionsPage() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await (api.getPositions ? api.getPositions() : api.get('/positions'));
      setPositions(r.data || []);
    } catch (e) { setMsg('❌ ' + e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      const fd = new FormData(e.target);
      const data = { name: fd.get('pos_name'), description: fd.get('pos_desc'), level: parseInt(fd.get('pos_level')) || 1 };
      if (!data.name) throw new Error('Nama jabatan wajib diisi');

      if (editing) {
        await (api.updatePosition ? api.updatePosition(editing.id, data) : api.put(`/positions/${editing.id}`, data));
        setMsg('✅ Jabatan diupdate!');
      } else {
        await (api.createPosition ? api.createPosition(data) : api.post('/positions', data));
        setMsg('✅ Jabatan ditambahkan!');
      }
      setShowForm(false); setEditing(null); load();
    } catch (err) { setMsg('❌ ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (pos) => {
    if (!confirm(`Hapus jabatan "${pos.name}"?`)) return;
    try {
      await (api.deletePosition ? api.deletePosition(pos.id) : api.delete(`/positions/${pos.id}`));
      setMsg('✅ Dihapus'); load();
    } catch (e) { setMsg('❌ ' + e.message); }
  };

  const IC = "w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500";

  if (loading) return <div className="p-6 flex justify-center"><div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <>
      <DashboardHeader
        title="💼 Jabatan"
        subtitle={`${positions.length} jabatan`}
      />
      <div className="p-4 md:p-6">
        <div className="flex justify-end mb-6">
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-wa-primary text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-wa-dark">+ Tambah Jabatan</button>
        </div>

      {msg && <div className={`px-4 py-3 rounded-xl text-sm mb-4 flex justify-between ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}><span>{msg}</span><button onClick={() => setMsg('')}>&times;</button></div>}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">{editing ? '✏️ Edit' : '➕ Tambah'} Jabatan</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="pos_name" className="block text-sm font-medium mb-1">Nama Jabatan *</label>
                <input id="pos_name" name="pos_name" type="text" required defaultValue={editing?.name || ''} placeholder="Manager, Staff, dll" className={IC} />
              </div>
              <div>
                <label htmlFor="pos_desc" className="block text-sm font-medium mb-1">Deskripsi</label>
                <textarea id="pos_desc" name="pos_desc" defaultValue={editing?.description || ''} rows={3} placeholder="Deskripsi jabatan..." className={IC} />
              </div>
              <div>
                <label htmlFor="pos_level" className="block text-sm font-medium mb-1">Level</label>
                <input id="pos_level" name="pos_level" type="number" min="1" max="10" defaultValue={editing?.level || 1} className={IC} />
                <p className="text-xs text-gray-400 mt-1">1 = tertinggi</p>
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
        {positions.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400 bg-white rounded-2xl border">Belum ada jabatan</div>
        ) : positions.map(pos => (
          <div key={pos.id} className="bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold">{pos.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{pos.description || '-'}</p>
                <p className="text-xs text-gray-400 mt-2">Level: {pos.level || 1} {pos.employee_count !== undefined ? `• 👥 ${pos.employee_count}` : ''}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEditing(pos); setShowForm(true); }} className="text-blue-500 text-sm">✏️</button>
                <button onClick={() => handleDelete(pos)} className="text-red-400 text-sm">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
