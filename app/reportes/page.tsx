'use client'
import { useEffect, useState, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import Toast from '@/components/Toast'
import { supabase } from '@/lib/supabase'
import { Download, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'

export default function Reportes() {
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [stats, setStats] = useState({ ventasSemana: 0, itemsVendidos: 0, productosMasVendidos: [] as any[] })

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  const fetchStats = useCallback(async () => {
    const desde = new Date(); desde.setDate(desde.getDate() - 7)
    const [{ data: ventas }, { data: items }] = await Promise.all([
      supabase.from('ventas').select('total').gte('created_at', desde.toISOString()),
      supabase.from('venta_items').select('cantidad, precio_unitario, variantes(color, sku, productos(nombre))').gte('created_at', desde.toISOString()),
    ])
    const ventasSemana = ventas?.reduce((s: number, v: any) => s + Number(v.total), 0) || 0
    const itemsVendidos = items?.reduce((s: number, i: any) => s + i.cantidad, 0) || 0

    const mapaProductos: Record<string, { nombre: string; cantidad: number; total: number }> = {}
    items?.forEach((i: any) => {
      const nombre = i.variantes?.productos?.nombre || 'Sin nombre'
      if (!mapaProductos[nombre]) mapaProductos[nombre] = { nombre, cantidad: 0, total: 0 }
      mapaProductos[nombre].cantidad += i.cantidad
      mapaProductos[nombre].total += i.cantidad * Number(i.precio_unitario)
    })
    const productosMasVendidos = Object.values(mapaProductos).sort((a, b) => b.cantidad - a.cantidad).slice(0, 10)
    setStats({ ventasSemana, itemsVendidos, productosMasVendidos })
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  const exportarInventario = async () => {
    setLoading(true)
    const { data } = await supabase.from('variantes').select('*, tallas(nombre), productos(nombre, sku, precio_costo, precio_venta, categorias(nombre), marcas(nombre), tipos_producto(nombre))').order('created_at', { ascending: false })

    const rows = (data || []).map((v: any) => ({
      'Producto': v.productos?.nombre || '',
      'SKU Producto': v.productos?.sku || '',
      'SKU Variante': v.sku || '',
      'Código de Barra': v.codigo_barra || '',
      'Categoría': v.productos?.categorias?.nombre || '',
      'Marca': v.productos?.marcas?.nombre || '',
      'Tipo': v.productos?.tipos_producto?.nombre || '',
      'Color': v.color || '',
      'Talla': v.tallas?.nombre || '',
      'Stock': v.stock,
      'Stock Mínimo': v.stock_minimo,
      'Precio Costo': v.productos?.precio_costo || 0,
      'Precio Venta': v.productos?.precio_venta || 0,
      'Valor en Stock': (v.stock * (v.productos?.precio_venta || 0)),
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 16 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
    XLSX.writeFile(wb, `inventario_enduropro_${new Date().toISOString().split('T')[0]}.xlsx`)
    setLoading(false)
    showToast('Inventario exportado', 'success')
  }

  const exportarWooCommerce = async () => {
    setLoading(true)
    const { data } = await supabase.from('variantes').select('*, tallas(nombre), productos(nombre, sku, precio_venta, descripcion, categorias(nombre), marcas(nombre))').order('created_at', { ascending: false })

    const rows = (data || []).map((v: any) => ({
      'ID': '',
      'Type': v.color || v.tallas?.nombre ? 'variation' : 'simple',
      'SKU': v.sku || v.productos?.sku || '',
      'Name': v.productos?.nombre || '',
      'Published': 1,
      'Is featured?': 0,
      'Visibility in catalog': 'visible',
      'Short description': '',
      'Description': v.productos?.descripcion || '',
      'Date sale price starts': '',
      'Date sale price ends': '',
      'Tax status': 'taxable',
      'Tax class': '',
      'In stock?': v.stock > 0 ? 1 : 0,
      'Stock': v.stock,
      'Low stock amount': v.stock_minimo,
      'Backorders allowed?': 0,
      'Sold individually?': 0,
      'Weight (kg)': '',
      'Length (cm)': '',
      'Width (cm)': '',
      'Height (cm)': '',
      'Allow customer reviews?': 1,
      'Purchase note': '',
      'Sale price': '',
      'Regular price': v.productos?.precio_venta || '',
      'Categories': v.productos?.categorias?.nombre || '',
      'Tags': v.productos?.marcas?.nombre || '',
      'Shipping class': '',
      'Images': '',
      'Download limit': '',
      'Download expiry days': '',
      'Parent': '',
      'Grouped products': '',
      'Upsells': '',
      'Cross-sells': '',
      'External URL': '',
      'Button text': '',
      'Position': 0,
      'Attribute 1 name': v.color ? 'Color' : '',
      'Attribute 1 value(s)': v.color || '',
      'Attribute 1 visible': v.color ? 1 : '',
      'Attribute 1 global': v.color ? 1 : '',
      'Attribute 2 name': v.tallas?.nombre ? 'Talla' : '',
      'Attribute 2 value(s)': v.tallas?.nombre || '',
      'Attribute 2 visible': v.tallas?.nombre ? 1 : '',
      'Attribute 2 global': v.tallas?.nombre ? 1 : '',
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'WooCommerce Import')
    XLSX.writeFile(wb, `woocommerce_import_${new Date().toISOString().split('T')[0]}.csv`)
    setLoading(false)
    showToast('CSV WooCommerce generado', 'success')
  }

  const exportarVentas = async () => {
    setLoading(true)
    const { data } = await supabase.from('venta_items').select('*, variantes(color, sku, tallas(nombre), productos(nombre, marcas(nombre))), ventas(total, nota, created_at)').order('created_at', { ascending: false })

    const rows = (data || []).map((i: any) => ({
      'Fecha': new Date((i.ventas as any)?.created_at).toLocaleString('es-CL'),
      'Producto': i.variantes?.productos?.nombre || '',
      'Marca': i.variantes?.productos?.marcas?.nombre || '',
      'Color': i.variantes?.color || '',
      'Talla': i.variantes?.tallas?.nombre || '',
      'SKU': i.variantes?.sku || '',
      'Cantidad': i.cantidad,
      'Precio Unitario': i.precio_unitario,
      'Subtotal': i.cantidad * Number(i.precio_unitario),
      'Nota': (i.ventas as any)?.nota || '',
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas')
    XLSX.writeFile(wb, `ventas_enduropro_${new Date().toISOString().split('T')[0]}.xlsx`)
    setLoading(false)
    showToast('Reporte de ventas exportado', 'success')
  }

  const fmt = (n: number) => `$${Number(n).toLocaleString('es-CL')}`

  const reportCards = [
    {
      title: 'INVENTARIO COMPLETO',
      desc: 'Todos los productos con variantes, stock y precios. Listo para revisar.',
      btn: 'Descargar Excel',
      fn: exportarInventario,
      color: '#3b82f6',
    },
    {
      title: 'IMPORTAR A WOOCOMMERCE',
      desc: 'CSV en el formato exacto que pide WooCommerce para cargar todos los productos.',
      btn: 'Descargar CSV',
      fn: exportarWooCommerce,
      color: '#8b5cf6',
    },
    {
      title: 'REPORTE DE VENTAS',
      desc: 'Historial completo de ventas con detalle por producto, cantidad y precio.',
      btn: 'Descargar Excel',
      fn: exportarVentas,
      color: '#22c55e',
    },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '32px', overflow: 'auto' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 32, fontWeight: 800, marginBottom: 8 }}>REPORTES</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 32 }}>Exporta inventario, ventas y datos para WooCommerce</div>

        {/* Stats semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Ventas esta semana', value: fmt(stats.ventasSemana), color: 'var(--red)' },
            { label: 'Unidades vendidas', value: stats.itemsVendidos, color: '#22c55e' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 30, fontWeight: 800, fontFamily: "'Barlow Condensed', sans-serif", color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>últimos 7 días</div>
            </div>
          ))}
        </div>

        {/* Export cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
          {reportCards.map(r => (
            <div key={r.title} className="card" style={{ borderTop: `2px solid ${r.color}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                <div style={{ background: `${r.color}15`, borderRadius: 8, padding: 10 }}>
                  <FileSpreadsheet size={20} color={r.color} />
                </div>
                <div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700 }}>{r.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{r.desc}</div>
                </div>
              </div>
              <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={r.fn} disabled={loading}>
                <Download size={14} /> {loading ? 'Generando...' : r.btn}
              </button>
            </div>
          ))}
        </div>

        {/* Más vendidos */}
        {stats.productosMasVendidos.length > 0 && (
          <div className="card">
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>MÁS VENDIDOS (ÚLTIMA SEMANA)</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Producto</th><th>Unidades</th><th>Total</th></tr></thead>
                <tbody>
                  {stats.productosMasVendidos.map((p, i) => (
                    <tr key={p.nombre}>
                      <td style={{ color: 'var(--text-dim)', fontWeight: 700 }}>#{i + 1}</td>
                      <td style={{ fontWeight: 500 }}>{p.nombre}</td>
                      <td><span className="badge badge-red">{p.cantidad} u.</span></td>
                      <td style={{ fontWeight: 700, color: 'var(--red)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15 }}>{fmt(p.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </main>
    </div>
  )
}
