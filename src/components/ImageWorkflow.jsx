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
import { templateGroups } from '../data/templateData'
import jsPDF from 'jspdf'
import JSZip from 'jszip'
import { removeBackground } from '@imgly/background-removal'

const STEP_IMAGE = 0
const STEP_EDITOR = 1
const HS = 10
const B4_MARGIN = 120
const B4_TEXT_W = 445
const B4_IMG_X = B4_MARGIN + B4_TEXT_W + 40  // 605
const B11_IMG_X = 230
const B11_IMG_W = 520
const B11_GRAD_X = 230
const B11_GRAD_Y = 0
const B11_GRAD_W = 160
const B11_GRAD_H = 560
const B11_TEXT_X = 56
const B11_TEXT_W = 460

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

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  if (h.length < 6) return [0, 0, 0]
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}
function relativeLuminance(hex) {
  const [r,g,b] = hexToRgb(hex).map(c => { const s = c/255; return s <= 0.03928 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4) })
  return 0.2126*r + 0.7152*g + 0.0722*b
}
function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hex1), l2 = relativeLuminance(hex2)
  const lighter = Math.max(l1,l2), darker = Math.min(l1,l2)
  return (lighter + 0.05) / (darker + 0.05)
}
function bestTextColor(bgHex) {
  const cW = contrastRatio(bgHex, '#ffffff'), cB = contrastRatio(bgHex, '#1E2023')
  return cW >= cB ? '#ffffff' : '#1E2023'
}

