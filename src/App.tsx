import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import { CheckInPage } from './pages/CheckInPage'
import { DoctorNotePage } from './pages/DoctorNotePage'
import { HandoffPage } from './pages/HandoffPage'
import { HomePage } from './pages/HomePage'
import { LogPage } from './pages/LogPage'
import { TimesheetPage } from './pages/TimesheetPage'

// Routes double as NFC tag URLs:
//   /checkin?tag=<DOOR_TAG_ID>  <- door tag: checks in, or if someone is on shift, opens their handoff to check out (EVV)
//   /log/<deviceId>    <- device tags (vest, nebulizer, feeding-pump, trikafta)
export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/checkin" element={<CheckInPage />} />
          <Route path="/log/:deviceId" element={<LogPage />} />
          <Route path="/handoff" element={<HandoffPage />} />
          <Route path="/doctor-note" element={<DoctorNotePage />} />
          <Route path="/timesheet" element={<TimesheetPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
