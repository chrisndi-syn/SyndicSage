import { useTranslation } from 'react-i18next'
import { Shell } from '../../components/layout/Shell'
import { Topbar } from '../../components/layout/Topbar'

export default function DashboardPage() {
  const { t } = useTranslation()

  return (
    <Shell>
      <Topbar title={t('nav.dashboard')} />
      <div style={{ padding: 24 }}>
        <p style={{ color: '#6E6E73', fontSize: 14 }}>
          Phase 2 coming soon — buildings, owners, charges.
        </p>
      </div>
    </Shell>
  )
}
