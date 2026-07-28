import { Routes, Route } from 'react-router-dom'
import { GuestSessionProvider } from './auth/GuestSessionContext'
import EntryGate from './components/EntryGate'
import Layout from './components/Layout'
import LoginPreviewPage from './pages/LoginPreviewPage'
import Home from './pages/Home'
import MyContent from './pages/MyContent'
import Settings from './pages/Settings'
import Templates from './pages/Templates'
import SiteMap from './pages/SiteMap'
import CustomSize from './pages/CustomSize'

export default function App() {
  return (
    <GuestSessionProvider>
      <Routes>
        {/* 로그인 안내 화면 — EntryGate 바깥, Layout 없음 */}
        <Route path="/login" element={<LoginPreviewPage />} />

        {/* 게스트 세션 가드 — 세션 없으면 /login으로 redirect */}
        <Route element={<EntryGate />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/sitemap" element={<SiteMap />} />
            <Route path="/templates/custom-size" element={<CustomSize />} />
            <Route path="/templates/:categoryId" element={<Templates />} />
            <Route path="/my" element={<MyContent />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </GuestSessionProvider>
  )
}
