import { useState, useEffect, useRef } from 'react'

const PREVIEW_LAYERS = {
  e1: (w, h) => [
    { type: 'background', color: '#ffffff' },
    { type: 'image', src: '/guide/e1-reference.jpg', x: 0, y: 0, width: w, height: h, objectFit: 'cover', opacity: 0.9 },
    { type: 'text', text: '연인을 위한 싱그러움\n샤넬이 제안하는 기프트', x: 216, y: 163, width: 401, fontSize: 44, fontWeight: '700', color: '#ffffff', lineHeight: 1.3, letterSpacing: -1 },
    { type: 'text', text: '홀리데이 리미티드 에디션 런칭', x: 216, y: 301, width: 334, fontSize: 24, fontWeight: '500', color: '#ffffff', lineHeight: 1.5 },
  ],
  e2: (w, h) => {
    const mainH = Math.round(44 * 1.3 * 2)
    const mainY = Math.round(169 * h / 512)
    return [
      { type: 'background', color: '#F6F1EA' },
      { type: 'image', src: '/guide/e2-object-fd4a39.png', x: -150, y: Math.round(-220 * h / 512), width: 1667, height: Math.round(758 * h / 512), objectFit: 'fill' },
      { type: 'text', text: '연인을 위한 싱그러움\n샤넬이 제안하는 기프트', x: 71, y: mainY, width: 445, fontSize: 44, fontWeight: '700', color: '#ffffff', lineHeight: 1.3, letterSpacing: -1 },
      { type: 'text', text: '홀리데이 리미티드 에디션 런칭', x: 71, y: mainY + mainH + 24, width: 445, fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.8)', lineHeight: 1.3 },
    ]
  },
  e3: (w, h) => [
    { type: 'background', color: '#F6F1EA' },
    { type: 'image', src: '/guide/e2-object-fd4a39.png', x: -158, y: -96, width: 1313, height: 597, objectFit: 'fill' },
    { type: 'text', text: '연인을 위한\n샤넬 기프트 제안', x: 54, y: 138, width: 401, fontSize: 50, fontWeight: '700', color: '#ffffff', lineHeight: 1.21, letterSpacing: -1 },
    { type: 'text', text: '홀리데이 리미티드\n에디션 런칭', x: 54, y: 289, width: 236, fontSize: 30, fontWeight: '700', color: 'rgba(255,255,255,0.8)', lineHeight: 1.3 },
  ],
  e5: (w, h) => {
    const productRows = [306, 442, 578, 714, 850].flatMap((iy, n) => [
      { type: 'image', src: '/assets/templates/e5/thumb.png', x: 756, y: iy, width: 106, height: 106, objectFit: 'cover', borderRadius: 10 },
      { type: 'text', text: '워터뱅크 블루\n하이알루로닉 크림 50ml', x: 888, y: iy, width: 379, fontSize: 21, fontWeight: '700', color: '#000000', lineHeight: 1.4, opacity: 0.8 },
      ...(n < 4 ? [{ type: 'rect', color: '#D4D4D4', x: 756, y: iy + 121, width: 511, height: 1 }] : []),
    ])
    return [
      { type: 'image', src: '/assets/templates/e5/bg-texture.png', x: 0, y: 0, width: 1440, height: 1048, objectFit: 'cover' },
      { type: 'image', src: '/assets/templates/e5/main-image.png', x: 213, y: 87, width: 474, height: 760, objectFit: 'cover', borderRadius: 10 },
      { type: 'rect', color: 'rgba(255,255,255,0.8)', x: 213, y: 847, width: 474, height: 114, borderRadius: 10 },
      { type: 'text', text: "MD's STORY", x: 249, y: 876, width: 418, fontSize: 22, fontWeight: '700', color: 'rgba(68,68,68,0.5)' },
      { type: 'text', text: '"상큼한 봄, 한 겹의 향을 더하는 데 집중"', x: 249, y: 904, width: 418, fontSize: 22, fontWeight: '700', color: '#222222', align: 'center' },
      { type: 'text', text: 'MD가 직접 고른', x: 756, y: 87, width: 533, fontSize: 33, fontWeight: '600', color: '#000000', letterSpacing: -0.66, lineHeight: 1.3 },
      { type: 'text', text: '나의 봄 향수', x: 756, y: 132, width: 533, fontSize: 45, fontWeight: '800', color: '#FF5E4F', letterSpacing: -0.9, lineHeight: 1.3 },
      { type: 'text', text: '12년차 뷰티 MD가 봄철 환절기에 직접 써본 후 골라낸 향수.\n제품 설명서가 아니라, 사용기에 가까운 리스트입니다.', x: 756, y: 209, width: 533, fontSize: 20, fontWeight: '400', color: '#000000', lineHeight: 1.42, opacity: 0.8 },
      ...productRows,
    ]
  },
}

function renderPreviewLayer(layer, i) {
  if (layer.type === 'background') {
    return <div key={i} style={{ position: 'absolute', inset: 0, background: layer.color }} />
  }
  if (layer.type === 'image') {
    return (
      <img key={i} src={layer.src} alt="" draggable={false} style={{
        position: 'absolute', left: layer.x, top: layer.y,
        width: layer.width, height: layer.height,
        objectFit: layer.objectFit || 'cover',
        borderRadius: layer.borderRadius || 0,
        opacity: layer.opacity ?? 1,
        display: 'block', flexShrink: 0,
      }} />
    )
  }
  if (layer.type === 'rect') {
    return (
      <div key={i} style={{
        position: 'absolute', left: layer.x, top: layer.y,
        width: layer.width, height: layer.height,
        background: layer.color, borderRadius: layer.borderRadius || 0,
      }} />
    )
  }
  if (layer.type === 'text') {
    return (
      <div key={i} style={{
        position: 'absolute', left: layer.x, top: layer.y, width: layer.width,
        fontSize: layer.fontSize, fontWeight: layer.fontWeight || '400',
        color: layer.color || '#000', fontFamily: 'Pretendard, sans-serif',
        lineHeight: layer.lineHeight || 1.4,
        letterSpacing: layer.letterSpacing ? `${layer.letterSpacing}px` : 'normal',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        opacity: layer.opacity ?? 1, textAlign: layer.align || 'left',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        {layer.text}
      </div>
    )
  }
  return null
}

export function TemplateCardPreview({ t }) {
  const [tw, th] = t.size.split('×').map(Number)
  const CARD_H = 160
  const containerRef = useRef(null)
  const [cardW, setCardW] = useState(260)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) setCardW(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = Math.min(cardW / tw, CARD_H / th) * 0.88
  const layers = PREVIEW_LAYERS[t.id]?.(tw, th)
  if (!layers) return null
  return (
    <div ref={containerRef} style={{
      position: 'absolute', inset: 0, overflow: 'hidden',
      background: '#F6F1EA',
    }}>
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: tw, height: th,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: 'center center',
        overflow: 'hidden',
      }}>
        {layers.map((layer, i) => renderPreviewLayer(layer, i))}
      </div>
    </div>
  )
}

export { PREVIEW_LAYERS }
