import { useLayoutEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import { CheckInPage } from './pages/CheckInPage'
import { DoctorNotePage } from './pages/DoctorNotePage'
import { EmergencyPage } from './pages/EmergencyPage'
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
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/checkin" element={<CheckInPage />} />
          <Route path="/log/:deviceId" element={<LogPage />} />
          <Route path="/handoff" element={<HandoffPage />} />
          <Route path="/doctor-note" element={<DoctorNotePage />} />
          <Route path="/timesheet" element={<TimesheetPage />} />
          <Route path="/emergency" element={<EmergencyPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}

/** Every page change starts at the top (otherwise the browser keeps the previous page's scroll position). */
function ScrollToTop() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}
