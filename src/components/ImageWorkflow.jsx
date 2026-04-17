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
import jsPDF from 'jspdf'
import JSZip from 'jszip'

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
  const canvasAreaRef = useRef(null)

  useEffect(() => {
    setDlSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of next) { if (!selectedTemplateIds.includes(id)) next.delete(id) }
      return next
    })
  }, [selectedTemplateIds.join(',')])

  const selectedTemplateDetails = [...allTemplates.filter((t) => selectedTemplateIds.includes(t.id))].sort((a, b) => {
    const ai = templateOrder.indexOf(a.id)
    const bi = templateOrder.indexOf(b.id)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
  const currentTemplate = selectedTemplateDetails[activePreviewTab]
  const currentTemplateId = currentTemplate?.id || ''
  const [canvasW, canvasH] = currentTemplate?.size?.split('\u00d7').map(Number) || [750, 750]
  const scale = zoom / 100

  const layers = allLayers[currentTemplateId] || []
  const selectedLayer = layers.find((l) => l.id === selectedLayerId)
  const bgLayer = layers.find(l => l.id === 'background')
  const bgColor = bgLayer?.color || allBgColors[currentTemplateId] || '#ffffff'
  const setBgColor = (color) => {
    setAllBgColors((prev) => ({ ...prev, [currentTemplateId]: color }))
    // 배경 레이어 color도 동기화
    setAllLayers((prev) => {
      const cur = prev[currentTemplateId] || []
      const updated = cur.map(l => l.id === 'background' ? { ...l, color } : l)
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
    const tmpl = allTemplates.find((t) => t.id === templateId)
    if (!tmpl) return null
    const [w, h] = tmpl.size.split('\u00d7').map(Number)
    const canvas = document.createElement('canvas')
    canvas.width = w * multiplier
    canvas.height = h * multiplier
    const ctx = canvas.getContext('2d')
    const layerList = allLayers[templateId] || []
    const bgLayerColor = layerList.find(l => l.id === 'background')?.color || allBgColors[templateId] || '#ffffff'
    ctx.fillStyle = bgLayerColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    for (const layer of layerList) {
      if (layer.type === 'background') continue
      ctx.save()
      const cx = (layer.x + layer.width / 2) * multiplier
      const cy = (layer.y + layer.height / 2) * multiplier
      ctx.translate(cx, cy)
      ctx.rotate(((layer.rotation || 0) * Math.PI) / 180)
      if (layer.type === 'image') {
        await new Promise((resolve) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => { ctx.drawImage(img, -layer.width * multiplier / 2, -layer.height * multiplier / 2, layer.width * multiplier, layer.height * multiplier); resolve() }
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
    return canvas
  }

  const handleDownload = async (templateId) => {
    const tmpl = allTemplates.find((t) => t.id === templateId)
    if (!tmpl) return
    const fileName = customNames[templateId] || tmpl.name
    const [w, h] = tmpl.size.split('\u00d7').map(Number)
    if (dlFormat === 'PDF') {
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
      const mimeType = dlFormat === 'JPG' ? 'image/jpeg' : 'image/png'
      const ext = dlFormat === 'JPG' ? 'jpg' : 'png'
      const link = document.createElement('a')
      link.download = `${fileName}_${dlScale}.${ext}`
      link.href = canvas.toDataURL(mimeType, 0.95)
      link.click()
    }
  }

  const handleDownloadZip = async () => {
    const toDownload = selectedTemplateDetails.filter((t) => dlSelectedIds.has(t.id))
    if (toDownload.length === 0) return
    if (toDownload.length === 1) { await handleDownload(toDownload[0].id); return }
    const zip = new JSZip()
    const multiplier = dlScale === 'x2' ? 2 : 1
    for (const tmpl of toDownload) {
      const fileName = customNames[tmpl.id] || tmpl.name
      if (dlFormat === 'PDF') {
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
        const mimeType = dlFormat === 'JPG' ? 'image/jpeg' : 'image/png'
        const ext = dlFormat === 'JPG' ? 'jpg' : 'png'
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
        const imgLayers = imgs.map((img, idx) => {
          const ratio = img.naturalWidth / img.naturalHeight
          const maxW = Math.round(w * 0.7), maxH = Math.round(h * 0.7)
          let imgW, imgH
          if (ratio > maxW / maxH) { imgW = maxW; imgH = Math.round(maxW / ratio) }
          else { imgH = maxH; imgW = Math.round(maxH * ratio) }
          const offset = idx * 20
          return { id: `img-${idx + 1}`, type: 'image', src: allImages[idx].url, x: Math.round((w - imgW) / 2) + offset, y: Math.round((h - imgH) / 2) + offset, width: imgW, height: imgH, rotation: 0 }
        })
        const init = [bgLayer, ...imgLayers]
        initAllLayers[tmpl.id] = init
        initAllHistory[tmpl.id] = { history: [JSON.parse(JSON.stringify(init))], index: 0 }
      })
      setAllLayers(initAllLayers)
      setAllHistory(initAllHistory)
      setSelectedLayerId('img-1')
    })
  }, [step])

  const onMouseDownLayer = (e, id) => {
    if (isSpaceDown) return
    e.stopPropagation()
    setSelectedLayerId(id)
    const layer = layers.find((l) => l.id === id)
    const { x: origX, y: origY, width: lW, height: lH } = layer
    const startX = e.clientX, startY = e.clientY
    const SNAP = 6
    const onMove = (ev) => {
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
    const onMove = (ev) => {
      const dx = Math.round((ev.clientX - startX) / scale)
      const dy = Math.round((ev.clientY - startY) / scale)
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
              {showMergeButton && (
                <button onClick={handleDownloadMerged} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold border border-primary-300 text-primary-700 bg-primary-50 hover:bg-primary-100 transition-all">
                  <Download className="w-4 h-4" /> 한장으로 다운로드
                </button>
              )}
              <button onClick={handleDownloadZip} disabled={dlSelectedIds.size === 0} className="flex items-center gap-2 px-8 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#9F48CE,#C084FC)' }}>
                <Download className="w-4 h-4" />
                {dlSelectedIds.size <= 1 ? '이미지 다운로드' : `${dlSelectedIds.size}개 ZIP 다운로드`}
              </button>
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
                          if (!currentTemplateId) return
                          const newAllLayers = { ...allLayers }
                          const newAllHistory = { ...allHistory }
                          const [sw, sh] = (currentTemplate?.size || '750\u00d7750').split('\u00d7').map(Number)
                          selectedTemplateDetails.forEach((tmpl) => {
                            if (tmpl.id === currentTemplateId) return
                            const [tw, th] = tmpl.size.split('\u00d7').map(Number)
                            const scaleX = tw / sw, scaleY = th / sh
                            const targetLayers = [...(allLayers[tmpl.id] || [])]
                            if (type === 'image') {
                              const r = selectedLayer.width / selectedLayer.height
                              const mW = Math.round(tw * 0.7), mH = Math.round(th * 0.7)
                              let nW, nH
                              if (r > mW / mH) { nW = mW; nH = Math.round(mW / r) } else { nH = mH; nW = Math.round(mH * r) }
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
                            }
                            newAllLayers[tmpl.id] = targetLayers
                            newAllHistory[tmpl.id] = { history: [JSON.parse(JSON.stringify(targetLayers))], index: 0 }
                          })
                          setAllLayers(newAllLayers)
                          setAllHistory(newAllHistory)
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg,#9F48CE,#C084FC)', color: '#fff' }}
                      >
                        <span style={{ fontSize: 14 }}>⇄</span>
                        {type === 'image' && '이미지 스타일 전체 적용'}
                        {type === 'text' && '텍스트 전체 적용'}
                        {type === 'background' && '배경색 전체 적용'}
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

                  const quickEdit = (
                    <div key="quick" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
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
                  )

                  const selectedObj = (selectedLayer && type !== 'background') ? (
                    <div key="obj" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">선택 객체</h3>
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
                      {type === 'text' && (
                        <div className="space-y-2 mt-2">
                          <textarea value={selectedLayer.text}
                            onChange={(e) => setLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, text: e.target.value } : l))}
                            onBlur={() => commitHistory(layers)}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none resize-none" rows={2} />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">크기</span>
                            <input type="number" value={selectedLayer.fontSize} min={8} max={200}
                              onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, fontSize: Number(e.target.value) } : l))}
                              className="w-16 px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white" />
                            <span className="text-xs text-gray-500">색</span>
                            <input type="color" value={selectedLayer.color}
                              onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, color: e.target.value } : l))}
                              className="w-8 h-7 rounded border border-gray-200 cursor-pointer" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null

                  const bgPanel = (
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

                  const bottomPanels = (
                    <>
                      <div key="copy" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">카피 자동 삽입</h3>
                        <label className="flex items-center justify-between cursor-pointer mb-2">
                          <span className="text-sm text-gray-600">카피 텍스트 ON/OFF</span>
                          <div className="w-10 h-6 bg-primary-500 rounded-full relative"><div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow" /></div>
                        </label>
                        <input type="text" placeholder="카피 문구 입력..." className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none" />
                      </div>
                      <div key="brand" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">브랜드 설정</h3>
                        <div className="flex gap-2 mb-3">
                          {['#7c3aed','#ec4899','#f59e0b','#10b981','#3b82f6'].map((c) => (
                            <button key={c} className="w-7 h-7 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-all" style={{ backgroundColor: c }} />
                          ))}
                          <button className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center"><Palette className="w-3 h-3 text-gray-400" /></button>
                        </div>
                        <select className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white"><option>Pretendard</option><option>Noto Sans KR</option></select>
                      </div>
                      <div key="lang" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">다국어 동시 제작</h3>
                        <div className="flex flex-wrap gap-2">
                          {['한국어','English','日本語','中文'].map((lang) => (
                            <button key={lang} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${lang === '한국어' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500'}`}>{lang}</button>
                          ))}
                        </div>
                      </div>
                      <div key="dl" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">다운로드 옵션</h3>
                        <div className="flex gap-2 mb-2">
                          {['JPG','PNG','PDF'].map((fmt) => (
                            <button key={fmt} onClick={() => setDlFormat(fmt)} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${dlFormat === fmt ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500'}`}>{fmt}</button>
                          ))}
                        </div>
                        {dlFormat === 'PDF' && <p className="text-xs text-primary-600 mt-1 text-center">300dpi 고화질 출력</p>}
                        {dlFormat !== 'PDF' && (
                          <div className="flex gap-2 mt-2">
                            {['x1','x2'].map((sc) => (
                              <button key={sc} onClick={() => setDlScale(sc)} className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${dlScale === sc ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500'}`}>{sc}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )

                  if (type === 'background') return <>{styleSync}{bgPanel}{fileStorage}{quickEdit}{selectedObj}{bottomPanels}</>
                  if (type === 'image') return <>{styleSync}{fileStorage}{quickEdit}{selectedObj}{bgPanel}{bottomPanels}</>
                  if (type === 'text') return <>{styleSync}{selectedObj}{fileStorage}{quickEdit}{bgPanel}{bottomPanels}</>
                  return <>{fileStorage}{quickEdit}{bgPanel}{bottomPanels}</>
                })()}
              </div>
            </div>

            {/* 오른쪽: 캔버스 */}
            <div className="flex-1 flex flex-col overflow-hidden">

              {/* 캔버스 뷰포트 */}
              <div
                ref={canvasAreaRef}
                className="flex-1 overflow-hidden"
                style={{ position: 'relative', cursor: isSpaceDown ? (isPanning ? 'grabbing' : 'grab') : 'default', background: '#f1f0f5' }}
                onClick={(e) => { if (!isPanning) { setSelectedLayerId(null); setEditingTextId(null) } }}
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
                    <div id="editor-canvas" style={{ position: 'relative', width: canvasW, height: canvasH, border: '1px solid #e5e7eb', overflow: 'hidden', backgroundImage: 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px', backgroundColor: '#f8f8f8' }}>
                      {layers.map((layer) => {
                        // 배경색 레이어 렌더링
                        if (layer.type === 'background') {
                          return (
                            <div key={layer.id}
                              onMouseDown={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id) }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ position: 'absolute', inset: 0, background: layer.color, cursor: 'pointer', zIndex: 0 }}
                            />
                          )
                        }
                        return (
                        <div key={layer.id}
                          onMouseDown={(e) => {
                            if (editingTextId === layer.id) { e.stopPropagation(); return }
                            onMouseDownLayer(e, layer.id)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            if (layer.type === 'text') { setEditingTextId(layer.id); setSelectedLayerId(layer.id) }
                          }}
                          style={{ position: 'absolute', left: layer.x, top: layer.y, width: layer.width, height: layer.height, transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'center center', cursor: editingTextId === layer.id ? 'text' : 'move', userSelect: editingTextId === layer.id ? 'text' : 'none', zIndex: layer.id === selectedLayerId ? 10 : 1 }}>
                          {layer.type === 'image' && <img src={layer.src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', pointerEvents: 'none' }} />}
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
                              <div style={{ width: '100%', height: '100%', fontSize: layer.fontSize, color: layer.color, fontFamily: layer.fontFamily || 'Pretendard', fontWeight: layer.fontWeight || (layer.bold ? '700' : '400'), textDecoration: layer.underline ? 'underline' : 'none', textAlign: layer.align || 'left', letterSpacing: `${layer.letterSpacing || 0}px`, lineHeight: layer.lineHeight || 1.4, display: 'flex', alignItems: 'center', whiteSpace: 'pre-wrap', wordBreak: 'break-all', pointerEvents: 'none' }}>{layer.text}</div>
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

                    {/* 투명 클릭 레이어 */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, overflow: 'visible', pointerEvents: 'none', zIndex: 50 }}>
                      {layers.filter((layer) => layer.id !== editingTextId && layer.type !== 'background').map((layer) => (
                        <div key={`hit-${layer.id}`}
                          onMouseDown={(e) => onMouseDownLayer(e, layer.id)}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => { e.stopPropagation(); if (layer.type === 'text') { setEditingTextId(layer.id); setSelectedLayerId(layer.id) } }}
                          style={{ position: 'absolute', left: layer.x, top: layer.y, width: layer.width, height: layer.height, transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'center center', cursor: 'move', pointerEvents: 'all', background: 'transparent' }} />
                      ))}
                    </div>

                    {/* 이미지 툴바 */}
                    {selectedLayer?.type === 'image' && (
                      <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: selectedLayer.x + selectedLayer.width / 2, top: selectedLayer.y - 48, transform: 'translateX(-50%)', zIndex: 200, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px', pointerEvents: 'all', whiteSpace: 'nowrap' }}>
                        <button onClick={() => deleteLayer(selectedLayer.id)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                          <Trash2 style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    )}

                    {/* 텍스트 툴바 */}
                    {selectedLayer?.type === 'text' && (
                      <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: Math.max(0, selectedLayer.x + selectedLayer.width / 2), top: selectedLayer.y - 48, transform: 'translateX(-50%)', zIndex: 200, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px', pointerEvents: 'all', whiteSpace: 'nowrap' }}>
                        <select value={selectedLayer.fontFamily || 'Pretendard'} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, fontFamily: e.target.value } : l))} style={{ fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 4px', background: '#fff', cursor: 'pointer', maxWidth: 110 }}>
                          <option value="Pretendard">Pretendard</option>
                          <option value="Noto Sans KR">Noto Sans KR</option>
                          <option value="GmarketSans">Gmarket Sans</option>
                        </select>
                        <select value={selectedLayer.fontWeight || '400'} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, fontWeight: e.target.value } : l))} style={{ fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 4px', background: '#fff', cursor: 'pointer', width: 72 }}>
                          {selectedLayer.fontFamily === 'GmarketSans' ? (
                            <><option value="300">Light</option><option value="500">Medium</option><option value="700">Bold</option></>
                          ) : (
                            <><option value="300">Light</option><option value="400">Regular</option><option value="500">Medium</option><option value="600">SemiBold</option><option value="700">Bold</option><option value="800">ExtraBold</option></>
                          )}
                        </select>
                        <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />
                        <input type="number" value={selectedLayer.fontSize} min={8} max={200} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, fontSize: Number(e.target.value) } : l))} style={{ width: 40, fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 4px', textAlign: 'center' }} />
                        <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />
                        <button onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, bold: !l.bold } : l))} style={{ width: 26, height: 26, borderRadius: 6, border: selectedLayer.bold ? '1.5px solid #9F48CE' : '1px solid transparent', background: selectedLayer.bold ? '#F3E8FF' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedLayer.bold ? '#9F48CE' : '#4b5563' }}>
                          <Bold style={{ width: 13, height: 13 }} />
                        </button>
                        <button onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, underline: !l.underline } : l))} style={{ width: 26, height: 26, borderRadius: 6, border: selectedLayer.underline ? '1.5px solid #9F48CE' : '1px solid transparent', background: selectedLayer.underline ? '#F3E8FF' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedLayer.underline ? '#9F48CE' : '#4b5563' }}>
                          <Underline style={{ width: 13, height: 13 }} />
                        </button>
                        <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />
                        {[{ v: 'left', Icon: AlignLeft }, { v: 'center', Icon: AlignCenter }, { v: 'right', Icon: AlignRight }].map(({ v, Icon }) => (
                          <button key={v} onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, align: v } : l))} style={{ width: 26, height: 26, borderRadius: 6, border: (selectedLayer.align || 'left') === v ? '1.5px solid #9F48CE' : '1px solid transparent', background: (selectedLayer.align || 'left') === v ? '#F3E8FF' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: (selectedLayer.align || 'left') === v ? '#9F48CE' : '#4b5563' }}>
                            <Icon style={{ width: 13, height: 13 }} />
                          </button>
                        ))}
                        <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />
                        <label style={{ position: 'relative', cursor: 'pointer' }}>
                          <div style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 'bold', color: selectedLayer.color, lineHeight: 1 }}>A</span>
                            <div style={{ width: 16, height: 3, borderRadius: 2, background: selectedLayer.color }} />
                          </div>
                          <input type="color" value={selectedLayer.color} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, color: e.target.value } : l))} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                        </label>
                        <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>자간</span>
                          <input type="number" value={selectedLayer.letterSpacing || 0} min={-10} max={50} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, letterSpacing: Number(e.target.value) } : l))} style={{ width: 36, fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 4px', textAlign: 'center' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontSize: 10, color: '#9ca3af' }}>행간</span>
                          <input type="number" value={selectedLayer.lineHeight || 1.4} min={0.8} max={4} step={0.1} onChange={(e) => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, lineHeight: Number(e.target.value) } : l))} style={{ width: 46, fontSize: 11, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 4px', textAlign: 'center' }} />
                        </div>
                        <div style={{ width: 1, height: 18, background: '#e5e7eb', margin: '0 4px' }} />
                        <button onClick={() => deleteLayer(selectedLayer.id)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                          <Trash2 style={{ width: 13, height: 13 }} />
                        </button>
                      </div>
                    )}

                    {/* 핸들 오버레이 */}
                    {selectedLayer && selectedLayer.type !== 'background' && (
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
                                    : <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>T</span>
                                }
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: isSelected ? '#7e22ce' : '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {layer.type === 'background' ? '배경색' : layer.type === 'image' ? `이미지 ${idx}` : `텍스트 ${idx}`}
                                </p>
                                <p style={{ fontSize: 10, color: '#9ca3af' }}>{layer.width} × {layer.height}</p>
                              </div>
                              <span style={{ fontSize: 12, flexShrink: 0 }}>{layer.type === 'background' ? '🎨' : layer.type === 'image' ? '🖼' : '✏️'}</span>
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
                    <span className="text-xs text-gray-400">총 <span className="font-semibold text-gray-700">{selectedTemplateDetails.length}</span>건</span>
                    <button
                      onClick={() => {
                        if (dlSelectedIds.size === selectedTemplateDetails.length) {
                          setDlSelectedIds(new Set())
                        } else {
                          setDlSelectedIds(new Set(selectedTemplateDetails.map(t => t.id)))
                        }
                      }}
                      style={{ fontSize: 11, fontWeight: 600, color: dlSelectedIds.size === selectedTemplateDetails.length ? '#9ca3af' : '#9F48CE', background: dlSelectedIds.size === selectedTemplateDetails.length ? '#f3f4f6' : '#f3e8ff', border: 'none', borderRadius: 99, padding: '2px 10px', cursor: 'pointer' }}
                    >
                      {dlSelectedIds.size === selectedTemplateDetails.length ? '전체 해제' : '전체 선택'}
                    </button>
                  </div>
                  <button onClick={() => setShowAddTemplatePopup(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#9F48CE', background: '#f3e8ff', border: 'none', borderRadius: 99, padding: '3px 10px', cursor: 'pointer' }}>
                    <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> 템플릿 추가
                  </button>
                </div>
                <div className="px-4 pt-2 pb-3 flex items-start gap-3 overflow-x-auto">
                  {selectedTemplateDetails.map((tmpl, i) => {
                    const tLayers = allLayers[tmpl.id] || []
                    const tBg = allBgColors[tmpl.id] || '#ffffff'
                    const [tw, th] = tmpl.size.split('\u00d7').map(Number)
                    const CARD_W = 140, CARD_H = 100
                    const ratio = tw / th
                    let bW = CARD_W, bH = Math.round(CARD_W / ratio)
                    if (bH > CARD_H) { bH = CARD_H; bW = Math.round(CARD_H * ratio) }
                    const tScaleX = bW / tw, tScaleY = bH / th
                    const isActive = activePreviewTab === i
                    const isDlChecked = dlSelectedIds.has(tmpl.id)
                    return (
                      <div key={tmpl.id} draggable
                        onDragStart={() => setDragTplId(tmpl.id)}
                        onDragOver={(e) => { e.preventDefault(); setDragOverTplId(tmpl.id) }}
                        onDragLeave={() => setDragOverTplId(null)}
                        onDrop={() => {
                          if (!dragTplId || dragTplId === tmpl.id) return
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
                        onClick={() => { setActivePreviewTab(i); setSelectedLayerId(null) }}
                        className="shrink-0 flex flex-col items-start gap-1"
                        style={{ cursor: 'grab', opacity: dragTplId === tmpl.id ? 0.4 : 1, borderLeft: dragOverTplId === tmpl.id && dragTplId !== tmpl.id ? '3px solid #9F48CE' : '3px solid transparent', transition: 'all 0.1s' }}
                      >
                        <div style={{ width: CARD_W, height: CARD_H, borderRadius: 4, outline: isActive ? '2.5px solid #9F48CE' : '2.5px solid transparent', outlineOffset: '2px', background: '#e9e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', boxShadow: isActive ? '0 0 0 4px #C084FC22' : 'none' }}>
                          <div onClick={(e) => { e.stopPropagation(); setDlSelectedIds((prev) => { const next = new Set(prev); if (next.has(tmpl.id)) next.delete(tmpl.id); else next.add(tmpl.id); return next }) }}
                            style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 4, border: isDlChecked ? '2px solid #9F48CE' : '2px solid #d1d5db', background: isDlChecked ? '#9F48CE' : 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transition: 'all 0.15s' }}>
                            {isDlChecked && <Check style={{ width: 10, height: 10, color: '#fff' }} />}
                          </div>
                          <div style={{ width: bW, height: bH, background: tBg, position: 'relative', overflow: 'hidden', borderRadius: 2, opacity: isDlChecked ? 1 : 0.4, transition: 'opacity 0.15s' }}>
                            {tLayers.map((layer) => (
                              <div key={layer.id} style={{ position: 'absolute', left: layer.x * tScaleX, top: layer.y * tScaleY, width: layer.width * tScaleX, height: layer.height * tScaleY, transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'center center' }}>
                                {layer.type === 'image' && <img src={layer.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }} />}
                                {layer.type === 'text' && <div style={{ fontSize: layer.fontSize * Math.min(tScaleX, tScaleY), color: layer.color, overflow: 'hidden', whiteSpace: 'nowrap' }}>{layer.text}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ width: CARD_W, marginTop: 4 }}>
                          <p className="text-xs font-medium text-gray-700 truncate">{i + 1}.{tmpl.name}</p>
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
