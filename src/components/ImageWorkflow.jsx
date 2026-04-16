/**
 * ImageWorkflow — 이미지 입력(Step 2) + 에디터(Step 3)
 * - 템플릿별 독립 레이어 상태
 * - 코너 핸들: 비율 고정 리사이즈
 * - 캔버스 overflow:hidden + 핸들은 overflow:visible
 * - 드래그 이동, 회전, Undo/Redo
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Upload, Link2, ArrowLeft, ArrowRight, Check, Download,
  X, Palette, ZoomIn, ZoomOut, Eraser, Expand, Wand2, Sparkles, ChevronDown,
  Undo2, Redo2, ImagePlus, Type, RotateCw,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STEP_IMAGE = 0
const STEP_EDITOR = 1
const HS = 10

const RESIZE_HANDLES = [
  { id: 'nw', cx: 0,   cy: 0,   cursor: 'nw-resize', corner: true  },
  { id: 'n',  cx: 0.5, cy: 0,   cursor: 'n-resize',  corner: false },
  { id: 'ne', cx: 1,   cy: 0,   cursor: 'ne-resize', corner: true  },
  { id: 'e',  cx: 1,   cy: 0.5, cursor: 'e-resize',  corner: false },
  { id: 'se', cx: 1,   cy: 1,   cursor: 'se-resize', corner: true  },
  { id: 's',  cx: 0.5, cy: 1,   cursor: 's-resize',  corner: false },
  { id: 'sw', cx: 0,   cy: 1,   cursor: 'sw-resize', corner: true  },
  { id: 'w',  cx: 0,   cy: 0.5, cursor: 'w-resize',  corner: false },
]

function deg(r) { return (r * 180) / Math.PI }
export default function ImageWorkflow({ selectedTemplateIds, allTemplates, onBack, toggleTemplate }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(STEP_IMAGE)
  const [inputMode, setInputMode] = useState('upload')
  const [urlInput, setUrlInput] = useState('')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [activePreviewTab, setActivePreviewTab] = useState(0)
  const [zoom, setZoom] = useState(75)

  // 템플릿별 독립 레이어: { [templateId]: layers[] }
  const [allLayers, setAllLayers] = useState({})
  // 템플릿별 히스토리: { [templateId]: { history, index } }
  const [allHistory, setAllHistory] = useState({})
  // 템플릿별 배경색: { [templateId]: string }
  const [allBgColors, setAllBgColors] = useState({})
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const activeRef = useRef(null)

  const selectedTemplateDetails = allTemplates.filter((t) => selectedTemplateIds.includes(t.id))
  const currentTemplate = selectedTemplateDetails[activePreviewTab]
  const currentTemplateId = currentTemplate?.id || ''
  const [canvasW, canvasH] = currentTemplate?.size?.split('×').map(Number) || [750, 750]
  const s = zoom / 100

  // 현재 탭 배경색
  const bgColor = allBgColors[currentTemplateId] || '#ffffff'
  const setBgColor = (color) => setAllBgColors((prev) => ({ ...prev, [currentTemplateId]: color }))

  // 현재 탭 레이어만 읽기/쓰기
  const layers = allLayers[currentTemplateId] || []
  const selectedLayer = layers.find((l) => l.id === selectedLayerId)

  const setLayers = useCallback((newLayers) => {
    setAllLayers((prev) => ({ ...prev, [currentTemplateId]: newLayers }))
  }, [currentTemplateId])

  const getHistory = () => allHistory[currentTemplateId] || { history: [[]], index: 0 }

  const commitHistory = useCallback((newLayers) => {
    setAllHistory((prev) => {
      const cur = prev[currentTemplateId] || { history: [[]], index: 0 }
      const next = cur.history.slice(0, cur.index + 1)
      next.push(JSON.parse(JSON.stringify(newLayers)))
      return { ...prev, [currentTemplateId]: { history: next, index: next.length - 1 } }
    })
  }, [currentTemplateId])

  const updateLayers = (newLayers) => { setLayers(newLayers); commitHistory(newLayers) }

  const undo = () => {
    const { history, index } = getHistory()
    if (index <= 0) return
    const ni = index - 1
    setLayers(JSON.parse(JSON.stringify(history[ni])))
    setAllHistory((prev) => ({ ...prev, [currentTemplateId]: { history, index: ni } }))
  }
  const redo = () => {
    const { history, index } = getHistory()
    if (index >= history.length - 1) return
    const ni = index + 1
    setLayers(JSON.parse(JSON.stringify(history[ni])))
    setAllHistory((prev) => ({ ...prev, [currentTemplateId]: { history, index: ni } }))
  }

  const { index: histIdx, history: hist } = getHistory()

  /* ── 파일 업로드 ── */
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files[0]
    if (file && file.type.startsWith('image/')) setUploadedImage({ name: file.name, url: URL.createObjectURL(file) })
  }, [])
  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) setUploadedImage({ name: file.name, url: URL.createObjectURL(file) })
  }

  /* ── 에디터 진입 시 모든 템플릿에 초기 레이어 세팅 ── */
  useEffect(() => {
    if (step !== STEP_EDITOR || !uploadedImage?.url) return
    const img = new Image()
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight
      const initAllLayers = {}
      const initAllHistory = {}
      selectedTemplateDetails.forEach((t) => {
        const [w, h] = t.size.split('×').map(Number)
        const maxW = Math.round(w * 0.7)
        const maxH = Math.round(h * 0.7)
        let imgW, imgH
        if (ratio > maxW / maxH) { imgW = maxW; imgH = Math.round(maxW / ratio) }
        else { imgH = maxH; imgW = Math.round(maxH * ratio) }
        const init = [{ id: 'img-1', type: 'image', src: uploadedImage.url, x: Math.round((w - imgW) / 2), y: Math.round((h - imgH) / 2), width: imgW, height: imgH, rotation: 0 }]
        initAllLayers[t.id] = init
        initAllHistory[t.id] = { history: [JSON.parse(JSON.stringify(init))], index: 0 }
      })
      setAllLayers(initAllLayers)
      setAllHistory(initAllHistory)
      setSelectedLayerId('img-1')
    }
    img.src = uploadedImage.url
  }, [step])

  /* ── 드래그 이동 ── */
  const onMouseDownLayer = (e, id) => {
    e.stopPropagation()
    setSelectedLayerId(id)
    const layer = layers.find((l) => l.id === id)
    const s = zoom / 100
    activeRef.current = { type: 'move', id, startMouseX: e.clientX, startMouseY: e.clientY, origX: layer.x, origY: layer.y }

    const onMove = (ev) => {
      if (!activeRef.current) return
      const { origX, origY, startMouseX, startMouseY } = activeRef.current
      const nx = Math.round(origX + (ev.clientX - startMouseX) / s)
      const ny = Math.round(origY + (ev.clientY - startMouseY) / s)
      setLayers(layers.map((l) => l.id === id ? { ...l, x: nx, y: ny } : l))
    }
    const onUp = () => {
      const cur = allLayers[currentTemplateId] || []
      commitHistory(cur)
      activeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  /* ── 리사이즈 ── */
  const onMouseDownResize = (e, id, handle, isCorner) => {
    e.stopPropagation()
    e.preventDefault()
    const layer = layers.find((l) => l.id === id)
    const sc = zoom / 100
    const { width: ow, height: oh, x: ox, y: oy } = layer
    const aspect = ow / oh

    const onMove = (ev) => {
      const dx = Math.round((ev.clientX - e.clientX) / sc)
      const dy = Math.round((ev.clientY - e.clientY) / sc)
      setLayers(layers.map((l) => {
        if (l.id !== id) return l
        let nw = ow, nh = oh, nx = ox, ny = oy

        if (isCorner) {
          // 코너: 비율 고정 (더 큰 delta 기준)
          if (handle === 'se') {
            nw = Math.max(20, ow + dx)
            nh = Math.round(nw / aspect)
          } else if (handle === 'sw') {
            nw = Math.max(20, ow - dx)
            nh = Math.round(nw / aspect)
            nx = ox + (ow - nw)
          } else if (handle === 'ne') {
            nw = Math.max(20, ow + dx)
            nh = Math.round(nw / aspect)
            ny = oy + (oh - nh)
          } else if (handle === 'nw') {
            nw = Math.max(20, ow - dx)
            nh = Math.round(nw / aspect)
            nx = ox + (ow - nw)
            ny = oy + (oh - nh)
          }
        } else {
          // 사이드: 자유 조절
          if (handle.includes('e')) nw = Math.max(20, ow + dx)
          if (handle.includes('s')) nh = Math.max(20, oh + dy)
          if (handle.includes('w')) { nw = Math.max(20, ow - dx); nx = ox + (ow - nw) }
          if (handle.includes('n')) { nh = Math.max(20, oh - dy); ny = oy + (oh - nh) }
        }
        return { ...l, width: nw, height: nh, x: nx, y: ny }
      }))
    }
    const onUp = () => {
      const cur = allLayers[currentTemplateId] || []
      commitHistory(cur)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  /* ── 회전 ── */
  const onMouseDownRotate = (e, id) => {
    e.stopPropagation()
    e.preventDefault()
    const layer = layers.find((l) => l.id === id)
    const s = zoom / 100
    // 레이어 중심 (화면 좌표)
    const cx = layer.x * s + (layer.width * s) / 2
    const cy = layer.y * s + (layer.height * s) / 2
    // 캔버스 DOM 위치 얻기
    const canvasEl = document.getElementById('editor-canvas')
    const rect = canvasEl ? canvasEl.getBoundingClientRect() : { left: 0, top: 0 }
    const absCx = rect.left + cx
    const absCy = rect.top + cy

    activeRef.current = { type: 'rotate', id, absCx, absCy, startRot: layer.rotation || 0 }

    const startAngle = Math.atan2(e.clientY - absCy, e.clientX - absCx)

    const onMove = (ev) => {
      if (!activeRef.current) return
      const { absCx: acx, absCy: acy, startRot } = activeRef.current
      const angle = Math.atan2(ev.clientY - acy, ev.clientX - acx)
      const delta = deg(angle - startAngle)
      const newRot = ((startRot + delta) % 360 + 360) % 360
      setLayers(layers.map((l) => l.id === id ? { ...l, rotation: Math.round(newRot) } : l))
    }
    const onUp = () => {
      const cur = allLayers[currentTemplateId] || []
      commitHistory(cur)
      activeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  /* ── 레이어 추가 - 현재 탭에만 ── */
  const addImageLayer = (file) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const id = `img-${Date.now()}`
    const img = new Image()
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight
      const maxW = Math.round(canvasW * 0.5)
      const maxH = Math.round(canvasH * 0.5)
      let imgW, imgH
      if (ratio > maxW / maxH) { imgW = maxW; imgH = Math.round(maxW / ratio) }
      else { imgH = maxH; imgW = Math.round(maxH * ratio) }
      const newLayer = { id, type: 'image', src: url, x: Math.round((canvasW - imgW) / 2), y: Math.round((canvasH - imgH) / 2), width: imgW, height: imgH, rotation: 0 }
      const newLayers = [...layers, newLayer]
      updateLayers(newLayers)
      setSelectedLayerId(id)
    }
    img.src = url
  }
  const addTextLayer = () => {
    const id = `text-${Date.now()}`
    const newLayers = [...layers, { id, type: 'text', text: '텍스트 입력', x: Math.round(canvasW * 0.1), y: Math.round(canvasH * 0.4), width: 220, height: 50, rotation: 0, fontSize: 24, color: '#000000' }]
    updateLayers(newLayers)
    setSelectedLayerId(id)
  }

  return (
    <div>
      {/* ══ STEP 2 상단바 ══ */}
      {step === STEP_IMAGE && (
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-8 py-3 flex items-center gap-2">
            <button onClick={onBack} className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-primary-50 text-primary-700">
              <Check className="w-3.5 h-3.5" /> 1. 템플릿 선택
            </button>
            <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90" />
            <span className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-primary-600 text-white shadow-md shadow-primary-200">2. 이미지 입력</span>
            <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90" />
            <span className="px-4 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-400">3. 에디터</span>
          </div>
        </div>
      )}

      {/* ══ STEP 2: 이미지 입력 ══ */}
      {step === STEP_IMAGE && (
        <div className="px-8 py-6 max-w-2xl">
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-4">
            <ArrowLeft className="w-4 h-4" /> 템플릿 다시 선택
          </button>
          <div className="mb-6 p-4 bg-primary-50 rounded-2xl">
            <p className="text-sm font-semibold text-primary-700 mb-2">선택한 템플릿 ({selectedTemplateDetails.length})</p>
            <div className="flex flex-wrap gap-2">
              {selectedTemplateDetails.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-xs font-medium text-primary-700 border border-primary-200">
                  {t.name}
                  <button onClick={() => toggleTemplate(t.id)} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mb-6">
            <button onClick={() => setInputMode('upload')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${inputMode === 'upload' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>
              <Upload className="w-4 h-4" /> 이미지 업로드
            </button>
            <button onClick={() => setInputMode('url')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${inputMode === 'url' ? 'bg-primary-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}>
              <Link2 className="w-4 h-4" /> 상품 URL 입력
            </button>
          </div>
          {inputMode === 'upload' && (
            <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="relative border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-primary-400 hover:bg-primary-50/30 transition-all cursor-pointer">
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileInput} className="absolute inset-0 opacity-0 cursor-pointer" />
              {uploadedImage ? (
                <div>
                  <div className="mx-auto mb-4 overflow-hidden shadow-lg max-h-64 max-w-full inline-block">
                    <img src={uploadedImage.url} alt="" className="max-h-64 max-w-full w-auto h-auto object-contain" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">{uploadedImage.name}</p>
                  <p className="text-xs text-primary-600 mt-1">클릭하여 다른 파일 선택</p>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-100 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-primary-500" />
                  </div>
                  <p className="text-base font-semibold text-gray-700 mb-1">상품 이미지를 드래그하세요</p>
                  <p className="text-sm text-gray-400">또는 클릭하여 파일 선택 · JPG, PNG, WEBP (최대 20MB)</p>
                </div>
              )}
            </div>
          )}
          {inputMode === 'url' && (
            <div className="space-y-4">
              <div className="relative">
                <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="url" placeholder="상품 URL을 입력하세요" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30" />
              </div>
              {urlInput && (
                <button onClick={() => setUploadedImage({ name: 'URL 이미지', url: null })} className="w-full py-3 bg-primary-100 text-primary-700 rounded-xl text-sm font-medium hover:bg-primary-200 transition-all">이미지 자동 추출</button>
              )}
            </div>
          )}
          {uploadedImage && (
            <button onClick={() => setStep(STEP_EDITOR)} className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 bg-primary-600 text-white rounded-2xl font-semibold shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all">
              이미지 생성하기 <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ══ STEP 3: 에디터 ══ */}
      {step === STEP_EDITOR && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#f1f0f5' }}>

          {/* 상단 툴바 */}
          <div className="shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
            {/* 좌: 로고 + 스텝 */}
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#9F48CE,#C084FC)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800">KK Studio</span>
              </button>
              <span className="text-gray-300">›</span>
              <button onClick={onBack} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-all flex items-center gap-1">
                <Check className="w-3 h-3" /> 1. 템플릿 선택
              </button>
              <span className="text-gray-300">›</span>
              <button onClick={() => setStep(STEP_IMAGE)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 transition-all flex items-center gap-1">
                <Check className="w-3 h-3" /> 2. 이미지 입력
              </button>
              <span className="text-gray-300">›</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-600 text-white">3. 에디터</span>
            </div>

            {/* 중앙: undo/redo + 추가 */}
            <div className="flex items-center gap-1">
              <button onClick={undo} disabled={histIdx <= 0} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition-all" title="실행취소">
                <Undo2 className="w-4 h-4" />
              </button>
              <button onClick={redo} disabled={histIdx >= hist.length - 1} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition-all" title="다시실행">
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-gray-200 mx-2" />
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer transition-all">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => addImageLayer(e.target.files[0])} />
                <ImagePlus className="w-4 h-4" /> 이미지 추가
              </label>
              <button onClick={addTextLayer} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-all">
                <Type className="w-4 h-4" /> 텍스트 추가
              </button>
            </div>

            {/* 우: 다운로드 */}
            <button className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg,#9F48CE,#C084FC)' }}>
              <Download className="w-4 h-4" /> 다운로드
            </button>
          </div>

          {/* 본문 */}
          <div className="flex flex-1 overflow-hidden">

            {/* 왼쪽 툴 패널 */}
            <div className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
              <div className="p-4 space-y-4">
                <button onClick={() => setStep(STEP_IMAGE)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
                  <ArrowLeft className="w-4 h-4" /> 이미지 다시 선택
                </button>

                {/* 빠른 편집 */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">빠른 편집</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[{icon: Eraser, label: '배경 제거'},{icon: Expand, label: '배경 확장'},{icon: ZoomIn, label: '화질 개선'},{icon: Wand2, label: '자동 보정'}].map(({ icon: Icon, label }) => (
                      <button key={label} className="flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all">
                        <Icon className="w-5 h-5 text-gray-500" />
                        <span className="text-xs text-gray-600">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 선택 레이어: 회전 슬라이더 */}
                {selectedLayer && (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">선택 객체</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCw className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">회전</span>
                      <input type="range" min={0} max={359} value={selectedLayer.rotation || 0}
                        onChange={(e) => setLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, rotation: Number(e.target.value) } : l))}
                        onMouseUp={() => commitHistory(layers)}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono text-gray-600 w-8">{selectedLayer.rotation || 0}°</span>
                    </div>
                    {selectedLayer.type === 'text' && (
                      <div className="space-y-2 mt-2">
                        <textarea value={selectedLayer.text}
                          onChange={(e) => setLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, text: e.target.value } : l))}
                          onBlur={() => commitHistory(layers)}
                          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none resize-none" rows={2}
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">크기</span>
                          <input type="number" value={selectedLayer.fontSize} min={8} max={200}
                            onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, fontSize: Number(e.target.value) } : l))}
                            className="w-16 px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white"
                          />
                          <span className="text-xs text-gray-500">색</span>
                          <input type="color" value={selectedLayer.color}
                            onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, color: e.target.value } : l))}
                            className="w-8 h-7 rounded border border-gray-200 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}
                    <button onClick={() => { const nl = layers.filter((l) => l.id !== selectedLayerId); updateLayers(nl); setSelectedLayerId(null) }}
                      className="mt-2 w-full py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50 border border-red-200 transition-all">
                      삭제
                    </button>
                  </div>
                )}

                {/* 배경색 설정 */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">배경색</h3>
                    <button onClick={() => setBgColor('#ffffff')} className="text-xs text-gray-400 hover:text-primary-600 transition-all">초기화</button>
                  </div>
                  {/* 프리셋 */}
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {['#ffffff','#000000','#f8f7fc','#F3E8FF','#EDE9F8','#FEF0E8','#FEF7E6','#1a1a2e'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setBgColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-md hover:scale-110 transition-all ${bgColor === c ? 'ring-2 ring-primary-500 ring-offset-1' : 'border border-gray-200'}`}
                      />
                    ))}
                  </div>
                  {/* HEX 입력 + 컬러피커 */}
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
                    <label className="cursor-pointer shrink-0" style={{ position: 'relative', width: 20, height: 20 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: bgColor, border: '1px solid #e5e7eb' }} />
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      />
                    </label>
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBgColor(e.target.value) }}
                      className="flex-1 text-sm bg-transparent focus:outline-none font-mono text-gray-700"
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                {/* 카피 자동 삽입 */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">카피 자동 삽입</h3>
                  <label className="flex items-center justify-between cursor-pointer mb-2">
                    <span className="text-sm text-gray-600">카피 텍스트 ON/OFF</span>
                    <div className="w-10 h-6 bg-primary-500 rounded-full relative">
                      <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow" />
                    </div>
                  </label>
                  <input type="text" placeholder="카피 문구 입력..." className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none" />
                </div>

                {/* 브랜드 설정 */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">브랜드 설정</h3>
                  <div className="flex gap-2 mb-3">
                    {['#7c3aed','#ec4899','#f59e0b','#10b981','#3b82f6'].map((c) => (
                      <button key={c} className="w-7 h-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-all" style={{ backgroundColor: c }} />
                    ))}
                    <button className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <Palette className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                  <select className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white">
                    <option>Pretendard</option>
                    <option>Noto Sans KR</option>
                  </select>
                </div>

                {/* 다국어 */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">다국어 동시 제작</h3>
                  <div className="flex flex-wrap gap-2">
                    {['한국어','English','日本語','中文'].map((lang) => (
                      <button key={lang} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${lang === '한국어' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500'}`}>{lang}</button>
                    ))}
                  </div>
                </div>

                {/* 다운로드 옵션 */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">다운로드 옵션</h3>
                  <div className="flex gap-2 mb-2">
                    {['JPG','PNG','ZIP'].map((fmt) => (
                      <button key={fmt} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${fmt === 'PNG' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500'}`}>{fmt}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {['x1','x2'].map((sc) => (
                      <button key={sc} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${sc === 'x1' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500'}`}>{sc}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 캔버스 */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* 캔버스 상단: 템플릿 탭 */}
              <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-2 flex gap-2 overflow-x-auto">
                {selectedTemplateDetails.map((t, i) => (
                  <button
                    key={t.id}
                    onClick={() => setActivePreviewTab(i)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-all ${activePreviewTab === i ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {t.name} <span className={`ml-1 text-xs ${activePreviewTab === i ? 'text-white/70' : 'text-gray-400'}`}>{t.size}</span>
                  </button>
                ))}
              </div>

              {/* 캔버스 스크롤 영역 */}
              <div
                className="flex-1 overflow-auto flex items-center justify-center p-12"
                onClick={() => setSelectedLayerId(null)}
              >
                {/* 캔버스 wrapper - 상대 위치 기준 */}
                <div style={{ position: 'relative', flexShrink: 0 }}>

                  {/* ① 실제 캔버스: overflow hidden → 이미지 프레임 밖으로 나가면 잘림 */}
                  <div
                    id="editor-canvas"
                    style={{
                      position: 'relative',
                      width: canvasW * s,
                      height: canvasH * s,
                      background: bgColor,
                      border: '1px solid #e5e7eb',
                      overflow: 'hidden',
                    }}
                  >
                    {layers.map((layer) => (
                      <div
                        key={layer.id}
                        onMouseDown={(e) => onMouseDownLayer(e, layer.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          left: layer.x * s,
                          top: layer.y * s,
                          width: layer.width * s,
                          height: layer.height * s,
                          transform: `rotate(${layer.rotation || 0}deg)`,
                          transformOrigin: 'center center',
                          cursor: 'move',
                          userSelect: 'none',
                          zIndex: layer.id === selectedLayerId ? 10 : 1,
                        }}
                      >
                        {layer.type === 'image' && (
                          <img src={layer.src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }} />
                        )}
                        {layer.type === 'text' && (
                          <div style={{ width: '100%', height: '100%', fontSize: layer.fontSize * s, color: layer.color, display: 'flex', alignItems: 'center', whiteSpace: 'pre-wrap', wordBreak: 'break-all', pointerEvents: 'none' }}>
                            {layer.text}
                          </div>
                        )}
                      </div>
                    ))}
                    <div style={{ position: 'absolute', bottom: 6, right: 8, background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', pointerEvents: 'none', zIndex: 30 }}>
                      {currentTemplate?.size}
                    </div>
                  </div>

                  {/* ② 투명 클릭 레이어: overflow visible → 프레임 밖 레이어도 선택 가능 */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW * s, height: canvasH * s, overflow: 'visible', pointerEvents: 'none', zIndex: 50 }}>
                    {layers.map((layer) => (
                      <div
                        key={`hit-${layer.id}`}
                        onMouseDown={(e) => onMouseDownLayer(e, layer.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          left: layer.x * s,
                          top: layer.y * s,
                          width: layer.width * s,
                          height: layer.height * s,
                          transform: `rotate(${layer.rotation || 0}deg)`,
                          transformOrigin: 'center center',
                          cursor: 'move',
                          pointerEvents: 'all',
                          background: 'transparent',
                        }}
                      />
                    ))}
                  </div>

                  {/* ② 핸들 오버레이: overflow visible → 핸들이 프레임 밖에서도 보임 */}
                  {selectedLayer && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW * s, height: canvasH * s, pointerEvents: 'none', overflow: 'visible', zIndex: 100 }}>
                      <div
                        style={{
                          position: 'absolute',
                          left: selectedLayer.x * s,
                          top: selectedLayer.y * s,
                          width: selectedLayer.width * s,
                          height: selectedLayer.height * s,
                          transform: `rotate(${selectedLayer.rotation || 0}deg)`,
                          transformOrigin: 'center center',
                          pointerEvents: 'none',
                        }}
                      >
                        {/* 보라 테두리 */}
                        <div style={{ position: 'absolute', inset: -1, border: '2px solid #9F48CE', pointerEvents: 'none' }} />

                        {/* 리사이즈 핸들 */}
                        {RESIZE_HANDLES.map((h) => (
                          <div
                            key={h.id}
                            onMouseDown={(e) => onMouseDownResize(e, selectedLayer.id, h.id, h.corner)}
                            style={{
                              position: 'absolute',
                              left: `calc(${h.cx * 100}% - ${HS / 2}px)`,
                              top: `calc(${h.cy * 100}% - ${HS / 2}px)`,
                              width: HS, height: HS,
                              background: '#ffffff',
                              border: '2px solid #9F48CE',
                              borderRadius: '50%',
                              cursor: h.cursor,
                              pointerEvents: 'all',
                              zIndex: 110,
                            }}
                          />
                        ))}

                        {/* 회전 연결선 */}
                        <div style={{ position: 'absolute', left: '50%', top: -22, width: 1, height: 20, background: '#9F48CE', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
                        {/* 회전 핸들 */}
                        <div
                          onMouseDown={(e) => onMouseDownRotate(e, selectedLayer.id)}
                          style={{
                            position: 'absolute', left: '50%', top: -(22 + HS + 4),
                            transform: 'translateX(-50%)',
                            width: HS + 4, height: HS + 4,
                            background: '#9F48CE', border: '2px solid #fff',
                            borderRadius: '50%', cursor: 'grab',
                            pointerEvents: 'all', zIndex: 110,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          <RotateCw style={{ width: 7, height: 7, color: '#fff' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 하단: 썸네일 미리보기 */}
              <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 overflow-x-auto">
                <span className="text-xs text-gray-400 shrink-0">총 <span className="font-semibold text-gray-700">{selectedTemplateDetails.length}</span>건</span>
                {selectedTemplateDetails.map((t, i) => {
                  const tLayers = allLayers[t.id] || []
                  const tBg = allBgColors[t.id] || '#ffffff'
                  const [tw, th] = t.size.split('×').map(Number)
                  const THUMB_W = 100
                  const THUMB_H = 60
                  const tScaleX = THUMB_W / tw
                  const tScaleY = THUMB_H / th
                  const isActive = activePreviewTab === i
                  return (
                    <button
                      key={t.id}
                      onClick={() => { setActivePreviewTab(i); setSelectedLayerId(null) }}
                      className="shrink-0 flex flex-col items-center gap-1"
                    >
                      <div style={{
                        width: THUMB_W,
                        height: THUMB_H,
                        background: tBg,
                        border: isActive ? '2px solid #9F48CE' : '1px solid #e5e7eb',
                        borderRadius: 4,
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        {tLayers.map((layer) => (
                          <div key={layer.id} style={{
                            position: 'absolute',
                            left: layer.x * tScaleX,
                            top: layer.y * tScaleY,
                            width: layer.width * tScaleX,
                            height: layer.height * tScaleY,
                            transform: `rotate(${layer.rotation || 0}deg)`,
                            transformOrigin: 'center center',
                          }}>
                            {layer.type === 'image' && <img src={layer.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />}
                            {layer.type === 'text' && <div style={{ fontSize: layer.fontSize * Math.min(tScaleX, tScaleY), color: layer.color, overflow: 'hidden', whiteSpace: 'nowrap' }}>{layer.text}</div>}
                          </div>
                        ))}
                      </div>
                      <span className={`text-xs truncate w-24 text-center ${isActive ? 'text-primary-600 font-semibold' : 'text-gray-400'}`}>
                        {t.name}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* 줌 컨트롤 */}
              <div className="shrink-0 h-10 bg-white border-t border-gray-100 flex items-center justify-center gap-3">
                <button onClick={() => setZoom((z) => Math.max(25, z - 25))} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all">
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono text-gray-500 w-10 text-center">{zoom}%</span>
                <button onClick={() => setZoom((z) => Math.min(200, z + 25))} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-all">
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
