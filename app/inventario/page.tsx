'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronRight, Package } from 'lucide-react'

interface Categoria { id: string; nombre: string }
interface Marca { id: string; nombre: string }
interface Talla { id: string; nombre: string }
interface Tipo { id: string; nombre: string }
interface Variante { id: string; color: string; sku: string; codigo_barra: string; stock: number; stock_minimo: number; tallas: { nombre: string } | null }
interface Producto {
  id: string; nombre: string; sku: string; codigo_barra: string; descripcion: string
  precio_costo: number; precio_venta: number; created_at: string
  categorias: { nombre: string } | null
  marcas: { nombre: string } | null
  tipos_producto: { nombre: string } | null
  variantes: Variante[]
}

export default function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [marcas, setMarcas] = useState<Marca[]>([])
  const [tallas, setTallas] = useState<Talla[]>([])
  const [tipos, setTipos] = useState<Tipo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [showVarianteModal, setShowVarianteModal] = useState(false)
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [form, setForm] = useState({ nombre: '', sku: '', codigo_barra: '', descripcion: '', precio_costo: '', precio_venta: '', categoria_id: '', marca_id: '', tipo_id: '' })
  const [varForm, setVarForm] = useState({ color: '', sku: '', codigo_barra: '', stock: '', stock_minimo: '2', talla_id: '' })

  const fetchProductos = useCallback(async () => {
    const { data } = await supabase.from('productos').select(`*, categorias(nombre), marcas(nombre), tipos_producto(nombre), variantes(*, tallas(nombre))`).order('created_at', { ascending: false })
    setProductos((data as any) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProductos()
    Promise.all([
      supabase.from('categorias').select('*').order('nombre'),
      supabase.from('marcas').select('*').order('nombre'),
      supabase.from('tallas').select('*').order('nombre'),
      supabase.from('tipos_producto').select('*').order('nombre'),
    ]).then(([c, m, t, ti]) => {
      setCategorias((c.data as any) || [])
      setMarcas((m.data as any) || [])
      setTallas((t.data as any) || [])
      setTipos((ti.data as any) || [])
    })
  }, [fetchProductos])

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  const toggleExpand = (id: string) => {
    const next = new Set(expanded)
    next.has(id) ? next.delete(id) : next.add(id)
    setExpanded(next)
  }

  const openEdit = (p: Producto) => {
    setSelectedProducto(p)
    setForm({ nombre: p.nombre, sku: p.sku || '', codigo_barra: p.codigo_barra || '', descripcion: p.descripcion || '', precio_costo: String(p.precio_costo), precio_venta: String(p.precio_venta), categoria_id: '', marca_id: '', tipo_id: '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.nombre) return showToast('El nombre es obligatorio', 'error')
    const payload: any = { nombre: form.nombre, sku: form.sku || null, codigo_barra: form.codigo_barra || null, descripcion: form.descripcion || null, precio_costo: Number(form.precio_costo) || 0, precio_venta: Number(form.precio_venta) || 0 }
    if (form.categoria_id) payload.categoria_id = form.categoria_id
    if (form.marca_id) payload.marca_id = form.marca_id
    if (form.tipo_id) payload.tipo_id = form.tipo_id

    if (selectedProducto) {
      const { error } = await supabase.from('productos').update(payload).eq('id', selectedProducto.id)
      if (error) return showToast('Error al actualizar', 'error')
      showToast('Producto actualizado', 'success')
    } else {
      const { error } = await supabase.from('productos').insert(payload)
      if (error) return showToast('Error al crear producto', 'error')
      showToast('Producto creado', 'success')
    }
    setShowModal(false)
    setSelectedProducto(null)
    setForm({ nombre: '', sku: '', codigo_barra: '', descripcion: '', precio_costo: '', precio_venta: '', categoria_id: '', marca_id: '', tipo_id: '' })
    fetchProductos()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto y todas sus variantes?')) return
    await supabase.from('productos').delete().eq('id', id)
    showToast('Producto eliminado', 'success')
    fetchProductos()
  }

  const handleSaveVariante = async () => {
    if (!selectedProducto) return
    const payload: any = { producto_id: selectedProducto.id, color: varForm.color || null, sku: varForm.sku || null, codigo_barra: varForm.codigo_barra || null, stock: Number(varForm.stock) || 0, stock_minimo: Number(varForm.stock_minimo) || 2 }
    if (varForm.talla_id) payload.talla_id = varForm.talla_id
    const { error } = await supabase.from('variantes').insert(payload)
    if (error) return showToast('Error al crear variante', 'error')

    // Registrar movimiento de entrada si hay stock inicial
    if (Number(varForm.stock) > 0) {
      const { data: varData } = await supabase.from('variantes').select('id').eq('producto_id', selectedProducto.id).eq('color', varForm.color || '').order('created_at', { ascending: false }).limit(1)
      if (varData?.[0]) {
        await supabase.from('movimientos').insert({ variante_id: varData[0].id, tipo: 'entrada', cantidad: Number(varForm.stock), nota: 'Stock inicial' })
      }
    }

    showToast('Variante agregada', 'success')
    setShowVarianteModal(false)
    setVarForm({ color: '', sku: '', codigo_barra: '', stock: '', stock_minimo: '2', talla_id: '' })
    fetchProductos()
  }

  const filtered = productos.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase()) ||
    p.marcas?.nombre.toLowerCase().includes(search.toLowerCase()) ||
    p.variantes?.some(v => v.codigo_barra?.includes(search))
  )

  const fmt = (n: number) => `$${Number(n).toLocaleString('es-CL')}`

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: '0.02em' }}>INVENTARIO</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{filtered.length} productos registrados</div>
          </div>
          <button className="btn-red" onClick={() => { setSelectedProducto(null); setForm({ nombre: '', sku: '', codigo_barra: '', descripcion: '', precio_costo: '', precio_venta: '', categoria_id: '', marca_id: '', tipo_id: '' }); setShowModal(true) }}>
            <Plus size={16} /> Nuevo Producto
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, SKU, marca, código de barra..." style={{ paddingLeft: 38 }} />
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Cargando inventario...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
            <Package size={40} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <div>No hay productos. ¡Agrega el primero!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(p => {
              const isOpen = expanded.has(p.id)
              const totalStock = p.variantes?.reduce((s, v) => s + v.stock, 0) || 0
              const stockBajo = p.variantes?.some(v => v.stock <= v.stock_minimo)

              return (
                <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Header del producto */}
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer' }}
                    onClick={() => toggleExpand(p.id)}
                  >
                    <div style={{ color: 'var(--text-dim)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                      <ChevronDown size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{p.nombre}</span>
                        {p.marcas && <span className="badge badge-gray">{p.marcas.nombre}</span>}
                        {p.categorias && <span className="badge badge-gray">{p.categorias.nombre}</span>}
                        {stockBajo && <span className="badge badge-yellow">⚠ Stock bajo</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                        {p.sku && `SKU: ${p.sku} · `}{p.variantes?.length || 0} variantes · Stock total: {totalStock} · Venta: {fmt(p.precio_venta)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                      <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => { setSelectedProducto(p); setShowVarianteModal(true) }}>
                        <Plus size={14} /> Variante
                      </button>
                      <button className="btn-ghost" style={{ padding: '6px 10px' }} onClick={() => openEdit(p)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn-ghost" style={{ padding: '6px 10px', color: 'var(--red)', borderColor: 'var(--border-red)' }} onClick={() => handleDelete(p.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Variantes */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '12px 20px 16px' }}>
                      {p.variantes?.length === 0 ? (
                        <div style={{ color: 'var(--text-dim)', fontSize: 13, textAlign: 'center', padding: 16 }}>Sin variantes — agrega color/talla</div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                          {p.variantes?.map(v => (
                            <div key={v.id} style={{
                              background: 'var(--bg3)',
                              border: `1px solid ${v.stock <= v.stock_minimo ? 'rgba(234,179,8,0.3)' : 'var(--border)'}`,
                              borderRadius: 8,
                              padding: '10px 14px',
                            }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{v.color || 'Sin color'} {v.tallas?.nombre ? `· T.${v.tallas.nombre}` : ''}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{v.sku || v.codigo_barra || '—'}</div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                                <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", color: v.stock <= v.stock_minimo ? '#eab308' : '#22c55e' }}>{v.stock}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>mín: {v.stock_minimo}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Modal Producto */}
        {showModal && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
                {selectedProducto ? 'EDITAR PRODUCTO' : 'NUEVO PRODUCTO'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label>Nombre *</label>
                  <input value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Ej: Tricota Fox Ranger" />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>SKU</label>
                    <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="Ej: EP-FOX-RNG" />
                  </div>
                  <div className="form-group">
                    <label>Código de Barra</label>
                    <input value={form.codigo_barra} onChange={e => setForm({ ...form, codigo_barra: e.target.value })} placeholder="Escanear o escribir" />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Precio Costo</label>
                    <input type="number" value={form.precio_costo} onChange={e => setForm({ ...form, precio_costo: e.target.value })} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Precio Venta</label>
                    <input type="number" value={form.precio_venta} onChange={e => setForm({ ...form, precio_venta: e.target.value })} placeholder="0" />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Categoría</label>
                    <select value={form.categoria_id} onChange={e => setForm({ ...form, categoria_id: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Marca</label>
                    <select value={form.marca_id} onChange={e => setForm({ ...form, marca_id: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Tipo</label>
                    <select value={form.tipo_id} onChange={e => setForm({ ...form, tipo_id: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {tipos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Descripción</label>
                  <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} placeholder="Descripción del producto..." />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn-ghost" onClick={() => setShowModal(false)}>Cancelar</button>
                  <button className="btn-red" onClick={handleSave}>Guardar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Variante */}
        {showVarianteModal && selectedProducto && (
          <div className="modal-overlay" onClick={() => setShowVarianteModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>NUEVA VARIANTE</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>{selectedProducto.nombre}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Color</label>
                    <input value={varForm.color} onChange={e => setVarForm({ ...varForm, color: e.target.value })} placeholder="Ej: Negro, Rojo..." />
                  </div>
                  <div className="form-group">
                    <label>Talla</label>
                    <select value={varForm.talla_id} onChange={e => setVarForm({ ...varForm, talla_id: e.target.value })}>
                      <option value="">Sin talla</option>
                      {tallas.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>SKU variante</label>
                    <input value={varForm.sku} onChange={e => setVarForm({ ...varForm, sku: e.target.value })} placeholder="Ej: EP-FOX-NEG-M" />
                  </div>
                  <div className="form-group">
                    <label>Código de Barra</label>
                    <input value={varForm.codigo_barra} onChange={e => setVarForm({ ...varForm, codigo_barra: e.target.value })} placeholder="Escanear o escribir" />
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Stock inicial</label>
                    <input type="number" value={varForm.stock} onChange={e => setVarForm({ ...varForm, stock: e.target.value })} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Stock mínimo</label>
                    <input type="number" value={varForm.stock_minimo} onChange={e => setVarForm({ ...varForm, stock_minimo: e.target.value })} placeholder="2" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button className="btn-ghost" onClick={() => setShowVarianteModal(false)}>Cancelar</button>
                  <button className="btn-red" onClick={handleSaveVariante}>Agregar Variante</button>
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
