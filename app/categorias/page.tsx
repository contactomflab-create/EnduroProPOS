'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, Edit2 } from 'lucide-react'

interface Item { id: string; nombre: string; descripcion?: string; created_at: string }

export default function Page() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState<Item | null>(null)
  const [form, setForm] = useState({ nombre: '', descripcion: '' })
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('categorias').select('*').order('nombre')
    setItems((data as any) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  const openNew = () => { setSelected(null); setForm({ nombre: '', descripcion: '' }); setShowModal(true) }
  const openEdit = (item: Item) => { setSelected(item); setForm({ nombre: item.nombre, descripcion: item.descripcion || '' }); setShowModal(true) }

  const handleSave = async () => {
    if (!form.nombre.trim()) return showToast('El nombre es obligatorio', 'error')
    if (selected) {
      const { error } = await supabase.from('categorias').update({ nombre: form.nombre, descripcion: form.descripcion || null }).eq('id', selected.id)
      if (error) return showToast('Error al actualizar', 'error')
      showToast('Actualizado correctamente', 'success')
    } else {
      const { error } = await supabase.from('categorias').insert({ nombre: form.nombre, descripcion: form.descripcion || null })
      if (error) return showToast(error.message || 'Error al guardar', 'error')
      showToast('Categoría creada', 'success')
    }
    setShowModal(false)
    fetch()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro?')) return
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) return showToast('No se puede eliminar, está siendo usado', 'error')
    showToast('Eliminado', 'success')
    fetch()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 800 }}>CATEGORÍAS</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{items.length} registros</div>
          </div>
          <button className="btn-red" onClick={openNew}><Plus size={16} /> Nuevo</button>
        </div>

        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Cargando...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Sin registros aún</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nombre</th><th>Descripción</th><th>Creado</th><th></th></tr></thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.nombre}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{item.descripcion || '—'}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString('es-CL')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn-ghost" style={{ padding: '5px 10px' }} onClick={() => openEdit(item)}><Edit2 size={13} /></button>
                          <button className="btn-ghost" style={{ padding: '5px 10px', color: 'var(--red)', borderColor: 'var(--border-red)' }} onClick={() => handleDelete(item.id)}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
                {selected ? 'EDITAR' : 'NUEVO'} CATEGORÍAS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre..." autoFocus />
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <input value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción opcional..." />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button className="btn-red" onClick={handleSave}>Guardar</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </main>
    </div>
  )
}
