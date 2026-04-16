import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Upload, Link2, ArrowLeft, ArrowRight, Check, Download,
  X, Palette, ZoomIn, ZoomOut, Eraser, Expand, Wand2, Sparkles, ChevronDown,
  Undo2, Redo2, ImagePlus, Type, RotateCw, Trash2,
  AlignLeft, AlignCenter, AlignRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  Bold, Underline,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { templateGroups } from '../data/templateData'

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
  const [allLayers, setAllLayers] = useState({})
  const [allHistory, setAllHistory] = useState({})
  const [allBgColors, setAllBgColors] = useState({})
  const [suggestedColors, setSuggestedColors] = useState([])
  const [isExtractingColors, setIsExtractingColors] = useState(false)
  const [editingTextId, setEditingTextId] = useState(null)
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [dlFormat, setDlFormat] = useState('PNG')
  const [dlScale, setDlScale] = useState('x1')
  const [dragLayerId, setDragLayerId] = useState(null)
  const [dragOverLayerId, setDragOverLayerId] = useState(null)
  const [showAddTemplatePopup, setShowAddTemplatePopup] = useState(false)
  const [addTemplateTab, setAddTemplateTab] = useState(0)
  const activeRef = useRef(null)

  const selectedTemplateDetails = allTemplates.filter((t) => selectedTemplateIds.includes(t.id))
  const currentTemplate = selectedTemplateDetails[activePreviewTab]
  const currentTemplateId = currentTemplate?.id || ''
  const [canvasW, canvasH] = currentTemplate?.size?.split('×').map(Number) || [750, 750]
  const s = zoom / 100

  const layers = allLayers[currentTemplateId] || []
  const selectedLayer = layers.find((l) => l.id === selectedLayerId)
  const bgColor = allBgColors[currentTemplateId] || '#ffffff'
  const setBgColor = (color) => setAllBgColors((prev) => ({ ...prev, [currentTemplateId]: color }))

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

  /* ── 다운로드 ── */
  const handleDownload = async (templateId) => {
    const t = allTemplates.find((t) => t.id === templateId)
    if (!t) return
    const [w, h] = t.size.split('×').map(Number)
    const multiplier = dlScale === 'x2' ? 2 : 1
    const canvas = document.createElement('canvas')
    canvas.width = w * multiplier
    canvas.height = h * multiplier
    const ctx = canvas.getContext('2d')

    // 배경색
    ctx.fillStyle = allBgColors[templateId] || '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 레이어 그리기
    const layerList = allLayers[templateId] || []
    for (const layer of layerList) {
      ctx.save()
      const cx = (layer.x + layer.width / 2) * multiplier
      const cy = (layer.y + layer.height / 2) * multiplier
      ctx.translate(cx, cy)
      ctx.rotate(((layer.rotation || 0) * Math.PI) / 180)
      if (layer.type === 'image') {
        await new Promise((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            ctx.drawImage(img, -layer.width * multiplier / 2, -layer.height * multiplier / 2, layer.width * multiplier, layer.height * multiplier)
            resolve()
          }
          img.onerror = resolve
          img.src = layer.src
        })
      } else if (layer.type === 'text') {
        const fontSize = (layer.fontSize || 24) * multiplier
        ctx.font = `${layer.fontWeight || 'normal'} ${fontSize}px ${layer.fontFamily || 'Pretendard'}`
        ctx.fillStyle = layer.color || '#000000'
        ctx.textAlign = layer.align || 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(layer.text || '', 0, -layer.height * multiplier / 2)
      }
      ctx.restore()
    }

    if (dlFormat === 'ZIP') {
      // ZIP: 각 탭별로 개별 다운로드 (JSZip 미포함 시 PNG 다운로드로 대체)
      const link = document.createElement('a')
      link.download = `${t.name}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } else {
      const mimeType = dlFormat === 'JPG' ? 'image/jpeg' : 'image/png'
      const ext = dlFormat === 'JPG' ? 'jpg' : 'png'
      const link = document.createElement('a')
      link.download = `${t.name}_${dlScale}.${ext}`
      link.href = canvas.toDataURL(mimeType, 0.95)
      link.click()
    }
  }

  const handleDownloadAll = async () => {
    for (const t of selectedTemplateDetails) {
      await handleDownload(t.id)
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files[0]
    if (file && file.type.startsWith('image/')) setUploadedImage({ name: file.name, url: URL.createObjectURL(file) })
  }, [])

  const handleFileInput = (e) => {
    const file = e.target.files[0]
    if (file) setUploadedImage({ name: file.name, url: URL.createObjectURL(file) })
  }

  useEffect(() => {
    if (step !== STEP_EDITOR || !uploadedImage?.url) return
    const img = new Image()
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight
      const initAllLayers = {}
      const initAllHistory = {}
      selectedTemplateDetails.forEach((t) => {
        const [w, h] = t.size.split('×').map(Number)
        const maxW = Math.round(w * 0.7), maxH = Math.round(h * 0.7)
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

  const onMouseDownLayer = (e, id) => {
    e.stopPropagation()
    setSelectedLayerId(id)
    const layer = layers.find((l) => l.id === id)
    const { x: origX, y: origY } = layer
    const startX = e.clientX, startY = e.clientY
    const onMove = (ev) => {
      const nx = Math.round(origX + (ev.clientX - startX) / s)
      const ny = Math.round(origY + (ev.clientY - startY) / s)
      setLayers(layers.map((l) => l.id === id ? { ...l, x: nx, y: ny } : l))
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

  const onMouseDownResize = (e, id, handle, isCorner) => {
    e.stopPropagation(); e.preventDefault()
    const layer = layers.find((l) => l.id === id)
    const { width: ow, height: oh, x: ox, y: oy } = layer
    const aspect = ow / oh
    const startX = e.clientX, startY = e.clientY
    const onMove = (ev) => {
      const dx = Math.round((ev.clientX - startX) / s)
      const dy = Math.round((ev.clientY - startY) / s)
      setLayers(layers.map((l) => {
        if (l.id !== id) return l
        let nw = ow, nh = oh, nx = ox, ny = oy
        if (isCorner) {
          if (handle === 'se') { nw = Math.max(20, ow + dx); nh = Math.round(nw / aspect) }
          else if (handle === 'sw') { nw = Math.max(20, ow - dx); nh = Math.round(nw / aspect); nx = ox + (ow - nw) }
          else if (handle === 'ne') { nw = Math.max(20, ow + dx); nh = Math.round(nw / aspect); ny = oy + (oh - nh) }
          else if (handle === 'nw') { nw = Math.max(20, ow - dx); nh = Math.round(nw / aspect); nx = ox + (ow - nw); ny = oy + (oh - nh) }
        } else {
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

  const onMouseDownRotate = (e, id) => {
    e.stopPropagation(); e.preventDefault()
    const layer = layers.find((l) => l.id === id)
    const canvasEl = document.getElementById('editor-canvas')
    const rect = canvasEl?.getBoundingClientRect() || { left: 0, top: 0 }
    const absCx = rect.left + (layer.x + layer.width / 2) * s
    const absCy = rect.top + (layer.y + layer.height / 2) * s
    const startAngle = Math.atan2(e.clientY - absCy, e.clientX - absCx)
    const startRot = layer.rotation || 0
    const onMove = (ev) => {
      const angle = Math.atan2(ev.clientY - absCy, ev.clientX - absCx)
      const newRot = ((startRot + deg(angle - startAngle)) % 360 + 360) % 360
      setLayers(layers.map((l) => l.id === id ? { ...l, rotation: Math.round(newRot) } : l))
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

  const addImageLayer = (file) => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const id = `img-${Date.now()}`
    const img = new Image()
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight
      const maxW = Math.round(canvasW * 0.5), maxH = Math.round(canvasH * 0.5)
      let imgW, imgH
      if (ratio > maxW / maxH) { imgW = maxW; imgH = Math.round(maxW / ratio) }
      else { imgH = maxH; imgW = Math.round(maxH * ratio) }
      const newLayer = { id, type: 'image', src: url, x: Math.round((canvasW - imgW) / 2), y: Math.round((canvasH - imgH) / 2), width: imgW, height: imgH, rotation: 0 }
      updateLayers([...layers, newLayer])
      setSelectedLayerId(id)
    }
    img.src = url
  }

  const addTextLayer = () => {
    const id = `text-${Date.now()}`
    updateLayers([...layers, { id, type: 'text', text: '텍스트 입력', x: Math.round(canvasW * 0.1), y: Math.round(canvasH * 0.4), width: 220, height: 60, rotation: 0, fontSize: 24, color: '#000000', fontFamily: 'Pretendard', bold: false, underline: false, align: 'left', letterSpacing: 0, lineHeight: 1.4 }])
    setSelectedLayerId(id)
  }

  const extractColors = () => {
    if (!uploadedImage?.url) return
    setIsExtractingColors(true)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 80
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, size, size)
      const data = ctx.getImageData(0, 0, size, size).data
      // 픽셀 샘플링 후 색상 클러스터링
      const colorMap = {}
      for (let i = 0; i < data.length; i += 16) {
        const r = Math.round(data[i] / 32) * 32
        const g = Math.round(data[i+1] / 32) * 32
        const b = Math.round(data[i+2] / 32) * 32
        const a = data[i+3]
        if (a < 128) continue
        const key = `${r},${g},${b}`
        colorMap[key] = (colorMap[key] || 0) + 1
      }
      const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
      const hex = sorted.map(([key]) => {
        const [r, g, b] = key.split(',').map(Number)
        return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
      })
      setSuggestedColors(hex)
      setIsExtractingColors(false)
    }
    img.src = uploadedImage.url
  }

  const deleteLayer = (id) => {
    updateLayers(layers.filter((l) => l.id !== id))
    setSelectedLayerId(null)
  }

  return (
    <div>
      {/* STEP 2 상단바 */}
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

      {/* STEP 2 */}
      {step === STEP_IMAGE && (
        <div className="px-8 py-10 max-w-2xl mx-auto">
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
              {urlInput && <button onClick={() => setUploadedImage({ name: 'URL 이미지', url: null })} className="w-full py-3 bg-primary-100 text-primary-700 rounded-xl text-sm font-medium hover:bg-primary-200 transition-all">이미지 자동 추출</button>}
            </div>
          )}
          {uploadedImage && (
            <button onClick={() => setStep(STEP_EDITOR)} className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 bg-primary-600 text-white rounded-2xl font-semibold shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all">
              이미지 생성하기 <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* STEP 3: 에디터 */}
      {step === STEP_EDITOR && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#f1f0f5' }}>

          {/* 상단 툴바 */}
          <div className="shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#9F48CE,#C084FC)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800">KK Studio</span>
              </button>
              <span className="text-gray-300">›</span>
              <button onClick={onBack} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 flex items-center gap-1">
                <Check className="w-3 h-3" /> 1. 템플릿 선택
              </button>
              <span className="text-gray-300">›</span>
              <button onClick={() => setStep(STEP_IMAGE)} className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 flex items-center gap-1">
                <Check className="w-3 h-3" /> 2. 이미지 입력
              </button>
              <span className="text-gray-300">›</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-600 text-white">3. 에디터</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={undo} disabled={histIdx <= 0} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30">
                <Undo2 className="w-4 h-4" />
              </button>
              <button onClick={redo} disabled={histIdx >= hist.length - 1} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30">
                <Redo2 className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-gray-200 mx-2" />
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => addImageLayer(e.target.files[0])} />
                <ImagePlus className="w-4 h-4" /> 이미지 추가
              </label>
              <button onClick={addTextLayer} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
                <Type className="w-4 h-4" /> 텍스트 추가
              </button>
            </div>
            <button onClick={handleDownloadAll} className="flex items-center gap-2 px-8 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all" style={{ background: 'linear-gradient(135deg,#9F48CE,#C084FC)' }}>
              <Download className="w-4 h-4" /> 이미지 다운로드
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

                {/* 선택 객체 속성 */}
                {selectedLayer && (
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">선택 객체</h3>

                    {/* 정렬 */}
                    <p className="text-xs text-gray-400 mb-1.5">정렬</p>
                    <div className="flex gap-1 mb-3">
                      {[
                        { Icon: AlignStartVertical,    title: '왼쪽 정렬',  action: () => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, x: 0 } : l)) },
                        { Icon: AlignCenterVertical,   title: '가로 중앙',  action: () => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, x: Math.round((canvasW - l.width) / 2) } : l)) },
                        { Icon: AlignEndVertical,      title: '오른쪽 정렬', action: () => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, x: canvasW - l.width } : l)) },
                        { Icon: AlignStartHorizontal,  title: '위 정렬',    action: () => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, y: 0 } : l)) },
                        { Icon: AlignCenterHorizontal, title: '세로 중앙',  action: () => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, y: Math.round((canvasH - l.height) / 2) } : l)) },
                        { Icon: AlignEndHorizontal,    title: '아래 정렬',  action: () => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, y: canvasH - l.height } : l)) },
                      ].map((btn, i) => (
                        <button key={i} onClick={btn.action} title={btn.title}
                          className="flex-1 py-2 rounded-lg bg-white border border-gray-200 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 transition-all text-gray-500 flex items-center justify-center">
                          <btn.Icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCw className="w-4 h-4 text-gray-400 shrink-0" />
                      <input type="range" min={0} max={359} value={selectedLayer.rotation || 0}
                        onChange={(e) => setLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, rotation: Number(e.target.value) } : l))}
                        onMouseUp={() => commitHistory(layers)}
                        className="flex-1"
                      />
                      <span className="text-xs font-mono text-gray-600 w-8 shrink-0">{selectedLayer.rotation || 0}°</span>
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
                  </div>
                )}

                {/* 배경색 */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">배경색</h3>
                    <button onClick={() => setBgColor('#ffffff')} className="text-xs text-gray-400 hover:text-primary-600">초기화</button>
                  </div>
                  {/* 추천 버튼 */}
                  <button
                    onClick={extractColors}
                    disabled={isExtractingColors}
                    className="w-full mb-3 py-2 rounded-lg text-xs font-medium border border-dashed border-primary-300 text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isExtractingColors ? (
                      <span>색상 추출 중...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        이미지에서 배경색 추천
                      </>
                    )}
                  </button>
                  {/* 추천 컬러칩 or 기본 컬러칩 */}
                  {suggestedColors.length > 0 ? (
                    <div>
                      <p className="text-xs text-gray-400 mb-1.5">추천 색상</p>
                      <div className="flex gap-1.5 flex-wrap mb-3">
                        {suggestedColors.map((c) => (
                          <button key={c} onClick={() => setBgColor(c)} style={{ backgroundColor: c }}
                            className={`w-7 h-7 rounded-md hover:scale-110 transition-all ${bgColor === c ? 'ring-2 ring-primary-500 ring-offset-1' : 'border border-gray-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {/* HEX 입력 */}
                  <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
                    <label className="cursor-pointer shrink-0" style={{ position: 'relative', width: 20, height: 20 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: bgColor, border: '1px solid #e5e7eb' }} />
                      <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                    </label>
                    <input type="text" value={bgColor}
                      onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBgColor(e.target.value) }}
                      className="flex-1 text-sm bg-transparent focus:outline-none font-mono text-gray-700" placeholder="#ffffff" />
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
                    <option>Pretendard</option><option>Noto Sans KR</option>
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
                      <button key={fmt} onClick={() => setDlFormat(fmt)} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${dlFormat === fmt ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500'}`}>{fmt}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {['x1','x2'].map((sc) => (
                      <button key={sc} onClick={() => setDlScale(sc)} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${dlScale === sc ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500'}`}>{sc}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 오른쪽: 캔버스 */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* 캔버스 스크롤 영역 */}
              <div className="flex-1 overflow-auto flex items-center justify-center p-12"
                style={{ position: 'relative' }}
                onClick={() => { setSelectedLayerId(null); setEditingTextId(null) }}
              >
                <div style={{ position: 'relative', flexShrink: 0, overflow: 'visible' }}>

                  {/* 실제 캔버스: overflow hidden */}
                  <div id="editor-canvas" style={{ position: 'relative', width: canvasW * s, height: canvasH * s, background: bgColor, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                    {layers.map((layer) => (
                      <div key={layer.id}
                        onMouseDown={(e) => {
                          if (editingTextId === layer.id) { e.stopPropagation(); return }
                          onMouseDownLayer(e, layer.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          if (layer.type === 'text') {
                            setEditingTextId(layer.id)
                            setSelectedLayerId(layer.id)
                          }
                        }}
                        style={{ position: 'absolute', left: layer.x * s, top: layer.y * s, width: layer.width * s, height: layer.height * s, transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'center center', cursor: editingTextId === layer.id ? 'text' : 'move', userSelect: editingTextId === layer.id ? 'text' : 'none', zIndex: layer.id === selectedLayerId ? 10 : 1 }}>
                        {layer.type === 'image' && <img src={layer.src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }} />}
                        {layer.type === 'text' && (
                          editingTextId === layer.id ? (
                            <textarea
                              autoFocus
                              value={layer.text}
                              onChange={(e) => setLayers(layers.map((l) => l.id === layer.id ? { ...l, text: e.target.value } : l))}
                              onBlur={() => { commitHistory(layers); setEditingTextId(null) }}
                              onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key === 'Escape') { commitHistory(layers); setEditingTextId(null) }
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                width: '100%', height: '100%',
                                fontSize: layer.fontSize * s,
                                color: layer.color,
                                fontFamily: layer.fontFamily || 'Pretendard',
                                fontWeight: layer.fontWeight || (layer.bold ? '700' : '400'),
                                textDecoration: layer.underline ? 'underline' : 'none',
                                textAlign: layer.align || 'left',
                                letterSpacing: `${(layer.letterSpacing || 0) * s}px`,
                                lineHeight: layer.lineHeight || 1.4,
                                background: 'rgba(255,255,255,0.15)',
                                border: '1px dashed #9F48CE',
                                outline: 'none', resize: 'none', padding: 4,
                                fontFamily: layer.fontFamily || 'Pretendard',
                                boxSizing: 'border-box', cursor: 'text',
                              }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', fontSize: layer.fontSize * s, color: layer.color, fontFamily: layer.fontFamily || 'Pretendard', fontWeight: layer.fontWeight || (layer.bold ? '700' : '400'), textDecoration: layer.underline ? 'underline' : 'none', textAlign: layer.align || 'left', letterSpacing: `${(layer.letterSpacing || 0) * s}px`, lineHeight: layer.lineHeight || 1.4, display: 'flex', alignItems: 'center', whiteSpace: 'pre-wrap', wordBreak: 'break-all', pointerEvents: 'none' }}>{layer.text}</div>
                          )
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 투명 클릭 레이어: 프레임 밖 선택 가능 */}
                  <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW * s, height: canvasH * s, overflow: 'visible', pointerEvents: 'none', zIndex: 50 }}>
                    {layers.filter((layer) => layer.id !== editingTextId).map((layer) => (
                      <div key={`hit-${layer.id}`} onMouseDown={(e) => onMouseDownLayer(e, layer.id)} onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          if (layer.type === 'text') { setEditingTextId(layer.id); setSelectedLayerId(layer.id) }
                        }}
                        style={{ position: 'absolute', left: layer.x * s, top: layer.y * s, width: layer.width * s, height: layer.height * s, transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'center center', cursor: 'move', pointerEvents: 'all', background: 'transparent' }} />
                    ))}
                  </div>

                  {/* 이미지 툴바 - 이미지 상단 중앙 위 */}
                  {selectedLayer?.type === 'image' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        left: selectedLayer.x * s + selectedLayer.width * s / 2,
                        top: selectedLayer.y * s - 48,
                        transform: 'translateX(-50%)',
                        zIndex: 200,
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        padding: '4px 8px',
                        pointerEvents: 'all',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <button onClick={() => deleteLayer(selectedLayer.id)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                        title="레이어 삭제">
                        <Trash2 style={{ width: 14, height: 14 }} />
                      </button>
                    </div>
                  )}

                  {/* 텍스트 툴바 */}
                  {selectedLayer?.type === 'text' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        left: Math.max(0, selectedLayer.x * s + selectedLayer.width * s / 2),
                        top: selectedLayer.y * s - 48,
                        transform: 'translateX(-50%)',
                        zIndex: 200,
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        padding: '4px 8px',
                        pointerEvents: 'all',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {/* 폰트 선택 */}
                      <select
                        value={selectedLayer.fontFamily || 'Pretendard'}
                        onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, fontFamily: e.target.value } : l))}
                        style={{ fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 4px', background: '#fff', cursor: 'pointer', maxWidth: 110 }}
                      >
                        <option value="Pretendard">Pretendard</option>
                        <option value="Noto Sans KR">Noto Sans KR</option>
                        <option value="GmarketSans">Gmarket Sans</option>
                      </select>

                      {/* 웨이트 선택 */}
                      <select
                        value={selectedLayer.fontWeight || '400'}
                        onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, fontWeight: e.target.value } : l))}
                        style={{ fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 4px', background: '#fff', cursor: 'pointer', width: 72 }}
                      >
                        {(selectedLayer.fontFamily === 'GmarketSans') ? (
                          <>
                            <option value="300">Light</option>
                            <option value="500">Medium</option>
                            <option value="700">Bold</option>
                          </>
                        ) : (
                          <>
                            <option value="300">Light</option>
                            <option value="400">Regular</option>
                            <option value="500">Medium</option>
                            <option value="600">SemiBold</option>
                            <option value="700">Bold</option>
                            <option value="800">ExtraBold</option>
                          </>
                        )}
                      </select>

                      {/* 구분선 */}
                      <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />

                      {/* 폰트 크기 */}
                      <input type="number" value={selectedLayer.fontSize} min={8} max={200}
                        onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, fontSize: Number(e.target.value) } : l))}
                        style={{ width: 40, fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 4px', textAlign: 'center' }}
                      />

                      <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />

                      {/* 볼드 */}
                      <button onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, bold: !l.bold } : l))}
                        style={{ width: 26, height: 26, borderRadius: 6, border: selectedLayer.bold ? '1.5px solid #9F48CE' : '1px solid transparent', background: selectedLayer.bold ? '#F3E8FF' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedLayer.bold ? '#9F48CE' : '#4b5563' }}>
                        <Bold style={{ width: 13, height: 13 }} />
                      </button>

                      {/* 언더라인 */}
                      <button onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, underline: !l.underline } : l))}
                        style={{ width: 26, height: 26, borderRadius: 6, border: selectedLayer.underline ? '1.5px solid #9F48CE' : '1px solid transparent', background: selectedLayer.underline ? '#F3E8FF' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedLayer.underline ? '#9F48CE' : '#4b5563' }}>
                        <Underline style={{ width: 13, height: 13 }} />
                      </button>

                      <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />

                      {/* 정렬 */}
                      {[{ v: 'left', Icon: AlignLeft }, { v: 'center', Icon: AlignCenter }, { v: 'right', Icon: AlignRight }].map(({ v, Icon }) => (
                        <button key={v} onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, align: v } : l))}
                          style={{ width: 26, height: 26, borderRadius: 6, border: (selectedLayer.align || 'left') === v ? '1.5px solid #9F48CE' : '1px solid transparent', background: (selectedLayer.align || 'left') === v ? '#F3E8FF' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: (selectedLayer.align || 'left') === v ? '#9F48CE' : '#4b5563' }}>
                          <Icon style={{ width: 13, height: 13 }} />
                        </button>
                      ))}

                      <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />

                      {/* 텍스트 색상 */}
                      <label style={{ position: 'relative', cursor: 'pointer' }} title="텍스트 색상">
                        <div style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 'bold', color: selectedLayer.color, lineHeight: 1 }}>A</span>
                          <div style={{ width: 16, height: 3, borderRadius: 2, background: selectedLayer.color }} />
                        </div>
                        <input type="color" value={selectedLayer.color}
                          onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, color: e.target.value } : l))}
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                      </label>

                      <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />

                      {/* 자간 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>자간</span>
                        <input type="number" value={selectedLayer.letterSpacing || 0} min={-10} max={50}
                          onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, letterSpacing: Number(e.target.value) } : l))}
                          style={{ width: 36, fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 4px', textAlign: 'center' }} />
                      </div>

                      {/* 행간 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>행간</span>
                        <input type="number" value={selectedLayer.lineHeight || 1.4} min={0.8} max={4} step={0.1}
                          onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, lineHeight: Number(e.target.value) } : l))}
                          style={{ width: 46, fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 4px', textAlign: 'center' }} />
                      </div>

                      <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />

                      {/* 레이어 삭제 */}
                      <button onClick={() => deleteLayer(selectedLayer.id)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
                        title="레이어 삭제">
                        <Trash2 style={{ width: 13, height: 13 }} />
                      </button>
                    </div>
                  )}

                  {/* 핸들 오버레이 */}
                  {selectedLayer && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW * s, height: canvasH * s, pointerEvents: 'none', overflow: 'visible', zIndex: 100 }}>
                      <div style={{ position: 'absolute', left: selectedLayer.x * s, top: selectedLayer.y * s, width: selectedLayer.width * s, height: selectedLayer.height * s, transform: `rotate(${selectedLayer.rotation || 0}deg)`, transformOrigin: 'center center', pointerEvents: 'none' }}>
                        {/* 보라 테두리 */}
                        <div style={{ position: 'absolute', inset: -1, border: '2px solid #9F48CE', pointerEvents: 'none' }} />

                        {/* 리사이즈 핸들 */}
                        {RESIZE_HANDLES.map((h) => (
                          <div key={h.id} onMouseDown={(e) => onMouseDownResize(e, selectedLayer.id, h.id, h.corner)}
                            style={{ position: 'absolute', left: `calc(${h.cx * 100}% - ${HS / 2}px)`, top: `calc(${h.cy * 100}% - ${HS / 2}px)`, width: HS, height: HS, background: '#ffffff', border: '2px solid #9F48CE', borderRadius: '50%', cursor: h.cursor, pointerEvents: 'all', zIndex: 110 }} />
                        ))}

                        {/* 회전 연결선 - 오른쪽 중앙 */}
                        <div style={{ position: 'absolute', left: '100%', top: '50%', width: 24, height: 1, background: '#9F48CE', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                        {/* 회전 핸들 - 오른쪽 중앙 */}
                        <div onMouseDown={(e) => onMouseDownRotate(e, selectedLayer.id)}
                          style={{ position: 'absolute', left: '100%', top: '50%', marginLeft: 24, transform: 'translateY(-50%)', width: 24, height: 24, background: '#9F48CE', border: '2px solid #fff', borderRadius: '50%', cursor: 'grab', pointerEvents: 'all', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                          <RotateCw style={{ width: 12, height: 12, color: '#fff' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 줌 컨트롤 - 하단 중앙 플로팅 */}
                <div onClick={(e) => e.stopPropagation()}
                  style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,255,255,0.95)', borderRadius: 999, border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', zIndex: 200 }}>
                  <button onClick={() => setZoom((z) => Math.max(25, z - 25))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-all">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-mono text-gray-600 w-10 text-center">{zoom}%</span>
                  <button onClick={() => setZoom((z) => Math.min(200, z + 25))} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 transition-all">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                {/* 레이어 패널 - 우하단 플로팅 */}
                <div onClick={(e) => e.stopPropagation()}
                  style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 200, width: 180 }}>
                  {layers.length > 0 && (
                    <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                      {/* 헤더 */}
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>레이어</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#9F48CE', background: '#f3e8ff', borderRadius: 99, padding: '1px 7px' }}>{layers.length}</span>
                      </div>
                      {/* 레이어 목록 (역순: 위쪽 레이어가 먼저) */}
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {[...layers].reverse().map((layer, i) => {
                          const isSelected = layer.id === selectedLayerId
                          const idx = layers.length - i
                          const isDragOver = dragOverLayerId === layer.id && dragLayerId !== layer.id
                          return (
                            <div key={layer.id}
                              draggable
                              onDragStart={() => setDragLayerId(layer.id)}
                              onDragOver={(e) => { e.preventDefault(); setDragOverLayerId(layer.id) }}
                              onDragLeave={() => setDragOverLayerId(null)}
                              onDrop={() => {
                                if (!dragLayerId || dragLayerId === layer.id) return
                                const newLayers = [...layers]
                                const fromIdx = newLayers.findIndex(l => l.id === dragLayerId)
                                // 역순 표시이므로 drop 대상의 실제 인덱스 계산
                                const toIdx = newLayers.findIndex(l => l.id === layer.id)
                                const [moved] = newLayers.splice(fromIdx, 1)
                                newLayers.splice(toIdx, 0, moved)
                                updateLayers(newLayers)
                                setDragLayerId(null)
                                setDragOverLayerId(null)
                              }}
                              onDragEnd={() => { setDragLayerId(null); setDragOverLayerId(null) }}
                              onClick={() => setSelectedLayerId(layer.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', cursor: 'grab', background: isSelected ? '#faf5ff' : isDragOver ? '#f3e8ff' : 'transparent', borderLeft: isSelected ? '2.5px solid #9F48CE' : '2.5px solid transparent', borderTop: isDragOver ? '2px solid #9F48CE' : '2px solid transparent', opacity: dragLayerId === layer.id ? 0.4 : 1, transition: 'all 0.1s' }}>
                              {/* 드래그 핸들 */}
                              <span style={{ fontSize: 10, color: '#d1d5db', flexShrink: 0, cursor: 'grab' }}>⠿</span>
                              {/* 썸네일 */}
                              <div style={{ width: 28, height: 28, borderRadius: 4, background: '#f3f4f6', border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {layer.type === 'image'
                                  ? <img src={layer.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>T</span>
                                }
                              </div>
                              {/* 레이어 정보 */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: isSelected ? '#7e22ce' : '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {layer.type === 'image' ? `이미지 ${idx}` : `텍스트 ${idx}`}
                                </p>
                                <p style={{ fontSize: 10, color: '#9ca3af' }}>{layer.width} × {layer.height}</p>
                              </div>
                              {/* 레이어 타입 아이콘 */}
                              <span style={{ fontSize: 12, flexShrink: 0 }}>{layer.type === 'image' ? '🖼' : '✏️'}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 하단: 썸네일 */}
              <div className="shrink-0 border-t border-gray-200" style={{ background: '#ffffff' }}>
                {/* 총 건수 */}
                <div className="px-4 pt-2 pb-1 flex items-center justify-between">
                  <span className="text-xs text-gray-400">총 <span className="font-semibold text-gray-700">{selectedTemplateDetails.length}</span>건</span>
                  <button
                    onClick={() => setShowAddTemplatePopup(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#9F48CE', background: '#f3e8ff', border: 'none', borderRadius: 99, padding: '3px 10px', cursor: 'pointer' }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> 템플릿 추가
                  </button>
                </div>
                {/* 썸네일 목록 */}
                <div className="px-4 pt-2 pb-3 flex items-start gap-3 overflow-x-auto">
                {selectedTemplateDetails.map((t, i) => {
                  const tLayers = allLayers[t.id] || []
                  const tBg = allBgColors[t.id] || '#ffffff'
                  const [tw, th] = t.size.split('×').map(Number)
                  const CARD_W = 140
                  const CARD_H = 100
                  const ratio = tw / th
                  let bW = CARD_W, bH = Math.round(CARD_W / ratio)
                  if (bH > CARD_H) { bH = CARD_H; bW = Math.round(CARD_H * ratio) }
                  const tScaleX = bW / tw, tScaleY = bH / th
                  const isActive = activePreviewTab === i
                  return (
                    <button key={t.id} onClick={() => { setActivePreviewTab(i); setSelectedLayerId(null) }} className="shrink-0 flex flex-col items-start gap-1">
                      <div style={{ width: CARD_W, height: CARD_H, borderRadius: 4, outline: isActive ? '2.5px solid #9F48CE' : '2.5px solid transparent', outlineOffset: '2px', background: '#e9e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', boxShadow: isActive ? '0 0 0 4px #C084FC22' : 'none' }}>
                        {isActive && (
                          <div style={{ position: 'absolute', top: -1, left: -1, width: 18, height: 18, background: '#9F48CE', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, border: '2px solid #fff' }}>
                            <Check style={{ width: 9, height: 9, color: '#fff' }} />
                          </div>
                        )}
                        <div style={{ width: bW, height: bH, background: tBg, position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
                            {tLayers.map((layer) => (
                              <div key={layer.id} style={{ position: 'absolute', left: layer.x * tScaleX, top: layer.y * tScaleY, width: layer.width * tScaleX, height: layer.height * tScaleY, transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'center center' }}>
                                {layer.type === 'image' && <img src={layer.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />}
                                {layer.type === 'text' && <div style={{ fontSize: layer.fontSize * Math.min(tScaleX, tScaleY), color: layer.color, overflow: 'hidden', whiteSpace: 'nowrap' }}>{layer.text}</div>}
                              </div>
                            ))}
                        </div>
                      </div>
                      <div style={{ width: CARD_W, marginTop: 4 }}>
                        <p className="text-xs font-medium text-gray-700 truncate">{i + 1}.{t.name}</p>
                        <p className="text-xs text-gray-400">{t.size.replace('×', ' × ')}</p>
                      </div>
                    </button>
                  )
                })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 템플릿 추가 팝업 */}
      {showAddTemplatePopup && (
        <div
          onClick={() => setShowAddTemplatePopup(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}
          >
            {/* 헤더 */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>템플릿 추가</h2>
              <button onClick={() => setShowAddTemplatePopup(false)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#6b7280' }}>✕</button>
            </div>

            {/* 탭 */}
            <div style={{ display: 'flex', gap: 4, padding: '10px 16px', borderBottom: '1px solid #f3f4f6', overflowX: 'auto' }}>
              {templateGroups.map((g, i) => (
                <button key={g.id} onClick={() => setAddTemplateTab(i)}
                  style={{ whiteSpace: 'nowrap', padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: addTemplateTab === i ? g.hex : '#f3f4f6', color: addTemplateTab === i ? '#fff' : '#6b7280', transition: 'all 0.1s' }}>
                  {g.label}
                </button>
              ))}
            </div>

            {/* 템플릿 그리드 */}
            <div style={{ overflowY: 'auto', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {templateGroups[addTemplateTab]?.templates.map((t) => {
                const alreadyAdded = selectedTemplateIds.includes(t.id)
                const [w, h] = t.size.split('×').map(Number)
                const cardW = 170, cardH = 100
                const ratio = w / h
                let bW = cardW, bH = Math.round(cardW / ratio)
                if (bH > cardH) { bH = cardH; bW = Math.round(cardH * ratio) }
                return (
                  <button key={t.id}
                    onClick={() => { if (!alreadyAdded) { toggleTemplate(t.id); setShowAddTemplatePopup(false) } }}
                    style={{ border: alreadyAdded ? `2px solid ${templateGroups[addTemplateTab].hex}` : '2px solid #e5e7eb', borderRadius: 10, padding: 8, background: alreadyAdded ? templateGroups[addTemplateTab].light : '#fff', cursor: alreadyAdded ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.15s' }}
                  >
                    {/* 미리보기 */}
                    <div style={{ width: '100%', height: cardH, borderRadius: 6, background: templateGroups[addTemplateTab].gradient || '#e9e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' }}>
                      <div style={{ width: bW, height: bH, background: 'rgba(255,255,255,0.15)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{t.size}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>{t.size}</span>
                      {alreadyAdded && <span style={{ fontSize: 10, fontWeight: 600, color: templateGroups[addTemplateTab].hex }}>추가됨</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
