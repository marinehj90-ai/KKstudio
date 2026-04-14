import { useState, useCallback } from 'react'
import {
  Search, Upload, Link2, ArrowRight, ArrowLeft, Check, Download, RefreshCw,
  Sparkles, Image, Layers, CalendarRange, Monitor, Smartphone, Globe,
  X, ChevronDown, Palette, Type, ZoomIn, Eraser, Expand, Wand2, Eye
} from 'lucide-react'

// ── Template Data ──
const templateGroups = [
  {
    id: 'banner',
    label: '배너',
    icon: Layers,
    color: 'from-violet-500 to-purple-600',
    templates: [
      { id: 'b1', name: '최상단 띠배너 (PC)', size: '1712×80', device: 'PC', preview: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' },
      { id: 'b2', name: '최상단 띠배너 (MO)', size: '1536×140', device: 'MO', preview: 'linear-gradient(135deg, #8b5cf6 0%, #c4b5fd 100%)' },
      { id: 'b3', name: '메인 대배너', size: '750×750', device: '공통', preview: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 50%, #c084fc 100%)' },
      { id: 'b4', name: 'PC 와이드 대배너', size: '1440×480', device: 'PC', preview: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)' },
      { id: 'b5', name: '통컨 기본배너', size: '750×750', device: '공통', preview: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)' },
      { id: 'b6', name: '통컨 띠배너 A (MO)', size: '750×140', device: 'MO', preview: 'linear-gradient(135deg, #9333ea 0%, #d8b4fe 100%)' },
      { id: 'b7', name: '통컨 띠배너 B (PC)', size: '1520×130', device: 'PC', preview: 'linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)' },
      { id: 'b8', name: '브랜드 필수배너 (로고)', size: '320×120', device: '공통', preview: 'linear-gradient(135deg, #581c87 0%, #9333ea 100%)' },
      { id: 'b9', name: '브랜드 필수배너 (이미지)', size: '750×750', device: '공통', preview: 'linear-gradient(135deg, #6b21a8 0%, #a855f7 100%)' },
      { id: 'b10', name: '메인 팝업 공지', size: '750×560', device: '공통', preview: 'linear-gradient(135deg, #7e22ce 0%, #c084fc 100%)' },
      { id: 'b11', name: '메인 팝업 프로모션', size: '750×560', device: '공통', preview: 'linear-gradient(135deg, #9333ea 0%, #e9d5ff 100%)' },
      { id: 'b12', name: '메인 퀵메뉴 이미지', size: '300×300', device: '공통', preview: 'linear-gradient(135deg, #a855f7 0%, #f3e8ff 100%)' },
    ],
  },
  {
    id: 'product',
    label: '상품이미지',
    icon: Image,
    color: 'from-fuchsia-500 to-pink-600',
    templates: [
      { id: 'p1', name: '상품 대표이미지', size: '1500×1500', device: '공통', preview: 'linear-gradient(135deg, #d946ef 0%, #f0abfc 100%)' },
      { id: 'p2', name: 'GWP 대표이미지', size: '1500×1500', device: '공통', preview: 'linear-gradient(135deg, #c026d3 0%, #e879f9 100%)' },
    ],
  },
  {
    id: 'exhibition',
    label: '기획전',
    icon: CalendarRange,
    color: 'from-indigo-500 to-blue-600',
    templates: [
      { id: 'e1', name: '기획전 썸네일', size: '750×750', device: '공통', preview: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' },
      { id: 'e2', name: '기획전 상단 비주얼 (PC)', size: '1440×500', device: 'PC', preview: 'linear-gradient(135deg, #4f46e5 0%, #a5b4fc 100%)' },
      { id: 'e3', name: '기획전 상단 비주얼 (MO)', size: '750×500', device: 'MO', preview: 'linear-gradient(135deg, #4338ca 0%, #818cf8 100%)' },
    ],
  },
  {
    id: 'event',
    label: '이벤트·상세',
    icon: Sparkles,
    color: 'from-amber-500 to-orange-600',
    templates: [
      { id: 'ev1', name: '이벤트 상세 상단', size: '860×400', device: '공통', preview: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
      { id: 'ev2', name: '상세페이지 대표이미지', size: '860×860', device: '공통', preview: 'linear-gradient(135deg, #d97706 0%, #fcd34d 100%)' },
      { id: 'ev3', name: '상세 섹션 컷', size: '860×400', device: '공통', preview: 'linear-gradient(135deg, #b45309 0%, #fbbf24 100%)' },
    ],
  },
]

// ── Step constants ──
const STEP_TEMPLATES = 0
const STEP_IMAGE = 1
const STEP_EDITOR = 2

export default function Home() {
  const [step, setStep] = useState(STEP_TEMPLATES)
  const [selectedTemplates, setSelectedTemplates] = useState([])
  const [activeGroup, setActiveGroup] = useState('banner')
  const [searchQuery, setSearchQuery] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('전체')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [inputMode, setInputMode] = useState('upload') // 'upload' | 'url'
  const [urlInput, setUrlInput] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [activePreviewTab, setActivePreviewTab] = useState(0)

  const toggleTemplate = (id) => {
    setSelectedTemplates((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    )
  }

  const currentGroup = templateGroups.find((g) => g.id === activeGroup)
  const filteredTemplates = currentGroup?.templates.filter((t) => {
    const matchSearch = !searchQuery || t.name.includes(searchQuery)
    const matchDevice = deviceFilter === '전체' || t.device === deviceFilter || t.device === '공통'
    return matchSearch && matchDevice
  })

  const selectedTemplateDetails = templateGroups
    .flatMap((g) => g.templates)
    .filter((t) => selectedTemplates.includes(t.id))

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      setIsGenerated(true)
    }, 2500)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files[0]
    if (file && file.type.startsWith('image/')) {
      setUploadedImage({ name: file.name, url: URL.createObjectURL(file) })
    }
  }, [])

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) {
      setUploadedImage({ name: file.name, url: URL.createObjectURL(file) })
    }
  }

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary-600 via-primary-500 to-purple-400">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-20 w-32 h-32 rounded-full bg-white/20 blur-2xl" />
          <div className="absolute bottom-5 right-40 w-48 h-48 rounded-full bg-purple-300/30 blur-3xl" />
          <div className="absolute top-5 right-20 w-24 h-24 rounded-full bg-pink-300/20 blur-2xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-8 py-10">
          <p className="inline-block px-3 py-1 mb-3 text-xs font-bold text-primary-700 bg-white/90 rounded-full">
            AI-POWERED
          </p>
          <h1 className="text-3xl font-extrabold text-white leading-tight mb-2">
            온라인몰 이미지,<br />AI로 빠르게 만들어 보세요
          </h1>
          <p className="text-primary-100 text-sm max-w-lg">
            상품 사진 하나로 배너, 기획전, 상세페이지까지. 템플릿을 선택하고 이미지를 올리면 끝.
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center gap-2">
          {[
            { label: '템플릿 선택', s: STEP_TEMPLATES },
            { label: '이미지 입력', s: STEP_IMAGE },
            { label: '에디터', s: STEP_EDITOR },
          ].map(({ label, s }, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90" />}
              <button
                onClick={() => {
                  if (s === STEP_TEMPLATES) setStep(s)
                  if (s === STEP_IMAGE && selectedTemplates.length > 0) setStep(s)
                  if (s === STEP_EDITOR && uploadedImage) setStep(s)
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  step === s
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                    : step > s
                    ? 'bg-primary-50 text-primary-700'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {step > s ? <Check className="w-3.5 h-3.5" /> : null}
                <span>
                  {i + 1}. {label}
                </span>
                {s === STEP_TEMPLATES && selectedTemplates.length > 0 && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-white/20 text-xs flex items-center justify-center">
                    {selectedTemplates.length}
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6">
        {/* ══════════════════════════════════════════════════
            STEP 1: 템플릿 선택
        ══════════════════════════════════════════════════ */}
        {step === STEP_TEMPLATES && (
          <div>
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

            {/* Group Tabs */}
            <div className="flex gap-2 mb-6">
              {templateGroups.map((g) => {
                const Icon = g.icon
                const count = g.templates.filter((t) => selectedTemplates.includes(t.id)).length
                return (
                  <button
                    key={g.id}
                    onClick={() => setActiveGroup(g.id)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      activeGroup === g.id
                        ? 'bg-gradient-to-r ' + g.color + ' text-white shadow-lg shadow-primary-200/50'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {g.label}
                    {count > 0 && (
                      <span className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                        activeGroup === g.id ? 'bg-white/20' : 'bg-primary-100 text-primary-700'
                      }`}>
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
                    className={`group relative rounded-2xl overflow-hidden border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary-500 shadow-lg shadow-primary-100 ring-2 ring-primary-200'
                        : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                    }`}
                  >
                    {/* Preview */}
                    <div
                      className="aspect-[4/3] relative"
                      style={{ background: t.preview }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-white/60 text-xs font-mono">{t.size}</span>
                      </div>
                      {/* Selection badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center shadow-md">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      {/* Device badge */}
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/30 text-white text-xs font-medium">
                        {t.device}
                      </div>
                    </div>
                    {/* Info */}
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
                  onClick={() => setStep(STEP_IMAGE)}
                  className="flex items-center gap-2 px-8 py-3.5 bg-primary-600 text-white rounded-2xl font-semibold shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all hover:scale-[1.02]"
                >
                  {selectedTemplates.length}개 템플릿 선택 완료
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 2: 이미지 입력
        ══════════════════════════════════════════════════ */}
        {step === STEP_IMAGE && (
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setStep(STEP_TEMPLATES)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> 템플릿 다시 선택
            </button>

            {/* Selected templates summary */}
            <div className="mb-6 p-4 bg-primary-50 rounded-2xl">
              <p className="text-sm font-semibold text-primary-700 mb-2">
                선택한 템플릿 ({selectedTemplateDetails.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedTemplateDetails.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-xs font-medium text-primary-700 border border-primary-200"
                  >
                    {t.name}
                    <button onClick={() => toggleTemplate(t.id)} className="ml-1 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setInputMode('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
                  inputMode === 'upload'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                이미지 업로드
              </button>
              <button
                onClick={() => setInputMode('url')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${
                  inputMode === 'url'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <Link2 className="w-4 h-4" />
                상품 URL 입력
              </button>
            </div>

            {/* Upload Area */}
            {inputMode === 'upload' && (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="relative border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-all cursor-pointer"
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileInput}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {uploadedImage ? (
                  <div>
                    <div className="w-32 h-32 mx-auto mb-4 rounded-xl overflow-hidden shadow-lg">
                      <img src={uploadedImage.url} alt="" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">{uploadedImage.name}</p>
                    <p className="text-xs text-primary-600 mt-1">클릭하여 다른 파일 선택</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-100 flex items-center justify-center">
                      <Upload className="w-7 h-7 text-primary-500" />
                    </div>
                    <p className="text-base font-semibold text-gray-700 mb-1">
                      상품 이미지를 드래그하세요
                    </p>
                    <p className="text-sm text-gray-400">
                      또는 클릭하여 파일 선택 · JPG, PNG, WEBP (최대 20MB)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* URL Input */}
            {inputMode === 'url' && (
              <div className="space-y-4">
                <div className="relative">
                  <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    placeholder="상품 URL을 입력하세요 (예: https://...)"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                  />
                </div>
                {urlInput && (
                  <button
                    onClick={() => setUploadedImage({ name: 'URL에서 추출된 이미지', url: null })}
                    className="w-full py-3 bg-primary-100 text-primary-700 rounded-xl text-sm font-medium hover:bg-primary-200 transition-all"
                  >
                    이미지 자동 추출
                  </button>
                )}
              </div>
            )}

            {/* Next */}
            {uploadedImage && (
              <button
                onClick={() => setStep(STEP_EDITOR)}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 bg-primary-600 text-white rounded-2xl font-semibold shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all"
              >
                이미지 생성하기
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            STEP 3: 작업 에디터
        ══════════════════════════════════════════════════ */}
        {step === STEP_EDITOR && (
          <div className="flex gap-6">
            {/* Left: Preview */}
            <div className="flex-1">
              <button
                onClick={() => setStep(STEP_IMAGE)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4"
              >
                <ArrowLeft className="w-4 h-4" /> 이미지 다시 선택
              </button>

              {/* Preview Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto">
                {selectedTemplateDetails.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setActivePreviewTab(i)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activePreviewTab === i
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>

              {/* Preview Canvas */}
              <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
                {isGenerating ? (
                  <div className="aspect-video flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-purple-50">
                    <div className="relative w-16 h-16 mb-4">
                      <div className="absolute inset-0 rounded-full border-4 border-primary-200" />
                      <div className="absolute inset-0 rounded-full border-4 border-primary-600 border-t-transparent animate-spin" />
                    </div>
                    <p className="text-sm font-semibold text-primary-700">AI가 이미지를 생성하고 있어요...</p>
                    <p className="text-xs text-gray-400 mt-1">배경 분리 → 템플릿 적용 → 보정</p>
                  </div>
                ) : isGenerated ? (
                  <div
                    className="aspect-video relative"
                    style={{
                      background: selectedTemplateDetails[activePreviewTab]?.preview ||
                        'linear-gradient(135deg, #7c3aed, #a855f7)',
                    }}
                  >
                    {/* Mock generated result */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Eye className="w-8 h-8 mx-auto mb-2 opacity-60" />
                        <p className="text-lg font-bold opacity-80">
                          {selectedTemplateDetails[activePreviewTab]?.name}
                        </p>
                        <p className="text-sm opacity-50 mt-1">
                          {selectedTemplateDetails[activePreviewTab]?.size}
                        </p>
                      </div>
                    </div>
                    {/* Uploaded product overlay */}
                    {uploadedImage?.url && (
                      <div className="absolute bottom-4 right-4 w-24 h-24 rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/30">
                        <img src={uploadedImage.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <Wand2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">생성 버튼을 눌러주세요</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isGenerated && (
                <div className="flex gap-3 mt-4">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all">
                    <Download className="w-4 h-4" />
                    다운로드
                  </button>
                  <button
                    onClick={() => {
                      setIsGenerated(false)
                      handleGenerate()
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-medium hover:border-primary-300 transition-all"
                  >
                    <RefreshCw className="w-4 h-4" />
                    재생성
                  </button>
                </div>
              )}
            </div>

            {/* Right: Options Panel */}
            <div className="w-80 shrink-0 space-y-4">
              {/* Generate Button */}
              {!isGenerated && !isGenerating && (
                <button
                  onClick={handleGenerate}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary-600 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-primary-200 hover:shadow-xl transition-all hover:scale-[1.01]"
                >
                  <Sparkles className="w-4 h-4" />
                  AI 이미지 생성
                </button>
              )}

              {/* Quick Enhancements */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">빠른 편집</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Eraser, label: '배경 제거' },
                    { icon: Expand, label: '배경 확장' },
                    { icon: ZoomIn, label: '화질 개선' },
                    { icon: Wand2, label: '자동 보정' },
                  ].map(({ icon: Icon, label }) => (
                    <button
                      key={label}
                      className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-gray-100 hover:border-primary-300 hover:bg-primary-50 transition-all"
                    >
                      <Icon className="w-5 h-5 text-gray-500" />
                      <span className="text-xs text-gray-600">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Copy Options */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">카피 자동 삽입</h3>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-600">카피 텍스트 ON/OFF</span>
                  <div className="w-10 h-6 bg-primary-500 rounded-full relative">
                    <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow" />
                  </div>
                </label>
                <input
                  type="text"
                  placeholder="카피 문구 입력..."
                  className="mt-3 w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
              </div>

              {/* Brand Settings */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">브랜드 설정</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">브랜드 컬러</label>
                    <div className="flex gap-2">
                      {['#7c3aed', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'].map((c) => (
                        <button
                          key={c}
                          className="w-7 h-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-all"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <button className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-primary-400">
                        <Palette className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">폰트</label>
                    <select className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30">
                      <option>Pretendard</option>
                      <option>Noto Sans KR</option>
                      <option>Spoqa Han Sans</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Language */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">다국어 동시 제작</h3>
                <div className="flex flex-wrap gap-2">
                  {['한국어', 'English', '日本語', '中文'].map((lang) => (
                    <button
                      key={lang}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        lang === '한국어'
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-primary-300'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Download Options */}
              <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">다운로드 옵션</h3>
                <div className="flex gap-2 mb-3">
                  {['JPG', 'PNG', 'ZIP (일괄)'].map((fmt) => (
                    <button
                      key={fmt}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                        fmt === 'PNG'
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-primary-300'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {['x1', 'x2'].map((s) => (
                    <button
                      key={s}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                        s === 'x1'
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'border-gray-200 text-gray-500 hover:border-primary-300'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
