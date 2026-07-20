import { useState } from 'react'
import { StoreProvider } from './store/StoreContext'
import { TabBar } from './ui/components'
import type { Tab } from './ui/components'
import TodayScreen from './ui/TodayScreen'
import PatientsScreen from './ui/PatientsScreen'
import ScheduleScreen from './ui/ScheduleScreen'
import FinanceScreen from './ui/FinanceScreen'

export default function App() {
  const [tab, setTab] = useState<Tab>('hoje')

  return (
    <StoreProvider>
      <main>
        {tab === 'hoje' && <TodayScreen />}
        {tab === 'pacientes' && <PatientsScreen />}
        {tab === 'agenda' && <ScheduleScreen />}
        {tab === 'financeiro' && <FinanceScreen />}
      </main>
      <TabBar tab={tab} onChange={setTab} />
    </StoreProvider>
  )
}
