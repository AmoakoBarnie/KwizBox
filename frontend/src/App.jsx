import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './auth.jsx'
import Landing from './pages/Landing.jsx'
import Play from './pages/Play.jsx'
import Quiz from './pages/Quiz.jsx'
import Summary from './pages/Summary.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Profile from './pages/Profile.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/play" element={<Play />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}
