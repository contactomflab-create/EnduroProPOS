'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { Plus, Trash2, ShoppingCart, Search } from 'lucide-react'

interface Variante { id: string; color: string; sku: string; stock: number; tallas: { nombre: string } | null; productos: { nombre: string; precio_venta: number } }
interface CartItem { variante: Variante; cantidad: number; precio: number }
interface Venta { id: string; total: number; nota: string; created_at: string; venta_items: { cantidad: number; precio_unitario: number; variantes: { color: string; sku: string; productos: { nombre: string } } }[] }

export default function Ventas() {
  const [variantes, setVariantes] = useState<Variante[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [search, setSearch] = useState('')
  const [ventas, setVentas] = useState<Venta[]>([])
  const [nota, setNota] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    const [{ data: vars }, { data: vs }] = await Promise.all([
      supabase.from('variantes').select('*, tallas(nombre), productos(nombre, precio_venta)').gt('stock', 0).order('created_at', { ascending: false }),
      supabase.from('ventas').select('*, venta_items(*, variantes(color, sku, productos(nombre)))').order('created_at', { ascending: false }).limit(20),
    ])
    setVariantes((vars as any) || [])
    setVentas((vs as any) || [])
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  const addToCart = (v: Variante) => {
    const existing = cart.find(c => c.variante.id === v.id)
    if (existing) {
      if (existing.cantidad >= v.stock) return showToast('Stock insuficiente', 'error')
      setCart(cart.map(c => c.variante.id === v.id ? { ...c, cantidad: c.cantidad + 1 } : c))
    } else {
      setCart([...cart, { variante: v, cantidad: 1, precio: v.productos.precio_venta }])
    }
  }

  const removeFromCart = (id: string) => setCart(cart.filter(c => c.variante.id !== id))

  const updateCantidad = (id: string, val: number) => {
    const item = cart.find(c => c.variante.id === id)
    if (!item) return
    if (val > item.variante.stock) return showToast('Stock insuficiente', 'error')
    if (val <= 0) return removeFromCart(id)
    setCart(cart.map(c => c.variante.id === id ? { ...c, cantidad: val } : c))
  }

  const total = cart.reduce((s, c) => s + c.cantidad * c.precio, 0)

  const handleVender = async () => {
    if (cart.length === 0) return showToast('Agrega productos al carrito', 'error')
    setLoading(true)
    const { data: venta, error } = await supabase.from('ventas').insert({ total, nota: nota || null }).select().single()
    if (error || !venta) { setLoading(false); return showToast('Error al registrar venta', 'error') }

    await supabase.from('venta_items').insert(cart.map(c => ({ venta_id: venta.id, variante_id: c.variante.id, cantidad: c.cantidad, precio_unitario: c.precio })))

    for (const c of cart) {
      await supabase.from('variantes').update({ stock: c.variante.stock - c.cantidad }).eq('id', c.variante.id)
      await supabase.from('movimientos').insert({ variante_id: c.variante.id, tipo: 'venta', cantidad: c.cantidad, precio_unitario: c.precio, nota: `Venta #${venta.id.slice(0, 8)}` })
    }

    setCart([])
    setNota('')
    setLoading(false)
    showToast(`Venta registrada — Total: $${total.toLocaleString('es-CL')}`, 'success')
    fetchData()
  }

  const filtered = variantes.filter(v =>
    v.productos?.nombre.toLowerCase().includes(search.toLowerCase()) ||
    v.color?.toLowerCase().includes(search.toLowerCase()) ||
    v.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const fmt = (n: number) => `$${Number(n).toLocaleString('es-CL')}`

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 800, marginBottom: 28 }}>VENTAS</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          {/* Productos */}
          <div>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto, color, SKU..." style={{ paddingLeft: 38 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {filtered.map(v => (
                <div key={v.id}
                  onClick={() => addToCart(v)}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--red)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.transform = 'none' }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{v.productos?.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8 }}>{v.color} {v.tallas?.nombre ? `· T.${v.tallas.nombre}` : ''}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--red)', fontWeight: 700, fontSize: 15 }}>{fmt(v.productos?.precio_venta)}</span>
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>Stock: {v.stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Carrito */}
          <div className="card" style={{ position: 'sticky', top: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <ShoppingCart size={18} color="var(--red)" />
              <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700 }}>CARRITO</span>
              <span className="badge badge-red" style={{ marginLeft: 'auto' }}>{cart.length}</span>
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)', fontSize: 13 }}>Selecciona productos</div>
            ) : (
              <>
                {cart.map(c => (
                  <div key={c.variante.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{c.variante.productos?.nombre}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{c.variante.color} {c.variante.tallas?.nombre ? `· T.${c.variante.tallas.nombre}` : ''}</div>
                      </div>
                      <button onClick={() => removeFromCart(c.variante.id)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => updateCantidad(c.variante.id, c.cantidad - 1)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, width: 26, height: 26, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontWeight: 600, width: 24, textAlign: 'center' }}>{c.cantidad}</span>
                        <button onClick={() => updateCantidad(c.variante.id, c.cantidad + 1)} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 4, width: 26, height: 26, cursor: 'pointer', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--red)' }}>{fmt(c.cantidad * c.precio)}</span>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
                  <input value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota (opcional)..." />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, marginTop: 8 }}>
                  <span style={{ fontWeight: 600 }}>Total</span>
                  <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, color: 'var(--red)' }}>{fmt(total)}</span>
                </div>
                <button className="btn-red" style={{ width: '100%', justifyContent: 'center' }} onClick={handleVender} disabled={loading}>
                  <ShoppingCart size={16} /> {loading ? 'Registrando...' : 'Confirmar Venta'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Historial */}
        <div className="card" style={{ marginTop: 32 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>HISTORIAL DE VENTAS</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fecha</th><th>Productos</th><th>Total</th><th>Nota</th></tr></thead>
              <tbody>
                {ventas.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontSize: 12, color: 'var(--text-dim)' }}>{new Date(v.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>
                      {v.venta_items?.map((i: any, idx: number) => (
                        <div key={idx} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.variantes?.productos?.nombre} × {i.cantidad}</div>
                      ))}
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--red)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16 }}>{fmt(v.total)}</td>
                    <td style={{ color: 'var(--text-dim)', fontSize: 13 }}>{v.nota || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </main>
    </div>
  )
}
