import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import MyContent from './pages/MyContent'
import Settings from './pages/Settings'
import Templates from './pages/Templates'
import SiteMap from './pages/SiteMap'
import CustomSize from './pages/CustomSize'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/sitemap" element={<SiteMap />} />
        <Route path="/templates/custom-size" element={<CustomSize />} />
        <Route path="/templates/:categoryId" element={<Templates />} />
        <Route path="/my" element={<MyContent />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
