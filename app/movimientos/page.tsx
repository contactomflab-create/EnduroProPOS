'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface Variante { id: string; color: string; sku: string; productos: { nombre: string } }
interface Movimiento { id: string; tipo: string; cantidad: number; precio_unitario: number; nota: string; created_at: string; variantes: Variante }

export default function Movimientos() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({ variante_id: '', tipo: 'entrada', cantidad: '', precio_unitario: '', nota: '' })

  const fetchData = useCallback(async () => {
    const [{ data: movs }, { data: vars }] = await Promise.all([
      supabase.from('movimientos').select('*, variantes(id, color, sku, productos(nombre))').order('created_at', { ascending: false }).limit(100),
      supabase.from('variantes').select('id, color, sku, stock, productos(nombre)').order('created_at', { ascending: false }),
    ])
    setMovimientos((movs as any) || [])
    setVariantes((vars as any) || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  const handleSave = async () => {
    if (!form.variante_id || !form.cantidad) return showToast('Variante y cantidad son requeridos', 'error')
    const cantidad = Number(form.cantidad)
    const { error } = await supabase.from('movimientos').insert({ variante_id: form.variante_id, tipo: form.tipo, cantidad, precio_unitario: Number(form.precio_unitario) || null, nota: form.nota || null })
    if (error) return showToast('Error al registrar', 'error')

    const varData = variantes.find(v => v.id === form.variante_id) as any
    if (varData) {
      const delta = form.tipo === 'entrada' ? cantidad : -cantidad
      await supabase.from('variantes').update({ stock: (varData.stock || 0) + delta }).eq('id', form.variante_id)
    }

    showToast('Movimiento registrado', 'success')
    setShowModal(false)
    setForm({ variante_id: '', tipo: 'entrada', cantidad: '', precio_unitario: '', nota: '' })
    fetchData()
  }

  const tipoColor: Record<string, string> = { entrada: 'badge-green', salida: 'badge-red', venta: 'badge-red', ajuste: 'badge-yellow' }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 800 }}>MOVIMIENTOS DE STOCK</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Historial de entradas, salidas y ventas</div>
          </div>
          <button className="btn-red" onClick={() => setShowModal(true)}><Plus size={16} /> Registrar Movimiento</button>
        </div>

        <div className="card" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Cargando...</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Precio Unit.</th><th>Nota</th><th>Fecha</th></tr></thead>
                <tbody>
                  {movimientos.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{(m.variantes as any)?.productos?.nombre || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{(m.variantes as any)?.color} · {(m.variantes as any)?.sku}</div>
                      </td>
                      <td><span className={`badge ${tipoColor[m.tipo] || 'badge-gray'}`}>{m.tipo === 'entrada' ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}{m.tipo}</span></td>
                      <td style={{ fontWeight: 700, color: m.tipo === 'entrada' ? '#22c55e' : 'var(--red)' }}>{m.tipo === 'entrada' ? '+' : '-'}{m.cantidad}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{m.precio_unitario ? `$${Number(m.precio_unitario).toLocaleString('es-CL')}` : '—'}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{m.nota || '—'}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{new Date(m.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 24 }}>NUEVO MOVIMIENTO</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label>Variante / Producto *</label>
                  <select value={form.variante_id} onChange={e => setForm({ ...form, variante_id: e.target.value })}>
                    <option value="">Seleccionar...</option>
                    {variantes.map((v: any) => <option key={v.id} value={v.id}>{v.productos?.nombre} — {v.color} (Stock: {v.stock})</option>)}
                  </select>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Tipo *</label>
                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                      <option value="entrada">Entrada (recepción)</option>
                      <option value="salida">Salida (pérdida/devolución)</option>
                      <option value="ajuste">Ajuste de inventario</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Cantidad *</label>
                    <input type="number" value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} placeholder="0" min="1" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Precio Unitario</label>
                  <input type="number" value={form.precio_unitario} onChange={e => setForm({ ...form, precio_unitario: e.target.value })} placeholder="Opcional" />
                </div>
                <div className="form-group">
                  <label>Nota</label>
                  <input value={form.nota} onChange={e => setForm({ ...form, nota: e.target.value })} placeholder="Ej: Recepción proveedor Fox..." />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button className="btn-red" onClick={handleSave}>Registrar</button>
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
