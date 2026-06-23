/**
 * 저장된 standard/customSize editorState를 Canvas API로 렌더링 후 PNG dataURL 반환
 *
 * ImageWorkflow의 renderToCanvas 로직을 독립 함수로 추출 (MyContent 다운로드 전용)
 */
import { templateGroups } from '../data/templateData'

const allTemplates = templateGroups.flatMap(g => g.templates)

// ── ImageWorkflow 동일 상수 ──────────────────────────────────────
const B11_IMG_X  = 230
const B11_IMG_W  = 520
const B11_GRAD_H = 560
const B2_CLOSE_ICON_PATH = 'M7.41401 5.99998L10.207 3.20695C10.3025 3.1147 10.3787 3.00437 10.4311 2.88236C10.4835 2.76036 10.5111 2.62915 10.5123 2.49638C10.5134 2.3636 10.4881 2.23194 10.4378 2.10905C10.3875 1.98615 10.3133 1.87445 10.2194 1.78056C10.1255 1.68666 10.0139 1.61245 9.89097 1.56217C9.76807 1.51189 9.63639 1.48655 9.50361 1.48771C9.37083 1.48886 9.23961 1.51648 9.11761 1.56889C8.9956 1.62129 8.88525 1.6975 8.79301 1.79301L6.00001 4.58598L3.20701 1.79301C3.01841 1.61085 2.76581 1.51003 2.50361 1.51231C2.24141 1.51458 1.99059 1.61974 1.80518 1.80515C1.61977 1.99056 1.51461 2.24138 1.51234 2.50358C1.51006 2.76577 1.61085 3.01834 1.79301 3.20695L4.58601 5.99998L1.79301 8.79301C1.6975 8.88525 1.62131 8.99559 1.5689 9.11759C1.51649 9.2396 1.48891 9.3708 1.48775 9.50358C1.4866 9.63636 1.51191 9.76801 1.56219 9.89091C1.61247 10.0138 1.68672 10.1255 1.78062 10.2194C1.87451 10.3133 1.98615 10.3875 2.10905 10.4378C2.23194 10.4881 2.36363 10.5134 2.49641 10.5122C2.62919 10.5111 2.7604 10.4835 2.88241 10.4311C3.00441 10.3787 3.11476 10.3025 3.20701 10.2069L6.00001 7.41398L8.79301 10.2069C8.88525 10.3025 8.9956 10.3787 9.11761 10.4311C9.23961 10.4835 9.37083 10.5111 9.50361 10.5122C9.63639 10.5134 9.76807 10.4881 9.89097 10.4378C10.0139 10.3875 10.1255 10.3133 10.2194 10.2194C10.3133 10.1255 10.3875 10.0138 10.4378 9.89091C10.4881 9.76801 10.5134 9.63636 10.5123 9.50358C10.5111 9.3708 10.4835 9.2396 10.4311 9.11759C10.3787 8.99559 10.3025 8.88525 10.207 8.79301L7.41401 5.99998Z'
const B2_CLOSE_SIZE = 24
const B2_CLOSE_CX   = 1120
const B2_CLOSE_CY   = 70

function hexToRgb(hex) {
  if (!hex || hex === 'transparent') return [255, 255, 255]
  const h = hex.replace('#', '')
  if (h.length < 6) return [255, 255, 255]
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return [255, 255, 255]
  return [r, g, b]
}

/**
 * ImageWorkflow의 renderToCanvas와 동일한 로직
 *
 * @param {string}  templateId
 * @param {number}  multiplier   1 = 원본 크기, 2 = 2x 등
 * @param {object}  editorState  { allLayers, allBgColors, customHeights }
 * @returns {Promise<HTMLCanvasElement|null>}
 */
