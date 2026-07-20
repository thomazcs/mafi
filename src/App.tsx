import { useState } from 'react'
import { StoreProvider } from './store/StoreContext'
import { TabBar } from './ui/components'
import type { Tab } from './ui/components'
import TodayScreen from './ui/TodayScreen'
import PatientsScreen from './ui/PatientsScreen'
import ScheduleScreen from './ui/ScheduleScreen'

function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="screen-title">{title}</h1>
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('hoje')

  return (
    <StoreProvider>
      <main>
        {tab === 'hoje' && <TodayScreen />}
        {tab === 'pacientes' && <PatientsScreen />}
        {tab === 'agenda' && <ScheduleScreen />}
        {tab === 'financeiro' && <Placeholder title="Financeiro" />}
      </main>
      <TabBar tab={tab} onChange={setTab} />
    </StoreProvider>
  )
}
