import { useState, useEffect } from 'react'
import {
  Search, ArrowRight, Check,
  Monitor, Smartphone, Globe, ChevronDown,
} from 'lucide-react'
import { templateGroups } from '../data/templateData'
import ImageWorkflow from '../components/ImageWorkflow'

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
    // 선택하려는 템플릿의 그룹 찾기
    const targetGroup = templateGroups.find(g => g.templates.some(t => t.id === id))
    // 현재 선택된 템플릿들의 그룹과 다르면 → 해당 그룹으로 초기화 후 선택
    setSelectedTemplates((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id)
      const prevGroup = templateGroups.find(g => g.templates.some(t => t.id === prev[0]))
      if (prev.length > 0 && prevGroup?.id !== targetGroup?.id) return [id]
      // b10은 단독 선택만 허용: 이미 다른 템플릿이 있거나, b10이 있는 상태에서 추가 불가
      if (id === 'b10' && prev.length > 0) return [id]
      if (prev.includes('b10')) return [id]
      return [...prev, id]
    })
    // 탭도 해당 그룹으로 이동
    if (targetGroup) setActiveGroup(targetGroup.id)
  }

  const currentGroup = templateGroups.find((g) => g.id === activeGroup)
  const currentGroupData = currentGroup // hex, light, dark, gradient 포함
  const filteredTemplates = currentGroup?.templates.filter((t) => {
    const matchSearch = !searchQuery || t.name.includes(searchQuery)
    const matchDevice = deviceFilter === '전체' || t.device === deviceFilter || t.device === '공통'
    return matchSearch && matchDevice
  })

  // 스텝 1 이후: ImageWorkflow
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
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #9F48CE 0%, #C084FC 100%)' }}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-5 right-40 w-48 h-48 rounded-full bg-purple-300/30 blur-3xl" />
          <div className="absolute top-5 right-20 w-24 h-24 rounded-full bg-pink-300/20 blur-2xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-8 py-10">
          <p className="inline-block px-3 py-1 mb-3 text-xs font-bold bg-white/90 rounded-full" style={{ color: '#7B2FA8' }}>
            AI-POWERED
          </p>
          <h1 className="text-3xl font-extrabold text-white leading-tight mb-2">
            신세계면세점 이미지 제작,<br />AI로 빠르게 만들어보세요
          </h1>
          <p className="text-primary-100 text-sm max-w-2xl">
            사진을 업로드하시거나, URL 분석으로 배너, 기획전, 이벤트, 상세페이지까지 제작할 수 있어요.<br />템플릿을 선택하고 이미지를 올리면 끝!
          </p>
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
                    ? { backgroundColor: '#9F48CE', color: '#fff', boxShadow: '0 4px 12px rgba(159,72,206,0.35)' }
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
                  ? { backgroundColor: '#9F48CE', color: '#fff', boxShadow: '0 2px 8px rgba(159,72,206,0.35)' }
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
                        : { backgroundColor: '#F3E8FF', color: '#9F48CE' }
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
                    ? { border: `2px solid ${currentGroupData?.hex || '#9F48CE'}`, boxShadow: `0 4px 20px ${currentGroupData?.hex || '#9F48CE'}30, 0 0 0 3px ${currentGroupData?.hex || '#9F48CE'}20` }
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
                  return (
                    <div className="relative h-40 flex items-center justify-center" style={{ background: t.preview }}>
                      <div style={{ width: `${(boxW / cW * 100).toFixed(1)}%`, height: `${(boxH / cH * 100).toFixed(1)}%`, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'monospace', userSelect: 'none' }}>{t.size}</span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: '#fff', border: `2px solid ${currentGroupData?.hex || '#9F48CE'}` }}>
                          <Check className="w-3.5 h-3.5" style={{ color: currentGroupData?.hex || '#9F48CE' }} />
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
              style={{ backgroundColor: currentGroupData?.hex || '#9F48CE', boxShadow: `0 8px 24px ${currentGroupData?.hex || '#9F48CE'}55` }}
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
