import { useState } from 'react'
import { useParams, NavLink } from 'react-router-dom'
import { Search, Check, ArrowRight, Monitor, Smartphone, Globe } from 'lucide-react'
import { templateGroups } from '../data/templateData'
import ImageWorkflow from '../components/ImageWorkflow'

const allTemplates = templateGroups.flatMap((g) => g.templates)

export default function Templates() {
  const { categoryId } = useParams()

  const activeGroup = templateGroups.find((g) => g.id === categoryId) ?? templateGroups[0]

  const [step, setStep] = useState(0) // 0: 템플릿 선택, 1~: ImageWorkflow
  const [selectedTemplates, setSelectedTemplates] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('전체')

  const toggleTemplate = (id) => {
    setSelectedTemplates((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const filteredTemplates = activeGroup.templates.filter((t) => {
    const matchSearch = !searchQuery || t.name.includes(searchQuery)
    const matchDevice = deviceFilter === '전체' || t.device === deviceFilter || t.device === '공통'
    return matchSearch && matchDevice
  })

  const Icon = activeGroup.icon

  // 스텝 1 이후: ImageWorkflow 렌더링
  if (step === 1) {
    return (
      <div className="min-h-screen">
        <ImageWorkflow
          selectedTemplateIds={selectedTemplates}
          allTemplates={allTemplates}
          onBack={() => setStep(0)}
          toggleTemplate={toggleTemplate}
        />
      </div>
    )
  }

  // 스텝 0: 템플릿 선택
  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${activeGroup.color}`}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-5 right-40 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-8 py-10">
          <p className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 text-xs font-bold text-gray-700 bg-white/90 rounded-full">
            <Icon className="w-3 h-3" />
            TEMPLATE
          </p>
          <h1 className="text-3xl font-extrabold text-white leading-tight mb-2">
            {activeGroup.label} 템플릿
          </h1>
          <p className="text-white/80 text-sm">
            원하는 템플릿을 선택하고, 이미지를 업로드하면 AI가 자동으로 생성해드려요.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center gap-2">
          {[
            { label: '템플릿 선택', active: true },
            { label: '이미지 입력', active: false },
            { label: '에디터', active: false },
          ].map(({ label, active }, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <svg className="w-4 h-4 text-gray-300 -rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
              <span
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium ${
                  active
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i + 1}. {label}
                {active && selectedTemplates.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white/20 text-xs flex items-center justify-center">
                    {selectedTemplates.length}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6">
        {/* Category Tabs */}
        <div className="flex gap-2 mb-6">
          {templateGroups.map((g) => {
            const GIcon = g.icon
            return (
              <NavLink
                key={g.id}
                to={`/templates/${g.id}`}
                onClick={() => { setSelectedTemplates([]); setStep(0) }}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? `bg-gradient-to-r ${g.color} text-white shadow-lg`
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
                  }`
                }
              >
                <GIcon className="w-4 h-4" />
                {g.label}
                <span className="text-xs opacity-60">({g.templates.length})</span>
              </NavLink>
            )
          })}
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="템플릿 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
            />
          </div>
          {['전체', 'PC', 'MO'].map((d) => (
            <button
              key={d}
              onClick={() => setDeviceFilter(d)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                deviceFilter === d
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
              }`}
            >
              {d === 'PC' && <Monitor className="w-3.5 h-3.5 inline mr-1" />}
              {d === 'MO' && <Smartphone className="w-3.5 h-3.5 inline mr-1" />}
              {d === '전체' && <Globe className="w-3.5 h-3.5 inline mr-1" />}
              {d}
            </button>
          ))}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {filteredTemplates.map((t) => {
            const isSelected = selectedTemplates.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleTemplate(t.id)}
                className={`group relative rounded-2xl overflow-hidden border-2 transition-all text-left ${
                  isSelected
                    ? 'border-primary-500 shadow-lg shadow-primary-100 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                }`}
              >
                <div className="aspect-[4/3] relative" style={{ background: t.preview }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white/60 text-xs font-mono">{t.size}</span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/30 text-white text-xs font-medium">
                    {t.device}
                  </div>
                </div>
                <div className="p-3 bg-white">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.size}</p>
                </div>
              </button>
            )
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">검색 결과가 없어요.</p>
          </div>
        )}
      </div>

      {/* Sticky Bottom CTA */}
      {selectedTemplates.length > 0 && (
        <div className="sticky bottom-6 flex justify-center pointer-events-none">
          <button
            onClick={() => setStep(1)}
            className="pointer-events-auto flex items-center gap-2 px-8 py-3.5 bg-primary-600 text-white rounded-2xl font-semibold shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all hover:scale-[1.02]"
          >
            {selectedTemplates.length}개 템플릿 선택 완료
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
