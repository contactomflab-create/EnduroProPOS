'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, Tags, Truck, Ruler, BarChart3, ShoppingCart, Menu, X, Layers, TrendingDown, LogOut } from 'lucide-react'
import { createSupabaseBrowser } from '@/lib/supabase-browser'

const nav = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/inventario', icon: Package, label: 'Inventario' },
  { href: '/ventas', icon: ShoppingCart, label: 'Ventas' },
  { href: '/movimientos', icon: TrendingDown, label: 'Movimientos' },
  { href: '/categorias', icon: Tags, label: 'Categorías' },
  { href: '/marcas', icon: Truck, label: 'Marcas' },
  { href: '/tallas', icon: Ruler, label: 'Tallas' },
  { href: '/tipos', icon: Layers, label: 'Tipos' },
  { href: '/reportes', icon: BarChart3, label: 'Reportes' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    const supabase = createSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 200,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--text)',
          display: 'none'
        }}
        className="mobile-toggle"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 150, display: 'none' }}
          className="mobile-overlay"
        />
      )}

      <aside style={{
        width: 220, minHeight: '100vh',
        background: 'var(--bg2)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, flexShrink: 0,
      }}>
        <div style={{ padding: '28px 20px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '0.05em', color: 'white', lineHeight: 1 }}>
            ENDURO<span style={{ color: 'var(--red)' }}>PRO</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Sistema de Tienda
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 10px' }}>
          {nav.map(({ href, icon: Icon, label }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} style={{ textDecoration: 'none' }} onClick={() => setOpen(false)}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, marginBottom: 2,
                  background: active ? 'rgba(224,31,31,0.12)' : 'transparent',
                  color: active ? 'var(--red)' : 'var(--text-muted)',
                  borderLeft: active ? '2px solid var(--red)' : '2px solid transparent',
                  transition: 'all 0.15s', cursor: 'pointer',
                  fontSize: 14, fontWeight: active ? 600 : 400,
                }}>
                  <Icon size={16} />{label}
                </div>
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8, width: '100%',
              background: 'transparent', border: 'none',
              color: 'var(--text-dim)', cursor: 'pointer',
              fontSize: 14, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--red)'; (e.currentTarget as HTMLElement).style.background = 'rgba(224,31,31,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-dim)'; (e.currentTarget as HTMLElement).style.background = 'transparent' }}
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', padding: '8px 12px 0' }}>MFLab © 2025</div>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .mobile-toggle { display: flex !important; }
          .mobile-overlay { display: block !important; }
        }
      `}</style>
    </>
  )
}
