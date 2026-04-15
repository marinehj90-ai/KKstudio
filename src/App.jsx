import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import MyContent from './pages/MyContent'
import Settings from './pages/Settings'
import Templates from './pages/Templates'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/templates/:categoryId" element={<Templates />} />
        <Route path="/my" element={<MyContent />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
