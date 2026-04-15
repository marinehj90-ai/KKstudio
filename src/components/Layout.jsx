import { Outlet, NavLink } from 'react-router-dom'
import { Home, FolderOpen, Settings, Layers, Image, CalendarRange, Sparkles, ChevronRight } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: '홈' },
  { to: '/my', icon: FolderOpen, label: '내 콘텐츠' },
  { to: '/settings', icon: Settings, label: '설정' },
]

const templateCategories = [
  { to: '/templates/banner', icon: Layers, label: '배너', count: 12 },
  { to: '/templates/product', icon: Image, label: '상품이미지', count: 2 },
  { to: '/templates/exhibition', icon: CalendarRange, label: '기획전', count: 3 },
  { to: '/templates/event', icon: Sparkles, label: '이벤트·상세', count: 3 },
]

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">KK Studio</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}

          {/* Template categories in LNB */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              템플릿 카테고리
            </p>
            {templateCategories.map(({ to, icon: Icon, label, count }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all group ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span className="flex-1 text-left">{label}</span>
                <span className="text-xs text-gray-400 group-hover:text-primary-500">{count}</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary-500" />
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Pro Status */}
        <div className="p-4 mx-3 mb-3 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary-600" />
            <span className="text-sm font-semibold text-primary-800">Pro Account</span>
          </div>
          <div className="w-full h-2 bg-white rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full" />
          </div>
          <p className="mt-1.5 text-xs text-primary-600">750 / 1,000 AI 생성 남음</p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
