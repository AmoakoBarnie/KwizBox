import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AuthProvider } from './auth.jsx'
import AnimatedBg from './components/AnimatedBg.jsx'
import KenteFrame from './components/KenteFrame.jsx'
import SoundToggle from './components/SoundToggle.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import Landing from './pages/Landing.jsx'
import Play from './pages/Play.jsx'
import Quiz from './pages/Quiz.jsx'
import Summary from './pages/Summary.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Profile from './pages/Profile.jsx'
import Admin from './pages/Admin.jsx'

const spring = { type: 'spring', stiffness: 260, damping: 26 }

function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -14, scale: 0.98 }}
      transition={spring}
      className="app"
      id="main-content"
    >
      {children}
    </motion.div>
  )
}

export default function App() {
  const location = useLocation()
  return (
    <AuthProvider>
      <AnimatedBg />
      <KenteFrame />
      <SoundToggle />
      <ThemeToggle />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Page><Landing /></Page>} />
          <Route path="/play" element={<Page><Play /></Page>} />
          <Route path="/quiz" element={<Page><Quiz /></Page>} />
          <Route path="/summary" element={<Page><Summary /></Page>} />
          <Route path="/leaderboard" element={<Page><Leaderboard /></Page>} />
          <Route path="/profile" element={<Page><Profile /></Page>} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </AuthProvider>
  )
}
