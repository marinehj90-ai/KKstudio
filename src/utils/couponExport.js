/**
 * 저장된 쿠폰 프로모션 editorState를 오프스크린 렌더링 후 PNG dataURL로 반환
 *
 * 내 콘텐츠 카드 다운로드 전용 — thumbnailUrl 대신 원본 크기 export에 사용
 */
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { toPng } from 'html-to-image'
import { UniversalModuleView, getModuleLayout } from '../components/CouponEditor'

const DW = 375
const NOOP = () => {}

/**
 * 캔버스 전용 컴포넌트 — 선택/편집 UI 없이 모듈만 렌더링
 */
function CouponCanvasOnly({ modules, layerOffsets, innerRef }) {
  return createElement(
    'div',
    {
      ref: innerRef,
      style: {
        width: DW,
        fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
        background: '#ffffff',
      },
    },
    modules.map(mod =>
      createElement(UniversalModuleView, {
        key: mod.id,
        mod,
        selLayerId: null,
        editLayerId: null,
        onBgClick: NOOP,
        onLayerDown: NOOP,
        onDbl: NOOP,
        onSave: NOOP,
        onCancel: NOOP,
        layerOffsets,
        onUpdateMod: NOOP,
        onCopyLayer: NOOP,
        onDeleteLayer: NOOP,
        cropMode: null,
        onResizeStart: null,
        onEnterCrop: null,
        onApplyCrop: NOOP,
        onCancelCrop: NOOP,
        onCropImageScaleChange: NOOP,
        onResetCrop: NOOP,
        onStartCropBoxResize: NOOP,
        onStartCropBoxMove: NOOP,
      })
    )
  )
}

/**
 * @param {object[]} modules    editorState.modules
 * @param {object}   layerOffsets  editorState.layerOffsets
 * @param {object}   options
 * @param {number}   options.pixelRatio  2 = 750px (등록용 기본), 4 = 1500px (고화질)
 * @returns {Promise<string>}  PNG dataURL
 */
export async function renderCouponToDataUrl(modules, layerOffsets = {}, { pixelRatio = 2 } = {}) {
  const container = document.createElement('div')
  // opacity:1 유지 — visibility:hidden/display:none이면 이미지 로딩 생략됨
  container.style.cssText =
    'position:fixed;left:-99999px;top:0;opacity:1;pointer-events:none;z-index:-9999;'
  document.body.appendChild(container)

  let canvasEl = null
  const root = createRoot(container)

  // flushSync → 동기 렌더링 (ref 콜백 포함)
  flushSync(() => {
    root.render(
      createElement(CouponCanvasOnly, {
        modules,
        layerOffsets,
        innerRef: el => { canvasEl = el },
      })
    )
  })

  try {
    await document.fonts.ready

    if (!canvasEl) throw new Error('[couponExport] canvas element not mounted')

    // 이미지 로딩 대기
    const imgs = Array.from(canvasEl.querySelectorAll('img'))
    await Promise.all(
      imgs.map(img =>
        img.complete
          ? Promise.resolve()
          : new Promise(r => { img.onload = r; img.onerror = r })
      )
    )
    // 레이아웃 안정화 대기
    await new Promise(r => setTimeout(r, 80))

    const dataUrl = await toPng(canvasEl, { pixelRatio, backgroundColor: '#ffffff' })
    const b64 = dataUrl.split(',')[1] || ''
    if (b64.length < 1000) throw new Error('[couponExport] export result is empty')

    return dataUrl
  } finally {
    root.unmount()
    document.body.removeChild(container)
  }
}