async function renderCanvasFromState(templateId, multiplier, editorState) {
  const { allLayers = {}, allBgColors = {}, customHeights = {} } = editorState

  const tmpl = allTemplates.find(t => t.id === templateId)
  if (!tmpl) return null

  const [w, _hBase] = tmpl.size.split('×').map(Number)
  const h = (tmpl.heightResizable && customHeights[templateId]) ? customHeights[templateId] : _hBase

  const canvas = document.createElement('canvas')
  canvas.width  = w * multiplier
  canvas.height = h * multiplier
  const ctx = canvas.getContext('2d')

  const layerList    = allLayers[templateId] || []
  const bgLayerColor = layerList.find(l => l.id === 'background')?.color
    || allBgColors[templateId]
    || '#ffffff'

  if (bgLayerColor !== 'transparent') {
    ctx.fillStyle = bgLayerColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  for (const layer of layerList) {
    if (layer.type === 'background') continue
    if (layer.isReference) continue
    if (layer.visible === false) continue

    ctx.save()
    if (layer.opacity !== undefined) ctx.globalAlpha = layer.opacity

    const cx = (layer.x + layer.width / 2) * multiplier
    const cy = (layer.y + layer.height / 2) * multiplier
    ctx.translate(cx, cy)
    ctx.rotate(((layer.rotation || 0) * Math.PI) / 180)

    if (layer.type === 'image') {
      if (!layer.src) { ctx.restore(); continue }
      const isB11 = tmpl.id === 'b11'
      await new Promise(resolve => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const lw = layer.width * multiplier, lh = layer.height * multiplier
          if (isB11) {
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
          } else if (layer.objectFit === 'cover' && !layer.cropOrigW) {
            const scale = Math.max(lw / img.naturalWidth, lh / img.naturalHeight)
            const iW = img.naturalWidth * scale, iH = img.naturalHeight * scale
            const br = (layer.borderRadius || 0) * multiplier
            ctx.save()
            ctx.beginPath()
            if (br > 0 && ctx.roundRect) { ctx.roundRect(-lw / 2, -lh / 2, lw, lh, br) }
            else { ctx.rect(-lw / 2, -lh / 2, lw, lh) }
            ctx.clip()
            ctx.drawImage(img, -iW / 2, -iH / 2, iW, iH)
            ctx.restore()
          } else {
            const cX = layer.cropX ?? 0
            const cY = layer.cropY ?? 0
            const cS = layer.cropScale ?? 1
            const cropOrigW = layer.cropOrigW ?? lw
            const cropOrigH = layer.cropOrigH ?? lh
            ctx.save()
            ctx.beginPath()
            ctx.rect(-lw / 2, -lh / 2, lw, lh)
            ctx.clip()
            const scaledW = cropOrigW * cS, scaledH = cropOrigH * cS
            ctx.drawImage(img, -scaledW / 2 + cX * multiplier, -scaledH / 2 + cY * multiplier, scaledW, scaledH)
            ctx.restore()
          }
          resolve()
        }
        img.onerror = resolve
        img.src = layer.src
      })
    } else if (layer.type === 'text') {
      const fontSize   = (layer.fontSize || 24) * multiplier
      const fontWeight = layer.fontWeight || (layer.bold ? '700' : '400')
      const lineH      = fontSize * (layer.lineHeight || 1.4)
      const boxW       = layer.width  * multiplier
      const boxH       = layer.height * multiplier
      if (layer.bgColor) {
        ctx.fillStyle = layer.bgColor
        const r = (layer.borderRadius || 0) * multiplier
        if (r > 0 && ctx.roundRect) {
          ctx.beginPath(); ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, r); ctx.fill()
        } else {
          ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH)
        }
      }
      ctx.font      = `${fontWeight} ${fontSize}px ${layer.fontFamily || 'Pretendard'}`
      ctx.fillStyle = layer.color || '#000000'
      ctx.textBaseline = 'top'
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${(layer.letterSpacing || 0) * multiplier}px`
      const align  = layer.align || 'left'
      ctx.textAlign = align
      const drawX  = align === 'center' ? 0 : align === 'right' ? boxW / 2 : -boxW / 2
      const lines  = (layer.text || '').split('\n')
      const halfLeading = Math.max(0, (lineH - fontSize) / 2)
      const startY = layer.verticalCenter ? -(lines.length * lineH) / 2 + halfLeading : -boxH / 2 + halfLeading
      lines.forEach((line, li) => { ctx.fillText(line, drawX, startY + li * lineH) })
    } else if (layer.type === 'gradient') {
      const bgC    = bgLayerColor === 'transparent' ? '#ffffff' : bgLayerColor
      const [rr, gg, bb] = hexToRgb(bgC)
      const gW     = layer.width  * multiplier
      const gH     = layer.height * multiplier
      const isLeft = layer.direction === 'to-left'
      const grad   = ctx.createLinearGradient(isLeft ? gW / 2 : -gW / 2, 0, isLeft ? -gW / 2 : gW / 2, 0)
      grad.addColorStop(0,   `rgba(${rr},${gg},${bb},1)`)
      grad.addColorStop(0.5, `rgba(${rr},${gg},${bb},1)`)
      grad.addColorStop(1,   `rgba(${rr},${gg},${bb},0)`)
      ctx.fillStyle = grad
      ctx.fillRect(-gW / 2, -gH / 2, gW, gH)
    } else if (layer.type === 'rect') {
      const rW = layer.width  * multiplier
      const rH = layer.height * multiplier
      ctx.fillStyle = layer.color || '#000000'
      const r = (layer.borderRadius || 0) * multiplier
      if (r > 0 && ctx.roundRect) {
        ctx.beginPath(); ctx.roundRect(-rW / 2, -rH / 2, rW, rH, r); ctx.fill()
      } else {
        ctx.fillRect(-rW / 2, -rH / 2, rW, rH)
      }
    } else if (layer.type === 'shape') {
      const rW  = layer.width  * multiplier
      const rH  = layer.height * multiplier
      const sw  = (layer.strokeWidth || 3) * multiplier
      const pts = layer.points || (layer.shapeType === 'star' ? 5 : 6)
      const ir  = layer.innerRadius ?? 0.4
      ctx.fillStyle   = layer.color || '#374151'
      ctx.strokeStyle = layer.color || '#374151'
      ctx.lineWidth = sw
      ctx.lineCap   = 'round'
      if (layer.shapeType === 'ellipse') {
        ctx.beginPath(); ctx.ellipse(0, 0, rW / 2, rH / 2, 0, 0, Math.PI * 2); ctx.fill()
      } else if (layer.shapeType === 'line' || layer.shapeType === 'arrow') {
        const pad = layer.shapeType === 'arrow' ? sw * 3 : 0
        const x1  = -rW / 2 + (layer.arrowStart ? pad : 0)
        const x2  =  rW / 2 - (layer.arrowEnd  ? pad : 0)
        ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x2, 0); ctx.stroke()
        const drawHead = (hcx) => {
          const sign = hcx > 0 ? 1 : -1
          ctx.beginPath()
          ctx.moveTo(hcx, 0)
          ctx.lineTo(hcx - sign * sw * 3, -sw * 2)
          ctx.lineTo(hcx - sign * sw * 3,  sw * 2)
          ctx.closePath(); ctx.fill()
        }
        if (layer.arrowEnd)   drawHead( rW / 2)
        if (layer.arrowStart) drawHead(-rW / 2)
      } else if (layer.shapeType === 'polygon') {
        ctx.beginPath()
        for (let i = 0; i < pts; i++) {
          const a = (i * 2 * Math.PI / pts) - Math.PI / 2
          const x = rW / 2 * Math.cos(a), y = rH / 2 * Math.sin(a)
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.closePath(); ctx.fill()
      } else if (layer.shapeType === 'star') {
        ctx.beginPath()
        for (let i = 0; i < pts * 2; i++) {
          const a   = (i * Math.PI / pts) - Math.PI / 2
          const r2  = i % 2 === 0 ? 1 : ir
          const x   = rW / 2 * r2 * Math.cos(a)
          const y   = rH / 2 * r2 * Math.sin(a)
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.closePath(); ctx.fill()
      }
    }
    ctx.restore()
  }

  // b2 X 닫기 아이콘
  if (templateId === 'b2') {
    const sc       = multiplier * (w / 1536)
    const iconSize = B2_CLOSE_SIZE * sc
    const icx      = B2_CLOSE_CX * (w / 1536) * multiplier
    const icy      = B2_CLOSE_CY * (h / 140)  * multiplier
    ctx.save()
    ctx.translate(icx, icy)
    ctx.scale(iconSize / 12, iconSize / 12)
    ctx.translate(-6, -6)
    ctx.fillStyle = 'white'
    ctx.fill(new Path2D(B2_CLOSE_ICON_PATH))
    ctx.restore()
  }

  return canvas
}

/**
 * standard / customSize editorState → PNG dataURL
 *
 * @param {string} templateId   첫 번째 (대표) templateId
 * @param {object} editorState  { allLayers, allBgColors, customHeights, ... }
 * @param {object} options
 * @param {number} options.multiplier  1 = 원본 크기 (기본값)
 * @returns {Promise<string>}  PNG dataURL
 */
export async function renderStandardToDataUrl(templateId, editorState, { multiplier = 1 } = {}) {
  const canvas = await renderCanvasFromState(templateId, multiplier, editorState)
  if (!canvas) throw new Error(`[standardExport] template not found: ${templateId}`)
  return canvas.toDataURL('image/png')
}