function LogoGuideOverlay({ guide, canvasW, canvasH, margin, onClose }) {
  const isSymbol = guide === '심볼형'
  const SYMBOL_W = 160
  const gx = isSymbol ? Math.round((canvasW - SYMBOL_W) / 2) : margin
  const gy = isSymbol ? 0 : margin
  const gw = isSymbol ? SYMBOL_W : canvasW - margin * 2
  const gh = isSymbol ? canvasH : canvasH - margin * 2
  const label = isSymbol ? `심볼형 ${gw}×${gh}` : `가로형 ${gw}×${gh}`
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, zIndex: 90, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
      <div style={{ position: 'absolute', left: gx, top: gy, width: gw, height: gh, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)', border: '2px dashed #C084FC', borderRadius: 2, background: 'transparent' }} />
      {isSymbol ? (
        <div style={{ position: 'absolute', left: gx + gw / 2, top: gy + 5, transform: 'translateX(-50%)', fontSize: 11, fontWeight: 700, color: '#C084FC', background: 'rgba(0,0,0,0.65)', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>{label}</div>
      ) : (
        <div style={{ position: 'absolute', left: gx, top: gy + gh + 5, fontSize: 11, fontWeight: 700, color: '#C084FC', background: 'rgba(0,0,0,0.65)', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>{label}</div>
      )}
      <div onClick={onClose} style={{ position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 6, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'all', color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✕</div>
    </div>
  )
}

export default function ImageWorkflow({ selectedTemplateIds, allTemplates, onBack, onGoHome, toggleTemplate }) {
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
  const [dlSelectedIds, setDlSelectedIds] = useState(() => new Set())
  const [guides, setGuides] = useState({ x: [], y: [] })
  const [mediaTab, setMediaTab] = useState('upload')
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [tooltip, setTooltip] = useState(null)
  const [isSpaceDown, setIsSpaceDown] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [dragTplId, setDragTplId] = useState(null)
  const [dragOverTplId, setDragOverTplId] = useState(null)
  const [templateOrder, setTemplateOrder] = useState(selectedTemplateIds)
  const [customNames, setCustomNames] = useState({}) // { [templateId]: string }
  const [editingNameId, setEditingNameId] = useState(null)
  const [bgChanged, setBgChanged] = useState(false)
  const [toast, setToast] = useState('')
  const [showDlPopup, setShowDlPopup] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRemovingBg, setIsRemovingBg] = useState(false)
  const [logoGuide, setLogoGuide] = useState(null) // null | '가로형' | '심볼형'
  const [showGoHomeConfirm, setShowGoHomeConfirm] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  // 다국어 복사본: [{ id: 'b4-en', name: 'PC 와이드 대배너 (English)', size: '1440×480', lang: 'English' }, ...]
  const [langCopies, setLangCopies] = useState([])
  // 로고 쌍: b8 선택 시 black/white 자동 생성
  const [logoPairs, setLogoPairs] = useState([])
  const [langSuggestions, setLangSuggestions] = useState({}) // { [langId]: [{ layerId, original, suggestions: [str] }] }
  const [guideTextColor, setGuideTextColor] = useState('#1E2023')
  const canvasAreaRef = useRef(null)

  useEffect(() => {
    // b8가 선택 해제되면 로고 쌍 초기화
    if (!selectedTemplateIds.includes('b8') && logoPairs.length > 0) {
      setLogoPairs([])
    }
    const validIds = new Set([...selectedTemplateIds, ...langCopies.map(lc => lc.id), ...logoPairs.map(lp => lp.id)])
    setDlSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of next) { if (!validIds.has(id)) next.delete(id) }
      // 로고 쌍은 자동 선택 (블랙/화이트 세트)
      logoPairs.forEach(lp => next.add(lp.id))
      return next
    })
  }, [selectedTemplateIds.join(','), langCopies.map(lc => lc.id).join(','), logoPairs.map(lp => lp.id).join(',')])

  const selectedTemplateDetails = [...allTemplates.filter((t) => selectedTemplateIds.includes(t.id))].sort((a, b) => {
    const ai = templateOrder.indexOf(a.id)
    const bi = templateOrder.indexOf(b.id)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
  const b4Base = selectedTemplateDetails.find(t => t.id === 'b4')
  const b8Base = selectedTemplateDetails.find(t => t.id === 'b8')
  // 부모 템플릿 바로 뒤에 lang copy / logo pair 삽입
  const allDisplayTemplates = selectedTemplateDetails.flatMap(t => {
    if (t.id === 'b8') {
      // b8 원본 대신 black/white 쌍으로 교체
      return logoPairs.map(lp => ({ id: lp.id, name: lp.name, size: t.size, device: t.device, preview: t.preview, logoPair: lp.variant }))
    }
    const copies = langCopies
      .filter(lc => lc.baseId === t.id)
      .map(lc => {
        const baseTmpl = selectedTemplateDetails.find(bt => bt.id === lc.baseId)
        return { id: lc.id, name: lc.name, size: lc.size, device: baseTmpl?.device || 'PC', preview: baseTmpl?.preview || '', lang: lc.lang, baseId: lc.baseId }
      })
    return [t, ...copies]
  })
  const currentTemplate = allDisplayTemplates[activePreviewTab]
  const currentTemplateId = currentTemplate?.id || ''
  // 현재 보고 있는 탭이 lang 복사본이 아닌 실제 템플릿인 경우에만 다국어 추가 가능
  const langBase = currentTemplate && !currentTemplate.lang ? currentTemplate : null
  const [canvasW, canvasH] = currentTemplate?.size?.split('\u00d7').map(Number) || [750, 750]
  const scale = zoom / 100
  const isLogoTab = !!currentTemplate?.logoPair // b8-black / b8-white 탭 여부
  const LOGO_MARGIN = 20
  const hasLogoSelected = logoPairs.some(lp => dlSelectedIds.has(lp.id))
  const dlEffectiveFmt = hasLogoSelected ? 'PNG' : dlFormat

  const layers = allLayers[currentTemplateId] || []
  const selectedLayer = layers.find((l) => l.id === selectedLayerId)
  const bgLayer = layers.find(l => l.id === 'background')
  const bgColor = bgLayer?.color || allBgColors[currentTemplateId] || '#ffffff'
  const setBgColor = (color) => {
    setSelectedLayerId('background')
    setAllBgColors((prev) => ({ ...prev, [currentTemplateId]: color }))
    setAllLayers((prev) => {
      const cur = prev[currentTemplateId] || []
      const recommended = bestTextColor(color)
      const updated = cur.map(l => {
        if (l.id === 'background') return { ...l, color }
        // 텍스트 레이어: 흑/백 계열이면 자동 전환
        if (l.type === 'text') {
          const c = (l.color || '').toLowerCase().replace(/\s/g, '')
          const isDark = c === '#1e2023' || c.startsWith('rgba(30,32,35') || c === '#000000' || c === '#1e1e1e'
          const isLight = c === '#ffffff' || c.startsWith('rgba(255,255,255') || c === '#fff'
          if (isDark || isLight) {
            // 불투명도 보존: rgba면 동일 알파로 추천색 적용
            const alphaMatch = c.match(/rgba\([^,]+,[^,]+,[^,]+,([^)]+)\)/)
            const alpha = alphaMatch ? parseFloat(alphaMatch[1]) : 1
            if (alpha < 1) {
              const rec = recommended === '#ffffff' ? `rgba(255,255,255,${alpha})` : `rgba(30,32,35,${alpha})`
              return { ...l, color: rec }
            }
            return { ...l, color: recommended }
          }
        }
        return l
      })
      return { ...prev, [currentTemplateId]: updated }
    })
    setBgChanged(true)
  }

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

  const renderToCanvas = async (templateId, multiplier) => {
    const tmpl = allTemplates.find((t) => t.id === templateId) || langCopies.find((lc) => lc.id === templateId) || logoPairs.find((lp) => lp.id === templateId)
    if (!tmpl) return null
    const [w, h] = tmpl.size.split('\u00d7').map(Number)
    const canvas = document.createElement('canvas')
    canvas.width = w * multiplier
    canvas.height = h * multiplier
    const ctx = canvas.getContext('2d')
    const layerList = allLayers[templateId] || []
    const bgLayerColor = layerList.find(l => l.id === 'background')?.color || allBgColors[templateId] || '#ffffff'
    if (bgLayerColor !== 'transparent') {
      ctx.fillStyle = bgLayerColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    // transparent → 배경 비워둠 (PNG 투명 유지)
    for (const layer of layerList) {
      if (layer.type === 'background') continue
      ctx.save()
      const cx = (layer.x + layer.width / 2) * multiplier
      const cy = (layer.y + layer.height / 2) * multiplier
      ctx.translate(cx, cy)
      ctx.rotate(((layer.rotation || 0) * Math.PI) / 180)
      if (layer.type === 'image') {
        const logoPairInfo = logoPairs.find(lp => lp.id === templateId)
        await new Promise((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const tmpl = allTemplates.find(t => t.id === templateId) || langCopies.find(lc => lc.id === templateId)
            const isB11Layout = tmpl?.id === 'b11' || tmpl?.baseId === 'b11'
            const lw = layer.width * multiplier, lh = layer.height * multiplier
            if (isB11Layout) {
              // b11 이미지 영역(x=230~750, y=0~560)으로 클립
              const cx = (layer.x + layer.width / 2) * multiplier
              const cy = (layer.y + layer.height / 2) * multiplier
              const clipX = B11_IMG_X * multiplier - cx
              const clipY = 0 - cy
              const clipW = B11_IMG_W * multiplier
              const clipH = B11_GRAD_H * multiplier
              ctx.save()
              ctx.beginPath()
              ctx.rect(clipX, clipY, clipW, clipH)
              ctx.clip()
              ctx.drawImage(img, -lw / 2, -lh / 2, lw, lh)
              ctx.restore()
            } else {
              ctx.drawImage(img, -lw / 2, -lh / 2, lw, lh)
              if (logoPairInfo) {
                ctx.globalCompositeOperation = 'source-atop'
                ctx.fillStyle = logoPairInfo.variant === 'black' ? '#000000' : '#ffffff'
                ctx.fillRect(-lw / 2, -lh / 2, lw, lh)
                ctx.globalCompositeOperation = 'source-over'
              }
            }
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
      } else if (layer.type === 'gradient') {
        const bgC = (allLayers[templateId] || []).find(l => l.id === 'background')?.color || '#ffffff'
        const [rr, gg, bb] = hexToRgb(bgC)
        const gW = layer.width * multiplier
        const gH = layer.height * multiplier
        const grad = ctx.createLinearGradient(-gW / 2, 0, gW / 2, 0)
        grad.addColorStop(0, `rgba(${rr},${gg},${bb},1)`)
        grad.addColorStop(0.7, `rgba(${rr},${gg},${bb},0.7)`)
        grad.addColorStop(1, `rgba(${rr},${gg},${bb},0)`)
        ctx.fillStyle = grad
        ctx.fillRect(-gW / 2, -gH / 2, gW, gH)
      }
      ctx.restore()
    }
    return canvas
  }

  const handleDownload = async (templateId) => {
    const tmpl = allTemplates.find((t) => t.id === templateId) || langCopies.find((lc) => lc.id === templateId) || logoPairs.find((lp) => lp.id === templateId)
    if (!tmpl) return
    const fileName = customNames[templateId] || tmpl.name
    const [w, h] = tmpl.size.split('\u00d7').map(Number)
    const isLogoPair = !!logoPairs.find(lp => lp.id === templateId)
    const fmt = isLogoPair ? 'PNG' : dlFormat
    if (fmt === 'PDF') {
      const canvas = await renderToCanvas(templateId, 4)
      if (!canvas) return
      const mmW = (w * 25.4) / 300
      const mmH = (h * 25.4) / 300
      const orientation = w >= h ? 'landscape' : 'portrait'
      const pdf = new jsPDF({ orientation, unit: 'mm', format: [mmW, mmH] })
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, mmW, mmH)
      pdf.save(`${fileName}_300dpi.pdf`)
    } else {
      const multiplier = dlScale === 'x2' ? 2 : 1
      const canvas = await renderToCanvas(templateId, multiplier)
      if (!canvas) return
      const mimeType = fmt === 'JPG' ? 'image/jpeg' : 'image/png'
      const ext = fmt === 'JPG' ? 'jpg' : 'png'
      const link = document.createElement('a')
      link.download = `${fileName}_${dlScale}.${ext}`
      link.href = canvas.toDataURL(mimeType, 0.95)
      link.click()
    }
  }

  const handleDownloadZip = async () => {
    const toDownload = allDisplayTemplates.filter((t) => dlSelectedIds.has(t.id))
    if (toDownload.length === 0) return
    if (toDownload.length === 1) { await handleDownload(toDownload[0].id); return }
    const zip = new JSZip()
    const multiplier = dlScale === 'x2' ? 2 : 1
    for (const tmpl of toDownload) {
      const fileName = customNames[tmpl.id] || tmpl.name
      const isLogoPair = !!logoPairs.find(lp => lp.id === tmpl.id)
      const fmt = isLogoPair ? 'PNG' : dlFormat
      if (fmt === 'PDF') {
        const canvas = await renderToCanvas(tmpl.id, 4)
        if (!canvas) continue
        const [w, h] = tmpl.size.split('\u00d7').map(Number)
        const mmW = (w * 25.4) / 300
        const mmH = (h * 25.4) / 300
        const orientation = w >= h ? 'landscape' : 'portrait'
        const pdf = new jsPDF({ orientation, unit: 'mm', format: [mmW, mmH] })
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.98), 'JPEG', 0, 0, mmW, mmH)
        zip.file(`${fileName}_300dpi.pdf`, pdf.output('blob'))
      } else {
        const canvas = await renderToCanvas(tmpl.id, multiplier)
        if (!canvas) continue
        const mimeType = fmt === 'JPG' ? 'image/jpeg' : 'image/png'
        const ext = fmt === 'JPG' ? 'jpg' : 'png'
        const base64 = canvas.toDataURL(mimeType, 0.95).split(',')[1]
        zip.file(`${fileName}_${dlScale}.${ext}`, base64, { base64: true })
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.download = `KKStudio_${new Date().toISOString().slice(0, 10)}.zip`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exhibitionEventGroupIds = ['exhibition', 'event']
  const exhibitionEventTemplateIds = new Set(
    templateGroups
      .filter(g => exhibitionEventGroupIds.includes(g.id))
      .flatMap(g => g.templates.map(t => t.id))
  )
  const showMergeButton = selectedTemplateDetails.some(t => exhibitionEventTemplateIds.has(t.id))

  const handleDownloadMerged = async () => {
    const multiplier = dlScale === 'x2' ? 2 : 1
    const canvases = []
    for (const tmpl of selectedTemplateDetails) {
      const c = await renderToCanvas(tmpl.id, multiplier)
      if (c) canvases.push(c)
    }
    if (canvases.length === 0) return
    const totalW = Math.max(...canvases.map(c => c.width))
    const totalH = canvases.reduce((sum, c) => sum + c.height, 0)
    const merged = document.createElement('canvas')
    merged.width = totalW
    merged.height = totalH
    const ctx = merged.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, totalW, totalH)
    let yy = 0
    for (const c of canvases) {
      const xx = Math.round((totalW - c.width) / 2)
      ctx.drawImage(c, xx, yy)
      yy += c.height
    }
    const mimeType = dlFormat === 'JPG' ? 'image/jpeg' : 'image/png'
    const ext = dlFormat === 'JPG' ? 'jpg' : 'png'
    const link = document.createElement('a')
    link.download = `merged_${dlScale}.${ext}`
    link.href = merged.toDataURL(mimeType, 0.95)
    link.click()
  }

  const nowStr = () => new Date().toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'))
    if (files.length === 0) return
    const newFiles = files.map(f => ({ name: f.name, url: URL.createObjectURL(f), uploadedAt: nowStr() }))
    setUploadedFiles(prev => [...prev, ...newFiles])
    if (files.length === 1) {
      setUploadedImage({ name: files[0].name, url: newFiles[0].url, extra: [] })
    } else {
      setUploadedImage({ name: `${files.length}개 파일`, url: newFiles[0].url, extra: newFiles.slice(1) })
    }
  }, [])

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const newFiles = files.map(f => ({ name: f.name, url: URL.createObjectURL(f), uploadedAt: nowStr() }))
    setUploadedFiles(prev => [...prev, ...newFiles])
    if (files.length === 1) {
      setUploadedImage({ name: files[0].name, url: newFiles[0].url, extra: [] })
    } else {
      setUploadedImage({ name: `${files.length}개 파일 선택됨`, url: newFiles[0].url, extra: newFiles.slice(1) })
    }
  }

  useEffect(() => {
    if (step !== STEP_EDITOR || !uploadedImage?.url) return
    const allImages = [{ url: uploadedImage.url }, ...(uploadedImage.extra || [])]
    const loadImage = (url) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = url })
    Promise.all(allImages.map(({ url }) => loadImage(url))).then((imgs) => {
      const initAllLayers = {}
      const initAllHistory = {}
      selectedTemplateDetails.forEach((tmpl) => {
        const [w, h] = tmpl.size.split('\u00d7').map(Number)
        // 배경색 레이어 (최하단)
        const bgLayer = { id: 'background', type: 'background', color: '#ffffff', x: 0, y: 0, width: w, height: h, rotation: 0 }
        // b4 전용 레이아웃 상수는 파일 상단 전역 상수 사용
        const imgLayers = imgs.map((img, idx) => {
          let imgW, imgH, imgX, imgY
          if (w === h) {
            imgW = w; imgH = h; imgX = 0; imgY = 0
          } else if (tmpl.id === 'b4') {
            // 우측 이미지 영역에 세로 fit
            const areaW = w - B4_IMG_X  // 835
            const ratio = img.naturalWidth / img.naturalHeight
            imgH = h; imgW = Math.round(h * ratio)
            if (imgW > areaW) { imgW = areaW; imgH = Math.round(areaW / ratio) }
            imgX = B4_IMG_X + Math.round((areaW - imgW) / 2)
            imgY = Math.round((h - imgH) / 2)
          } else if (tmpl.id === 'b11') {
            // 높이 = 템플릿 높이(560), 너비 = 원본 비율 유지 (크롭 없음)
            const ratio = img.naturalWidth / img.naturalHeight
            imgH = h                        // 560
            imgW = Math.round(h * ratio)    // 비율 유지
            imgX = B11_IMG_X               // 230
            imgY = 0
          } else if (tmpl.id === 'b9r') {
            // 가로 1000px에 맞춰 fit, 세로 중앙 정렬
            const ratio = img.naturalWidth / img.naturalHeight
            imgW = w                            // 1000
            imgH = Math.round(w / ratio)
            imgX = 0
            imgY = Math.round((h - imgH) / 2)
          } else {
            const ratio = img.naturalWidth / img.naturalHeight
            const maxW = Math.round(w * 0.7), maxH = Math.round(h * 0.7)
            if (ratio > maxW / maxH) { imgW = maxW; imgH = Math.round(maxW / ratio) }
            else { imgH = maxH; imgW = Math.round(maxH * ratio) }
            const offset = idx * 20
            imgX = Math.round((w - imgW) / 2) + offset; imgY = Math.round((h - imgH) / 2) + offset
          }
          return { id: `img-${idx + 1}`, type: 'image', src: allImages[idx].url, x: imgX ?? 0, y: imgY ?? 0, width: imgW, height: imgH, rotation: 0 }
        })
        // PC 와이드 대배너(b4) 전용 텍스트 레이어 초기화
        const b4TextLayers = tmpl.id === 'b4' ? (() => {
          const mainFontSize = 48, subFontSize = 28, lineHeight = 1.3
          const mainH = Math.round(mainFontSize * lineHeight * 2)  // 125
          const subH = Math.round(subFontSize * lineHeight)         // 36
          const gap = 24
          const totalH = mainH + gap + subH
          const startY = Math.round((h - totalH) / 2)
          return [
            { id: 'b4-gradient', type: 'gradient', direction: 'to-right', x: B4_IMG_X, y: 0, width: 160, height: h, rotation: 0 },
            { id: 'b4-main', type: 'text', text: '설 연휴 쇼핑 #오쇼완\n최대 56% 오늘 하루만!', x: B4_MARGIN, y: startY, width: B4_TEXT_W, height: mainH, rotation: 0, fontSize: mainFontSize, fontWeight: '700', color: '#1E2023', fontFamily: 'Pretendard', align: 'left', letterSpacing: -2, lineHeight },
            { id: 'b4-sub',  type: 'text', text: "Happy Valentine's 특별한 순간",              x: B4_MARGIN, y: startY + mainH + gap, width: B4_TEXT_W, height: subH, rotation: 0, fontSize: subFontSize, fontWeight: '400', color: 'rgba(30,32,35,0.8)', fontFamily: 'Pretendard', align: 'left', letterSpacing: 0, lineHeight },
          ]
        })() : []

        // 메인 팝업 프로모션(b11) 전용 레이어 초기화
        const b11Layers = tmpl.id === 'b11' ? (() => {
          const lh = 1.3
          const subFontSize = 34, titleFontSize = 56, detailFontSize = 32
          const subH = Math.round(subFontSize * lh)           // 44
          const titleH = Math.round(titleFontSize * lh * 2)   // 146
          const detailH = Math.round(detailFontSize * lh)     // 42
          const gap1 = 16, gap2 = 32
          const totalH = subH + gap1 + titleH + gap2 + detailH  // 280
          const startY = Math.round((h - totalH) / 2)         // 140
          return [
            { id: 'b11-gradient', type: 'gradient', direction: 'to-right', x: B11_GRAD_X, y: B11_GRAD_Y, width: B11_GRAD_W, height: B11_GRAD_H, rotation: 0 },
            { id: 'b11-sub',    type: 'text', text: '서브타이틀 문구',              x: B11_TEXT_X, y: startY,                          width: B11_TEXT_W, height: subH,    rotation: 0, fontSize: subFontSize,    fontWeight: '400', color: '#1E2023',              fontFamily: 'Pretendard', align: 'left', letterSpacing: 0,  lineHeight: lh },
            { id: 'b11-title',  type: 'text', text: '메인 타이틀\n두줄까지 입력 가능', x: B11_TEXT_X, y: startY + subH + gap1,            width: B11_TEXT_W, height: titleH,  rotation: 0, fontSize: titleFontSize,  fontWeight: '700', color: '#1E2023',              fontFamily: 'Pretendard', align: 'left', letterSpacing: -1, lineHeight: lh },
            { id: 'b11-detail', type: 'text', text: '상세 내용을 입력해 주세요',    x: B11_TEXT_X, y: startY + subH + gap1 + titleH + gap2, width: B11_TEXT_W, height: detailH, rotation: 0, fontSize: detailFontSize, fontWeight: '400', color: 'rgba(30,32,35,0.8)', fontFamily: 'Pretendard', align: 'left', letterSpacing: 0,  lineHeight: lh },
          ]
        })() : []

        const init = [bgLayer, ...imgLayers, ...b4TextLayers, ...b11Layers]
        initAllLayers[tmpl.id] = init
        initAllHistory[tmpl.id] = { history: [JSON.parse(JSON.stringify(init))], index: 0 }
      })
      // b8 로고 쌍 자동 초기화
      const b8Tmpl = selectedTemplateDetails.find(t => t.id === 'b8')
      if (b8Tmpl) {
        const [bw, bh] = b8Tmpl.size.split('×').map(Number)
        const LOGO_MARGIN = Math.round(bw * 0.0625) // 20px at 320px
        const pairs = [
          { id: 'b8-black', name: '브랜드 필수배너 (블랙)', variant: 'black', textColor: '#000000', size: b8Tmpl.size },
          { id: 'b8-white', name: '브랜드 필수배너 (화이트)', variant: 'white', textColor: '#ffffff', size: b8Tmpl.size },
        ]
        const buildLogoLayers = (srcUrls) => {
          pairs.forEach(({ id, textColor }) => {
            const bgL = { id: 'background', type: 'background', color: 'transparent', x: 0, y: 0, width: bw, height: bh, rotation: 0 }
            const imgLayers = imgs.map((img, idx) => {
              const maxW = bw - LOGO_MARGIN * 2
              const maxH = bh - LOGO_MARGIN * 2
              const ratio = img.naturalWidth / img.naturalHeight
              let iw, ih
              if (ratio > maxW / maxH) { iw = maxW; ih = Math.round(maxW / ratio) }
              else { ih = maxH; iw = Math.round(maxH * ratio) }
              const ix = Math.round((bw - iw) / 2)
              const iy = Math.round((bh - ih) / 2)
              return { id: `img-${idx + 1}`, type: 'image', src: srcUrls[idx], x: ix, y: iy, width: iw, height: ih, rotation: 0, logoTint: textColor }
            })
            const init = [bgL, ...imgLayers]
            initAllLayers[id] = init
            initAllHistory[id] = { history: [JSON.parse(JSON.stringify(init))], index: 0 }
          })
        }
        // 원본 URL로 우선 초기화
        buildLogoLayers(allImages.map(f => f.url))
        setLogoPairs(pairs)

        // 배경 제거 비동기 실행 후 레이어 src 업데이트
        setIsRemovingBg(true)
        Promise.all(allImages.map(f => removeBackground(f.url).then(blob => URL.createObjectURL(blob)).catch(() => f.url)))
          .then(removedUrls => {
            buildLogoLayers(removedUrls)
            setAllLayers(prev => {
              const next = { ...prev }
              pairs.forEach(({ id }) => {
                if (next[id]) {
                  next[id] = next[id].map(l => {
                    if (l.type !== 'image') return l
                    const idx = parseInt(l.id.replace('img-', '')) - 1
                    return { ...l, src: removedUrls[idx] ?? l.src }
                  })
                }
              })
              return next
            })
          })
          .finally(() => setIsRemovingBg(false))
      }

      setAllLayers(initAllLayers)
      setAllHistory(initAllHistory)
      setSelectedLayerId('img-1')
      setPanOffset({ x: 0, y: 0 })
      setZoom(75)
    })
  }, [step])

  const onMouseDownLayer = (e, id) => {
    if (isSpaceDown) return
    e.stopPropagation()
    setSelectedLayerId(id)
    const layer = layers.find((l) => l.id === id)
    if (layer?.type === 'text') return  // 텍스트 위치 고정
    const { x: origX, y: origY, width: lW, height: lH } = layer
    const startX = e.clientX, startY = e.clientY
    const SNAP = 6
    let dragging = false
    const onMove = (ev) => {
      if (!dragging) {
        const dist = Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY)
        if (dist < 4) return
        dragging = true
      }
      let nx = Math.round(origX + (ev.clientX - startX) / scale)
      let ny = Math.round(origY + (ev.clientY - startY) / scale)
      const others = (allLayers[currentTemplateId] || []).filter((l) => l.id !== id)
      const xTargets = [0, Math.round(canvasW / 2), canvasW, ...others.flatMap((l) => [l.x, Math.round(l.x + l.width / 2), l.x + l.width])]
      const xEdges = [{ val: nx, offset: 0 }, { val: Math.round(nx + lW / 2), offset: -Math.round(lW / 2) }, { val: nx + lW, offset: -lW }]
      const newGuidesX = []
      let bestX = SNAP + 1
      for (const tgt of xTargets) {
        for (const edge of xEdges) {
          const d = Math.abs(edge.val - tgt)
          if (d < bestX) { bestX = d; nx = tgt + edge.offset; newGuidesX.length = 0; newGuidesX.push(tgt) }
        }
      }
      const yTargets = [0, Math.round(canvasH / 2), canvasH, ...others.flatMap((l) => [l.y, Math.round(l.y + l.height / 2), l.y + l.height])]
      const yEdges = [{ val: ny, offset: 0 }, { val: Math.round(ny + lH / 2), offset: -Math.round(lH / 2) }, { val: ny + lH, offset: -lH }]
      const newGuidesY = []
      let bestY = SNAP + 1
      for (const tgt of yTargets) {
        for (const edge of yEdges) {
          const d = Math.abs(edge.val - tgt)
          if (d < bestY) { bestY = d; ny = tgt + edge.offset; newGuidesY.length = 0; newGuidesY.push(tgt) }
        }
      }
      setGuides({ x: newGuidesX, y: newGuidesY })
      setLayers(layers.map((l) => l.id === id ? { ...l, x: nx, y: ny } : l))
    }
    const onUp = () => {
      const cur = allLayers[currentTemplateId] || []
      commitHistory(cur)
      setGuides({ x: [], y: [] })
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
    const isTextLayer = layer.type === 'text'
    const onMove = (ev) => {
      const dx = Math.round((ev.clientX - startX) / scale)
      const dy = Math.round((ev.clientY - startY) / scale)
      setLayers(layers.map((l) => {
        if (l.id !== id) return l
        let nw = ow, nh = oh, nx = ox, ny = oy
        if (isTextLayer) {
          // 텍스트: 오른쪽 width만 조절
          nw = Math.max(60, ow + dx)
        } else if (isCorner) {
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
      commitHistory(allLayers[currentTemplateId] || [])
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
    const absCx = rect.left + (layer.x + layer.width / 2) * scale
    const absCy = rect.top + (layer.y + layer.height / 2) * scale
    const startAngle = Math.atan2(e.clientY - absCy, e.clientX - absCx)
    const startRot = layer.rotation || 0
    const onMove = (ev) => {
      const angle = Math.atan2(ev.clientY - absCy, ev.clientX - absCx)
      const newRot = ((startRot + deg(angle - startAngle)) % 360 + 360) % 360
      setLayers(layers.map((l) => l.id === id ? { ...l, rotation: Math.round(newRot) } : l))
    }
    const onUp = () => {
      commitHistory(allLayers[currentTemplateId] || [])
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const addImageLayer = (file) => {
    if (!file) return
    const url = file.url ?? URL.createObjectURL(file)
    const id = `img-${Date.now()}`
    const img = new Image()
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight
      let imgW, imgH
      if (canvasW === canvasH) {
        // 정사각 캔버스: 캔버스 완전히 채우기 (cover fit)
        imgW = canvasW; imgH = canvasH
      } else {
        const maxW = Math.round(canvasW * 0.5), maxH = Math.round(canvasH * 0.5)
        if (ratio > maxW / maxH) { imgW = maxW; imgH = Math.round(maxW / ratio) }
        else { imgH = maxH; imgW = Math.round(maxH * ratio) }
      }
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

  const toggleLangCopy = (lang) => {
    const baseTemplate = langBase
    if (!baseTemplate) return
    const langKey = lang === 'English' ? 'en' : lang === '中文' ? 'zh' : 'ja'
    const langId = `${baseTemplate.id}-lang-${langKey}`
    const isActive = langCopies.some(lc => lc.id === langId)
    if (isActive) {
      const removedTabIdx = allDisplayTemplates.findIndex(t => t.id === langId)
      setLangCopies(prev => prev.filter(lc => lc.id !== langId))
      setAllLayers(prev => { const n = { ...prev }; delete n[langId]; return n })
      setAllHistory(prev => { const n = { ...prev }; delete n[langId]; return n })
      if (activePreviewTab === removedTabIdx) setActivePreviewTab(0)
      else if (activePreviewTab > removedTabIdx) setActivePreviewTab(prev => prev - 1)
    } else {
      const baseLangCopies = langCopies.filter(lc => lc.baseId === baseTemplate.id)
      if (baseLangCopies.length >= 2) return
      const sourceLayers = allLayers[baseTemplate.id] ? JSON.parse(JSON.stringify(allLayers[baseTemplate.id])) : []
      // 번역 제안 사전 (레이어 ID 기준)
      const SUGGESTIONS = {
        'English': {
          // b4 (PC 와이드 대배너)
          'b4-main': ["Lunar New Year Shopping\nUp to 56% OFF — Today Only!", "Spring Sale Event #SSGsale\nExclusive 56% Discount Today!"],
          'b4-sub':  ["Happy Valentine's — A Special Moment", "A Truly Special Valentine's Moment"],
          // b11 (메인 팝업 프로모션)
          'b11-sub':    ["Exclusive Offer", "Special Promotion"],
          'b11-title':  ["Limited Time\nSpecial Event", "Premium Brand\nExclusive Sale"],
          'b11-detail': ["Shop now for exclusive deals", "Up to 56% OFF — Today Only"],
        },
        '中文': {
          'b4-main': ["春节购物 #限时特卖\n最高56折 仅限今日！", "新春特卖会\n精选商品低至56折 今日截止"],
          'b4-sub':  ["情人节 特别的时刻", "幸福情人节 · 专属礼遇"],
          'b11-sub':    ["专属优惠", "限时特卖"],
          'b11-title':  ["限时特卖\n优惠活动", "精品品牌\n专属折扣"],
          'b11-detail': ["立即购物 享受专属优惠", "最高56折 仅限今日"],
        },
        '日本語': {
          'b4-main': ["お正月セール #SSG\n最大56%OFF 本日限り！", "新春ショッピング\n最大56%引き・本日のみ"],
          'b4-sub':  ["バレンタインの特別な瞬間", "ハッピーバレンタイン 特別なひととき"],
          'b11-sub':    ["特別オファー", "限定セール"],
          'b11-title':  ["期間限定\nスペシャルイベント", "プレミアムブランド\n限定セール"],
          'b11-detail': ["今すぐショッピング", "最大56%OFF 本日限り"],
        },
      }
      // 첫 번째 번역 제안을 텍스트 레이어에 자동 적용
      const translatedLayers = sourceLayers.map(l => {
        if (l.type !== 'text') return l
        const translated = SUGGESTIONS[lang]?.[l.id]?.[0]
        return translated ? { ...l, text: translated } : l
      })
      const newCopy = { lang, id: langId, name: `${baseTemplate.name} (${lang})`, size: baseTemplate.size, baseId: baseTemplate.id }
      const newTabIdx = allDisplayTemplates.length
      setLangCopies(prev => [...prev, newCopy])
      setAllLayers(prev => ({ ...prev, [langId]: translatedLayers }))
      setAllHistory(prev => ({ ...prev, [langId]: { history: [JSON.parse(JSON.stringify(translatedLayers))], index: 0 } }))
      setActivePreviewTab(newTabIdx)
      // 번역 제안 패널용 데이터 생성
      const textLayers = sourceLayers.filter(l => l.type === 'text')
      const suggestions = textLayers.map(l => ({
        layerId: l.id,
        original: l.text,
        suggestions: SUGGESTIONS[lang]?.[l.id] || [l.text],
      }))
      setLangSuggestions(prev => ({ ...prev, [langId]: suggestions }))
    }
  }

  const extractColors = () => {
    if (!uploadedImage?.url) return
    setIsExtractingColors(true)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 80; canvas.height = 80
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, 80, 80)
      const data = ctx.getImageData(0, 0, 80, 80).data
      const colorMap = {}
      for (let i = 0; i < data.length; i += 16) {
        const r = Math.round(data[i] / 32) * 32
        const g = Math.round(data[i+1] / 32) * 32
        const b = Math.round(data[i+2] / 32) * 32
        if (data[i+3] < 128) continue
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

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setIsSpaceDown(true)
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault()
        setZoom((z) => Math.min(200, z + 25))
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault()
        setZoom((z) => Math.max(25, z - 25))
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault()
        setZoom(75)
      }
    }
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpaceDown(false)
        setIsPanning(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const handleCanvasWheel = (e) => {
    e.preventDefault()
    // Cmd/Ctrl + 휠 = 줌
    if (e.metaKey || e.ctrlKey) {
      const delta = e.deltaY > 0 ? -25 : 25
      setZoom((z) => Math.min(200, Math.max(25, z + delta)))
    } else {
      // 일반 휠 = 패닝 (Shift+휠 = 좌우)
      setPanOffset((prev) => ({
        x: prev.x - (e.shiftKey ? e.deltaY : e.deltaX) * 0.8,
        y: prev.y - (e.shiftKey ? 0 : e.deltaY) * 0.8,
      }))
    }
  }

  const handleCanvasMouseDown = (e) => {
    if (isSpaceDown) {
      e.preventDefault()
      e.stopPropagation()
      setIsPanning(true)
      const startX = e.clientX
      const startY = e.clientY
      const startPanX = panOffset.x
      const startPanY = panOffset.y
      const onMove = (ev) => {
        setPanOffset({ x: startPanX + (ev.clientX - startX), y: startPanY + (ev.clientY - startY) })
      }
      const onUp = () => {
        setIsPanning(false)
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
      }
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    }
  }

  const canvasTransform = `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px)) scale(${scale})`

  const fitToScreen = () => {
    if (!canvasAreaRef.current) return
    const rect = canvasAreaRef.current.getBoundingClientRect()
    const padding = 80
    const fitZoom = Math.min(
      Math.floor((rect.width - padding * 2) / canvasW * 100),
      Math.floor((rect.height - padding * 2) / canvasH * 100),
      200
    )
    setZoom(Math.max(25, fitZoom))
    setPanOffset({ x: 0, y: 0 })
  }

  return (
    <div>
      {/* 애니메이션 keyframes */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes syncPulse { 0%,100% { background-position: 0% 50% } 50% { background-position: 100% 50% } }
      `}</style>

      {/* 메인으로 나가기 확인 다이얼로그 */}
      {showGoHomeConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100000, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '28px 28px 24px', width: 320, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>메인으로 나가시겠어요?</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24, lineHeight: 1.6 }}>
              현재 작업 중인 내용은 저장되지 않으며<br />나가면 사라집니다.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowGoHomeConfirm(false)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E5E7EB', background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={() => { setShowGoHomeConfirm(false); onGoHome ? onGoHome() : onBack() }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#9F48CE,#C084FC)', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 메시지 */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 99999, background: '#111827', color: '#fff', fontSize: 13, fontWeight: 500, padding: '10px 20px', borderRadius: 999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)', pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* 파일 보관함 툴팁 */}
      {tooltip && (
        <div style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, zIndex: 99999, width: 172, pointerEvents: 'none' }}>
          <div style={{ background: '#111827', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: 12 }}>
            <div style={{ width: '100%', height: 80, borderRadius: 8, overflow: 'hidden', marginBottom: 10, position: 'relative', backgroundImage: 'linear-gradient(45deg, #555 25%, transparent 25%), linear-gradient(-45deg, #555 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #555 75%), linear-gradient(-45deg, transparent 75%, #555 75%)', backgroundSize: '6px 6px', backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px', backgroundColor: '#444' }}>
              <img src={tooltip.file.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <p style={{ color: '#FACC15', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>파일 정보</p>
            <p style={{ color: '#fff', fontSize: 11, fontWeight: 500, wordBreak: 'break-all', lineHeight: 1.4, marginBottom: 8 }}>{tooltip.file.name}</p>
            <div style={{ height: 1, background: '#374151', marginBottom: 8 }} />
            <p style={{ color: '#FACC15', fontSize: 10, fontWeight: 600, marginBottom: 4 }}>업로드 날짜</p>
            <p style={{ color: '#9CA3AF', fontSize: 11, marginBottom: 8 }}>{tooltip.file.uploadedAt}</p>
            <div style={{ height: 1, background: '#374151', marginBottom: 8 }} />
            <p style={{ color: '#6B7280', fontSize: 10 }}>{selectedLayer?.type === 'image' ? '클릭 시 이미지 교체' : '클릭 시 레이어 추가'}</p>
          </div>
        </div>
      )}

      {/* 줌 컨트롤과 레이어 패널은 캔버스 뷰포트 안에서 렌더링 */}

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
              {selectedTemplateDetails.map((tmpl) => (
                <span key={tmpl.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white text-xs font-medium text-primary-700 border border-primary-200">
                  {tmpl.name}
                  <button onClick={() => toggleTemplate(tmpl.id)} className="ml-1 hover:text-red-500"><X className="w-3 h-3" /></button>
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
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleFileInput} className="absolute inset-0 opacity-0 cursor-pointer" />
              {uploadedImage ? (
                <div>
                  {uploadedImage.extra?.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                      {[uploadedImage, ...uploadedImage.extra].map((f, i) => (
                        <img key={i} src={f.url} alt="" className="h-24 w-auto object-contain rounded-lg shadow-md border border-gray-100" />
                      ))}
                    </div>
                  ) : (
                    <div className="mx-auto mb-4 overflow-hidden shadow-lg max-h-64 max-w-full inline-block">
                      <img src={uploadedImage.url} alt="" className="max-h-64 max-w-full w-auto h-auto object-contain" />
                    </div>
                  )}
                  <p className="text-sm font-medium text-gray-700">{uploadedImage.name}</p>
                  <p className="text-xs text-primary-600 mt-1">클릭하여 다시 선택</p>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-100 flex items-center justify-center">
                    <Upload className="w-7 h-7 text-primary-500" />
                  </div>
                  <p className="text-base font-semibold text-gray-700 mb-1">상품 이미지를 드래그하세요</p>
                  <p className="text-sm text-gray-400">또는 클릭하여 파일 선택 · 여러 장 동시 선택 가능 · JPG, PNG, WEBP</p>
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
              <button onClick={() => setShowGoHomeConfirm(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all">
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
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files[0]
                  if (!file) return
                  const newFile = { name: file.name, url: URL.createObjectURL(file), uploadedAt: nowStr() }
                  setUploadedFiles(prev => [...prev, newFile])
                  addImageLayer(newFile)
                }} />
                <ImagePlus className="w-4 h-4" /> 이미지 추가
              </label>
              <button onClick={addTextLayer} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
                <Type className="w-4 h-4" /> 텍스트 추가
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* 가이드 보기 토글 */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => { const next = !showGuide; setShowGuide(next); if (!next) setLogoGuide(null) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${(showGuide || (isLogoTab && logoGuide)) ? '#9F48CE' : '#e5e7eb'}`, background: (showGuide || (isLogoTab && logoGuide)) ? '#F3E8FF' : '#fff', color: (showGuide || (isLogoTab && logoGuide)) ? '#9F48CE' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
                  </svg>
                  가이드 보기
                  <ChevronDown style={{ width: 12, height: 12, transform: showGuide ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                {showGuide && isLogoTab && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '6px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 110 }}>
                    {['가로형', '심볼형'].map(type => (
                      <button key={type} onClick={() => { setLogoGuide(g => g === type ? null : type) }}
                        style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${logoGuide === type ? '#9F48CE' : 'transparent'}`, background: logoGuide === type ? '#f3e8ff' : 'transparent', color: logoGuide === type ? '#7c3aed' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        {type}
                      </button>
                    ))}
                  </div>
                )}
                {showGuide && !isLogoTab && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '10px 14px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#374151', cursor: 'pointer', position: 'relative', whiteSpace: 'nowrap' }}>
                      <div style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid #e5e7eb', background: guideTextColor, flexShrink: 0 }} />
                      <input type="color" value={guideTextColor} onChange={e => setGuideTextColor(e.target.value)} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                      폰트색
                    </label>
                  </div>
                )}
              </div>
              <div style={{ width: 1, height: 20, background: '#e5e7eb' }} />
              {showMergeButton && (
                <button onClick={handleDownloadMerged} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold border border-primary-300 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-all">
                  <Download className="w-4 h-4" /> 한장으로 다운로드
                </button>
              )}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowDlPopup(v => !v)} disabled={dlSelectedIds.size === 0} className="flex items-center gap-2 px-8 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#9F48CE,#C084FC)' }}>
                  <Download className="w-4 h-4" />
                  {dlSelectedIds.size <= 1 ? '이미지 다운로드' : `${dlSelectedIds.size}개 ZIP 다운로드`}
                  <ChevronDown className="w-3.5 h-3.5" style={{ transform: showDlPopup ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                {showDlPopup && (
                  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 500, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: 16, width: 220 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>파일 형식</p>
                    {hasLogoSelected ? (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <div style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px solid #9F48CE', background: '#f3e8ff', color: '#7c3aed', textAlign: 'center' }}>PNG</div>
                      </div>
                    ) : (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                      {['JPG','PNG','PDF'].map(fmt => (
                        <button key={fmt} onClick={() => setDlFormat(fmt)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, border: dlFormat === fmt ? '1.5px solid #9F48CE' : '1.5px solid #e5e7eb', background: dlFormat === fmt ? '#f3e8ff' : '#fff', color: dlFormat === fmt ? '#7c3aed' : '#6b7280', cursor: 'pointer' }}>{fmt}</button>
                      ))}
                    </div>
                    )}
                    {hasLogoSelected && <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12, textAlign: 'center' }}>로고배너는 투명 PNG로 저장</p>}
                    {dlEffectiveFmt !== 'PDF' && (
                      <>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>해상도</p>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                          {[['x1','1배 (원본)'],['x2','2배 (고화질)']].map(([sc, label]) => (
                            <button key={sc} onClick={() => setDlScale(sc)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 600, border: dlScale === sc ? '1.5px solid #9F48CE' : '1.5px solid #e5e7eb', background: dlScale === sc ? '#f3e8ff' : '#fff', color: dlScale === sc ? '#7c3aed' : '#6b7280', cursor: 'pointer' }}>{label}</button>
                          ))}
                        </div>
                      </>
                    )}
                    {dlEffectiveFmt === 'PDF' && <p style={{ fontSize: 11, color: '#9F48CE', marginBottom: 12, textAlign: 'center' }}>300dpi 고화질 출력</p>}
                    <button onClick={() => { setShowDlPopup(false); handleDownloadZip() }} style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: 'linear-gradient(135deg,#9F48CE,#C084FC)', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Download style={{ width: 14, height: 14 }} />
                      {dlSelectedIds.size <= 1 ? '다운로드' : `${dlSelectedIds.size}개 다운로드`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 본문 */}
          <div className="flex flex-1 overflow-hidden">

            {/* 왼쪽 툴 패널 */}
            <div className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
              <div className="p-4 space-y-4">
                <button onClick={() => setStep(STEP_IMAGE)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
                  <ArrowLeft className="w-4 h-4" /> 이미지 다시 선택
                </button>

                {/* 동적 패널 순서 - 선택 상태에 따라 관련 패널이 상단으로 */}
                {(() => {
                  const type = selectedLayer?.type

                  const styleSync = (type === 'image' || type === 'text' || type === 'background') ? (
                    <div key="sync" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">스타일 일괄 적용</h3>
                        <div className="relative group">
                          <span style={{ fontSize: 12, color: '#9ca3af', cursor: 'default' }}>ⓘ</span>
                          <div className="absolute left-5 top-0 z-50 w-52 bg-gray-900 text-white text-xs rounded-xl p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-all" style={{ whiteSpace: 'normal' }}>
                            {type === 'image' && '선택한 이미지를 모든 사이즈에 동일하게 적용합니다.'}
                            {type === 'text' && '선택한 텍스트 레이어를 모든 사이즈에 동일하게 적용합니다.'}
                            {type === 'background' && '변경된 배경색을 모든 사이즈에 동일하게 적용합니다.'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (!currentTemplateId || isSyncing) return
                          setIsSyncing(true)
                          setTimeout(() => {
                            const newAllLayers = { ...allLayers }
                            const newAllHistory = { ...allHistory }
                            const newAllBgColors = { ...allBgColors }
                            const [sw, sh] = (currentTemplate?.size || '750\u00d7750').split('\u00d7').map(Number)
                            allDisplayTemplates.forEach((tmpl) => {
                              if (tmpl.id === currentTemplateId) return
                              const [tw, th] = tmpl.size.split('\u00d7').map(Number)
                              const scaleX = tw / sw, scaleY = th / sh
                              const targetLayers = [...(allLayers[tmpl.id] || [])]
                              if (type === 'image') {
                                let nW, nH
                                if (tw === th) {
                                  nW = tw; nH = th
                                } else {
                                  const r = selectedLayer.width / selectedLayer.height
                                  const mW = Math.round(tw * 0.7), mH = Math.round(th * 0.7)
                                  if (r > mW / mH) { nW = mW; nH = Math.round(mW / r) } else { nH = mH; nW = Math.round(mH * r) }
                                }
                                const sl = { ...selectedLayer, x: Math.round((tw - nW) / 2), y: Math.round((th - nH) / 2), width: nW, height: nH }
                                const idx = targetLayers.findIndex(l => l.id === selectedLayer.id)
                                if (idx >= 0) targetLayers[idx] = sl; else targetLayers.push(sl)
                              } else if (type === 'text') {
                                const sl = { ...selectedLayer, x: Math.round(selectedLayer.x * scaleX), y: Math.round(selectedLayer.y * scaleY), width: Math.round(selectedLayer.width * scaleX), height: Math.round(selectedLayer.height * scaleY), fontSize: selectedLayer.fontSize ? Math.round(selectedLayer.fontSize * Math.min(scaleX, scaleY)) : selectedLayer.fontSize }
                                const idx = targetLayers.findIndex(l => l.id === selectedLayer.id)
                                if (idx >= 0) targetLayers[idx] = sl; else targetLayers.push(sl)
                              } else if (type === 'background') {
                                const bi = targetLayers.findIndex(l => l.id === 'background')
                                if (bi >= 0) targetLayers[bi] = { ...targetLayers[bi], color: selectedLayer.color }
                                else targetLayers.unshift({ id: 'background', type: 'background', color: selectedLayer.color, x: 0, y: 0, width: tw, height: th, rotation: 0 })
                                newAllBgColors[tmpl.id] = selectedLayer.color
                              }
                              newAllLayers[tmpl.id] = targetLayers
                              newAllHistory[tmpl.id] = { history: [JSON.parse(JSON.stringify(targetLayers))], index: 0 }
                            })
                            setAllLayers(newAllLayers)
                            setAllHistory(newAllHistory)
                            if (type === 'background') setAllBgColors(newAllBgColors)
                            setIsSyncing(false)
                            setToast('전체 사이즈에 적용되었습니다!')
                            setTimeout(() => setToast(''), 2000)
                          }, 50)
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                        style={{
                          background: isSyncing
                            ? 'linear-gradient(270deg, #9F48CE, #C084FC, #9F48CE)'
                            : 'linear-gradient(135deg,#9F48CE,#C084FC)',
                          backgroundSize: isSyncing ? '200% 200%' : '100%',
                          animation: isSyncing ? 'syncPulse 1s ease infinite' : 'none',
                          color: '#fff',
                          opacity: isSyncing ? 0.85 : 1,
                          cursor: isSyncing ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isSyncing ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                              style={{ animation: 'spin 0.8s linear infinite' }}>
                              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                            </svg>
                            적용 중...
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 14 }}>⇄</span>
                            {type === 'image' && '이미지 스타일 전체 적용'}
                            {type === 'text' && '텍스트 전체 적용'}
                            {type === 'background' && '배경색 전체 적용'}
                          </>
                        )}
                      </button>
                    </div>
                  ) : null

                  const fileStorage = (
                    <div key="files" className="rounded-xl border border-gray-200 overflow-visible">
                      <label className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary-50 border-b border-gray-200 text-sm font-medium text-primary-700 hover:bg-primary-100 cursor-pointer transition-all">
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          if (files.length === 0) return
                          const newFiles = files.map(f => ({ name: f.name, url: URL.createObjectURL(f), uploadedAt: nowStr() }))
                          setUploadedFiles(prev => [...prev, ...newFiles])
                        }} />
                        <Upload className="w-4 h-4" /> 파일 업로드
                      </label>
                      <div className="flex border-b border-gray-200">
                        {[{ key: 'upload', label: '파일 보관함' }, { key: 'ai', label: 'AI 생성이미지' }].map(tab => (
                          <button key={tab.key} onClick={() => setMediaTab(tab.key)}
                            className={`flex-1 py-2 text-xs font-medium transition-all ${mediaTab === tab.key ? 'text-primary-700 border-b-2 border-primary-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}>
                            {tab.label}
                          </button>
                        ))}
                      </div>
                      <div className="p-2 bg-gray-50">
                        {mediaTab === 'upload' && (
                          uploadedFiles.length === 0
                            ? <p className="text-xs text-gray-400 text-center py-6">업로드한 파일이 없어요</p>
                            : <div className="grid grid-cols-3 gap-1.5">
                                {uploadedFiles.map((f, i) => (
                                  <div key={i} className="relative">
                                    <button
                                      onClick={() => { if (selectedLayer?.type === 'image') { updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, src: f.url } : l)) } else { addImageLayer(f) } }}
                                      onMouseEnter={(e) => { const rect = e.currentTarget.getBoundingClientRect(); setTooltip({ file: f, x: rect.right + 8, y: rect.top }) }}
                                      onMouseLeave={() => setTooltip(null)}
                                      className="relative w-full aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-primary-400 transition-all"
                                    >
                                      <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(45deg, #d0d0d0 25%, transparent 25%), linear-gradient(-45deg, #d0d0d0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #d0d0d0 75%), linear-gradient(-45deg, transparent 75%, #d0d0d0 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px', backgroundColor: '#f8f8f8' }} />
                                      <img src={f.url} alt={f.name} className="absolute inset-0 w-full h-full object-contain" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                        )}
                        {mediaTab === 'ai' && (
                          <div className="text-center py-6">
                            <div className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#9F48CE,#C084FC)' }}>
                              <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-xs font-medium text-gray-500">Creagen AI 이미지 생성</p>
                            <p className="text-gray-300 mt-1" style={{ fontSize: 10 }}>Coming soon</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )

                  const logoTypePanel = isLogoTab ? (
                    <div key="logotype" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">로고 타입 가이드</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: '가로형', sublabel: '워드마크' },
                          { label: '심볼형', sublabel: '아이콘+텍스트' },
                        ].map(({ label, sublabel }) => {
                          const active = logoGuide === label
                          return (
                          <button key={label} onClick={() => setLogoGuide(active ? null : label)}
                            className="flex flex-col items-start gap-0.5 py-2.5 px-3 rounded-xl border transition-all text-left"
                            style={{ background: active ? '#f3e8ff' : '#fff', borderColor: active ? '#9F48CE' : '#e5e7eb' }}>
                            <span className="text-xs font-semibold" style={{ color: active ? '#7c3aed' : '#374151' }}>{label}</span>
                            <span className="text-[10px] text-gray-400">{sublabel}</span>
                          </button>
                          )
                        })}
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 text-center">가이드 선택 후 이미지를 직접 맞춰주세요</p>
                    </div>
                  ) : null

                  const quickEdit = (
                    <div key="quick" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">빠른 편집</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          {icon: Eraser, label: isRemovingBg ? '처리 중...' : '배경 제거', onClick: async () => {
                            if (!selectedLayer || selectedLayer.type !== 'image' || isRemovingBg) return
                            setIsRemovingBg(true)
                            try {
                              const blob = await removeBackground(selectedLayer.src)
                              const newUrl = URL.createObjectURL(blob)
                              updateLayers(layers.map(l => l.id === selectedLayer.id ? { ...l, src: newUrl } : l))
                              if (isLogoTab) {
                                setToast(currentTemplate.logoPair === 'white' ? '배경 제거 완료. 흰색 로고로 표시됩니다.' : '배경 제거 완료. 검정 로고로 표시됩니다.')
                                setTimeout(() => setToast(''), 2500)
                              }
                            } catch (e) {
                              setToast('배경 제거 실패: ' + e.message)
                              setTimeout(() => setToast(''), 3000)
                            } finally {
                              setIsRemovingBg(false)
                            }
                          }},
                          {icon: Expand, label: '배경 확장', skip: isLogoTab, onClick: () => {
                            if (!selectedLayer || selectedLayer.type !== 'image') return
                            const src = selectedLayer.src
                            const { x: ix, y: iy, width: iw, height: ih } = selectedLayer
                            const img = new Image()
                            img.crossOrigin = 'anonymous'
                            img.onload = () => {
                              const off = document.createElement('canvas')
                              off.width = canvasW; off.height = canvasH
                              const ctx = off.getContext('2d')

                              // 1) 이미지를 캔버스 전체에 cover fit으로 블러 확장
                              const imgR = img.naturalWidth / img.naturalHeight
                              const cvR = canvasW / canvasH
                              let bgW, bgH
                              if (imgR > cvR) { bgH = canvasH; bgW = bgH * imgR }
                              else { bgW = canvasW; bgH = bgW / imgR }
                              const bgX = (canvasW - bgW) / 2, bgY = (canvasH - bgH) / 2

                              // 블러 배경
                              ctx.filter = 'blur(28px) saturate(0.85) brightness(0.92)'
                              ctx.drawImage(img, bgX, bgY, bgW, bgH)
                              ctx.filter = 'none'

                              // 2) 원본 이미지 위치에 선명하게 합성 + 엣지 페더링
                              // 페더 마스크: 원본 이미지 경계에서 자연스럽게 블렌드
                              const feather = Math.min(iw, ih) * 0.08
                              const tmpCanvas = document.createElement('canvas')
                              tmpCanvas.width = canvasW; tmpCanvas.height = canvasH
                              const tCtx = tmpCanvas.getContext('2d')

                              // 원본 이미지를 tmpCanvas에 그리기
                              tCtx.drawImage(img, ix, iy, iw, ih)

                              // 바깥쪽 페더 마스크 (원본 경계 → 투명)
                              tCtx.globalCompositeOperation = 'destination-in'
                              const grad = tCtx.createLinearGradient(ix, 0, ix + feather, 0)
                              // 4면 각각 gradient mask로 페더
                              const applyEdgeFade = (x1, y1, x2, y2, rx, ry, rw, rh) => {
                                const g = tCtx.createLinearGradient(x1, y1, x2, y2)
                                g.addColorStop(0, 'rgba(0,0,0,0)')
                                g.addColorStop(1, 'rgba(0,0,0,1)')
                                tCtx.fillStyle = g
                                tCtx.fillRect(rx, ry, rw, rh)
                              }
                              applyEdgeFade(ix, 0, ix + feather, 0, ix, iy, feather, ih)           // left
                              applyEdgeFade(ix+iw, 0, ix+iw-feather, 0, ix+iw-feather, iy, feather, ih) // right
                              applyEdgeFade(0, iy, 0, iy+feather, ix, iy, iw, feather)            // top
                              applyEdgeFade(0, iy+ih, 0, iy+ih-feather, ix, iy+ih-feather, iw, feather) // bottom
                              tCtx.globalCompositeOperation = 'source-over'

                              // 3) blurred bg 위에 페더된 원본 합성
                              ctx.drawImage(tmpCanvas, 0, 0)

                              // 4) 레이어 교체
                              const dataUrl = off.toDataURL('image/png')
                              const bgLayerIdx = layers.findIndex(l => l.id === 'background')
                              const newLayers = layers.filter(l => l.id !== selectedLayer.id)
                              const expanded = { ...selectedLayer, src: dataUrl, x: 0, y: 0, width: canvasW, height: canvasH, rotation: 0 }
                              newLayers.splice(bgLayerIdx + 1, 0, expanded)
                              updateLayers(newLayers)
                            }
                            img.src = src
                          }},
                          {icon: ZoomIn, label: '화질 개선', onClick: null},
                          {icon: Wand2, label: '자동 보정', onClick: null},
                        ].map(({ icon: Icon, label, onClick, skip }) => {
                          if (skip) return null
                          const disabled = !onClick || (label.includes('처리 중') && isRemovingBg)
                          return (
                          <button key={label} onClick={onClick || undefined} disabled={disabled}
                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border border-gray-200 transition-all ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary-300 hover:bg-primary-50'} ${isRemovingBg && label.includes('처리 중') ? 'animate-pulse border-primary-300 bg-primary-50' : ''}`}>
                            <Icon className={`w-5 h-5 ${isRemovingBg && label.includes('처리 중') ? 'text-primary-500' : 'text-gray-500'}`} />
                            <span className={`text-xs ${isRemovingBg && label.includes('처리 중') ? 'text-primary-600 font-medium' : 'text-gray-600'}`}>{label}</span>
                          </button>
                          )
                        })}
                      </div>
                    </div>
                  )

                  const selectedObj = (selectedLayer && type !== 'background') ? (
                    <div key="obj" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">선택 객체</h3>
                      {type !== 'text' && (
                        <>
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
                              onMouseUp={() => commitHistory(layers)} className="flex-1" />
                            <span className="text-xs font-mono text-gray-600 w-8 shrink-0">{selectedLayer.rotation || 0}°</span>
                          </div>
                        </>
                      )}
                      {type === 'text' && (() => {
                        const ratio = contrastRatio(bgColor, selectedLayer.color || '#1E2023')
                        const ratioFixed = ratio.toFixed(1)
                        const passAA = ratio >= 4.5
                        const passAALarge = ratio >= 3
                        const recommended = bestTextColor(bgColor)
                        const isAlreadyBest = selectedLayer.color?.toLowerCase() === recommended.toLowerCase()
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 shrink-0">크기</span>
                              <input type="number" value={selectedLayer.fontSize} min={8} max={200}
                                onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, fontSize: Number(e.target.value) } : l))}
                                className="w-16 px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 shrink-0">색상</span>
                              <button onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, color: '#1E2023' } : l))}
                                style={{ width: 28, height: 28, borderRadius: 6, background: '#1E2023', border: selectedLayer.color === '#1E2023' || selectedLayer.color === '#1e2023' ? '2.5px solid #9F48CE' : '2px solid #e5e7eb', cursor: 'pointer', flexShrink: 0 }} title="블랙" />
                              <button onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, color: '#ffffff' } : l))}
                                style={{ width: 28, height: 28, borderRadius: 6, background: '#ffffff', border: selectedLayer.color === '#ffffff' ? '2.5px solid #9F48CE' : '2px solid #e5e7eb', cursor: 'pointer', flexShrink: 0 }} title="화이트" />
                              <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                                <div style={{ width: 28, height: 28, borderRadius: 6, background: selectedLayer.color, border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#9ca3af' }}>+</div>
                                <input type="color" value={selectedLayer.color} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, color: e.target.value } : l))} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                              </label>
                            </div>
                            {/* 명도대비 */}
                            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 10px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280' }}>웹 접근성 명도대비</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: passAA ? '#16a34a' : passAALarge ? '#d97706' : '#dc2626' }}>
                                  {ratioFixed}:1
                                </span>
                              </div>
                              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: passAA ? '#dcfce7' : '#f3f4f6', color: passAA ? '#16a34a' : '#9ca3af' }}>AA ✓ (4.5:1)</span>
                                <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: passAALarge ? '#dcfce7' : '#f3f4f6', color: passAALarge ? '#16a34a' : '#9ca3af' }}>AA Large ✓ (3:1)</span>
                              </div>
                              {!isAlreadyBest && (
                                <button
                                  onClick={() => {
                                    const textLayers = layers.filter(l => l.type === 'text')
                                    updateLayers(layers.map(l => textLayers.some(t => t.id === l.id) ? { ...l, color: recommended } : l))
                                  }}
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 0', borderRadius: 6, border: 'none', background: recommended === '#ffffff' ? '#1E2023' : '#f3f4f6', color: recommended === '#ffffff' ? '#fff' : '#1E2023', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                                >
                                  <div style={{ width: 12, height: 12, borderRadius: 3, background: recommended, border: '1.5px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                                  텍스트 전체 → {recommended === '#ffffff' ? '흰색' : '검정'} 자동 적용
                                </button>
                              )}
                              {isAlreadyBest && <p style={{ fontSize: 10, color: '#16a34a', textAlign: 'center' }}>✓ 최적 대비색 사용 중</p>}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  ) : null

                  const bgPanel = isLogoTab ? null : (
                    <div key="bg" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">배경색</h3>
                        <button onClick={() => setBgColor('#ffffff')} className="text-xs text-gray-400 hover:text-primary-600">초기화</button>
                      </div>
                      <button onClick={extractColors} disabled={isExtractingColors}
                        className="w-full mb-3 py-2 rounded-lg text-xs font-medium border border-dashed border-primary-300 text-primary-600 hover:bg-primary-50 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                        {isExtractingColors ? <span>색상 추출 중...</span> : <><Sparkles className="w-3.5 h-3.5" /> 이미지에서 배경색 추천</>}
                      </button>
                      {suggestedColors.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1.5">추천 색상</p>
                          <div className="flex gap-1.5 flex-wrap mb-3">
                            {suggestedColors.map((c) => (
                              <button key={c} onClick={() => setBgColor(c)} style={{ backgroundColor: c }}
                                className={`w-7 h-7 rounded-md hover:scale-110 transition-all ${bgColor === c ? 'ring-2 ring-primary-500 ring-offset-1' : 'border border-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2 py-1.5">
                        <label className="cursor-pointer shrink-0" style={{ position: 'relative', width: 18, height: 18 }}>
                          <div style={{ width: 18, height: 18, borderRadius: 3, backgroundColor: bgColor, border: '1px solid #e5e7eb' }} />
                          <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                        </label>
                        <input type="text" value={bgColor}
                          onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) setBgColor(e.target.value) }}
                          style={{ flex: 1, minWidth: 0, fontSize: 12, fontFamily: 'monospace', color: '#374151', background: 'transparent', border: 'none', outline: 'none' }} placeholder="#ffffff" />
                        <button
                          onClick={() => { const code = bgColor.replace('#', ''); navigator.clipboard.writeText(code); setToast('컬러코드가 복사되었습니다!'); setTimeout(() => setToast(''), 2000) }}
                          style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, color: '#d1d5db' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )

                  // 현재 탭이 언어 복사본인 경우 번역 제안 패널
                  const currentLangCopy = langCopies.find(lc => lc.id === currentTemplateId)
                  const currentSuggestions = langSuggestions[currentTemplateId] || []
                  const translationPanel = currentLangCopy && currentSuggestions.length > 0 ? (
                    <div key="trans" style={{ background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)', borderRadius: 12, border: '1.5px solid #C084FC', padding: '12px 12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg,#9F48CE,#C084FC)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Sparkles style={{ width: 11, height: 11, color: '#fff' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#7e22ce' }}>{currentLangCopy.lang} 번역 제안</span>
                      </div>
                      {currentSuggestions.map((item) => (
                        <div key={item.layerId} style={{ marginBottom: 10 }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>
                            {item.layerId === 'b4-main' ? '메인카피' : '서브카피'}
                          </p>
                          {item.suggestions.map((sug, si) => {
                            const isApplied = (layers.find(l => l.id === item.layerId)?.text || '') === sug
                            return (
                              <button key={si}
                                onClick={() => updateLayers(layers.map(l => l.id === item.layerId ? { ...l, text: sug } : l))}
                                style={{ width: '100%', textAlign: 'left', padding: '7px 10px', marginBottom: 4, borderRadius: 8, border: isApplied ? '1.5px solid #9F48CE' : '1.5px solid #e9d5ff', background: isApplied ? '#ede9fe' : '#fff', cursor: 'pointer', fontSize: 11, color: isApplied ? '#7e22ce' : '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', display: 'flex', alignItems: 'flex-start', gap: 6 }}
                              >
                                {isApplied && <span style={{ color: '#9F48CE', flexShrink: 0, marginTop: 1 }}>✓</span>}
                                <span>{sug}</span>
                              </button>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  ) : null

                  const langPanel = b4Base ? (
                    <div key="lang" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">다국어 동시 제작</h3>
                      <div className="flex flex-wrap gap-2">
                        <button className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-primary-50 border-primary-300 text-primary-700">한국어 ✓</button>
                        {['English', '中文'].map((lang) => {
                          const isActive = langCopies.some(lc => lc.lang === lang)
                          const isDisabled = !isActive && langCopies.length >= 2
                          return (
                            <button key={lang}
                              onClick={() => toggleLangCopy(lang)}
                              disabled={isDisabled}
                              style={{ opacity: isDisabled ? 0.4 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isActive ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500'}`}
                            >
                              {lang}{isActive ? ' ✓' : ''}
                            </button>
                          )
                        })}
                      </div>
                      {langCopies.length > 0 && <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>최대 3개(한+2개국어) 동시 편집</p>}
                    </div>
                  ) : null

                  const bottomPanels = (
                    <>
                      <div key="lang" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">다국어 동시 제작</h3>
                        {!langBase ? (
                          <p style={{ fontSize: 11, color: '#9ca3af' }}>언어 탭에서는 추가할 수 없어요</p>
                        ) : (
                          <>
                            <div className="flex flex-wrap gap-2">
                              <button className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-primary-50 border-primary-300 text-primary-700">한국어 ✓</button>
                              {['English', '日本語', '中文'].map((lang) => {
                                const langKey = lang === 'English' ? 'en' : lang === '中文' ? 'zh' : 'ja'
                                const langId = `${langBase.id}-lang-${langKey}`
                                const isActive = langCopies.some(lc => lc.id === langId)
                                const baseLangCount = langCopies.filter(lc => lc.baseId === langBase.id).length
                                const isDisabled = !isActive && baseLangCount >= 2
                                return (
                                  <button key={lang}
                                    onClick={() => toggleLangCopy(lang)}
                                    disabled={isDisabled}
                                    style={{ opacity: isDisabled ? 0.4 : 1, cursor: isDisabled ? 'not-allowed' : 'pointer' }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isActive ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500'}`}
                                  >
                                    {lang}{isActive ? ' ✓' : ''}
                                  </button>
                                )
                              })}
                            </div>
                            {langCopies.filter(lc => lc.baseId === langBase.id).length > 0 && <p style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>최대 3개(한+2개국어) 동시 편집</p>}
                          </>
                        )}
                      </div>
                      {type !== 'text' && langPanel}
                    </>
                  )

                  if (type === 'background') return <>{styleSync}{bgPanel}{translationPanel}{fileStorage}{quickEdit}{selectedObj}{bottomPanels}</>
                  if (type === 'image') return <>{styleSync}{logoTypePanel}{fileStorage}{quickEdit}{selectedObj}{bgPanel}{translationPanel}{bottomPanels}</>
                  if (type === 'text') return <>{styleSync}{selectedObj}{langPanel}{translationPanel}{fileStorage}{quickEdit}{bgPanel}{bottomPanels}</>
                  return <>{translationPanel}{fileStorage}{quickEdit}{bgPanel}{bottomPanels}</>
                })()}
              </div>
            </div>

            {/* 오른쪽: 캔버스 */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* 캔버스 뷰포트 */}
              <div
                ref={canvasAreaRef}
                className="flex-1 overflow-hidden"
                style={{ position: 'relative', cursor: isSpaceDown ? (isPanning ? 'grabbing' : 'grab') : 'default', background: isLogoTab && currentTemplate?.logoPair === 'white' ? '#2d2d2d' : '#f1f0f5' }}
                onClick={(e) => { if (!isPanning) { setSelectedLayerId(null); setEditingTextId(null); setShowDlPopup(false) } }}
                onMouseDown={handleCanvasMouseDown}
                onWheel={handleCanvasWheel}
              >
                {/* transform scale + pan */}
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: canvasTransform, transformOrigin: 'center center' }}>
                  {/* 캔버스 상단 파일명 */}
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    {editingNameId === currentTemplateId ? (
                      <input
                        autoFocus
                        defaultValue={customNames[currentTemplateId] || currentTemplate?.name || ''}
                        onBlur={(e) => {
                          const val = e.target.value.trim()
                          if (val) setCustomNames(prev => ({ ...prev, [currentTemplateId]: val }))
                          setEditingNameId(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') e.target.blur()
                          if (e.key === 'Escape') setEditingNameId(null)
                          e.stopPropagation()
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 13, fontWeight: 600, color: '#374151', border: 'none', borderBottom: '2px solid #9F48CE', outline: 'none', background: 'transparent', minWidth: 120, padding: '0 2px' }}
                      />
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
                        {activePreviewTab + 1}.{customNames[currentTemplateId] || currentTemplate?.name}
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>
                      ({currentTemplate?.size?.replace('\u00d7', 'X')})
                    </span>
                    <button
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: '#9ca3af' }}
                      onClick={(e) => { e.stopPropagation(); setEditingNameId(currentTemplateId) }}
                      title="파일명 편집">
                      ✏️
                    </button>
                  </div>
                  <div style={{ position: 'relative', overflow: 'visible' }}>

                    {/* 실제 캔버스 */}
                    <div id="editor-canvas" style={{ position: 'relative', width: canvasW, height: canvasH, border: '1px solid #e5e7eb', overflow: 'hidden', backgroundImage: isLogoTab && currentTemplate?.logoPair === 'white' ? 'linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%)' : 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px', backgroundColor: isLogoTab && currentTemplate?.logoPair === 'white' ? '#333' : '#f8f8f8' }}>
                      {layers.map((layer) => {
                        // 배경색 레이어 렌더링
                        if (layer.type === 'background') {
                          return (
                            <div key={layer.id}
                              onMouseDown={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id) }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ position: 'absolute', inset: 0, background: layer.color === 'transparent' ? 'transparent' : layer.color, cursor: 'pointer', zIndex: 0 }}
                            />
                          )
                        }
                        return (
                        <div key={layer.id}
                          onMouseDown={(e) => {
                            if (layer.type === 'text') {
                              e.stopPropagation()
                              setSelectedLayerId(layer.id)
                              return  // 싱글클릭은 선택만, 더블클릭에서 편집
                            }
                            if (editingTextId === layer.id) { e.stopPropagation(); return }
                            onMouseDownLayer(e, layer.id)
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            if (layer.type === 'text') { setEditingTextId(layer.id); setSelectedLayerId(layer.id) }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ position: 'absolute', left: layer.x, top: layer.y, width: layer.width, height: layer.type === 'text' ? 'auto' : layer.height, transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'center center', cursor: layer.type === 'text' ? (editingTextId === layer.id ? 'text' : 'default') : 'move', userSelect: editingTextId === layer.id ? 'text' : 'none', zIndex: layer.type === 'text' ? (layer.id === selectedLayerId ? 30 : 15) : layer.type === 'gradient' ? 10 : 1 }}>
                          {layer.type === 'image' && (() => {
                            const isB11Layout = currentTemplateId === 'b11' || langCopies.find(lc => lc.id === currentTemplateId)?.baseId === 'b11'
                            if (isB11Layout) {
                              const clipLeft   = Math.max(0, B11_IMG_X - layer.x)
                              const clipRight  = Math.max(0, (layer.x + layer.width) - (B11_IMG_X + B11_IMG_W))
                              const clipTop    = Math.max(0, -layer.y)
                              const clipBottom = Math.max(0, (layer.y + layer.height) - B11_GRAD_H)
                              const clip = clipLeft > 0 || clipRight > 0 || clipTop > 0 || clipBottom > 0
                                ? `inset(${clipTop}px ${clipRight}px ${clipBottom}px ${clipLeft}px)`
                                : undefined
                              return <img src={layer.src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none', clipPath: clip }} />
                            }
                            return <img src={layer.src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none', filter: isLogoTab ? (currentTemplate.logoPair === 'black' ? 'brightness(0) saturate(0)' : 'brightness(0) saturate(0) invert(1)') : undefined }} />
                          })()}
                          {layer.type === 'gradient' && (() => {
                            const [rr, gg, bb] = hexToRgb(bgColor)
                            return <div style={{ width: '100%', height: '100%', background: `linear-gradient(to right, rgba(${rr},${gg},${bb},1) 0%, rgba(${rr},${gg},${bb},0.7) 70%, rgba(${rr},${gg},${bb},0) 100%)`, pointerEvents: 'none' }} />
                          })()}
                          {layer.type === 'text' && layer.id === selectedLayerId && editingTextId !== layer.id && (
                            <div style={{ position: 'absolute', inset: -1, border: '2px solid #9F48CE', pointerEvents: 'none', borderRadius: 1 }} />
                          )}
                          {layer.type === 'text' && (
                            editingTextId === layer.id ? (
                              <textarea autoFocus value={layer.text}
                                onChange={(e) => setLayers(layers.map((l) => l.id === layer.id ? { ...l, text: e.target.value } : l))}
                                onBlur={() => { commitHistory(layers); setEditingTextId(null) }}
                                onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') { commitHistory(layers); setEditingTextId(null) } }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                style={{ width: '100%', height: '100%', fontSize: layer.fontSize, color: layer.color, fontFamily: layer.fontFamily || 'Pretendard', fontWeight: layer.fontWeight || (layer.bold ? '700' : '400'), textDecoration: layer.underline ? 'underline' : 'none', textAlign: layer.align || 'left', letterSpacing: `${layer.letterSpacing || 0}px`, lineHeight: layer.lineHeight || 1.4, background: 'rgba(255,255,255,0.15)', border: '1px dashed #9F48CE', outline: 'none', resize: 'none', padding: 4, boxSizing: 'border-box', cursor: 'text' }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: layer.height, overflow: 'hidden', fontSize: layer.fontSize, color: layer.color, fontFamily: layer.fontFamily || 'Pretendard', fontWeight: layer.fontWeight || (layer.bold ? '700' : '400'), textDecoration: layer.underline ? 'underline' : 'none', textAlign: layer.align || 'left', letterSpacing: `${layer.letterSpacing || 0}px`, lineHeight: layer.lineHeight || 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', pointerEvents: 'none' }}>{layer.text}</div>
                            )
                          )}
                        </div>
                        )
                      })}
                    </div>

                    {/* 스마트 가이드선 */}
                    {(guides.x.length > 0 || guides.y.length > 0) && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 80, overflow: 'visible' }}>
                        {guides.x.map((gx, i) => <div key={`gx-${i}`} style={{ position: 'absolute', left: gx - 0.5, top: 0, width: 1, height: canvasH, background: '#9F48CE', opacity: 0.85 }} />)}
                        {guides.y.map((gy, i) => <div key={`gy-${i}`} style={{ position: 'absolute', top: gy - 0.5, left: 0, height: 1, width: canvasW, background: '#9F48CE', opacity: 0.85 }} />)}
                      </div>
                    )}

                    {/* 투명 클릭 레이어 (이미지 전용 — 그라디언트·텍스트 제외) */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, overflow: 'visible', pointerEvents: 'none', zIndex: 50 }}>
                      {layers.filter((layer) => layer.id !== editingTextId && layer.type !== 'background' && layer.type !== 'text' && layer.type !== 'gradient').map((layer, idx) => (
                        <div key={`hit-${layer.id}`}
                          onMouseDown={(e) => onMouseDownLayer(e, layer.id)}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          style={{ position: 'absolute', left: layer.x, top: layer.y, width: layer.width, height: layer.height, transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'center center', cursor: 'move', pointerEvents: 'all', background: 'transparent', zIndex: 51 + idx }} />
                      ))}
                    </div>

                    {/* 텍스트 전용 클릭 레이어 (항상 최상단 — 이미지·그라디언트 hit layer 위) */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, overflow: 'visible', pointerEvents: 'none', zIndex: 90 }}>
                      {layers.filter((layer) => layer.type === 'text' && layer.id !== editingTextId).map((layer) => (
                        <div key={`text-hit-${layer.id}`}
                          onMouseDown={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id) }}
                          onDoubleClick={(e) => { e.stopPropagation(); setEditingTextId(layer.id); setSelectedLayerId(layer.id) }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ position: 'absolute', left: layer.x, top: layer.y, width: layer.width, height: layer.height, transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'center center', cursor: 'default', pointerEvents: 'all', background: 'transparent' }} />
                      ))}
                    </div>

                    {/* 이미지/그라디언트 툴바 */}
                    {(selectedLayer?.type === 'image' || selectedLayer?.type === 'gradient') && (
                      <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: selectedLayer.x + selectedLayer.width / 2, top: selectedLayer.y - 48, transform: 'translateX(-50%)', zIndex: 200, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px', pointerEvents: 'all', whiteSpace: 'nowrap' }}>
                        {selectedLayer?.type === 'gradient' && <span style={{ fontSize: 11, color: '#9ca3af', padding: '0 4px' }}>그라디언트</span>}
                        <button onClick={() => deleteLayer(selectedLayer.id)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    )}

                    {/* 이미지 사이즈 뱃지 */}
                    {selectedLayer?.type === 'image' && selectedLayer?.type !== 'gradient' && (
                      <div style={{ position: 'absolute', left: selectedLayer.x + selectedLayer.width / 2, top: selectedLayer.y + selectedLayer.height + 10, transform: 'translateX(-50%)', zIndex: 200, pointerEvents: 'none' }}>
                        <div style={{ background: 'linear-gradient(135deg,#9F48CE,#C084FC)', color: '#fff', fontSize: 13, fontWeight: 600, padding: '4px 12px', borderRadius: 6, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(159,72,206,0.35)' }}>
                          {selectedLayer.width} × {selectedLayer.height}
                        </div>
                      </div>
                    )}

                    {/* 텍스트 툴바 */}
                    {selectedLayer?.type === 'text' && (
                      <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: Math.max(0, selectedLayer.x + selectedLayer.width / 2), top: selectedLayer.y - 58, transform: 'translateX(-50%)', zIndex: 200, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', pointerEvents: 'all', whiteSpace: 'nowrap' }}>
                        <select value={selectedLayer.fontFamily || 'Pretendard'} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, fontFamily: e.target.value } : l))} style={{ fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', background: '#fff', cursor: 'pointer', maxWidth: 130 }}>
                          <option value="Pretendard">Pretendard</option>
                          <option value="Noto Sans KR">Noto Sans CJK</option>
                          <option value="GmarketSans">Gmarket Sans</option>
                        </select>
                        <select value={selectedLayer.fontWeight || '400'} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, fontWeight: e.target.value } : l))} style={{ fontSize: 13, border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', background: '#fff', cursor: 'pointer', width: 90 }}>
                          {selectedLayer.fontFamily === 'GmarketSans' ? (
                            <><option value="300">Light</option><option value="500">Medium</option><option value="700">Bold</option></>
                          ) : (
                            <><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">SemiBold</option><option value="700">Bold</option><option value="800">ExtraBold</option></>
                          )}
                        </select>
                        <div style={{ width: 1, height: 22, background: '#e5e7eb', margin: '0 4px' }} />
                        <input type="number" value={selectedLayer.fontSize} min={8} max={200} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, fontSize: Number(e.target.value) } : l))} style={{ width: 54, fontSize: 15, border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }} />
                        <div style={{ width: 1, height: 22, background: '#e5e7eb', margin: '0 4px' }} />
                        <button onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, bold: !l.bold } : l))} style={{ width: 32, height: 32, borderRadius: 6, border: selectedLayer.bold ? '1.5px solid #9F48CE' : '1px solid transparent', background: selectedLayer.bold ? '#F3E8FF' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedLayer.bold ? '#9F48CE' : '#4b5563' }}>
                          <Bold style={{ width: 15, height: 15 }} />
                        </button>
                        <button onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, underline: !l.underline } : l))} style={{ width: 32, height: 32, borderRadius: 6, border: selectedLayer.underline ? '1.5px solid #9F48CE' : '1px solid transparent', background: selectedLayer.underline ? '#F3E8FF' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedLayer.underline ? '#9F48CE' : '#4b5563' }}>
                          <Underline style={{ width: 15, height: 15 }} />
                        </button>
                        <div style={{ width: 1, height: 22, background: '#e5e7eb', margin: '0 4px' }} />
                        {[{ v: 'left', Icon: AlignLeft }, { v: 'center', Icon: AlignCenter }, { v: 'right', Icon: AlignRight }].map(({ v, Icon }) => (
                          <button key={v} onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, align: v } : l))} style={{ width: 32, height: 32, borderRadius: 6, border: (selectedLayer.align || 'left') === v ? '1.5px solid #9F48CE' : '1px solid transparent', background: (selectedLayer.align || 'left') === v ? '#F3E8FF' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: (selectedLayer.align || 'left') === v ? '#9F48CE' : '#4b5563' }}>
                            <Icon style={{ width: 15, height: 15 }} />
                          </button>
                        ))}
                        <div style={{ width: 1, height: 22, background: '#e5e7eb', margin: '0 4px' }} />
                        <label style={{ position: 'relative', cursor: 'pointer' }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
                            <span style={{ fontSize: 14, fontWeight: 'bold', color: selectedLayer.color, lineHeight: 1 }}>A</span>
                            <div style={{ width: 18, height: 3, borderRadius: 2, background: selectedLayer.color }} />
                          </div>
                          <input type="color" value={selectedLayer.color} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, color: e.target.value } : l))} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                        </label>
                        <div style={{ width: 1, height: 22, background: '#e5e7eb', margin: '0 4px' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 13, color: '#9ca3af' }}>자간</span>
                          <input type="number" value={selectedLayer.letterSpacing || 0} min={-10} max={50} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, letterSpacing: Number(e.target.value) } : l))} style={{ width: 48, fontSize: 15, border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 13, color: '#9ca3af' }}>행간</span>
                          <input type="number" value={selectedLayer.lineHeight || 1.4} min={0.8} max={4} step={0.1} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, lineHeight: Number(e.target.value) } : l))} style={{ width: 58, fontSize: 15, border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 6px', textAlign: 'center' }} />
                        </div>
                        <div style={{ width: 1, height: 22, background: '#e5e7eb', margin: '0 4px' }} />
                        <button onClick={() => deleteLayer(selectedLayer.id)} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                          <Trash2 style={{ width: 15, height: 15 }} />
                        </button>
                      </div>
                    )}

                    {/* 배너 가이드 오버레이 */}
                    {showGuide && !isLogoTab && currentTemplateId === 'b4' && (() => {
                      const marginX = B4_MARGIN        // 120
                      const textW = B4_TEXT_W          // 445
                      const mainFontSize = 48, subFontSize = 28, lineHeight = 1.3
                      const mainH = Math.round(mainFontSize * lineHeight * 2)
                      const subH = Math.round(subFontSize * lineHeight)
                      const gap = 24
                      const totalH = mainH + gap + subH
                      const startY = Math.round((canvasH - totalH) / 2)
                      const imageAreaX = marginX + textW + 40
                      const imageAreaW = canvasW - imageAreaX
                      return (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', left: 0, top: 0, width: marginX, height: canvasH, background: 'rgba(159,72,206,0.1)', borderRight: '2px dashed rgba(159,72,206,0.6)' }} />
                          <div style={{ position: 'absolute', left: 0, top: 10, width: marginX, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9F48CE' }}>← 120px →</div>
                          <div style={{ position: 'absolute', left: marginX, top: startY - 24, fontSize: 11, fontWeight: 700, color: '#9F48CE', background: 'rgba(243,232,255,0.95)', padding: '2px 8px', borderRadius: 4, border: '1px solid #C084FC' }}>텍스트 영역 {textW}px</div>
                          <div style={{ position: 'absolute', left: marginX, top: startY, width: textW, height: totalH, border: '2px dashed #9F48CE', borderRadius: 4 }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: mainH, background: 'rgba(159,72,206,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#7c3aed', background: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: 4 }}>메인카피 (48px Bold · 최대 2줄)</span>
                            </div>
                            <div style={{ position: 'absolute', left: 0, top: mainH, width: '100%', height: gap, background: 'rgba(159,72,206,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 10, color: '#9F48CE', fontWeight: 600 }}>gap {gap}px</span>
                            </div>
                            <div style={{ position: 'absolute', left: 0, top: mainH + gap, width: '100%', height: subH, background: 'rgba(159,72,206,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#7c3aed', background: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: 4 }}>서브카피 (28px Regular)</span>
                            </div>
                          </div>
                          <div style={{ position: 'absolute', left: imageAreaX, top: 0, width: imageAreaW, height: canvasH, border: '3px solid rgba(59,130,246,0.8)', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                            <div style={{ background: 'rgba(59,130,246,0.85)', borderRadius: 8, padding: '10px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                              <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>이미지 영역</span>
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{imageAreaW} × {canvasH}px</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* 배경 제거 중 로딩 오버레이 */}
                    {isLogoTab && isRemovingBg && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 2 }}>
                        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#C084FC', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>배경 제거 중…</span>
                      </div>
                    )}

                    {/* 로고 타입 가이드 오버레이 */}
                    {isLogoTab && logoGuide && <LogoGuideOverlay guide={logoGuide} canvasW={canvasW} canvasH={canvasH} margin={LOGO_MARGIN} onClose={() => setLogoGuide(null)} />}

                    {/* b11 팝업 배너 가이드 오버레이 */}
                    {showGuide && !isLogoTab && currentTemplateId === 'b11' && (() => {
                      const lh = 1.3
                      const subH = Math.round(34 * lh)        // 44
                      const titleH = Math.round(56 * lh * 2)  // 146
                      const detailH = Math.round(32 * lh)     // 42
                      const gap1 = 16, gap2 = 32
                      const totalH = subH + gap1 + titleH + gap2 + detailH  // 280
                      const startY = Math.round((canvasH - totalH) / 2)     // 140
                      return (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>
                          {/* 이미지 영역 */}
                          <div style={{ position: 'absolute', left: B11_IMG_X, top: 0, width: B11_IMG_W, height: canvasH, border: '3px solid rgba(59,130,246,0.8)', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                            <div style={{ background: 'rgba(59,130,246,0.85)', borderRadius: 8, padding: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>이미지 영역 {B11_IMG_W}×{canvasH}</span>
                            </div>
                          </div>
                          {/* 그라디언트 영역 */}
                          <div style={{ position: 'absolute', left: B11_GRAD_X, top: B11_GRAD_Y, width: B11_GRAD_W, height: B11_GRAD_H, border: '2px dashed rgba(234,179,8,0.8)', background: 'rgba(234,179,8,0.08)' }}>
                            <div style={{ position: 'absolute', bottom: -20, left: 0, fontSize: 10, fontWeight: 700, color: '#b45309', whiteSpace: 'nowrap', background: 'rgba(254,243,199,0.95)', padding: '1px 6px', borderRadius: 3 }}>그라디언트 {B11_GRAD_W}px</div>
                          </div>
                          {/* 텍스트 영역 */}
                          <div style={{ position: 'absolute', left: B11_TEXT_X, top: startY - 24, fontSize: 11, fontWeight: 700, color: '#9F48CE', background: 'rgba(243,232,255,0.95)', padding: '2px 8px', borderRadius: 4, border: '1px solid #C084FC' }}>텍스트 영역 {B11_TEXT_W}px</div>
                          <div style={{ position: 'absolute', left: B11_TEXT_X, top: startY, width: B11_TEXT_W, height: totalH, border: '2px dashed #9F48CE', borderRadius: 4 }}>
                            {/* 서브타이틀 */}
                            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: subH, background: 'rgba(159,72,206,0.12)', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', background: 'rgba(255,255,255,0.8)', padding: '1px 6px', borderRadius: 3 }}>서브타이틀 (34px · 선택)</span>
                            </div>
                            {/* gap1 */}
                            <div style={{ position: 'absolute', left: 0, top: subH, width: '100%', height: gap1, background: 'rgba(159,72,206,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 9, color: '#9F48CE', fontWeight: 600 }}>{gap1}px</span>
                            </div>
                            {/* 타이틀 */}
                            <div style={{ position: 'absolute', left: 0, top: subH + gap1, width: '100%', height: titleH, background: 'rgba(159,72,206,0.18)', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: 'rgba(255,255,255,0.8)', padding: '1px 6px', borderRadius: 3 }}>타이틀 (56px Bold · 최대 2줄 · 필수)</span>
                            </div>
                            {/* gap2 */}
                            <div style={{ position: 'absolute', left: 0, top: subH + gap1 + titleH, width: '100%', height: gap2, background: 'rgba(159,72,206,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 9, color: '#9F48CE', fontWeight: 600 }}>{gap2}px</span>
                            </div>
                            {/* 상세내용 */}
                            <div style={{ position: 'absolute', left: 0, top: subH + gap1 + titleH + gap2, width: '100%', height: detailH, background: 'rgba(159,72,206,0.12)', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#7c3aed', background: 'rgba(255,255,255,0.8)', padding: '1px 6px', borderRadius: 3 }}>상세내용 (32px · opacity 80% · 선택)</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* 텍스트 선택 테두리 */}
                    {selectedLayer?.type === 'text' && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 100 }}>
                        <div style={{ position: 'absolute', left: selectedLayer.x - 2, top: selectedLayer.y - 2, width: selectedLayer.width + 4, height: selectedLayer.height + 4, border: '2px solid #9F48CE', borderRadius: 3, pointerEvents: 'none' }} />
                      </div>
                    )}

                    {/* 핸들 오버레이 */}
                    {selectedLayer && selectedLayer.type !== 'background' && selectedLayer.type !== 'text' && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', overflow: 'visible', zIndex: 100 }}>
                        <div style={{ position: 'absolute', left: selectedLayer.x, top: selectedLayer.y, width: selectedLayer.width, height: selectedLayer.height, transform: `rotate(${selectedLayer.rotation || 0}deg)`, transformOrigin: 'center center', pointerEvents: 'none' }}>
                          <div style={{ position: 'absolute', inset: -1, border: '2px solid #9F48CE', pointerEvents: 'none' }} />
                          {RESIZE_HANDLES.map((h) => (
                            <div key={h.id} onMouseDown={(e) => onMouseDownResize(e, selectedLayer.id, h.id, h.corner)}
                              style={{ position: 'absolute', left: `calc(${h.cx * 100}% - ${HS / 2}px)`, top: `calc(${h.cy * 100}% - ${HS / 2}px)`, width: HS, height: HS, background: '#ffffff', border: '2px solid #9F48CE', borderRadius: '50%', cursor: h.cursor, pointerEvents: 'all', zIndex: 110 }} />
                          ))}
                          <div style={{ position: 'absolute', left: '100%', top: '50%', width: 24, height: 1, background: '#9F48CE', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                          <div onMouseDown={(e) => onMouseDownRotate(e, selectedLayer.id)} style={{ position: 'absolute', left: '100%', top: '50%', marginLeft: 24, transform: 'translateY(-50%)', width: 24, height: 24, background: '#9F48CE', border: '2px solid #fff', borderRadius: '50%', cursor: 'grab', pointerEvents: 'all', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                            <RotateCw style={{ width: 12, height: 12, color: '#fff' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 줌 컨트롤 - 캔버스 영역 하단 중앙 */}
                <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: 'rgba(255,255,255,0.97)', borderRadius: 999, border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px' }}>
                  <button onClick={() => setZoom((z) => Math.max(25, z - 25))} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }} onMouseEnter={e => e.currentTarget.style.background='#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <ZoomOut style={{ width: 16, height: 16 }} />
                  </button>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#374151', width: 42, textAlign: 'center' }}>{zoom}%</span>
                  <button onClick={() => setZoom((z) => Math.min(200, z + 25))} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }} onMouseEnter={e => e.currentTarget.style.background='#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <ZoomIn style={{ width: 16, height: 16 }} />
                  </button>
                  <div style={{ width: 1, height: 16, background: '#e5e7eb', margin: '0 2px' }} />
                  <button onClick={fitToScreen} style={{ height: 28, padding: '0 10px', display: 'flex', alignItems: 'center', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }} onMouseEnter={e => e.currentTarget.style.background='#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    Fit
                  </button>
                </div>

                {/* 레이어 패널 - 캔버스 영역 우하단 */}
                {layers.length > 0 && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 200, width: 180 }}>
                    <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>레이어</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#9F48CE', background: '#f3e8ff', borderRadius: 99, padding: '1px 7px' }}>{layers.length}</span>
                      </div>
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
                              <span style={{ fontSize: 10, color: '#d1d5db', flexShrink: 0 }}>⠿</span>
                              <div style={{ width: 28, height: 28, borderRadius: 4, background: '#f3f4f6', border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {layer.type === 'background'
                                  ? <div style={{ width: '100%', height: '100%', background: layer.color }} />
                                  : layer.type === 'image'
                                    ? <img src={layer.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : layer.type === 'gradient'
                                      ? <div style={{ width: '100%', height: '100%', background: `linear-gradient(to right, ${bgColor}, transparent)` }} />
                                      : <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>T</span>
                                }
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: isSelected ? '#7e22ce' : '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {layer.type === 'background' ? '배경색' : layer.type === 'image' ? `이미지 ${idx}` : layer.type === 'gradient' ? '그라디언트' : `텍스트 ${idx}`}
                                </p>
                                <p style={{ fontSize: 10, color: '#9ca3af' }}>{layer.width} × {layer.height}</p>
                              </div>
                              <span style={{ fontSize: 12, flexShrink: 0 }}>{layer.type === 'background' ? '🎨' : layer.type === 'image' ? '🖼' : layer.type === 'gradient' ? '🌅' : '✏️'}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 하단: 썸네일 */}
              <div className="shrink-0 border-t border-gray-200" style={{ background: '#ffffff' }}>
                <div className="px-4 pt-2 pb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">총 <span className="font-semibold text-gray-700">{allDisplayTemplates.length}</span>건</span>
                    <button
                      onClick={() => {
                        if (dlSelectedIds.size === allDisplayTemplates.length) {
                          setDlSelectedIds(new Set())
                        } else {
                          setDlSelectedIds(new Set(allDisplayTemplates.map(t => t.id)))
                        }
                      }}
                      style={{ fontSize: 11, fontWeight: 600, color: dlSelectedIds.size === allDisplayTemplates.length ? '#9ca3af' : '#9F48CE', background: dlSelectedIds.size === allDisplayTemplates.length ? '#f3f4f6' : '#f3e8ff', border: 'none', borderRadius: 99, padding: '2px 10px', cursor: 'pointer' }}
                    >
                      {dlSelectedIds.size === allDisplayTemplates.length ? '전체 해제' : '전체 선택'}
                    </button>
                    {dlSelectedIds.size > 0 && (
                      <button
                        onClick={() => {
                          const toDelete = [...dlSelectedIds]
                          // 실제 탭 인덱스 기준으로 activePreviewTab 보정
                          const remainingTemplates = allDisplayTemplates.filter(t => !dlSelectedIds.has(t.id))
                          const currentId = allDisplayTemplates[activePreviewTab]?.id
                          // lang copies 삭제
                          const langIdsToDelete = toDelete.filter(id => langCopies.some(lc => lc.id === id))
                          if (langIdsToDelete.length > 0) {
                            setLangCopies(prev => prev.filter(lc => !langIdsToDelete.includes(lc.id)))
                            setAllLayers(prev => { const n = { ...prev }; langIdsToDelete.forEach(id => delete n[id]); return n })
                            setAllHistory(prev => { const n = { ...prev }; langIdsToDelete.forEach(id => delete n[id]); return n })
                          }
                          // 실제 템플릿 삭제
                          const realIdsToDelete = toDelete.filter(id => selectedTemplateIds.includes(id))
                          realIdsToDelete.forEach(id => toggleTemplate(id))
                          // activePreviewTab 보정
                          const newIdx = remainingTemplates.findIndex(t => t.id === currentId)
                          setActivePreviewTab(Math.max(0, newIdx === -1 ? 0 : newIdx))
                          setDlSelectedIds(new Set())
                        }}
                        style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', background: '#fef2f2', border: 'none', borderRadius: 99, padding: '2px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        {dlSelectedIds.size}개 삭제
                      </button>
                    )}
                  </div>
                  <button onClick={() => setShowAddTemplatePopup(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#9F48CE', background: '#f3e8ff', border: 'none', borderRadius: 99, padding: '3px 10px', cursor: 'pointer' }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> 템플릿 추가
                  </button>
                </div>
                <div className="px-4 pt-2 pb-3 flex items-start gap-3 overflow-x-auto">
                  {allDisplayTemplates.map((tmpl, i) => {
                    const tLayers = allLayers[tmpl.id] || []
                    const rawBg = (allLayers[tmpl.id]?.find(l => l.id === 'background')?.color) || allBgColors[tmpl.id] || '#ffffff'
                    const tBg = rawBg === 'transparent' ? undefined : rawBg
                    const tIsTransparent = rawBg === 'transparent'
                    const [tw, th] = tmpl.size.split('\u00d7').map(Number)
                    const CARD_W = 140, CARD_H = 100
                    const ratio = tw / th
                    let bW = CARD_W, bH = Math.round(CARD_W / ratio)
                    if (bH > CARD_H) { bH = CARD_H; bW = Math.round(CARD_H * ratio) }
                    const tScaleX = bW / tw, tScaleY = bH / th
                    const isActive = activePreviewTab === i
                    const isDlChecked = dlSelectedIds.has(tmpl.id)
                    return (
                      <div key={tmpl.id} draggable={!tmpl.lang}
                        onDragStart={tmpl.lang ? undefined : () => setDragTplId(tmpl.id)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverTplId(tmpl.id) }}
                        onDragLeave={() => setDragOverTplId(null)}
                        onDrop={() => {
                          if (!dragTplId || dragTplId === tmpl.id || tmpl.lang) return
                          const ids = selectedTemplateDetails.map(t => t.id)
                          const fromIdx = ids.indexOf(dragTplId)
                          const toIdx = ids.indexOf(tmpl.id)
                          const reordered = [...ids]
                          const [moved] = reordered.splice(fromIdx, 1)
                          reordered.splice(toIdx, 0, moved)
                          setTemplateOrder(reordered)
                          setActivePreviewTab(toIdx)
                          setDragTplId(null)
                          setDragOverTplId(null)
                        }}
                        onDragEnd={() => { setDragTplId(null); setDragOverTplId(null) }}
                        onClick={() => { setActivePreviewTab(i); setSelectedLayerId(null); setLogoGuide(null) }}
                        className="shrink-0 flex flex-col items-start gap-1"
                        style={{ cursor: 'grab', opacity: dragTplId === tmpl.id ? 0.4 : 1, borderLeft: dragOverTplId === tmpl.id && dragTplId !== tmpl.id ? '3px solid #9F48CE' : '3px solid transparent', transition: 'all 0.1s' }}
                      >
                        <div style={{ width: CARD_W, height: CARD_H, borderRadius: 4, outline: isActive ? '2.5px solid #9F48CE' : '2.5px solid transparent', outlineOffset: '2px', background: tmpl.logoPair === 'white' ? '#3a3a3a' : '#e9e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', boxShadow: isActive ? '0 0 0 4px #C084FC22' : 'none' }}>
                          <div onClick={(e) => { e.stopPropagation(); setDlSelectedIds((prev) => { const next = new Set(prev); if (next.has(tmpl.id)) next.delete(tmpl.id); else next.add(tmpl.id); return next }) }}
                            style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 4, border: isDlChecked ? '2px solid #9F48CE' : '2px solid #d1d5db', background: isDlChecked ? '#9F48CE' : 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transition: 'all 0.15s' }}>
                            {isDlChecked && <Check style={{ width: 10, height: 10, color: '#fff' }} />}
                          </div>
                          <div style={{ width: bW, height: bH, ...(tIsTransparent ? (tmpl.logoPair === 'white' ? { backgroundImage: 'linear-gradient(45deg,#555 25%,transparent 25%),linear-gradient(-45deg,#555 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#555 75%),linear-gradient(-45deg,transparent 75%,#555 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0,0 4px,4px -4px,-4px 0px', backgroundColor: '#3a3a3a' } : { backgroundImage: 'linear-gradient(45deg,#ccc 25%,transparent 25%),linear-gradient(-45deg,#ccc 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ccc 75%),linear-gradient(-45deg,transparent 75%,#ccc 75%)', backgroundSize: '8px 8px', backgroundPosition: '0 0,0 4px,4px -4px,-4px 0px', backgroundColor: '#f0f0f0' }) : { background: tBg }), position: 'relative', overflow: 'hidden', borderRadius: 2, opacity: isDlChecked ? 1 : 0.4, transition: 'opacity 0.15s' }}>
                            {tLayers.map((layer) => (
                              <div key={layer.id} style={{ position: 'absolute', left: layer.x * tScaleX, top: layer.y * tScaleY, width: layer.width * tScaleX, height: layer.height * tScaleY, transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'center center' }}>
                                {layer.type === 'image' && (() => {
                                  if (tmpl.id === 'b11') {
                                    return <img src={layer.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} />
                                  }
                                  return <img src={layer.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', filter: tmpl.logoPair ? (tmpl.logoPair === 'black' ? 'brightness(0) saturate(0)' : 'brightness(0) saturate(0) invert(1)') : undefined }} />
                                })()}
                                {layer.type === 'gradient' && (() => {
                                  const [rr, gg, bb] = hexToRgb(tBg)
                                  return <div style={{ width: '100%', height: '100%', background: `linear-gradient(to right, rgba(${rr},${gg},${bb},1) 0%, rgba(${rr},${gg},${bb},0.7) 70%, rgba(${rr},${gg},${bb},0) 100%)` }} />
                                })()}
                                {layer.type === 'text' && <div style={{ fontSize: layer.fontSize * Math.min(tScaleX, tScaleY), fontWeight: layer.fontWeight || '400', color: layer.color, fontFamily: layer.fontFamily || 'Pretendard', lineHeight: layer.lineHeight || 1.4, letterSpacing: `${(layer.letterSpacing || 0) * Math.min(tScaleX, tScaleY)}px`, overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-all', width: '100%', height: '100%' }}>{layer.text}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ width: CARD_W, marginTop: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <p className="text-xs font-medium text-gray-700 truncate" style={{ flex: 1, minWidth: 0 }}>{i + 1}.{tmpl.name}</p>
                            {tmpl.lang && <span style={{ fontSize: 9, fontWeight: 700, color: '#9F48CE', background: '#f3e8ff', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{tmpl.lang}</span>}
                            {tmpl.logoPair && <span style={{ fontSize: 9, fontWeight: 700, color: tmpl.logoPair === 'black' ? '#1f2937' : '#6b7280', background: tmpl.logoPair === 'black' ? '#f3f4f6' : '#e5e7eb', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{tmpl.logoPair === 'black' ? '●BLK' : '○WHT'}</span>}
                          </div>
                          <p className="text-xs text-gray-400">{tmpl.size.replace('\u00d7', ' \u00d7 ')}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 템플릿 추가 팝업 */}
      {showAddTemplatePopup && (() => {
        const currentGroup = templateGroups.find(g => g.templates.some(t => selectedTemplateIds.includes(t.id))) || templateGroups[0]
        return (
          <div onClick={() => setShowAddTemplatePopup(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, width: 640, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>템플릿 추가</h2>
                  <span style={{ fontSize: 12, fontWeight: 600, color: currentGroup.hex, background: currentGroup.light, borderRadius: 99, padding: '2px 10px' }}>{currentGroup.label}</span>
                </div>
                <button onClick={() => setShowAddTemplatePopup(false)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: '#f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#6b7280' }}>✕</button>
              </div>
              <div style={{ overflowY: 'auto', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {currentGroup.templates.map((tmpl) => {
                  const alreadyAdded = selectedTemplateIds.includes(tmpl.id)
                  const [w, h] = tmpl.size.split('\u00d7').map(Number)
                  const cardW = 170, cardH = 100
                  const ratio = w / h
                  let bW = cardW, bH = Math.round(cardW / ratio)
                  if (bH > cardH) { bH = cardH; bW = Math.round(cardH * ratio) }
                  return (
                    <button key={tmpl.id} onClick={() => { if (!alreadyAdded) { toggleTemplate(tmpl.id); setShowAddTemplatePopup(false) } }}
                      style={{ border: alreadyAdded ? `2px solid ${currentGroup.hex}` : '2px solid #e5e7eb', borderRadius: 10, padding: 8, background: alreadyAdded ? currentGroup.light : '#fff', cursor: alreadyAdded ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                      <div style={{ width: '100%', height: cardH, borderRadius: 6, background: currentGroup.gradient || '#e9e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ width: bW, height: bH, background: 'rgba(255,255,255,0.15)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{tmpl.size}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#374151', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tmpl.name}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10, color: '#9ca3af' }}>{tmpl.size}</span>
                        {alreadyAdded && <span style={{ fontSize: 10, fontWeight: 600, color: currentGroup.hex }}>추가됨</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
