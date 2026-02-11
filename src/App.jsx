import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ExchangePage from './pages/ExchangePage'
import LearnPage from './pages/LearnPage'
import DashboardPage from './pages/DashboardPage'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/exchange" element={<ExchangePage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
