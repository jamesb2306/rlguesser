import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/lib/AuthContext'
import Navbar from '@/components/layout/Navbar'
import Home from '@/pages/Home'
import Auth from '@/pages/Auth'
import Pricing from '@/pages/Pricing'
import Leaderboard from '@/pages/Leaderboard'
import Profile from '@/pages/Profile'
import { ArchiveIndex, ArchiveGame } from '@/pages/Archive'
import Admin from '@/pages/Admin'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <div className="flex-1">
            <Routes>
              <Route path="/"                 element={<Home />} />
              <Route path="/auth"             element={<Auth />} />
              <Route path="/pricing"          element={<Pricing />} />
              <Route path="/leaderboard"      element={<Leaderboard />} />
              <Route path="/profile"          element={<Profile />} />
              <Route path="/archive"          element={<ArchiveIndex />} />
              <Route path="/archive/:date"    element={<ArchiveGame />} />
              <Route path="/admin"            element={<Admin />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
