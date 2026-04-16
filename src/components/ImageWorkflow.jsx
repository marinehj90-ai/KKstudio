/**
 * ImageWorkflow — 이미지 입력(Step 2) + 에디터(Step 3) 공유 컴포넌트
 *
 * Props:
 *   selectedTemplateIds  — 선택된 template id 배열
 *   allTemplates         — 모든 template 객체 배열 (flat)
 *   onBack               — "템플릿 다시 선택" 클릭 콜백
 *   toggleTemplate       — 선택 태그 X 클릭 시 콜백
 */
import { useState, useCallback } from 'react'
import {
  Upload, Link2, ArrowLeft, ArrowRight, Check, Download, RefreshCw,
  X, Palette, ZoomIn, Eraser, Expand, Wand2, Eye, Sparkles, ChevronDown,
} from 'lucide-react'

const STEP_IMAGE = 0
const STEP_EDITOR = 1

export default function ImageWorkflow({ selectedTemplateIds, allTemplates, onBack, toggleTemplate }) {
  const [step, setStep] = useState(STEP_IMAGE)
  const [inputMode, setInputMode] = useState('upload')
  const [urlInput, setUrlInput] = useState('')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGenerated, setIsGenerated] = useState(false)
  const [activePreviewTab, setActivePreviewTab] = useState(0)

  const selectedTemplateDetails = allTemplates.filter((t) => selectedTemplateIds.includes(t.id))

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

  // ── Step Indicator (2, 3만 표시) ──
  const steps = [
    { label: '이미지 입력', s: STEP_IMAGE },
    { label: '에디터', s: STEP_EDITOR },
  ]

  return (
    <div>
      {/* Step Indicator */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center gap-2">
          {/* Step 1 — 완료 표시 */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-primary-50 text-primary-700"
          >
            <Check className="w-3.5 h-3.5" />
            1. 템플릿 선택
          </button>

          {steps.map(({ label, s }, i) => (
            <div key={s} className="flex items-center gap-2">
              <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90" />
              <button
                onClick={() => {
                  if (s === STEP_IMAGE) setStep(s)
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
                {i + 2}. {label}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6">
        {/* ══ STEP 2: 이미지 입력 ══ */}
        {step === STEP_IMAGE && (
          <div className="max-w-2xl mx-auto">
            <button
              onClick={onBack}
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

        {/* ══ STEP 3: 에디터 ══ */}
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
              <div className="relative overflow-hidden border border-gray-200 bg-white shadow-sm">
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
                    {uploadedImage?.url && (
                      <div className="absolute bottom-4 right-4 w-24 h-24 rounded-xl overflow-hidden shadow-2xl ring-2 ring-white/30">
                        <img src={uploadedImage.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 flex items-center justify-center p-6">
                    {(() => {
                      const currentTemplate = selectedTemplateDetails[activePreviewTab]
                      const [w, h] = currentTemplate?.size?.split('×').map(Number) || [16, 9]
                      return (
                        <div
                          className="relative overflow-hidden shadow-inner border border-gray-200 bg-white"
                          style={{
                            aspectRatio: `${w} / ${h}`,
                            maxHeight: '480px',
                            width: h >= w ? 'auto' : '100%',
                            height: h >= w ? '480px' : 'auto',
                          }}
                        >
                          {uploadedImage?.url ? (
                            <img
                              src={uploadedImage.url}
                              alt="미리보기"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <Wand2 className="w-10 h-10 text-gray-300 mb-2" />
                              <p className="text-sm text-gray-400">생성 버튼을 눌러주세요</p>
                            </div>
                          )}
                          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/40 text-white text-xs font-mono">
                            {currentTemplate?.size}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              {isGenerated && (
                <div className="flex gap-3 mt-4">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all">
                    <Download className="w-4 h-4" />
                    다운로드
                  </button>
                  <button
                    onClick={() => { setIsGenerated(false); handleGenerate() }}
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
              {!isGenerated && !isGenerating && (
                <button
                  onClick={handleGenerate}
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-primary-600 to-purple-500 text-white rounded-xl font-semibold shadow-lg shadow-primary-200 hover:shadow-xl transition-all hover:scale-[1.01]"
                >
                  <Sparkles className="w-4 h-4" />
                  AI 이미지 생성
                </button>
              )}

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
