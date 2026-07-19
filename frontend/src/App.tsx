import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/store/authStore'
import { canView, firstVisibleArea, AREA_ROUTE } from '@/lib/permissions'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/components/sections/LoginPage'
import DashboardPage from '@/components/sections/DashboardPage'
import ComunicadosPage from '@/components/sections/ComunicadosPage'
import RegistrarAcaoPage from '@/components/sections/RegistrarAcaoPage'
import HistoricoPage from '@/components/sections/HistoricoPage'
import EstatisticasPage from '@/components/sections/EstatisticasPage'
import MembrosPage from '@/components/sections/MembrosPage'
import AusenciasPage from '@/components/sections/AusenciasPage'
import BauPage from '@/components/sections/BauPage'
import HistoricoBauPage from '@/components/sections/HistoricoBauPage'
import EstoquePage from '@/components/sections/EstoquePage'
import BauGerenciaPage from '@/components/sections/BauGerenciaPage'
import HistoricoBauGerenciaPage from '@/components/sections/HistoricoBauGerenciaPage'
import EstoqueGerenciaPage from '@/components/sections/EstoqueGerenciaPage'
import TabletPage from '@/components/sections/TabletPage'
import HistoricoTabletPage from '@/components/sections/HistoricoTabletPage'
import VendasPage from '@/components/sections/VendasPage'
import HistoricoVendasPage from '@/components/sections/HistoricoVendasPage'
import EstoqueMunicaoPage from '@/components/sections/EstoqueMunicaoPage'
import ConfiguracoesPage from '@/components/sections/ConfiguracoesPage'

function destinoInicial(user: ReturnType<typeof useAuthStore.getState>['user']): string {
  const area = firstVisibleArea(user)
  return area ? AREA_ROUTE[area] : '/sem-acesso'
}

function ProtectedRoute({ children, area }: { children: React.ReactNode; area?: string }) {
  const { token, user } = useAuthStore()
  if (!token || !user) return <Navigate to="/login" replace />
  if (area && !canView(user, area)) {
    const destino = destinoInicial(user)
    return destino === '/sem-acesso' ? <SemAcesso /> : <Navigate to={destino} replace />
  }
  return <>{children}</>
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore()
  if (token && user) return <Navigate to={destinoInicial(user)} replace />
  return <>{children}</>
}

function RootRedirect() {
  const { user } = useAuthStore()
  const destino = destinoInicial(user)
  return destino === '/sem-acesso' ? <SemAcesso /> : <Navigate to={destino} replace />
}

function SemAcesso() {
  const { logout } = useAuthStore()
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="font-orbitron text-sm text-gold tracking-widest">SEM ÁREAS LIBERADAS</p>
      <p className="font-mono text-xs text-txt2 max-w-sm">
        Sua conta não tem nenhuma área liberada. Contate um administrador.
      </p>
      <button onClick={() => logout()} className="font-mono text-xs text-txt3 hover:text-red transition-colors">
        Sair
      </button>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={
            <PublicRoute><LoginPage /></PublicRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute><AppShell /></ProtectedRoute>
          }>
            <Route index element={<RootRedirect />} />
            <Route path="dashboard" element={<ProtectedRoute area="dashboard"><DashboardPage /></ProtectedRoute>} />
            <Route path="comunicados" element={<ProtectedRoute area="comunicados"><ComunicadosPage /></ProtectedRoute>} />
            <Route path="acoes/nova" element={<ProtectedRoute area="registrar"><RegistrarAcaoPage /></ProtectedRoute>} />
            <Route path="acoes/historico" element={<ProtectedRoute area="historico"><HistoricoPage /></ProtectedRoute>} />
            <Route path="estatisticas" element={<ProtectedRoute area="estatisticas"><EstatisticasPage /></ProtectedRoute>} />
            <Route path="membros" element={<ProtectedRoute area="membros"><MembrosPage /></ProtectedRoute>} />
            <Route path="ausencias" element={<ProtectedRoute area="ausencias"><AusenciasPage /></ProtectedRoute>} />
            <Route path="bau" element={<ProtectedRoute area="bau"><BauPage /></ProtectedRoute>} />
            <Route path="bau/historico" element={<ProtectedRoute area="historicoBau"><HistoricoBauPage /></ProtectedRoute>} />
            <Route path="estoque" element={<ProtectedRoute area="estoque"><EstoquePage /></ProtectedRoute>} />
            <Route path="gerencia/bau" element={<ProtectedRoute area="bauGerencia"><BauGerenciaPage /></ProtectedRoute>} />
            <Route path="gerencia/historico" element={<ProtectedRoute area="historicoBauGerencia"><HistoricoBauGerenciaPage /></ProtectedRoute>} />
            <Route path="gerencia/estoque" element={<ProtectedRoute area="estoqueGerencia"><EstoqueGerenciaPage /></ProtectedRoute>} />
            <Route path="tablet" element={<ProtectedRoute area="tablet"><TabletPage /></ProtectedRoute>} />
            <Route path="tablet/historico" element={<ProtectedRoute area="historicoTablet"><HistoricoTabletPage /></ProtectedRoute>} />
            <Route path="vendas" element={<ProtectedRoute area="vendas"><VendasPage /></ProtectedRoute>} />
            <Route path="vendas/historico" element={<ProtectedRoute area="historicoVendas"><HistoricoVendasPage /></ProtectedRoute>} />
            <Route path="vendas/estoque" element={<ProtectedRoute area="estoqueMunicao"><EstoqueMunicaoPage /></ProtectedRoute>} />
            <Route path="configuracoes" element={<ProtectedRoute area="configuracoes"><ConfiguracoesPage /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
