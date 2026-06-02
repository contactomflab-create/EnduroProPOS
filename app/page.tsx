'use client'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabase'
import { Package, TrendingDown, ShoppingCart, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface Stats {
  totalProductos: number
  totalVariantes: number
  stockBajo: number
  ventasHoy: number
  movimientosHoy: number
  valorInventario: number
}

interface Movimiento {
  id: string
  tipo: string
  cantidad: number
  nota: string
  created_at: string
  variantes: { sku: string; color: string; productos: { nombre: string } }
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({ totalProductos: 0, totalVariantes: 0, stockBajo: 0, ventasHoy: 0, movimientosHoy: 0, valorInventario: 0 })
  const [movRecientes, setMovRecientes] = useState<Movimiento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    const [{ count: prods }, { count: vars }, { data: variantes }, { data: ventas }, { data: movs }] = await Promise.all([
      supabase.from('productos').select('*', { count: 'exact', head: true }),
      supabase.from('variantes').select('*', { count: 'exact', head: true }),
      supabase.from('variantes').select('stock, stock_minimo, precio_venta:producto_id(precio_venta)'),
      supabase.from('ventas').select('total').gte('created_at', new Date().toISOString().split('T')[0]),
      supabase.from('movimientos').select('*, variantes(sku, color, productos(nombre))').order('created_at', { ascending: false }).limit(8),
    ])

    const stockBajo = variantes?.filter((v: any) => v.stock <= v.stock_minimo).length || 0
    const ventasHoy = ventas?.reduce((sum: number, v: any) => sum + Number(v.total), 0) || 0
    const valorInventario = variantes?.reduce((sum: number, v: any) => sum + (v.stock * (v.precio_venta?.precio_venta || 0)), 0) || 0

    setStats({
      totalProductos: prods || 0,
      totalVariantes: vars || 0,
      stockBajo,
      ventasHoy,
      movimientosHoy: movs?.length || 0,
      valorInventario,
    })
    setMovRecientes((movs as any) || [])
    setLoading(false)
  }

  const fmt = (n: number) => `$${n.toLocaleString('es-CL')}`

  const statCards = [
    { label: 'Productos', value: stats.totalProductos, icon: Package, color: '#e01f1f', sub: `${stats.totalVariantes} variantes` },
    { label: 'Stock Bajo', value: stats.stockBajo, icon: AlertTriangle, color: '#eab308', sub: 'por reposición' },
    { label: 'Ventas Hoy', value: fmt(stats.ventasHoy), icon: ShoppingCart, color: '#22c55e', sub: 'ingresos del día' },
    { label: 'Valor Inventario', value: fmt(stats.valorInventario), icon: TrendingDown, color: '#3b82f6', sub: 'precio venta total' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 800, letterSpacing: '0.02em', color: 'white' }}>
            DASHBOARD
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {statCards.map((s) => (
            <div key={s.label} className="stat-card" style={{ '--red': s.color } as any}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: 'white', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.02em' }}>{loading ? '—' : s.value}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>{s.sub}</div>
                </div>
                <div style={{ background: `${s.color}18`, borderRadius: 8, padding: 10 }}>
                  <s.icon size={20} color={s.color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Movimientos recientes */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: '0.05em' }}>
              MOVIMIENTOS RECIENTES
            </div>
          </div>
          {loading ? (
            <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 40 }}>Cargando...</div>
          ) : movRecientes.length === 0 ? (
            <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: 40 }}>Sin movimientos aún</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Nota</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {movRecientes.map((m: any) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{m.variantes?.productos?.nombre || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{m.variantes?.color} · {m.variantes?.sku}</div>
                      </td>
                      <td>
                        <span className={`badge ${m.tipo === 'venta' || m.tipo === 'salida' ? 'badge-red' : 'badge-green'}`}>
                          {m.tipo === 'venta' || m.tipo === 'salida' ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}
                          {m.tipo}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{m.tipo === 'venta' || m.tipo === 'salida' ? '-' : '+'}{m.cantidad}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{m.nota || '—'}</td>
                      <td style={{ color: 'var(--text-dim)', fontSize: 12 }}>{new Date(m.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
