import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { StoreProvider } from './lib/store'
import { CheckInPage } from './pages/CheckInPage'
import { HandoffPage } from './pages/HandoffPage'
import { HomePage } from './pages/HomePage'
import { LogPage } from './pages/LogPage'

// Routes double as NFC tag URLs:
//   /checkin           <- door tag
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
          <Route path="*" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
