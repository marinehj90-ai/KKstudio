import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Ruler, ArrowRight, AlertTriangle } from 'lucide-react'
import ImageWorkflow from '../components/ImageWorkflow'

function NavigationGuardModal({ onProceed, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4">
          <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <h3 className="text-base font-bold text-gray-900 leading-snug">
            페이지를 나가기 전에 작업을 저장하세요
          </h3>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            현재 작업 중인 내용이 저장되지 않았을 수 있습니다. 페이지를 이동하기 전에 작업을 저장해주세요.
          </p>
          <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">
            저장하지 않고 이동하면 지금까지 편집한 내용이 사라질 수 있습니다.
          </p>
        </div>
        <div className="px-6 pb-5 flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            계속 작업하기
          </button>
          {/* 추후 저장 기능 구현 시: <button onClick={onSaveAndProceed}>저장하고 이동</button> */}
          <button
            onClick={onProceed}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#F6A23A 0%,#E94E1B 55%,#D44117 100%)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)' }}
          >
            저장하지 않고 이동
          </button>
        </div>
      </div>
    </div>
  )
}

const MIN = 50
const MAX = 5000

export default function CustomSize() {
  const navigate = useNavigate()
  const location = useLocation()
  const locState = location.state || {}

  const [wInput, setWInput] = useState('')
  const [hInput, setHInput] = useState('')
  const [name, setName]     = useState('커스텀 사이즈')
  const [step, setStep]     = useState(() => locState.selectedTemplateIds?.length > 0 ? 1 : 0)
  const [pendingNavigation, setPendingNavigation] = useState(null)
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
      if (href === window.location.pathname) return
      e.preventDefault()
      e.stopImmediatePropagation()
      setPendingNavigation(href)
    }
    document.addEventListener('click', handleCapture, true)
    return () => document.removeEventListener('click', handleCapture, true)
  }, [])

  function handleGuardProceed() {
    const target = pendingNavigation
    setPendingNavigation(null)
    setStep(0)
    if (target) navigate(target)
  }

  function handleGuardCancel() {
    setPendingNavigation(null)
  }

  const w = parseInt(wInput, 10)
  const h = parseInt(hInput, 10)
  const wValid = !isNaN(w) && w >= MIN && w <= MAX
  const hValid = !isNaN(h) && h >= MIN && h <= MAX
  const canProceed = wValid && hValid

  const customTemplate = {
    id: 'custom',
    name: name.trim() || '커스텀 사이즈',
    size: `${w}×${h}`,
    device: '공통',
    preview: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
  }

  if (step === 1) {
    return (
      <div className="min-h-screen">
        {pendingNavigation && (
          <NavigationGuardModal
            onProceed={handleGuardProceed}
            onCancel={handleGuardCancel}
          />
        )}
        <ImageWorkflow
          selectedTemplateIds={locState.selectedTemplateIds || ['custom']}
          allTemplates={[customTemplate]}
          onBack={() => setStep(0)}
          onGoHome={() => navigate('/')}
          toggleTemplate={() => {}}
          color={{ hex: '#78716C', light: '#F5F4F2', dark: '#57534E', gradient: 'linear-gradient(135deg,#A8A29E 0%,#78716C 100%)' }}
          contentId={locState.contentId}
          initialState={locState.initialState}
          category={locState.category || 'customSize'}
          routePath={locState.routePath || '/custom-size'}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'var(--ck-gradient-template-hero)' }}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-5 right-40 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-8 py-10">
          <p className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 text-xs font-bold bg-white/90 rounded-full" style={{ color: '#57534E' }}>
            <Ruler className="w-3 h-3" />
            FREE SIZE
          </p>
          <h1 className="text-3xl font-extrabold text-white leading-tight mb-2" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
            자유사이즈 제작
          </h1>
          <p className="text-white/90 text-sm" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
            원하는 제작물 사이즈를 직접 입력한 뒤 이미지를 업로드해 작업할 수 있습니다.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center gap-2">
          {['사이즈 입력', '이미지 입력', '에디터'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <svg className="w-4 h-4 text-gray-300 -rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>}
              <span
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={
                  i === 0
                    ? { background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)', color: '#fff', boxShadow: '0 4px 12px rgba(233,78,27,0.4)' }
                    : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                }
              >
                {i + 1}. {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Size Input Card */}
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="max-w-lg bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <h2 className="text-base font-bold text-gray-800 mb-1">사이즈 직접 입력</h2>
          <p className="text-xs text-gray-400 mb-6">*사이즈 범위 {MIN}~{MAX} (px)</p>

          {/* W / H inputs */}
          <div className="flex gap-3 mb-5">
            <div
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors"
              style={{ border: `1.5px solid ${wInput && !wValid ? '#ef4444' : wValid ? '#F15A24' : '#e5e7eb'}` }}
            >
              <span className="text-xs font-bold text-gray-400 shrink-0">W</span>
              <input
                type="number"
                placeholder="Width (px)"
                value={wInput}
                min={MIN} max={MAX}
                onChange={e => setWInput(e.target.value)}
                className="w-full text-sm text-gray-800 bg-transparent outline-none"
              />
            </div>
            <div
              className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors"
              style={{ border: `1.5px solid ${hInput && !hValid ? '#ef4444' : hValid ? '#F15A24' : '#e5e7eb'}` }}
            >
              <span className="text-xs font-bold text-gray-400 shrink-0">H</span>
              <input
                type="number"
                placeholder="Height (px)"
                value={hInput}
                min={MIN} max={MAX}
                onChange={e => setHInput(e.target.value)}
                className="w-full text-sm text-gray-800 bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Name input */}
          <div className="mb-2">
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">이름</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="커스텀 사이즈"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 outline-none focus:border-primary-400 transition-colors"
            />
          </div>

          {/* Validation hint */}
          {(wInput || hInput) && !canProceed && (
            <p className="text-xs text-red-400 mt-2 mb-1">{MIN}px 이상 {MAX}px 이하 값을 입력해주세요.</p>
          )}

          {/* Next button */}
          <button
            disabled={!canProceed}
            onClick={() => setStep(1)}
            className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all"
            style={
              canProceed
                ? { background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)', color: '#fff', boxShadow: '0 8px 24px rgba(233,78,27,0.35)', cursor: 'pointer' }
                : { background: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
            }
          >
            다음 — 이미지 입력
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
