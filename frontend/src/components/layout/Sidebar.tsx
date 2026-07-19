import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, PlusCircle, History, BarChart2,
  Users, Settings, Archive, Package, ClipboardList, CalendarOff,
  Wallet, Receipt, Megaphone,
  Crown, ShoppingCart,
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useLogo } from '@/hooks/useConfig'
import { canView } from '@/lib/permissions'
import ArabiaEmblem from '@/components/ui/ArabiaEmblem'

type NavItem = {
  to: string
  icon: React.ElementType
  label: string
  area: string
}

const NAV_SECTIONS: { section: string; items: NavItem[] }[] = [
  {
    section: 'OPERACOES',
    items: [
      { to: '/dashboard',       icon: LayoutDashboard, label: 'DASHBOARD',        area: 'dashboard' },
      { to: '/comunicados',     icon: Megaphone,       label: 'COMUNICADOS',      area: 'comunicados' },
      { to: '/acoes/nova',      icon: PlusCircle,      label: 'REGISTRAR ACAO',   area: 'registrar' },
      { to: '/acoes/historico', icon: History,         label: 'HISTORICO',        area: 'historico' },
      { to: '/estatisticas',    icon: BarChart2,       label: 'ESTATISTICAS',     area: 'estatisticas' },
    ],
  },
  {
    section: 'PESSOAL',
    items: [
      { to: '/membros',       icon: Users,         label: 'MEMBROS',       area: 'membros' },
      { to: '/ausencias',     icon: CalendarOff,   label: 'AUSENCIAS',     area: 'ausencias' },
      { to: '/bau',           icon: Archive,       label: 'BAU',           area: 'bau' },
      { to: '/bau/historico', icon: ClipboardList, label: 'HISTORICO BAU', area: 'historicoBau' },
      { to: '/estoque',       icon: Package,       label: 'ESTOQUE',       area: 'estoque' },
    ],
  },
  {
    section: 'GERENCIA',
    items: [
      { to: '/gerencia/bau',       icon: Crown,         label: 'BAU GERENCIA',       area: 'bauGerencia' },
      { to: '/gerencia/historico', icon: ClipboardList, label: 'HISTORICO GERENCIA', area: 'historicoBauGerencia' },
      { to: '/gerencia/estoque',   icon: Package,       label: 'ESTOQUE GERENCIA',   area: 'estoqueGerencia' },
    ],
  },
  {
    section: 'TABLET',
    items: [
      { to: '/tablet',           icon: Wallet,  label: 'SAQUE / DEPOSITO', area: 'tablet' },
      { to: '/tablet/historico', icon: Receipt, label: 'HISTORICO TABLET', area: 'historicoTablet' },
    ],
  },
  {
    section: 'VENDAS',
    items: [
      { to: '/vendas',           icon: ShoppingCart, label: 'NOVA VENDA',       area: 'vendas' },
      { to: '/vendas/historico', icon: Receipt,      label: 'HISTORICO VENDAS', area: 'historicoVendas' },
      { to: '/vendas/estoque',   icon: Package,      label: 'ESTOQUE MUNICAO',  area: 'estoqueMunicao' },
    ],
  },
  {
    section: 'SISTEMA',
    items: [
      { to: '/configuracoes', icon: Settings, label: 'CONFIGURACOES', area: 'configuracoes' },
    ],
  },
]

export default function Sidebar() {
  const { user } = useAuthStore()
  const { data: logoData } = useLogo()

  const canSee = (item: NavItem) => canView(user, item.area)

  return (
    <aside className="arb-sidebar">
      <div className="sidebar-arabesque">
        <svg width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
          <rect width="100%" height="100%" fill="url(#arabesque)" />
        </svg>
      </div>

      <div className="sidebar-header">
        <div className="logo-ring" style={{ width: 68, height: 68, position: 'relative' }}>
          <div className="ring-outer" />
          {logoData?.logo ? (
            <img src={logoData.logo} alt="Logo" className="logo-circle" />
          ) : (
            <ArabiaEmblem size={40} />
          )}
        </div>
        <div className="white-rule" />
        <p className="org-name">ARÁBIA</p>
        <p className="org-sub">SISTEMA INTERNO</p>
      </div>

      <nav className="arb-nav">
        {NAV_SECTIONS.map(({ section, items }) => {
          const visible = items.filter(canSee)
          if (visible.length === 0) return null
          return (
            <div key={section}>
              <div className="nav-section">{section}</div>
              {visible.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  <item.icon className="nav-icon" size={14} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="status-dot" />
        <span className="footer-txt">ONLINE</span>
        <span className="footer-ver">v3.0</span>
      </div>
    </aside>
  )
}
