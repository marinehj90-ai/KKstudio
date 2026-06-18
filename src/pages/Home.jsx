import { useState, useEffect } from 'react'
import {
  Search, ArrowRight, Check,
  Monitor, Smartphone, Globe, ChevronDown,
} from 'lucide-react'
import { templateGroups as _templateGroups } from '../data/templateData'
import ImageWorkflow from '../components/ImageWorkflow'
import { TemplateCardPreview, PREVIEW_LAYERS } from '../components/TemplateCardPreview'

const GROUP_ORDER = ['banner', 'brand', 'exhibition', 'event', 'product', 'notice']
const templateGroups = [..._templateGroups].sort(
  (a, b) => GROUP_ORDER.indexOf(a.id) - GROUP_ORDER.indexOf(b.id)
)
const allTemplates = templateGroups.flatMap((g) => g.templates)

export default function Home() {
  const [step, setStep] = useState(0) // 0: 템플릿 선택, 1: ImageWorkflow
  const [selectedTemplates, setSelectedTemplates] = useState([])
  const [activeGroup, setActiveGroup] = useState('banner')

  // 영역 찾기에서 넘어온 경우 템플릿 자동 선택
  useEffect(() => {
    const preSelected = sessionStorage.getItem('preSelectedTemplate')
    if (preSelected) {
      sessionStorage.removeItem('preSelectedTemplate')
      const t = allTemplates.find((t) => t.id === preSelected)
      if (t) {
        const group = templateGroups.find((g) => g.templates.some((tmpl) => tmpl.id === t.id))
        if (group) setActiveGroup(group.id)
        setSelectedTemplates([t.id])
        setStep(1) // 바로 에디터 진입
      }
    }
  }, [])
  const [searchQuery, setSearchQuery] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('전체')

  const toggleTemplate = (id) => {
    const targetGroup = templateGroups.find(g => g.templates.some(t => t.id === id))
    setSelectedTemplates((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id)
      const prevGroup = templateGroups.find(g => g.templates.some(t => t.id === prev[0]))
      if (prev.length > 0 && prevGroup?.id !== targetGroup?.id) return [id]
      const SOLO_IDS = ['b10', 'b8']
      if (SOLO_IDS.includes(id) && prev.length > 0) return [id]
      if (prev.some(p => SOLO_IDS.includes(p))) return [id]
      return [...prev, id]
    })
    if (targetGroup) setActiveGroup(targetGroup.id)
  }

  const currentGroup = templateGroups.find((g) => g.id === activeGroup)
  const currentGroupData = currentGroup
  const filteredTemplates = currentGroup?.templates.filter((t) => {
    const matchSearch = !searchQuery || t.name.includes(searchQuery)
    const matchDevice = deviceFilter === '전체' || t.device === deviceFilter || t.device === '공통'
    return matchSearch && matchDevice
  })

  // 스텝 1: ImageWorkflow
  if (step === 1) {
    return (
      <div className="min-h-screen">
        <ImageWorkflow
          selectedTemplateIds={selectedTemplates}
          allTemplates={allTemplates}
          onBack={() => setStep(0)}
          onGoHome={() => setStep(0)}
          toggleTemplate={toggleTemplate}
        />
      </div>
    )
  }

  // 스텝 0: 템플릿 선택
  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden" style={{ background: 'var(--ck-gradient-template-hero)' }}>
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-64 h-full opacity-20" style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.25), transparent)' }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-8 py-14 flex items-center justify-between gap-8">
          {/* Left: copy */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-extrabold text-white leading-tight mb-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
              신세계면세점 이미지 제작,<br />AI로 빠르게 만들어보세요
            </h1>
            <p className="text-white/85 text-sm max-w-2xl" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
              사진을 업로드하시거나, URL 분석으로 배너, 기획전, 이벤트, 상세페이지까지 제작할 수 있어요.<br />템플릿을 선택하고 이미지를 올리면 끝!
            </p>
          </div>
          {/* Right: brand logo — hidden on mobile */}
          <div
            className="hidden md:flex shrink-0 items-center justify-center"
            style={{
              width: 200,
              padding: '16px 20px',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.10)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.22)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
            }}
          >
            <img
              src="/assets/logos/shinsegae-dutyfree-logo.png"
              alt="SHINSEGAE DUTY FREE"
              style={{ display: 'block', width: '100%', maxWidth: 180, height: 'auto', objectFit: 'contain', margin: '0 auto', opacity: 1, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))', transform: 'translateY(-11px)' }}
            />
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center gap-2">
          {['템플릿 선택', '이미지 입력', '에디터'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90" />}
              <span
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={
                  i === 0
                    ? { background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)', color: '#fff', boxShadow: '0 4px 12px rgba(233,78,27,0.4)' }
                    : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                }
              >
                {i + 1}. {label}
                {i === 0 && selectedTemplates.length > 0 && (
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
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={
                deviceFilter === d
                  ? { background: 'linear-gradient(135deg,#F6A23A 0%,#E94E1B 100%)', color: '#fff', boxShadow: '0 2px 8px rgba(233,78,27,0.4)' }
                  : { backgroundColor: '#fff', color: '#4b5563', border: '1px solid #e5e7eb' }
              }
            >
              {d === 'PC' && <Monitor className="w-3.5 h-3.5 inline mr-1" />}
              {d === 'MO' && <Smartphone className="w-3.5 h-3.5 inline mr-1" />}
              {d === '전체' && <Globe className="w-3.5 h-3.5 inline mr-1" />}
              {d}
            </button>
          ))}
        </div>

        {/* Group Tabs */}
        <div className="flex gap-2 mb-6">
          {templateGroups.map((g) => {
            const Icon = g.icon
            const count = g.templates.filter((t) => selectedTemplates.includes(t.id)).length
            return (
              <button
                key={g.id}
                onClick={() => { setActiveGroup(g.id); setSelectedTemplates([]) }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={
                  activeGroup === g.id
                    ? { background: g.gradient, color: '#fff', boxShadow: `0 4px 16px ${g.hex}44` }
                    : { backgroundColor: '#fff', color: '#4b5563', border: '1px solid #e5e7eb' }
                }
              >
                <Icon className="w-4 h-4" />
                {g.label}
                {count > 0 && (
                  <span
                    className="w-5 h-5 rounded-full text-xs flex items-center justify-center"
                    style={
                      activeGroup === g.id
                        ? { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }
                        : { backgroundColor: '#FFF0E5', color: '#E94E1B' }
                    }
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {filteredTemplates?.map((t) => {
            const isSelected = selectedTemplates.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleTemplate(t.id)}
                className="group relative rounded-2xl overflow-hidden transition-all text-left"
                style={
                  isSelected
                    ? { border: `2px solid ${currentGroupData?.hex || '#FF6A24'}`, boxShadow: `0 4px 20px ${currentGroupData?.hex || '#FF6A24'}30, 0 0 0 3px ${currentGroupData?.hex || '#FF6A24'}20` }
                    : { border: '2px solid #e5e7eb' }
                }
              >
                {(() => {
                  const [tw, th] = t.size.split('×').map(Number)
                  const ratio = tw / th
                  const cW = 260, cH = 160
                  let boxW = ratio > cW / cH ? cW * 0.88 : cH * 0.82 * ratio
                  let boxH = ratio > cW / cH ? boxW / ratio : cH * 0.82
                  boxH = Math.max(boxH, cH * 0.12)
                  boxW = Math.max(boxW, cW * 0.10)
                  const hasStaticPreview = !!t.previewImage
                  const hasLivePreview = !!PREVIEW_LAYERS[t.id] && !hasStaticPreview
                  const hasBg = hasLivePreview || hasStaticPreview
                  return (
                    <div
                      className="relative h-40 flex items-center justify-center overflow-hidden"
                      style={{ background: hasBg ? '#F6F1EA' : t.preview }}
                    >
                      {hasLivePreview ? (
                        <TemplateCardPreview t={t} />
                      ) : hasStaticPreview ? (
                        <img
                          src={t.previewImage}
                          alt={t.name}
                          style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', objectPosition: 'center center', display: 'block' }}
                          draggable={false}
                        />
                      ) : (
                        <div style={{ width: `${(boxW / cW * 100).toFixed(1)}%`, height: `${(boxH / cH * 100).toFixed(1)}%`, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'monospace', userSelect: 'none' }}>{t.size}</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#fff', border: `2px solid ${currentGroupData?.hex || '#FF6A24'}` }}>
                          <Check className="w-3.5 h-3.5" style={{ color: currentGroupData?.hex || '#FF6A24' }} />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/30 text-white text-xs font-medium">{t.device}</div>
                    </div>
                  )
                })()}
                <div className="p-3 bg-white">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.size}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Next Button */}
        {selectedTemplates.length > 0 && (
          <div className="sticky bottom-6 flex justify-center">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-8 py-3.5 text-white rounded-2xl font-semibold transition-all hover:scale-[1.02]"
              style={{ background: currentGroupData?.gradient || 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)', boxShadow: `0 8px 24px rgba(233,78,27,0.45)` }}
            >
              {selectedTemplates.length}개 템플릿 선택 완료
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
