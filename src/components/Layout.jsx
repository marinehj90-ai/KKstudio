import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, FolderOpen, Settings, Layers, Image, CalendarRange, Sparkles, ChevronRight, MapPin, BookImage, BellDot, Ruler } from 'lucide-react'
import GuestBadge from './GuestBadge'

const navItems = [
  { to: '/', icon: Home, label: '홈' },
  { to: '/sitemap', icon: MapPin, label: '영역 찾기' },
  { to: '/my', icon: FolderOpen, label: '내 콘텐츠' },
  { to: '/settings', icon: Settings, label: '설정' },
]

const templateCategories = [
  { to: '/templates/banner',     icon: Layers,        label: '배너',        count: 9,  hex: '#F15A24', light: '#FFF0E5' },
  { to: '/templates/brand',      icon: BookImage,     label: '브랜드어셋',   count: 3,  hex: '#F6A23A', light: '#FFF7EF' },
  { to: '/templates/exhibition', icon: CalendarRange, label: '기획전',       count: 4,  hex: '#F15A24', light: '#FFF0E5' },
  { to: '/templates/event',      icon: Sparkles,      label: '이벤트·상세', count: 3,  hex: '#F6A23A', light: '#FFF7EF' },
  { to: '/templates/product',    icon: Image,         label: '상품이미지',   count: 2,  hex: '#F6A23A', light: '#FFF7EF' },
  { to: '/templates/notice',      icon: BellDot,       label: '메인공지팝업', count: 1,  hex: '#F6A23A', light: '#FFF7EF' },
  { to: '/templates/custom-size', icon: Ruler,         label: '자유사이즈',   count: null, hex: '#78716C', light: '#F5F4F2' },
]

// 홈 포인트 컬러
const HOME_COLOR = '#E94E1B'
const HOME_LIGHT = '#FFF0E5'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  function onLogoClick() {
    if (location.pathname === '/') return
    const confirmed = window.confirm('홈 화면으로 이동하시겠습니까?\n저장되지 않은 작업이 있다면 사라질 수 있습니다.')
    if (confirmed) {
      navigate('/')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0">
        {/* Logo */}
        <div
          className="h-16 flex items-center px-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={onLogoClick}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F6A23A 0%, #E94E1B 100%)' }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">KK Studio</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to
            return (
              <NavLink
                key={to}
                to={to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={({ isActive: active }) =>
                  active
                    ? { backgroundColor: HOME_LIGHT, color: HOME_COLOR, fontWeight: 600 }
                    : { color: '#374151' }
                }
              >
                <Icon className="w-5 h-5" />
                {label}
              </NavLink>
            )
          })}

          {/* Template categories */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              템플릿 카테고리
            </p>
            {templateCategories.map(({ to, icon: Icon, label, count, hex, light }) => (
              <NavLink
                key={to}
                to={to}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all group"
                style={({ isActive }) =>
                  isActive
                    ? { backgroundColor: light, color: hex, fontWeight: '600' }
                    : { color: '#4b5563' }
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-4 h-4" style={{ color: isActive ? hex : undefined }} />
                    <span className="flex-1 text-left">{label}</span>
                    {count !== null && (
                      <span
                        className="text-xs"
                        style={{ color: isActive ? hex : '#9ca3af' }}
                      >
                        {count}
                      </span>
                    )}
                    <ChevronRight
                      className="w-3.5 h-3.5"
                      style={{ color: isActive ? hex : '#d1d5db' }}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* 게스트 사용자 배지 */}
        <GuestBadge />
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
