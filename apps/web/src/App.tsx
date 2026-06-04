import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider }     from './shared/auth/AuthContext'
import { BuildingProvider } from './shared/building/BuildingContext'
import { AuthGuard }        from './shared/auth/AuthGuard'
import LoginPage            from './features/auth/LoginPage'
import AuthCallbackPage     from './features/auth/AuthCallbackPage'
import OnboardingPage       from './features/onboarding/OnboardingPage'
import DashboardPage        from './features/dashboard/DashboardPage'
import BuildingsPage        from './features/buildings/BuildingsPage'
import BuildingProfilePage  from './features/buildings/BuildingProfilePage'
import OwnersPage           from './features/owners/OwnersPage'
import ChargesPage          from './features/charges/ChargesPage'
import ExpensesPage         from './features/accounting/ExpensesPage'
import IncomePage           from './features/accounting/IncomePage'
import BilanPage            from './features/accounting/BilanPage'
import BudgetPage           from './features/accounting/BudgetPage'
import SettingsPage         from './features/settings/SettingsPage'
import TicketsPage          from './features/tickets/TicketsPage'
import InsurancePage        from './features/insurance/InsurancePage'
import ContractorsPage      from './features/contractors/ContractorsPage'
import LetterTemplatesPage  from './features/letter-templates/LetterTemplatesPage'
import DocumentsPage        from './features/documents/DocumentsPage'
import InboxPage            from './features/inbox/InboxPage'
import TimelinePage         from './features/timeline/TimelinePage'
import RoadmapPage          from './features/roadmap/RoadmapPage'
import MeetingsPage         from './features/meetings/MeetingsPage'
import MeetingRoomPage      from './features/meetings/MeetingRoomPage'
import VotesPage            from './features/votes/VotesPage'
import MaintenancePage      from './features/maintenance/MaintenancePage'
import ReportsPage          from './features/reports/ReportsPage'
import InvitationsPage      from './features/invitations/InvitationsPage'
import PortalPage           from './features/portal/PortalPage'
import MessagesPage         from './features/portal/MessagesPage'
import AcceptInvitePage     from './features/portal/AcceptInvitePage'
import ProfilePage           from './features/profile/ProfilePage'
import SubscribePage        from './features/billing/SubscribePage'
import SubscribeSuccessPage from './features/billing/SubscribeSuccessPage'
import CustomersPage        from './features/admin/CustomersPage'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <BuildingProvider>
          <Routes>
            {/* Public */}
            <Route path="/login"         element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Semi-public — requires auth, no app shell */}
            <Route path="/onboarding" element={<AuthGuard><OnboardingPage /></AuthGuard>} />

            {/* Billing — requires auth, shown before app access is granted */}
            <Route path="/subscribe"         element={<AuthGuard><SubscribePage /></AuthGuard>} />
            <Route path="/subscribe/success" element={<AuthGuard><SubscribeSuccessPage /></AuthGuard>} />

            {/* Admin — requires auth + API enforces ADMIN_USER_ID check */}
            <Route path="/admin/customers" element={<AuthGuard><CustomersPage /></AuthGuard>} />

            {/* Protected app */}
            <Route path="/"          element={<AuthGuard><DashboardPage /></AuthGuard>} />
            <Route path="/buildings"     element={<AuthGuard><BuildingsPage /></AuthGuard>} />
            <Route path="/buildings/:id" element={<AuthGuard><BuildingProfilePage /></AuthGuard>} />
            <Route path="/owners"    element={<AuthGuard><OwnersPage /></AuthGuard>} />
            <Route path="/charges"   element={<AuthGuard><ChargesPage /></AuthGuard>} />
            <Route path="/expenses"  element={<AuthGuard><ExpensesPage /></AuthGuard>} />
            <Route path="/income"    element={<AuthGuard><IncomePage /></AuthGuard>} />
            <Route path="/bilan"     element={<AuthGuard><BilanPage /></AuthGuard>} />
            <Route path="/budget"    element={<AuthGuard><BudgetPage /></AuthGuard>} />
            <Route path="/settings"      element={<AuthGuard><SettingsPage /></AuthGuard>} />
            <Route path="/profile"       element={<AuthGuard><ProfilePage /></AuthGuard>} />
            <Route path="/tickets"       element={<AuthGuard><TicketsPage /></AuthGuard>} />
            <Route path="/insurance"     element={<AuthGuard><InsurancePage /></AuthGuard>} />
            <Route path="/contractors"   element={<AuthGuard><ContractorsPage /></AuthGuard>} />
            <Route path="/templates"     element={<AuthGuard><LetterTemplatesPage /></AuthGuard>} />
            <Route path="/documents"     element={<AuthGuard><DocumentsPage /></AuthGuard>} />
            <Route path="/inbox"         element={<AuthGuard><InboxPage /></AuthGuard>} />
            <Route path="/timeline"      element={<AuthGuard><TimelinePage /></AuthGuard>} />
            <Route path="/roadmap"       element={<AuthGuard><RoadmapPage /></AuthGuard>} />
            <Route path="/votes"         element={<AuthGuard><VotesPage /></AuthGuard>} />
            <Route path="/maintenance"   element={<AuthGuard><MaintenancePage /></AuthGuard>} />
            <Route path="/meetings"      element={<AuthGuard><MeetingsPage /></AuthGuard>} />
            <Route path="/meetings/:id/room" element={<AuthGuard><MeetingRoomPage /></AuthGuard>} />
            <Route path="/reports"       element={<AuthGuard><ReportsPage /></AuthGuard>} />
            <Route path="/invitations"   element={<AuthGuard><InvitationsPage /></AuthGuard>} />
            <Route path="/portal"        element={<AuthGuard><PortalPage /></AuthGuard>} />
            <Route path="/portal/messages" element={<AuthGuard><MessagesPage /></AuthGuard>} />

            {/* Public — no AuthGuard (token validates identity) */}
            <Route path="/invite/accept" element={<AcceptInvitePage />} />
          </Routes>
        </BuildingProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
