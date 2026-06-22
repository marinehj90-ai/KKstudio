import { useState, useEffect, useRef } from 'react'
import { useParams, NavLink, useNavigate } from 'react-router-dom'
import { Search, Check, ArrowRight, Monitor, Smartphone, Globe, AlertTriangle } from 'lucide-react'
import { TemplateCardPreview, PREVIEW_LAYERS } from '../components/TemplateCardPreview'

function NavigationGuardModal({ onProceed, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[360px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4">
          <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 leading-snug">
            작업을 중단하고 이동할까요?
          </h3>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            현재 입력 중인 이미지와 선택한 템플릿 정보가 초기화될 수 있습니다. 작업을 중단하고 다른 템플릿을 선택하시겠습니까?
          </p>
        </div>
        <div className="px-6 pb-5 flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onProceed}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#F6A23A 0%,#E94E1B 55%,#D44117 100%)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)' }}
          >
            템플릿 선택하기
          </button>
        </div>
      </div>
    </div>
  )
}
import { templateGroups } from '../data/templateData'
import ImageWorkflow from '../components/ImageWorkflow'
import CouponEditor from '../components/CouponEditor'

const allTemplates = templateGroups.flatMap((g) => g.templates)

export default function Templates() {
  const { categoryId } = useParams()
  const navigate = useNavigate()

  const activeGroup = templateGroups.find((g) => g.id === categoryId) ?? templateGroups[0]
  const c = activeGroup // 색상 쇼트컷: c.hex, c.light, c.dark

  const [step, setStep] = useState(0)
  const [selectedTemplates, setSelectedTemplates] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('전체')
  const [pendingNavigation, setPendingNavigation] = useState(null) // 이동 대기 경로
  const stepRef = useRef(step)
  useEffect(() => { stepRef.current = step }, [step])

  // LNB 템플릿 카테고리 클릭 인터셉트 (step >= 1일 때만)
  useEffect(() => {
    function handleCapture(e) {
      if (stepRef.current < 1) return
      const anchor = e.target.closest('a[href]')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || !href.startsWith('/templates/')) return
      // 현재 경로와 동일하면 통과
      if (href === window.location.pathname) return
      e.preventDefault()
      e.stopImmediatePropagation()
      setPendingNavigation(href)
    }
    document.addEventListener('click', handleCapture, true)
    return () => document.removeEventListener('click', handleCapture, true)
  }, [])

  function handleGuardProceed() {
    const target = pendingNavigation // 클리어 전 명시적 캡처
    setPendingNavigation(null)
    setSelectedTemplates([])
    setStep(0)
    if (target) navigate(target)
  }

  function handleGuardCancel() {
    setPendingNavigation(null)
  }

  const toggleTemplate = (id) => {
    const SOLO_IDS = ['b10', 'b8', 'e5', 'ev5']
    setSelectedTemplates((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id)
      if (SOLO_IDS.includes(id) && prev.length > 0) return [id]
      if (prev.some(p => SOLO_IDS.includes(p))) return [id]
      return [...prev, id]
    })
  }

  const filteredTemplates = activeGroup.templates.filter((t) => {
    const matchSearch = !searchQuery || t.name.includes(searchQuery)
    const matchDevice = deviceFilter === '전체' || t.device === deviceFilter || t.device === '공통'
    return matchSearch && matchDevice
  })

  const Icon = activeGroup.icon

  if (step === 1) {
    if (selectedTemplates.includes('ev5')) {
      return <CouponEditor onBack={() => setStep(0)} />
    }
    return (
      <div className="min-h-screen">
        {pendingNavigation && (
          <NavigationGuardModal
            onProceed={handleGuardProceed}
            onCancel={handleGuardCancel}
          />
        )}
        <ImageWorkflow
          selectedTemplateIds={selectedTemplates}
          allTemplates={allTemplates}
          onBack={() => setStep(0)}
          onGoHome={() => navigate('/')}
          toggleTemplate={toggleTemplate}
          color={c}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden" style={{ background: 'var(--ck-gradient-template-hero)' }}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-5 right-40 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-8 py-10">
          <p className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 text-xs font-bold bg-white/90 rounded-full" style={{ color: c.dark }}>
            <Icon className="w-3 h-3" />
            TEMPLATE
          </p>
          <h1 className="text-3xl font-extrabold text-white leading-tight mb-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
            {activeGroup.label} 템플릿
          </h1>
          <p className="text-white/90 text-sm" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
            원하는 템플릿을 선택하고, 이미지를 업로드하면 AI가 자동으로 생성해드려요.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center gap-2">
          {['템플릿 선택', '이미지 입력', '에디터'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && (
                <svg className="w-4 h-4 text-gray-300 -rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              )}
              <span
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={
                  i === 0
                    ? { backgroundColor: c.hex, color: '#fff', boxShadow: `0 4px 12px ${c.hex}55` }
                    : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                }
              >
                {i + 1}. {label}
                {i === 0 && selectedTemplates.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-white/25 text-xs flex items-center justify-center">
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
            const isActive = g.id === activeGroup.id
            return (
              <NavLink
                key={g.id}
                to={`/templates/${g.id}`}
                onClick={() => { setSelectedTemplates([]); setStep(0) }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={
                  isActive
                    ? { background: g.gradient, color: '#fff', boxShadow: `0 4px 16px ${g.hex}44` }
                    : { background: '#fff', color: '#4b5563', border: '1px solid #e5e7eb' }
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
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none transition-all"
              style={{ '--tw-ring-color': c.hex }}
              onFocus={(e) => { e.target.style.borderColor = c.hex; e.target.style.boxShadow = `0 0 0 3px ${c.hex}30` }}
              onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
            />
          </div>
          {['전체', 'PC', 'MO'].map((d) => (
            <button
              key={d}
              onClick={() => setDeviceFilter(d)}
              className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={
                deviceFilter === d
                  ? { backgroundColor: c.hex, color: '#fff', boxShadow: `0 2px 8px ${c.hex}44` }
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

        {/* Template Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {filteredTemplates.map((t) => {
            const isSelected = selectedTemplates.includes(t.id)
            return (
              <button
                key={t.id}
                onClick={() => toggleTemplate(t.id)}
                className="group relative rounded-2xl overflow-hidden transition-all text-left"
                style={
                  isSelected
                    ? { border: `2px solid ${c.hex}`, boxShadow: `0 4px 20px ${c.hex}30, 0 0 0 3px ${c.hex}20` }
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
                    <div className="relative h-40 flex items-center justify-center overflow-hidden" style={{ background: hasBg ? '#F6F1EA' : t.preview }}>
                      {/* 라이브 미리보기: 실제 레이어 데이터로 CSS 렌더링 */}
                      {hasLivePreview ? (
                        <TemplateCardPreview t={t} />
                      ) : hasStaticPreview ? (
                        <img
                          src={t.previewImage}
                          alt={t.name}
                          style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', objectPosition: 'center center', display: 'block', ...(t.invertPreview ? { filter: 'invert(1)' } : {}) }}
                          draggable={false}
                        />
                      ) : t.guideImage ? (
                        <img
                          src={t.guideImage}
                          alt="guide"
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
                          draggable={false}
                        />
                      ) : null}
                      {/* 사이즈 박스: 라이브 미리보기·previewImage·guideImage 없을 때만 표시 */}
                      {!hasLivePreview && !hasStaticPreview && !t.guideImage && (
                        <div style={{ position: 'relative', zIndex: 1, width: `${(boxW / cW * 100).toFixed(1)}%`, height: `${(boxH / cH * 100).toFixed(1)}%`, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'monospace', userSelect: 'none' }}>{t.size}</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#fff', border: `2px solid ${c.hex}`, zIndex: 2 }}>
                          <Check className="w-3.5 h-3.5" style={{ color: c.hex }} />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/30 text-white text-xs font-medium" style={{ zIndex: 2 }}>{t.device}</div>
                    </div>
                  )
                })()}
                <div className="p-3 bg-white">
                  <p className="text-sm font-medium text-gray-800 truncate">{t.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-400">{t.size}</p>
                    {t.singleSelectOnly && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#E94E1B', background: '#FFF0E5', border: '1px solid #F6A23A55', borderRadius: 4, padding: '0px 5px', letterSpacing: 0, lineHeight: '18px', whiteSpace: 'nowrap' }}>단독 편집</span>
                    )}
                  </div>
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
            onClick={() => {
              // 방어: singleSelectOnly 템플릿이 포함된 경우 반드시 단독 선택
              const SOLO_IDS = ['b10', 'b8', 'e5', 'ev5']
              const hasSolo = selectedTemplates.some(id => SOLO_IDS.includes(id))
              if (hasSolo && selectedTemplates.length > 1) {
                const soloId = selectedTemplates.find(id => SOLO_IDS.includes(id))
                setSelectedTemplates([soloId])
                return
              }
              setStep(1)
            }}
            className="pointer-events-auto flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold transition-all hover:scale-[1.02] text-white"
            style={{ background: c.gradient || 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)', boxShadow: '0 8px 24px rgba(233,78,27,0.45)' }}
          >
            {selectedTemplates.length}개 템플릿 선택 완료
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
