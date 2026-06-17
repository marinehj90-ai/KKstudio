import React, { useState, useCallback, useRef, useEffect, memo } from 'react'
import {
  Upload, Link2, ArrowLeft, ArrowRight, Check, Download,
  X, Palette, ZoomIn, ZoomOut, Eraser, Expand, Wand2, Sparkles, ChevronDown,
  Undo2, Redo2, ImagePlus, Type, RotateCw, Trash2, Maximize2,
  AlignLeft, AlignCenter, AlignRight,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  Bold, Underline, BringToFront, Crop, Eye, EyeOff,
} from 'lucide-react'
import { templateGroups } from '../data/templateData'
import jsPDF from 'jspdf'
import JSZip from 'jszip'
import { removeBackground } from '@imgly/background-removal'
import btnCheckboxBg from '../assets/guide/btn-checkbox-bg.svg'
import btnCheckIcon from '../assets/guide/btn-check-icon.svg'
import btnCloseIcon from '../assets/guide/btn-close-icon.svg'

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
  if (!hex || hex === 'transparent') return [255, 255, 255]
  const h = hex.replace('#', '')
  if (h.length < 6) return [255, 255, 255]
  const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return [255, 255, 255]
  return [r, g, b]
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

// b6 텍스트 미리보기 오버레이 — memo로 완전 격리 (부모 re-render에도 DOM 내용 유지)
const B6TextPreviewOverlay = memo(function B6TextPreviewOverlay({ canvasW, canvasH, color, onColorChange }) {
  const mainRef = useRef(null)
  const subRef  = useRef(null)

  // 초기 플레이스홀더 텍스트 (마운트 1회만)
  useEffect(() => {
    if (mainRef.current) mainRef.current.innerText = '메인 카피를 입력하세요'
    if (subRef.current)  subRef.current.innerText  = '서브 카피를 입력하세요'
  }, [])

  // color만 DOM 직접 업데이트
  useEffect(() => {
    if (mainRef.current) mainRef.current.style.color = color
    if (subRef.current)  subRef.current.style.color  = color
  }, [color])

  const HIDDEN_W = 214
  const TEXT_X = 313
  const TEXT_W = canvasW - TEXT_X - 210
  const MAIN_FS = 21, MAIN_LH = 1.3
  const MAIN_H  = Math.round(MAIN_FS * MAIN_LH * 2) // 55px
  const SUB_FS  = 17, SUB_H = Math.round(SUB_FS * 1.5) // 여유 높이
  const GAP = 9, TOP_Y = 30

  const stop = e => { e.stopPropagation(); }

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90 }}>
      {/* 숨겨지는 영역 (레이아웃 가이드와 동일) */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: HIDDEN_W, height: canvasH, background: 'rgba(239,68,68,0.18)', borderRight: '2px dashed rgba(239,68,68,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'rgba(239,68,68,0.85)', borderRadius: 6, padding: '4px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>숨겨지는 영역</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', fontFamily: 'system-ui, sans-serif' }}>{HIDDEN_W}px</span>
        </div>
      </div>
      {/* 메인카피 */}
      <div ref={mainRef} contentEditable suppressContentEditableWarning
        onMouseDown={stop} onClick={stop} onKeyDown={stop}
        style={{ position: 'absolute', left: TEXT_X, top: TOP_Y, width: TEXT_W, height: MAIN_H, fontSize: MAIN_FS, fontWeight: 700, fontFamily: 'Pretendard', lineHeight: MAIN_LH, letterSpacing: '-0.42px', color, outline: 'none', pointerEvents: 'all', cursor: 'text', border: '1.5px dashed rgba(241,90,36,0.5)', borderRadius: 3, padding: '0 2px', background: 'transparent', overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      />
      {/* 서브카피 */}
      <div ref={subRef} contentEditable suppressContentEditableWarning
        onMouseDown={stop} onClick={stop} onKeyDown={stop}
        style={{ position: 'absolute', left: TEXT_X, top: TOP_Y + MAIN_H + GAP, width: TEXT_W, height: SUB_H, fontSize: SUB_FS, fontWeight: 400, fontFamily: 'Pretendard', lineHeight: 1.0, letterSpacing: '-0.34px', color, outline: 'none', pointerEvents: 'all', cursor: 'text', border: '1.5px dashed rgba(241,90,36,0.3)', borderRadius: 3, padding: '0 2px', background: 'transparent', overflow: 'hidden', whiteSpace: 'nowrap' }}
      />
      {/* 컬러 토글 */}
      <div style={{ position: 'absolute', left: TEXT_X, top: TOP_Y + MAIN_H + GAP + SUB_H + 6, display: 'flex', gap: 5, pointerEvents: 'all' }}>
        {['#1E2023', '#ffffff'].map(c => (
          <button key={c} onMouseDown={stop} onClick={() => onColorChange(c)}
            style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: `2.5px solid ${color === c ? '#F15A24' : '#d1d5db'}`, cursor: 'pointer', boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #e5e7eb' : 'none' }} />
        ))}
      </div>
    </div>
  )
})

// b7 텍스트 미리보기 오버레이
const B7TextPreviewOverlay = memo(function B7TextPreviewOverlay({ canvasW, canvasH, color, onColorChange }) {
  const mainRef = useRef(null)
  const subRef  = useRef(null)

  useEffect(() => {
    if (mainRef.current) mainRef.current.innerText = '메인 카피를 입력하세요'
    if (subRef.current)  subRef.current.innerText  = '서브 카피를 입력하세요'
  }, [])

  useEffect(() => {
    if (mainRef.current) mainRef.current.style.color = color
    if (subRef.current)  subRef.current.style.color  = color
  }, [color])

  // T 텍스트 영역: x=560, w=400, 중앙 정렬
  const T_X = 560, T_W = 400
  const MAIN_FS = 24, SUB_FS = 18, GAP = 14
  const MAIN_H = Math.round(MAIN_FS * 1.4)  // 약 34px
  const SUB_H  = Math.round(SUB_FS  * 1.4)  // 약 26px
  const totalH = MAIN_H + GAP + SUB_H
  const startY = Math.round((canvasH - totalH) / 2)

  const stop = e => e.stopPropagation()

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90 }}>
      {/* 메인카피 — 24px Bold, center */}
      <div ref={mainRef} contentEditable suppressContentEditableWarning
        onMouseDown={stop} onClick={stop} onKeyDown={stop}
        style={{ position: 'absolute', left: T_X, top: startY, width: T_W, height: MAIN_H, fontSize: MAIN_FS, fontWeight: 700, fontFamily: 'Pretendard', lineHeight: 'normal', textAlign: 'center', color, outline: 'none', pointerEvents: 'all', cursor: 'text', border: '1.5px dashed rgba(241,90,36,0.5)', borderRadius: 3, padding: '0 4px', background: 'transparent', overflow: 'hidden', whiteSpace: 'nowrap' }}
      />
      {/* 서브카피 — 18px Regular, center */}
      <div ref={subRef} contentEditable suppressContentEditableWarning
        onMouseDown={stop} onClick={stop} onKeyDown={stop}
        style={{ position: 'absolute', left: T_X, top: startY + MAIN_H + GAP, width: T_W, height: SUB_H, fontSize: SUB_FS, fontWeight: 400, fontFamily: 'Pretendard', lineHeight: 'normal', textAlign: 'center', color, outline: 'none', pointerEvents: 'all', cursor: 'text', border: '1.5px dashed rgba(241,90,36,0.3)', borderRadius: 3, padding: '0 4px', background: 'transparent', overflow: 'hidden', whiteSpace: 'nowrap' }}
      />
      {/* 컬러 토글 */}
      <div style={{ position: 'absolute', left: T_X + T_W / 2 - 25, top: startY + totalH + 8, display: 'flex', gap: 5, pointerEvents: 'all' }}>
        {['#ffffff', '#1E2023'].map(c => (
          <button key={c} onMouseDown={stop} onClick={() => onColorChange(c)}
            style={{ width: 20, height: 20, borderRadius: '50%', background: c, border: `2.5px solid ${color === c ? '#F15A24' : '#d1d5db'}`, cursor: 'pointer', boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #e5e7eb' : 'none' }} />
        ))}
      </div>
    </div>
  )
})

// b3 메인 대배너 텍스트 미리보기 오버레이 (피그마 6154-195 기준, ×2 스케일)
const B3TextPreviewOverlay = memo(function B3TextPreviewOverlay({ canvasW, canvasH }) {
  const textRef  = useRef(null)
  const flag1Ref = useRef(null)
  const flag2Ref = useRef(null)

  useEffect(() => {
    if (textRef.current)  textRef.current.innerText  = '메인 카피를\n입력하세요'
    if (flag1Ref.current) flag1Ref.current.innerText = '사은품'
    if (flag2Ref.current) flag2Ref.current.innerText = '기간 한정'
  }, [])

  const stop = e => e.stopPropagation()
  const sc = canvasW / 375  // 750/375 = 2

  const PB       = Math.round(32 * sc)
  const PX       = Math.round(24 * sc)
  const FS_MAIN  = Math.round(28 * sc)
  const FS_FLAG  = Math.round(12 * sc)
  const FLAG_PX  = Math.round(6  * sc)
  const FLAG_PY  = Math.round(4  * sc)
  const FLAG_R   = Math.round(4  * sc)
  const FLAG_GAP = Math.round(4  * sc)
  const TXT_GAP  = Math.round(8  * sc)
  const GRAD_H   = Math.round(canvasH * 0.32)
  const IND_H    = Math.round(28 * sc)
  const IND_PX   = Math.round(10 * sc)
  const IND_GAP  = Math.round(8  * sc)
  const IND_R    = Math.round(56 * sc)
  const IND_RIGHT = Math.round(12 * sc)
  const IND_TOP   = Math.round(12 * sc)
  const IC        = Math.round(10 * sc)

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 91, overflow: 'hidden' }}>
      {/* 하단 그라데이션 */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, width: canvasW, height: GRAD_H, background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.7))', pointerEvents: 'none' }} />
      {/* dim */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.02)', pointerEvents: 'none' }} />

      {/* 텍스트 + 플래그 영역 (하단) */}
      <div style={{ position: 'absolute', bottom: PB, left: PX, right: PX, display: 'flex', flexDirection: 'column', gap: TXT_GAP, pointerEvents: 'none' }}>
        {/* 플래그 2종 */}
        <div style={{ display: 'flex', gap: FLAG_GAP, flexWrap: 'wrap' }}>
          <div ref={flag1Ref} id="b3-preview-flag1" contentEditable suppressContentEditableWarning
            onMouseDown={stop} onClick={stop} onKeyDown={stop}
            style={{ background: '#4D6EE4', color: '#fff', fontSize: FS_FLAG, fontWeight: 700, fontFamily: 'Pretendard, sans-serif', lineHeight: 1.3, padding: `${FLAG_PY}px ${FLAG_PX}px`, borderRadius: FLAG_R, outline: 'none', pointerEvents: 'all', cursor: 'text', whiteSpace: 'nowrap', display: 'inline-block' }}
          />
          <div ref={flag2Ref} id="b3-preview-flag2" contentEditable suppressContentEditableWarning
            onMouseDown={stop} onClick={stop} onKeyDown={stop}
            style={{ background: '#FE324B', color: '#fff', fontSize: FS_FLAG, fontWeight: 700, fontFamily: 'Pretendard, sans-serif', lineHeight: 1.3, padding: `${FLAG_PY}px ${FLAG_PX}px`, borderRadius: FLAG_R, outline: 'none', pointerEvents: 'all', cursor: 'text', whiteSpace: 'nowrap', display: 'inline-block' }}
          />
        </div>
        {/* 메인 텍스트 (Bold, White 고정, 2줄 제한) */}
        <div ref={textRef} id="b3-preview-main" contentEditable suppressContentEditableWarning
          onMouseDown={stop} onClick={stop}
          onKeyDown={e => {
            stop(e)
            if (e.key === 'Enter') {
              const text = textRef.current?.innerText || ''
              if (text.includes('\n')) e.preventDefault()
            }
          }}
          style={{ color: '#ffffff', fontSize: FS_MAIN, fontWeight: 700, fontFamily: 'Pretendard, sans-serif', lineHeight: 1.3, height: Math.round(FS_MAIN * 1.3 * 2), overflow: 'hidden', outline: 'none', pointerEvents: 'all', cursor: 'text', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
        />
      </div>

      {/* 상단 인디케이터 (우상단) */}
      <div style={{ position: 'absolute', top: IND_TOP, right: IND_RIGHT, height: IND_H, background: 'rgba(30,32,35,0.5)', borderRadius: IND_R, display: 'flex', alignItems: 'center', gap: IND_GAP, padding: `0 ${IND_PX}px` }}>
        {/* 일시정지 아이콘 */}
        <svg width={IC * 0.75} height={IC} viewBox="0 0 8 10" fill="none">
          <rect x="0"   y="0" width="2.5" height="10" rx="1" fill="white" />
          <rect x="5.5" y="0" width="2.5" height="10" rx="1" fill="white" />
        </svg>
        {/* 1 / 3 */}
        <span style={{ fontSize: Math.round(13 * sc), color: '#fff', fontFamily: 'Pretendard, sans-serif', fontWeight: 500, lineHeight: 1, whiteSpace: 'nowrap' }}>1 / 3</span>
        {/* Vector (피그마 원본) */}
        <svg width={IC} height={IC} viewBox="0 0 10 10" fill="none" overflow="visible">
          <path d="M6.25 0H0.625C0.279822 0 0 0.279822 0 0.625V6.25C0 6.59518 0.279822 6.875 0.625 6.875H6.25C6.59518 6.875 6.875 6.59518 6.875 6.25V0.625C6.875 0.279822 6.59518 0 6.25 0Z" fill="white" />
          <path d="M2.5 9.375C2.5 9.54076 2.56586 9.69972 2.68307 9.81693C2.80028 9.93414 2.95924 10 3.125 10H9.375C9.54076 10 9.69972 9.93414 9.81693 9.81693C9.93414 9.69972 10 9.54076 10 9.375V2.5C10 2.33424 9.93414 2.17528 9.81693 2.05807C9.69972 1.94086 9.54076 1.875 9.375 1.875H8.125V7.5C8.125 7.66576 8.05914 7.82472 7.94193 7.94193C7.82472 8.05914 7.66576 8.125 7.5 8.125H2.5V9.375Z" fill="white" />
        </svg>
      </div>
    </div>
  )
})

function Tip({ label, children }) {
  const [show, setShow] = React.useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)', background: '#1f2937', color: '#fff', fontSize: 11, fontFamily: 'system-ui, sans-serif', fontWeight: 500, padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 400, boxShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
          {label}
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #1f2937' }} />
        </div>
      )}
    </div>
  )
}

function TipDesc({ label, desc, children }) {
  const [show, setShow] = React.useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: '#1f2937', color: '#fff', fontSize: 11, fontFamily: 'system-ui, sans-serif', padding: '6px 10px', borderRadius: 7, whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 400, boxShadow: '0 2px 10px rgba(0,0,0,0.28)', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontWeight: 600, fontSize: 11 }}>{label}</span>
          <span style={{ fontWeight: 400, fontSize: 10, color: '#9ca3af' }}>{desc}</span>
          <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid #1f2937' }} />
        </div>
      )}
    </div>
  )
}

// b2 띠배너 MO X 닫기 아이콘 (피그마 검수 18:58 기준, 1536×140)
// left: calc(50%+352px) + translate(-50%) → center_x = 768+352 = 1120, center_y = 70
const B2_CLOSE_ICON_PATH = 'M7.41401 5.99998L10.207 3.20695C10.3025 3.1147 10.3787 3.00437 10.4311 2.88236C10.4835 2.76036 10.5111 2.62915 10.5123 2.49638C10.5134 2.3636 10.4881 2.23194 10.4378 2.10905C10.3875 1.98615 10.3133 1.87445 10.2194 1.78056C10.1255 1.68666 10.0139 1.61245 9.89097 1.56217C9.76807 1.51189 9.63639 1.48655 9.50361 1.48771C9.37083 1.48886 9.23961 1.51648 9.11761 1.56889C8.9956 1.62129 8.88525 1.6975 8.79301 1.79301L6.00001 4.58598L3.20701 1.79301C3.01841 1.61085 2.76581 1.51003 2.50361 1.51231C2.24141 1.51458 1.99059 1.61974 1.80518 1.80515C1.61977 1.99056 1.51461 2.24138 1.51234 2.50358C1.51006 2.76577 1.61085 3.01834 1.79301 3.20695L4.58601 5.99998L1.79301 8.79301C1.6975 8.88525 1.62131 8.99559 1.5689 9.11759C1.51649 9.2396 1.48891 9.3708 1.48775 9.50358C1.4866 9.63636 1.51191 9.76801 1.56219 9.89091C1.61247 10.0138 1.68672 10.1255 1.78062 10.2194C1.87451 10.3133 1.98615 10.3875 2.10905 10.4378C2.23194 10.4881 2.36363 10.5134 2.49641 10.5122C2.62919 10.5111 2.7604 10.4835 2.88241 10.4311C3.00441 10.3787 3.11476 10.3025 3.20701 10.2069L6.00001 7.41398L8.79301 10.2069C8.88525 10.3025 8.9956 10.3787 9.11761 10.4311C9.23961 10.4835 9.37083 10.5111 9.50361 10.5122C9.63639 10.5134 9.76807 10.4881 9.89097 10.4378C10.0139 10.3875 10.1255 10.3133 10.2194 10.2194C10.3133 10.1255 10.3875 10.0138 10.4378 9.89091C10.4881 9.76801 10.5134 9.63636 10.5123 9.50358C10.5111 9.3708 10.4835 9.2396 10.4311 9.11759C10.3787 8.99559 10.3025 8.88525 10.207 8.79301L7.41401 5.99998Z'
const B2_CLOSE_SIZE = 24
const B2_CLOSE_CX = 1120
const B2_CLOSE_CY = 70

const B2CloseIconOverlay = memo(function B2CloseIconOverlay({ canvasW, canvasH }) {
  const sc = canvasW / 1536
  const size = B2_CLOSE_SIZE * sc
  const cx = B2_CLOSE_CX * sc
  const cy = B2_CLOSE_CY * sc
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 88 }}>
      <svg
        viewBox="0 0 12 12"
        width={size}
        height={size}
        style={{ position: 'absolute', left: cx - size / 2, top: cy - size / 2 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={B2_CLOSE_ICON_PATH} fill="white" />
      </svg>
    </div>
  )
})

// b12 퀵메뉴 이미지 레이아웃 가이드 (피그마 6650-64627 기준, 300×300)
const B12GuideOverlay = memo(function B12GuideOverlay({ canvasW, canvasH }) {
  // 피그마 기준 300px → 캔버스 실제 크기로 스케일
  const sc = canvasW / 300
  const MARGIN   = Math.round(24 * sc)   // 안전마진 선 위치
  const RED_W    = Math.round(208 * sc)  // 권장 이미지 영역
  const RED_H    = Math.round(208 * sc)
  const RED_X    = Math.round((canvasW - RED_W) / 2)
  const RED_Y    = Math.round((canvasH - RED_H) / 2)
  const BLU_HW   = Math.round(250 * sc)  // 가로형 콘텐츠 영역
  const BLU_HH   = Math.round(160 * sc)
  const BLU_HX   = Math.round((canvasW - BLU_HW) / 2)
  const BLU_HY   = Math.round((canvasH - BLU_HH) / 2)
  const BLU_VW   = Math.round(160 * sc)  // 세로형 콘텐츠 영역
  const BLU_VH   = Math.round(250 * sc)
  const BLU_VX   = Math.round((canvasW - BLU_VW) / 2)
  const BLU_VY   = Math.round((canvasH - BLU_VH) / 2)

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>

      {/* 가로형 콘텐츠 영역 (파란 가로) */}
      <div style={{ position: 'absolute', left: BLU_HX, top: BLU_HY, width: BLU_HW, height: BLU_HH, background: 'rgba(0,30,255,0.15)', border: '1.5px solid rgba(0,30,255,0.5)', boxSizing: 'border-box' }} />

      {/* 세로형 콘텐츠 영역 (파란 세로) */}
      <div style={{ position: 'absolute', left: BLU_VX, top: BLU_VY, width: BLU_VW, height: BLU_VH, background: 'rgba(0,30,255,0.15)', border: '1.5px solid rgba(0,30,255,0.5)', boxSizing: 'border-box' }} />

      {/* 권장 이미지 영역 (빨간) */}
      <div style={{ position: 'absolute', left: RED_X, top: RED_Y, width: RED_W, height: RED_H, background: 'rgba(255,0,0,0.15)', border: '1.5px solid rgba(255,0,0,0.6)', boxSizing: 'border-box', display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
        <span style={{ fontSize: Math.round(9 * sc), fontWeight: 700, color: 'rgba(200,0,0,0.9)', background: 'rgba(255,255,255,0.85)', borderRadius: 3, padding: '1px 5px', marginTop: 4, fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap' }}>권장 이미지 영역 208×208</span>
      </div>

      {/* 라벨 — 가로형 */}
      <div style={{ position: 'absolute', left: BLU_HX, top: BLU_HY + BLU_HH + 3, width: BLU_HW, display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: Math.round(8 * sc), fontWeight: 700, color: 'rgba(0,30,200,0.9)', background: 'rgba(255,255,255,0.85)', borderRadius: 3, padding: '1px 5px', fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap' }}>가로형 250×160</span>
      </div>

      {/* 라벨 — 세로형 */}
      <div style={{ position: 'absolute', left: BLU_VX + BLU_VW + 3, top: BLU_VY, height: BLU_VH, display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: Math.round(8 * sc), fontWeight: 700, color: 'rgba(0,30,200,0.9)', background: 'rgba(255,255,255,0.85)', borderRadius: 3, padding: '1px 5px', fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap' }}>세로형 160×250</span>
      </div>

      {/* 안전마진 점선 4개 */}
      <div style={{ position: 'absolute', left: 0, top: MARGIN, width: canvasW, height: 0, borderTop: '1px dashed rgba(100,100,100,0.7)' }} />
      <div style={{ position: 'absolute', left: 0, bottom: MARGIN, width: canvasW, height: 0, borderTop: '1px dashed rgba(100,100,100,0.7)' }} />
      <div style={{ position: 'absolute', left: MARGIN, top: 0, width: 0, height: canvasH, borderLeft: '1px dashed rgba(100,100,100,0.7)' }} />
      <div style={{ position: 'absolute', right: MARGIN, top: 0, width: 0, height: canvasH, borderLeft: '1px dashed rgba(100,100,100,0.7)' }} />

      {/* 마진 라벨 */}
      <div style={{ position: 'absolute', left: 2, top: MARGIN / 2, transform: 'translateY(-50%)', fontSize: Math.round(7 * sc), fontWeight: 700, color: 'rgba(80,80,80,0.9)', background: 'rgba(255,255,255,0.85)', borderRadius: 3, padding: '1px 4px', fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap' }}>24px</div>
    </div>
  )
})

// 기획전 상단 비주얼 (PC) — 1000×500 — Figma node 6861-2359 기반
// 텍스트 Safe Zone: x=71, y=169, w=445 / 메인 44px Bold 2줄 / 서브 28px Bold 1줄 / gap 24px
const TemplateGuideOverlay = memo(function TemplateGuideOverlay({ canvasW, canvasH }) {
  // Figma 원본 기준: 1000×512
  const sc  = canvasW / 1000
  const ysc = canvasH / 512

  const LEFT_MARGIN = Math.round(71  * sc)
  const TEXT_W      = Math.round(445 * sc)
  const TEXT_Y      = Math.round(169 * ysc)
  const IMG_X       = LEFT_MARGIN + TEXT_W
  const IMG_W       = canvasW - IMG_X

  const MAIN_FS = Math.round(44 * sc)
  const SUB_FS  = Math.round(28 * sc)
  const LH      = 1.3
  const GAP     = Math.round(24 * sc)
  const MAIN_H  = Math.round(MAIN_FS * LH * 2)
  const SUB_H   = Math.round(SUB_FS  * LH)
  const TOTAL_H = MAIN_H + GAP + SUB_H

  const ORANGE = '#F15A24'
  const DARK   = '#D44117'
  const BLUE   = 'rgba(100,90,82,0.82)'

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>
      {/* 좌측 여백 */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: LEFT_MARGIN, height: canvasH, background: `rgba(243,140,92,0.1)`, borderRight: `2px dashed rgba(243,140,92,0.6)` }} />
      <div style={{ position: 'absolute', left: 0, top: 10, width: LEFT_MARGIN, textAlign: 'center', fontSize: 11, fontWeight: 700, color: DARK }}>← {LEFT_MARGIN}px →</div>

      {/* 텍스트 영역 라벨 */}
      <div style={{ position: 'absolute', left: LEFT_MARGIN, top: TEXT_Y - 24, fontSize: 11, fontWeight: 700, color: DARK, background: 'rgba(254,240,232,0.95)', padding: '2px 8px', borderRadius: 4, border: `1px solid ${ORANGE}`, whiteSpace: 'nowrap' }}>
        텍스트 영역 {TEXT_W}px
      </div>

      {/* 텍스트 Safe Zone */}
      <div style={{ position: 'absolute', left: LEFT_MARGIN, top: TEXT_Y, width: TEXT_W, height: TOTAL_H, border: `2px dashed ${ORANGE}`, borderRadius: 4 }}>
        {/* 메인 타이틀 */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: MAIN_H, background: 'rgba(243,140,92,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: DARK, background: 'rgba(255,255,255,0.82)', padding: '2px 8px', borderRadius: 4 }}>메인 타이틀 (44px Bold · 최대 2줄)</span>
        </div>
        {/* gap */}
        <div style={{ position: 'absolute', left: 0, top: MAIN_H, width: '100%', height: GAP, background: 'rgba(243,140,92,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: ORANGE }}>gap {Math.round(24 * sc)}px</span>
        </div>
        {/* 서브 타이틀 */}
        <div style={{ position: 'absolute', left: 0, top: MAIN_H + GAP, width: '100%', height: SUB_H, background: 'rgba(243,140,92,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: DARK, background: 'rgba(255,255,255,0.82)', padding: '2px 8px', borderRadius: 4 }}>서브 타이틀 (28px Bold)</span>
        </div>
      </div>

      {/* 이미지 영역 */}
      <div style={{ position: 'absolute', left: IMG_X, top: 0, width: IMG_W, height: canvasH, border: '3px solid rgba(59,130,246,0.8)', background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <div style={{ background: BLUE, borderRadius: 8, padding: '10px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>메인 오브제 위치 영역</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{IMG_W} × {canvasH}px</span>
        </div>
      </div>
    </div>
  )
})

// e3: 기획전 상단 비주얼 (MO) 750×500 가이드 오버레이 (Figma 6863-2665)
const E3GuideOverlay = memo(function E3GuideOverlay({ canvasW, canvasH }) {
  const sc  = canvasW / 750
  const ysc = canvasH / 500

  const LEFT_MARGIN    = Math.round(54  * sc)
  const TEXT_W         = Math.round(401 * sc)
  const TEXT_Y         = Math.round(138 * ysc)
  const TITLE_FRAME_W  = Math.round(445 * sc)
  const IMG_X          = LEFT_MARGIN + TITLE_FRAME_W
  const IMG_W          = canvasW - IMG_X

  const GAP    = Math.round(24  * ysc)
  const MAIN_H = Math.round(127 * ysc)
  const SUB_H  = Math.round(85  * ysc)
  const TOTAL_H = MAIN_H + GAP + SUB_H

  const ORANGE  = '#F15A24'
  const DARK    = '#D44117'
  const NEUTRAL = 'rgba(100,90,82,0.82)'

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: LEFT_MARGIN, height: canvasH, background: 'rgba(243,140,92,0.1)', borderRight: '2px dashed rgba(243,140,92,0.6)' }} />
      <div style={{ position: 'absolute', left: 0, top: 10, width: LEFT_MARGIN, textAlign: 'center', fontSize: 11, fontWeight: 700, color: DARK }}>← {LEFT_MARGIN}px →</div>
      <div style={{ position: 'absolute', left: LEFT_MARGIN, top: TEXT_Y - 24, fontSize: 11, fontWeight: 700, color: DARK, background: 'rgba(254,240,232,0.95)', padding: '2px 8px', borderRadius: 4, border: `1px solid ${ORANGE}`, whiteSpace: 'nowrap' }}>
        텍스트 영역 {TEXT_W}px
      </div>
      <div style={{ position: 'absolute', left: LEFT_MARGIN, top: TEXT_Y, width: TEXT_W, height: TOTAL_H, border: `2px dashed ${ORANGE}`, borderRadius: 4 }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: MAIN_H, background: 'rgba(243,140,92,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: DARK, background: 'rgba(255,255,255,0.82)', padding: '2px 8px', borderRadius: 4 }}>메인 타이틀 (50px Bold · 최대 2줄)</span>
        </div>
        <div style={{ position: 'absolute', left: 0, top: MAIN_H, width: '100%', height: GAP, background: 'rgba(243,140,92,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: ORANGE }}>gap {GAP}px</span>
        </div>
        <div style={{ position: 'absolute', left: 0, top: MAIN_H + GAP, width: '100%', height: SUB_H, background: 'rgba(243,140,92,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: DARK, background: 'rgba(255,255,255,0.82)', padding: '2px 8px', borderRadius: 4 }}>서브 타이틀 (30px Bold)</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: IMG_X, top: 0, width: IMG_W, height: canvasH, border: '3px solid rgba(100,90,82,0.5)', background: 'rgba(100,90,82,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <div style={{ background: NEUTRAL, borderRadius: 8, padding: '10px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>메인 오브제 위치 영역</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)' }}>{IMG_W} × {canvasH}px</span>
        </div>
      </div>
    </div>
  )
})

// e5: 기획전 MD추천 모듈 1440×1048 가이드 오버레이 (Figma 6436-1073)
const E5GuideOverlay = memo(function E5GuideOverlay({ canvasW, canvasH }) {
  const sc  = canvasW / 1440
  const ysc = canvasH / 1048

  const CARD_X  = Math.round(213 * sc), CARD_Y = Math.round(87 * ysc)
  const CARD_W  = Math.round(474 * sc), CARD_H = Math.round(760 * ysc)
  const BOX_H   = Math.round(114 * ysc)
  const R_X     = Math.round(756 * sc), R_Y = Math.round(87 * ysc), R_W = Math.round(533 * sc)
  const LIST_Y  = Math.round(306 * ysc)
  const LIST_H  = Math.round(Math.max(1, 1 * ysc))
  const THUMB_W = Math.round(106 * sc), THUMB_H = Math.round(106 * ysc)
  const ROW_GAP = Math.round(136 * ysc) // 106 + 15 + 15
  const LINE_YS = [Math.round(427*ysc), Math.round(563*ysc), Math.round(699*ysc), Math.round(835*ysc)]

  const ORANGE = '#F15A24'
  const DARK   = '#D44117'
  const BLUE   = 'rgba(60,100,180,0.7)'

  const label = (txt, x, y, extra = {}) => (
    <div style={{ position: 'absolute', left: x, top: y, fontSize: 11, fontWeight: 700, color: '#fff', background: DARK, padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', zIndex: 2, ...extra }}>{txt}</div>
  )

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>
      {/* 좌측 메인 이미지 슬롯 */}
      <div style={{ position: 'absolute', left: CARD_X, top: CARD_Y, width: CARD_W, height: CARD_H, border: `2px dashed ${ORANGE}`, background: 'rgba(243,140,92,0.08)' }}>
        {label(`메인 이미지 슬롯 ${Math.round(474*sc)}×${CARD_H}px`, 4, 4)}
      </div>
      {/* 카드 텍스트 박스 */}
      <div style={{ position: 'absolute', left: CARD_X, top: CARD_Y + CARD_H, width: CARD_W, height: BOX_H, border: `1.5px dashed rgba(243,140,92,0.7)`, background: 'rgba(255,255,255,0.06)' }}>
        {label('상품 카드 텍스트', 4, 2)}
      </div>
      {/* 우측 타이틀 영역 */}
      <div style={{ position: 'absolute', left: R_X, top: R_Y, width: R_W, height: Math.round(200*ysc), border: `2px dashed ${BLUE}`, background: 'rgba(60,100,180,0.06)' }}>
        {label('타이틀 영역', 4, 4, { background: BLUE })}
      </div>
      {/* 우측 상품 리스트 */}
      <div style={{ position: 'absolute', left: R_X, top: LIST_Y, width: R_W, height: canvasH - LIST_Y - Math.round(24*ysc), border: `1.5px dashed ${BLUE}`, background: 'rgba(60,100,180,0.04)' }}>
        {label('상품 리스트 (5개)', 4, 4, { background: BLUE })}
      </div>
      {/* 썸네일 슬롯 표시 */}
      {[0,1,2,3,4].map(i => {
        const ty = Math.round(306*ysc) + i * ROW_GAP
        return (
          <div key={i} style={{ position: 'absolute', left: R_X, top: ty, width: THUMB_W, height: THUMB_H, border: `1.5px dashed ${ORANGE}`, background: 'rgba(243,140,92,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: DARK }}>{i+1}</span>
          </div>
        )
      })}
      {/* 구분선 위치 */}
      {LINE_YS.map((ly, i) => (
        <div key={i} style={{ position: 'absolute', left: R_X, top: ly, width: R_W, height: Math.max(1, LIST_H), background: 'rgba(212,212,212,0.9)', borderTop: '1px dashed rgba(100,100,100,0.5)' }} />
      ))}
      {/* 치수 레이블 */}
      <div style={{ position: 'absolute', left: CARD_X, top: CARD_Y - 20, fontSize: 11, fontWeight: 700, color: ORANGE, background: 'rgba(254,240,232,0.95)', padding: '1px 6px', borderRadius: 4, border: `1px solid ${ORANGE}` }}>
        좌 카드: x={213}, y={87}, {474}×{760}
      </div>
      <div style={{ position: 'absolute', left: R_X, top: R_Y - 20, fontSize: 11, fontWeight: 700, color: '#3c64b4', background: 'rgba(232,238,254,0.95)', padding: '1px 6px', borderRadius: 4, border: '1px solid #3c64b4' }}>
        우 섹션: x={756}, w={533}
      </div>
    </div>
  )
})

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
      <div style={{ position: 'absolute', left: gx, top: gy, width: gw, height: gh, boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)', border: '2px dashed #F9A94D', borderRadius: 2, background: 'transparent' }} />
      {isSymbol ? (
        <div style={{ position: 'absolute', left: gx + gw / 2, top: gy + 5, transform: 'translateX(-50%)', fontSize: 11, fontWeight: 700, color: '#F9A94D', background: 'rgba(0,0,0,0.65)', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>{label}</div>
      ) : (
        <div style={{ position: 'absolute', left: gx, top: gy + gh + 5, fontSize: 11, fontWeight: 700, color: '#F9A94D', background: 'rgba(0,0,0,0.65)', padding: '2px 7px', borderRadius: 4, whiteSpace: 'nowrap' }}>{label}</div>
      )}
      <div onClick={onClose} style={{ position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 6, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', pointerEvents: 'all', color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✕</div>
    </div>
  )
}

export default function ImageWorkflow({ selectedTemplateIds, allTemplates, onBack, onGoHome, toggleTemplate }) {
  const isNoImageTemplate = selectedTemplateIds.every(id => id === 'b10' || id === 'e5')
  const [step, setStep] = useState(() => isNoImageTemplate ? STEP_EDITOR : STEP_IMAGE)
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
  const [selectedLayerIds, setSelectedLayerIds] = useState(() => new Set())
  const selectedLayerIdsRef = useRef(new Set())
  const [dlFormat, setDlFormat] = useState('PNG')
  const [dlScale, setDlScale] = useState('x1')
  const [linkInfoModalSlotId, setLinkInfoModalSlotId] = useState(null)
  const [linkInputModalSlotId, setLinkInputModalSlotId] = useState(null)
  const [linkInputValue, setLinkInputValue] = useState('')
  const [dragLayerId, setDragLayerId] = useState(null)
  const [dragOverLayerId, setDragOverLayerId] = useState(null)
  const [hoverLayerId, setHoverLayerId] = useState(null)
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
  const [b6GuideMode, setB6GuideMode] = useState(null) // null | 'layout' | 'text'
  const [b3WithPreview, setB3WithPreview] = useState(false)
  const [b6PreviewText, setB6PreviewText] = useState({ main: '메인 카피를 입력하세요', sub: '서브 카피를 입력하세요', color: '#1E2023' })
  const [b7PreviewColor, setB7PreviewColor] = useState('#1E2023')
  // 다국어 복사본: [{ id: 'b4-en', name: 'PC 와이드 대배너 (English)', size: '1440×480', lang: 'English' }, ...]
  const [langCopies, setLangCopies] = useState([])
  // 로고 쌍: b8 선택 시 black/white 자동 생성
  const [logoPairs, setLogoPairs] = useState([])
  const [langSuggestions, setLangSuggestions] = useState({}) // { [langId]: [{ layerId, original, suggestions: [str] }] }
  const [guideTextColor, setGuideTextColor] = useState('#1E2023')
  const [customHeights, setCustomHeights] = useState({}) // { [templateId]: number } — heightResizable 템플릿 전용
  const [showFrameSizePopover, setShowFrameSizePopover] = useState(false)
  const [frameHInput, setFrameHInput] = useState('')
  const [cropLayerId, setCropLayerId] = useState(null)
  const [cropTemp, setCropTemp] = useState(null) // { cropX, cropY, cropScale }
  const applyCropRef = useRef(null)
  const cancelCropRef = useRef(null)
  const cropLayerRef = useRef(null)  // { x, y, width, height } — crop 중인 레이어 bounds
  const slotUploadInputRef = useRef(null) // isUploadSlot 레이어 파일 선택용
  const [pendingSlotLayerId, setPendingSlotLayerId] = useState(null)
  const [hoveredSlotLayerId, setHoveredSlotLayerId] = useState(null)
  const cropTempRef = useRef(null)
  const scaleRef = useRef(1)
  const canvasAreaRef = useRef(null)


  useEffect(() => {
    setShowGuide(false)
    setB6GuideMode(null)
  }, [activePreviewTab])

  useEffect(() => {
    // b8가 선택 해제되면 로고 쌍 초기화
    if (!selectedTemplateIds.includes('b8') && logoPairs.length > 0) {
      setLogoPairs([])
    }
    const validIds = new Set([...selectedTemplateIds, ...langCopies.map(lc => lc.id), ...logoPairs.map(lp => lp.id)])
    setDlSelectedIds((prev) => {
      const next = new Set(prev)
      for (const id of next) { if (!validIds.has(id)) next.delete(id) }
      return next
    })
  }, [selectedTemplateIds.join(','), langCopies.map(lc => lc.id).join(','), logoPairs.map(lp => lp.id).join(',')])

  // selectedLayerIds ref 동기화
  useEffect(() => { selectedLayerIdsRef.current = selectedLayerIds }, [selectedLayerIds])

  // selectedLayerId 변경 시 selectedLayerIds 동기화
  useEffect(() => {
    if (selectedLayerId === null) {
      setSelectedLayerIds(new Set())
    } else {
      setSelectedLayerIds(prev => prev.has(selectedLayerId) ? prev : new Set([selectedLayerId]))
    }
  }, [selectedLayerId])

  // isNoImageTemplate(e5, b10)은 이미지 업로드 단계가 없으므로 에디터 진입 시 다운로드 선택 목록에 자동 추가
  useEffect(() => {
    if (isNoImageTemplate) {
      setDlSelectedIds(new Set(selectedTemplateIds))
    }
  }, [isNoImageTemplate, selectedTemplateIds.join(',')])

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
  const [canvasW, _baseCanvasH] = currentTemplate?.size?.split('\u00d7').map(Number) || [750, 750]
  const isHeightResizable = !!currentTemplate?.heightResizable
  const canvasH = (isHeightResizable && customHeights[currentTemplateId]) ? customHeights[currentTemplateId] : _baseCanvasH
  const scale = zoom / 100
  const isLogoTab = !!currentTemplate?.logoPair // b8-black / b8-white 탭 여부
  const LOGO_MARGIN = 20
  const hasLogoSelected = logoPairs.some(lp => dlSelectedIds.has(lp.id))
  const dlEffectiveFmt = hasLogoSelected ? 'PNG' : dlFormat

  const layers = allLayers[currentTemplateId] || []
  const selectedLayer = layers.find((l) => l.id === selectedLayerId)
  const bgLayer = layers.find(l => l.id === 'background')
  const bgColor = bgLayer?.color || allBgColors[currentTemplateId] || '#ffffff'
  const isB2Template = currentTemplateId === 'b2' || langCopies.find(lc => lc.id === currentTemplateId)?.baseId === 'b2'
  const isB1Template = currentTemplateId === 'b1' || langCopies.find(lc => lc.id === currentTemplateId)?.baseId === 'b1'
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
    const [w, _hBase] = tmpl.size.split('\u00d7').map(Number)
    const h = (tmpl.heightResizable && customHeights[templateId]) ? customHeights[templateId] : _hBase
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
      if (layer.isReference) continue  // 예시 이미지는 export 제외
      if (layer.visible === false) continue
      ctx.save()
      if (layer.opacity !== undefined) ctx.globalAlpha = layer.opacity
      const cx = (layer.x + layer.width / 2) * multiplier
      const cy = (layer.y + layer.height / 2) * multiplier
      ctx.translate(cx, cy)
      ctx.rotate(((layer.rotation || 0) * Math.PI) / 180)
      if (layer.type === 'image') {
        if (!layer.src) { ctx.restore(); continue }
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
            } else if (layer.objectFit === 'cover' && !layer.cropOrigW) {
              // objectFit cover — crop data 없을 때: 이미지를 슬롯에 꽉 채워 중앙 크롭
              const scale = Math.max(lw / img.naturalWidth, lh / img.naturalHeight)
              const iW = img.naturalWidth * scale, iH = img.naturalHeight * scale
              const br = (layer.borderRadius || 0) * multiplier
              ctx.save()
              ctx.beginPath()
              if (br > 0 && ctx.roundRect) { ctx.roundRect(-lw / 2, -lh / 2, lw, lh, br) } else { ctx.rect(-lw / 2, -lh / 2, lw, lh) }
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
              if (logoPairInfo) {
                ctx.globalCompositeOperation = 'source-atop'
                ctx.fillStyle = logoPairInfo.variant === 'black' ? '#000000' : '#ffffff'
                ctx.fillRect(-lw / 2, -lh / 2, lw, lh)
                ctx.globalCompositeOperation = 'source-over'
              }
              ctx.restore()
            }
            resolve()
          }
          img.onerror = resolve
          img.src = layer.src
        })
      } else if (layer.type === 'text') {
        const fontSize = (layer.fontSize || 24) * multiplier
        const fontWeight = layer.fontWeight || (layer.bold ? '700' : '400')
        const lineH = fontSize * (layer.lineHeight || 1.4)
        const boxW = layer.width * multiplier
        const boxH = layer.height * multiplier
        // 배경색 (뱃지 등)
        if (layer.bgColor) {
          ctx.fillStyle = layer.bgColor
          const r = (layer.borderRadius || 0) * multiplier
          if (r > 0 && ctx.roundRect) {
            ctx.beginPath(); ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, r); ctx.fill()
          } else {
            ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH)
          }
        }
        ctx.font = `${fontWeight} ${fontSize}px ${layer.fontFamily || 'Pretendard'}`
        ctx.fillStyle = layer.color || '#000000'
        // textBaseline='top': CSS half-leading과 동일하게 글자 상단을 기준으로 배치
        ctx.textBaseline = 'top'
        // letterSpacing: 네이티브 Canvas API 사용 (Chrome 99+, Safari 16.4+)
        if ('letterSpacing' in ctx) ctx.letterSpacing = `${(layer.letterSpacing || 0) * multiplier}px`
        const align = layer.align || 'left'
        ctx.textAlign = align
        // textAlign 기준점: left=박스 왼쪽, center=중앙, right=오른쪽
        const drawX = align === 'center' ? 0 : align === 'right' ? boxW / 2 : -boxW / 2
        const lines = (layer.text || '').split('\n')
        // halfLeading: CSS line-height에서 상하에 균등 분배되는 여백 (절반)
        const halfLeading = Math.max(0, (lineH - fontSize) / 2)
        // verticalCenter: 텍스트 블록을 레이어 세로 중앙에 배치
        //   블록 총 높이 = n*lineH, 첫 줄 top = -n*lineH/2 + halfLeading → 블록 시각 중심 = 0
        // 일반: CSS처럼 박스 상단에서 halfLeading 내려서 시작
        const startY = layer.verticalCenter ? -(lines.length * lineH) / 2 + halfLeading : -boxH / 2 + halfLeading
        lines.forEach((line, li) => {
          ctx.fillText(line, drawX, startY + li * lineH)
        })
      } else if (layer.type === 'gradient') {
        const bgC = bgLayerColor === 'transparent' ? '#ffffff' : bgLayerColor
        const [rr, gg, bb] = hexToRgb(bgC)
        const gW = layer.width * multiplier
        const gH = layer.height * multiplier
        const isLeft = layer.direction === 'to-left'
        const grad = ctx.createLinearGradient(isLeft ? gW / 2 : -gW / 2, 0, isLeft ? -gW / 2 : gW / 2, 0)
        grad.addColorStop(0, `rgba(${rr},${gg},${bb},1)`)
        grad.addColorStop(0.5, `rgba(${rr},${gg},${bb},1)`)
        grad.addColorStop(1, `rgba(${rr},${gg},${bb},0)`)
        ctx.fillStyle = grad
        ctx.fillRect(-gW / 2, -gH / 2, gW, gH)
      } else if (layer.type === 'rect') {
        const rW = layer.width * multiplier
        const rH = layer.height * multiplier
        ctx.fillStyle = layer.color || '#000000'
        const r = (layer.borderRadius || 0) * multiplier
        if (r > 0 && ctx.roundRect) {
          ctx.beginPath(); ctx.roundRect(-rW / 2, -rH / 2, rW, rH, r); ctx.fill()
        } else {
          ctx.fillRect(-rW / 2, -rH / 2, rW, rH)
        }
      } else if (layer.type === 'shape') {
        const rW = layer.width * multiplier
        const rH = layer.height * multiplier
        const sw = (layer.strokeWidth || 3) * multiplier
        const pts = layer.points || (layer.shapeType === 'star' ? 5 : 6)
        const ir = layer.innerRadius ?? 0.4
        ctx.fillStyle = layer.color || '#374151'
        ctx.strokeStyle = layer.color || '#374151'
        ctx.lineWidth = sw
        ctx.lineCap = 'round'
        if (layer.shapeType === 'ellipse') {
          ctx.beginPath(); ctx.ellipse(0, 0, rW / 2, rH / 2, 0, 0, Math.PI * 2); ctx.fill()
        } else if (layer.shapeType === 'line' || layer.shapeType === 'arrow') {
          const pad = layer.shapeType === 'arrow' ? sw * 3 : 0
          const x1 = -rW / 2 + (layer.arrowStart ? pad : 0)
          const x2 =  rW / 2 - (layer.arrowEnd  ? pad : 0)
          ctx.beginPath(); ctx.moveTo(x1, 0); ctx.lineTo(x2, 0); ctx.stroke()
          const drawHead = (cx) => {
            const sign = cx > 0 ? 1 : -1
            ctx.beginPath()
            ctx.moveTo(cx, 0)
            ctx.lineTo(cx - sign * sw * 3, -sw * 2)
            ctx.lineTo(cx - sign * sw * 3,  sw * 2)
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
            const a = (i * Math.PI / pts) - Math.PI / 2
            const r2 = i % 2 === 0 ? 1 : ir
            const x = rW / 2 * r2 * Math.cos(a), y = rH / 2 * r2 * Math.sin(a)
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
          }
          ctx.closePath(); ctx.fill()
        }
      }
      ctx.restore()
    }
    // b2 X 닫기 아이콘 렌더링 (피그마 5950:16267 기준)
    if (templateId === 'b2') {
      const sc = multiplier * (w / 1536)
      const iconSize = B2_CLOSE_SIZE * sc
      const cx = B2_CLOSE_CX * (w / 1536) * multiplier
      const cy = B2_CLOSE_CY * (h / 140) * multiplier
      ctx.save()
      ctx.translate(cx, cy)
      ctx.scale(iconSize / 12, iconSize / 12)
      ctx.translate(-6, -6)
      ctx.fillStyle = 'white'
      ctx.fill(new Path2D(B2_CLOSE_ICON_PATH))
      ctx.restore()
    }
    return canvas
  }

  const drawB3PreviewOverlay = (ctx, cw, ch) => {
    const sc = cw / 375
    const PB = Math.round(32 * sc), PX = Math.round(24 * sc)
    const FS_MAIN = Math.round(28 * sc), FS_FLAG = Math.round(12 * sc)
    const FLAG_PX = Math.round(6 * sc), FLAG_PY = Math.round(4 * sc)
    const FLAG_R = Math.round(4 * sc), FLAG_GAP = Math.round(4 * sc)
    const TXT_GAP = Math.round(8 * sc), LH = 1.3
    const IND_H = Math.round(28 * sc), IND_PX = Math.round(10 * sc)
    const IND_GAP = Math.round(8 * sc), IND_R = Math.round(56 * sc)
    const IND_RIGHT = Math.round(12 * sc), IND_TOP = Math.round(12 * sc)
    const IC = Math.round(10 * sc)

    const mainText  = document.getElementById('b3-preview-main')?.innerText  || '메인 카피를\n입력하세요'
    const flag1Text = document.getElementById('b3-preview-flag1')?.innerText || '사은품'
    const flag2Text = document.getElementById('b3-preview-flag2')?.innerText || '기간 한정'

    // 하단 그라디언트
    const gradH = Math.round(ch * 0.32)
    const grad = ctx.createLinearGradient(0, ch - gradH, 0, ch)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(1, 'rgba(0,0,0,0.7)')
    ctx.fillStyle = grad
    ctx.fillRect(0, ch - gradH, cw, gradH)

    // dim
    ctx.fillStyle = 'rgba(0,0,0,0.02)'
    ctx.fillRect(0, 0, cw, ch)

    // 플래그 그리기 헬퍼
    const drawFlag = (text, bg, x, y) => {
      ctx.font = `700 ${FS_FLAG}px Pretendard, sans-serif`
      const tw = ctx.measureText(text).width
      const bw = tw + FLAG_PX * 2
      const bh = Math.round(FS_FLAG * LH) + FLAG_PY * 2
      ctx.fillStyle = bg
      ctx.beginPath(); ctx.roundRect(x, y, bw, bh, FLAG_R); ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, x + FLAG_PX, y + bh / 2)
      return bw
    }

    // 메인 텍스트 높이 계산
    const mainLines = mainText.split('\n').slice(0, 2)
    const lineH = Math.round(FS_MAIN * LH)
    const mainH = mainLines.length * lineH
    const flagH = Math.round(FS_FLAG * LH) + FLAG_PY * 2

    // 플래그 (텍스트 위, bottom 기준)
    const flagTop = ch - PB - mainH - TXT_GAP - flagH
    let fx = PX
    fx += drawFlag(flag1Text, '#4D6EE4', fx, flagTop) + FLAG_GAP
    drawFlag(flag2Text, '#FE324B', fx, flagTop)

    // 메인 텍스트
    ctx.font = `700 ${FS_MAIN}px Pretendard, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.textBaseline = 'top'
    mainLines.forEach((line, i) => ctx.fillText(line, PX, ch - PB - mainH + i * lineH))

    // 인디케이터
    const IND_FS = Math.round(13 * sc)
    ctx.font = `500 ${IND_FS}px Pretendard, sans-serif`
    const numW = ctx.measureText('1 / 3').width
    const pauseW = Math.round(IC * 0.75)
    const vecW = IC
    const indW = IND_PX * 2 + pauseW + IND_GAP + numW + IND_GAP + vecW
    const indX = cw - IND_RIGHT - indW

    ctx.fillStyle = 'rgba(30,32,35,0.5)'
    ctx.beginPath(); ctx.roundRect(indX, IND_TOP, indW, IND_H, IND_R); ctx.fill()

    // 일시정지 아이콘
    const pX = indX + IND_PX, pY = IND_TOP + (IND_H - IC) / 2
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(pX, pY, Math.round(2.5 * sc), IC)
    ctx.fillRect(pX + Math.round(5.5 * sc), pY, Math.round(2.5 * sc), IC)

    // "1 / 3" 텍스트
    ctx.font = `500 ${IND_FS}px Pretendard, sans-serif`
    ctx.textBaseline = 'middle'
    ctx.fillText('1 / 3', pX + pauseW + IND_GAP, IND_TOP + IND_H / 2)

    // Vector 아이콘 (두 겹 사각형)
    const vX = indX + indW - IND_PX - vecW, vY = IND_TOP + (IND_H - IC) / 2
    const vS = IC * 0.6875, vR = Math.max(1, Math.round(0.625 * sc))
    ctx.fillStyle = '#ffffff'
    ctx.beginPath(); ctx.roundRect(vX, vY, vS, vS, vR); ctx.fill()
    ctx.beginPath(); ctx.roundRect(vX + IC * 0.25, vY + IC * 0.25, vS, vS, vR); ctx.fill()
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
      if (b3WithPreview && templateId === 'b3') {
        drawB3PreviewOverlay(canvas.getContext('2d'), canvas.width, canvas.height)
      }
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
        if (b3WithPreview && tmpl.id === 'b3') {
          drawB3PreviewOverlay(canvas.getContext('2d'), canvas.width, canvas.height)
        }
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

  const handleDownloadImageMap = async () => {
    const linkLayers = layers.filter(l => l.linkUrl)
    if (linkLayers.length === 0) {
      alert('링크가 설정된 영역이 없습니다.')
      return
    }
    const invalidLinks = linkLayers.filter(l => !l.linkUrl.startsWith('http://') && !l.linkUrl.startsWith('https://'))
    if (invalidLinks.length > 0) {
      alert('유효하지 않은 링크가 있습니다. 링크 URL은 http:// 또는 https://로 시작해야 합니다.')
      return
    }
    // Pretendard 등 웹폰트 로드 완료 보장 — 폰트 미로드 시 fallback 폰트로 텍스트가 어긋나는 문제 방지
    await document.fonts.ready
    // 디버그 로그: export 직전 좌표 확인
    const _mainImgLayer = layers.find(l => l.id === 'e5-main-image')
    const _bgLayer = layers.find(l => l.id === 'e5-bg-texture')
    console.log('[e5 HTML export] debug', {
      exportWidth: canvasW,
      exportHeight: canvasH,
      currentZoom: zoom,
      linkedLayerCoords: linkLayers.map(l => ({ id: l.id, x: l.x, y: l.y, w: l.width, h: l.height, url: l.linkUrl })),
      mainImageLayer: _mainImgLayer ? { x: _mainImgLayer.x, y: _mainImgLayer.y, w: _mainImgLayer.width, h: _mainImgLayer.height, hasCrop: !!_mainImgLayer.cropOrigW } : null,
      backgroundLayer: _bgLayer ? { x: _bgLayer.x, y: _bgLayer.y, w: _bgLayer.width, h: _bgLayer.height } : null,
    })
    const canvas = await renderToCanvas(currentTemplateId, 1)
    if (!canvas) return
    console.log('[e5 HTML export] canvas size', { width: canvas.width, height: canvas.height })
    const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    const imgH = canvas.height
    const halfW = Math.round(canvasW / 2)
    const areas = linkLayers.map(l => {
      const x1 = Math.round(l.x), y1 = Math.round(l.y)
      const x2 = Math.round(l.x + l.width), y2 = Math.round(l.y + l.height)
      return `    <area shape="rect" coords="${x1},${y1},${x2},${y2}" href="${l.linkUrl}" alt="${l.name || ''}" />`
    }).join('\n')
    const htmlString = [
      `<div style="width:100%; position:relative; overflow:visible; text-align:left;">`,
      `  <div style="position:relative; left:50%; margin-left:-${halfW}px; width:${canvasW}px; height:${imgH}px;">`,
      `    <img src="./md-recommend-module.png" usemap="#md-recommend-map" width="${canvasW}" height="${imgH}" alt="기획전 MD추천 모듈" style="display:block; width:${canvasW}px; height:${imgH}px; border:0; margin:0; padding:0;" />`,
      `    <map name="md-recommend-map" id="md-recommend-map">`,
      areas,
      `    </map>`,
      `  </div>`,
      `</div>`,
    ].join('\n')
    const zip = new JSZip()
    zip.file('md-recommend-module.png', pngBlob)
    zip.file('index.html', htmlString)
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.download = 'md-recommend-module.zip'
    link.href = URL.createObjectURL(zipBlob)
    link.click()
    URL.revokeObjectURL(link.href)
    setTimeout(() => alert('ZIP 안의 md-recommend-module.png를 사내몰 이미지 서버에 업로드한 뒤, index.html의 img src 경로를 업로드된 이미지 URL로 변경해 사용하세요.'), 300)
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
    console.log('[init effect] step:', step, 'templates:', selectedTemplateDetails.map(t => t.id), 'uploadedUrl:', uploadedImage?.url?.slice(0,40))
    if (step !== STEP_EDITOR) return
    // 이미지 불필요 템플릿(b10) 전용 초기화
    if (isNoImageTemplate) {
      const initAllLayers = {}
      const initAllHistory = {}
      selectedTemplateDetails.forEach((tmpl) => {
        const [w, h] = tmpl.size.split('×').map(Number)
        const bgLayer = { id: 'background', type: 'background', color: '#ffffff', x: 0, y: 0, width: w, height: h, rotation: 0 }
        const noImgLayers = tmpl.id === 'e5' ? (() => {
          // e5: 기획전 MD추천 모듈 — Figma 6436-1073 개별 레이어
          // 배경 텍스처 이미지 (최하단, export 포함)
          const bgTex = { id: 'e5-bg-texture', name: 'Figma 배경 텍스처', type: 'image', src: '/assets/templates/e5/bg-texture.png', objectFit: 'cover', x: 0, y: 0, width: 1440, height: 1048, rotation: 0 }
          // 좌측 메인 이미지 — 기본 Figma 예시 이미지 + 클릭 시 교체 가능
          const mainImg  = { id: 'e5-main-image', name: '메인 상품 이미지', type: 'image', isUploadSlot: true, src: '/assets/templates/e5/main-image.png', objectFit: 'cover', x: 213, y: 87, width: 474, height: 760, borderRadius: 10, rotation: 0 }
          // 좌측 카드 텍스트
          const cardBox  = { id: 'e5-card-box', name: '카드 텍스트 박스', type: 'rect', color: 'rgba(255,255,255,0.8)', x: 213, y: 847, width: 474, height: 114, borderRadius: 10, rotation: 0 }
          const mdsStory = { id: 'e5-mds-story', name: "MD's STORY", type: 'text', text: "MD's STORY", x: 249, y: 876, width: 418, height: 26, fontSize: 22, fontWeight: '700', color: 'rgba(68,68,68,0.5)', fontFamily: 'Pretendard', align: 'left', letterSpacing: -0.44, lineHeight: 1.2, rotation: 0 }
          const quote    = { id: 'e5-quote', name: '카드 카피', type: 'text', text: '"상큼한 봄, 한 겹의 향을 더하는 데 집중"', x: 249, y: 904, width: 418, height: 30, fontSize: 22, fontWeight: '700', color: '#222222', fontFamily: 'Pretendard', align: 'center', letterSpacing: 0, lineHeight: 1.2, rotation: 0 }
          // 우측 타이틀·설명
          const title1   = { id: 'e5-title-1', name: '메인 타이틀 1', type: 'text', text: 'MD가 직접 고른', x: 756, y: 87, width: 533, height: 43, fontSize: 33, fontWeight: '600', color: '#000000', fontFamily: 'Pretendard', align: 'left', letterSpacing: -0.66, lineHeight: 1.3, rotation: 0 }
          const title2   = { id: 'e5-title-2', name: '메인 타이틀 2', type: 'text', text: '나의 봄 향수', x: 756, y: 132, width: 533, height: 59, fontSize: 45, fontWeight: '800', color: '#FF5E4F', fontFamily: 'Pretendard', align: 'left', letterSpacing: -0.9, lineHeight: 1.3, rotation: 0 }
          const subtitle = { id: 'e5-subtitle', name: '서브 타이틀', type: 'text', text: '12년차 뷰티 MD가 봄철 환절기에 직접 써본 후 골라낸 향수.\n제품 설명서가 아니라, 사용기에 가까운 리스트입니다.', x: 756, y: 209, width: 533, height: 84, fontSize: 20, fontWeight: '400', color: '#000000', fontFamily: 'Pretendard', align: 'left', letterSpacing: -0.4, lineHeight: 1.42, opacity: 0.8, rotation: 0 }
          // 상품 리스트 (5개, y: 306/442/578/714/850) — 썸네일은 투명 upload slot
          const productRows = [306, 442, 578, 714, 850].flatMap((iy, i) => {
            const n = i + 1
            return [
              { id: `e5-thumb-${n}`, name: `상품 썸네일 ${n}`, type: 'image', isUploadSlot: true, src: '/assets/templates/e5/thumb.png', objectFit: 'cover', x: 756, y: iy, width: 106, height: 106, borderRadius: 10, rotation: 0 },
              { id: `e5-pname-${n}`, name: `상품명 ${n}`, type: 'text', text: '워터뱅크 블루\n하이알루로닉 크림 50ml', x: 888, y: iy, width: 379, height: 59, fontSize: 21, fontWeight: '700', color: '#000000', fontFamily: 'Pretendard', align: 'left', letterSpacing: -0.42, lineHeight: 1.4, opacity: 0.8, rotation: 0 },
              { id: `e5-pdesc-${n}`, name: `상품 설명 ${n}`, type: 'text', text: '12년차 뷰티 MD가 봄철 환절기에 직접 써본', x: 888, y: iy + 76, width: 379, height: 29, fontSize: 20, fontWeight: '400', color: '#000000', fontFamily: 'Pretendard', align: 'left', letterSpacing: -0.4, lineHeight: 1.42, opacity: 0.8, rotation: 0 },
              ...(n < 5 ? [{ id: `e5-line-${n}`, name: `구분선 ${n}`, type: 'rect', color: '#D4D4D4', x: 756, y: iy + 121, width: 511, height: 1, rotation: 0 }] : []),
            ]
          })
          return [bgTex, mainImg, cardBox, mdsStory, quote, title1, title2, subtitle, ...productRows]
        })() : tmpl.id === 'b10' ? (() => {
          // Figma 1148:315 기준 (750×559)
          return [
            { id: 'b10-gray-box', type: 'rect', color: '#F3F3F3', borderRadius: 20, x: 36, y: 193, width: 678, height: 263, rotation: 0 },
            { id: 'b10-badge-box', type: 'rect', color: '#1E2023', borderRadius: 8, x: 304, y: 55, width: 142, height: 43, rotation: 0 },
            { id: 'b10-badge', type: 'text', text: '서비스 공지', x: 320, y: 62, width: 110, height: 29, fontSize: 24, fontWeight: '800', color: '#ffffff', fontFamily: 'Pretendard', align: 'center', letterSpacing: 0, lineHeight: 1.2 },
            { id: 'b10-title', type: 'text', text: '인도장 혼잡 예상 안내', x: 51, y: 111, width: 648, height: 53, fontSize: 44, fontWeight: '800', color: '#1E2023', fontFamily: 'Pretendard', align: 'center', letterSpacing: 0, lineHeight: 1.2 },
            { id: 'b10-body', type: 'text', text: '성수기 연휴로 인도장 혼잡이 예상되오니\n상품 수령에 불편함이 없으시도록 출국 3시간전\n공항에 방문 해 주시기 바랍니다.', x: 111, y: 226, width: 529, height: 132, fontSize: 29, fontWeight: '700', color: '#1E2023', fontFamily: 'Pretendard', align: 'center', letterSpacing: 0, lineHeight: 44 / 29 },
            { id: 'b10-sub', type: 'text', text: '신세계면세점과 편안하고 즐거운 여행 되세요.', x: 36, y: 390, width: 678, height: 33, fontSize: 22, fontWeight: '500', color: '#1E2023', fontFamily: 'Pretendard', align: 'center', letterSpacing: 0, lineHeight: 1.5 },
            { id: 'b10-contact', type: 'text', text: '문의 사항 안내  ☎ 고객센터 1661-8778', x: 0, y: 485, width: 750, height: 26, fontSize: 22, fontWeight: '500', color: '#373A3C', fontFamily: 'Pretendard', align: 'center', letterSpacing: 0, lineHeight: 1.2 },
          ]
        })() : []
        const init = [bgLayer, ...noImgLayers]
        initAllLayers[tmpl.id] = init
        initAllHistory[tmpl.id] = { history: [JSON.parse(JSON.stringify(init))], index: 0 }
      })
      // b10 전용: 영문(en) + 중문(zh) 탭 자동 생성, 국문(tab 0) 기본 활성화
      const b10Tmpl = selectedTemplateDetails.find(t => t.id === 'b10')
      if (b10Tmpl && initAllLayers['b10']) {
        const base = initAllLayers['b10']

        // ── 영문(en) ──────────────────────────────────────────
        const enTexts = {
          'b10-badge':   'Notice',
          'b10-title':   'Expected Congestion\nat the Airport Pickup Desk',
          'b10-body':    'Due to peak season holidays,\ncongestion is expected at the pickup desk.\nTo avoid any inconvenience,\nplease arrive at the airport\nat least 3 hours before departure.',
          'b10-sub':     'Wishing you a pleasant journey with Shinsegae Duty Free.',
          'b10-contact': 'For inquiries: Customer Service  ☎ 1661-8778',
        }
        const enCoords = {
          'b10-gray-box':  { x: 36, y: 193, width: 678, height: 292 },
          'b10-badge-box': { x: 304, y: 33, width: 142, height: 43 },
          'b10-badge':     { x: 320, y: 40, width: 110, height: 29 },
          'b10-title':     { x: 36, y: 88, width: 678, height: 98, fontSize: 38, lineHeight: 1.25 },
          'b10-body':      { x: 51, y: 213, width: 648, height: 195, fontSize: 23, fontWeight: '600', lineHeight: 1.6 },
          'b10-sub':       { x: 36, y: 423, width: 678, height: 26, fontSize: 20 },
          'b10-contact':   { x: 0, y: 507, width: 750, height: 26, fontSize: 20 },
        }
        const b10EnId = 'b10-lang-en'
        const b10EnLayers = base.map(l => {
          const coord = enCoords[l.id] || {}
          if (l.type === 'text' && enTexts[l.id]) return { ...l, text: enTexts[l.id], ...coord }
          if (Object.keys(coord).length > 0) return { ...l, ...coord }
          return l
        })
        initAllLayers[b10EnId] = b10EnLayers
        initAllHistory[b10EnId] = { history: [JSON.parse(JSON.stringify(b10EnLayers))], index: 0 }
        const enCopy = { lang: 'English', id: b10EnId, name: `${b10Tmpl.name} (English)`, size: b10Tmpl.size, baseId: 'b10' }
        const enSuggestions = base.filter(l => l.type === 'text').map(l => ({
          layerId: l.id, original: l.text, suggestions: [enTexts[l.id], l.text].filter(Boolean),
        }))

        // ── 중문(zh) ──────────────────────────────────────────
        const zhTexts = {
          'b10-badge':   '公告事项',
          'b10-title':   '提货处繁忙通知',
          'b10-body':    '因旺季假期影响，预计提货处将出现繁忙情况。\n为避免影响您的提货，\n请您务必于出境前至少提前3小时抵达机场。',
          'b10-sub':     '感谢您选择新世界免税店，祝您旅途愉快！',
          'b10-contact': '如有疑问，请联系客户中心  ☎ 400-842-8868',
        }
        const zhCoords = {
          'b10-body': { x: 72, y: 228, width: 605, height: 132 },
        }
        const b10ZhId = 'b10-lang-zh'
        const b10ZhLayers = base.map(l =>
          l.type === 'text' && zhTexts[l.id]
            ? { ...l, text: zhTexts[l.id], ...(zhCoords[l.id] || {}) }
            : l
        )
        initAllLayers[b10ZhId] = b10ZhLayers
        initAllHistory[b10ZhId] = { history: [JSON.parse(JSON.stringify(b10ZhLayers))], index: 0 }
        const zhCopy = { lang: '中文', id: b10ZhId, name: `${b10Tmpl.name} (中文)`, size: b10Tmpl.size, baseId: 'b10' }
        const zhSuggestions = base.filter(l => l.type === 'text').map(l => ({
          layerId: l.id, original: l.text, suggestions: [zhTexts[l.id], l.text].filter(Boolean),
        }))

        setLangCopies([enCopy, zhCopy])
        setLangSuggestions({ [b10EnId]: enSuggestions, [b10ZhId]: zhSuggestions })
        setActivePreviewTab(0) // 국문 기본
      }
      setAllLayers(initAllLayers)
      setAllHistory(initAllHistory)
      setSelectedLayerId('b10-title')
      setPanOffset({ x: 0, y: 0 })
      setZoom(75)
      return
    }
    // e1: 이미지 없이도 텍스트 레이어 즉시 초기화
    const e1EarlyTemplates = selectedTemplateDetails.filter(t => t.id === 'e1' && !allLayers[t.id]?.length)
    if (e1EarlyTemplates.length > 0) {
      const earlyInit = {}
      const earlyHistoryInit = {}
      e1EarlyTemplates.forEach(tmpl => {
        const [w, h] = tmpl.size.split('×').map(Number)
        const bgLayer = { id: 'background', type: 'background', color: '#ffffff', x: 0, y: 0, width: w, height: h, rotation: 0 }
        const refLayer = { id: 'e1-ref', name: '예시 이미지', type: 'image', src: '/guide/e1-reference.jpg', x: 0, y: 0, width: w, height: h, rotation: 0, opacity: 0.90, isReference: true }
        const textLayers = [
          { id: 'e1-main-title', name: '메인 타이틀', type: 'text', text: '연인을 위한 싱그러움\n샤넬이 제안하는 기프트', x: 216, y: 163, width: 401, height: 114, rotation: 0, fontSize: 44, fontWeight: '700', color: '#ffffff', fontFamily: 'Pretendard', align: 'left', letterSpacing: -1, lineHeight: 1.3 },
          { id: 'e1-sub-title',  name: '서브 타이틀',  type: 'text', text: '홀리데이 리미티드 에디션 런칭',          x: 216, y: 301, width: 334, height: 36,  rotation: 0, fontSize: 24,  fontWeight: '500', color: '#ffffff', fontFamily: 'Pretendard', align: 'left', letterSpacing: 0,  lineHeight: 1.5 },
        ]
        const init = [bgLayer, refLayer, ...textLayers]
        earlyInit[tmpl.id] = init
        earlyHistoryInit[tmpl.id] = { history: [JSON.parse(JSON.stringify(init))], index: 0 }
      })
      setAllLayers(prev => ({ ...prev, ...earlyInit }))
      setAllHistory(prev => ({ ...prev, ...earlyHistoryInit }))
    }
    // e2: 이미지 없이도 기본 레이어 즉시 초기화 (Figma 6861-2359, 1000×512→1000×500)
    const e2EarlyTemplates = selectedTemplateDetails.filter(t => t.id === 'e2' && !allLayers[t.id]?.length)
    if (e2EarlyTemplates.length > 0) {
      const earlyInit = {}
      const earlyHistoryInit = {}
      e2EarlyTemplates.forEach(tmpl => {
        const [w, h] = tmpl.size.split('×').map(Number)
        const bgLayer = { id: 'background', type: 'background', color: '#0a0a14', x: 0, y: 0, width: w, height: h, rotation: 0 }
        const objectLayer = { id: 'e2-object', name: '메인 오브제', type: 'image', src: '/guide/e2-object-fd4a39.png', x: -150, y: Math.round(-220 * h / 512), width: 1667, height: Math.round(758 * h / 512), rotation: 0 }
        const mainH = Math.round(44 * 1.3 * 2)
        const mainY = Math.round(169 * h / 512)
        const textLayers = [
          { id: 'e2-main-title', name: '메인 타이틀', type: 'text', text: '연인을 위한 싱그러움\n샤넬이 제안하는 기프트', x: 71, y: mainY, width: 445, height: mainH, rotation: 0, fontSize: 44, fontWeight: '700', color: '#ffffff', fontFamily: 'Pretendard', align: 'left', letterSpacing: -1, lineHeight: 1.3 },
          { id: 'e2-sub-title',  name: '서브 타이틀',  type: 'text', text: '홀리데이 리미티드 에디션 런칭',  x: 71, y: mainY + mainH + 24, width: 445, height: Math.round(28 * 1.3), rotation: 0, fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.8)', fontFamily: 'Pretendard', align: 'left', letterSpacing: 0, lineHeight: 1.3 },
        ]
        const init = [bgLayer, objectLayer, ...textLayers]
        earlyInit[tmpl.id] = init
        earlyHistoryInit[tmpl.id] = { history: [JSON.parse(JSON.stringify(init))], index: 0 }
      })
      setAllLayers(prev => ({ ...prev, ...earlyInit }))
      setAllHistory(prev => ({ ...prev, ...earlyHistoryInit }))
    }
    // e3: 이미지 없이도 기본 레이어 즉시 초기화 (Figma 6863-2665, 750×500)
    const e3EarlyTemplates = selectedTemplateDetails.filter(t => t.id === 'e3' && !allLayers[t.id]?.length)
    if (e3EarlyTemplates.length > 0) {
      const earlyInit = {}
      const earlyHistoryInit = {}
      e3EarlyTemplates.forEach(tmpl => {
        const [w, h] = tmpl.size.split('×').map(Number)
        const bgLayer     = { id: 'background', type: 'background', color: '#0a0a14', x: 0, y: 0, width: w, height: h, rotation: 0 }
        const objectLayer = { id: 'e3-object', name: '메인 오브제', type: 'image', src: '/guide/e2-object-fd4a39.png', x: -158, y: -96, width: 1313, height: 597, rotation: 0 }
        const textLayers  = [
          { id: 'e3-main-title', name: '메인 타이틀', type: 'text', text: '연인을 위한\n샤넬 기프트 제안',    x: 54, y: 138, width: 401, height: 127, rotation: 0, fontSize: 50, fontWeight: '700', color: '#ffffff',              fontFamily: 'Pretendard', align: 'left', letterSpacing: -1, lineHeight: 1.21 },
          { id: 'e3-sub-title',  name: '서브 타이틀',  type: 'text', text: '홀리데이 리미티드\n에디션 런칭', x: 54, y: 289, width: 236, height: 85,  rotation: 0, fontSize: 30, fontWeight: '700', color: 'rgba(255,255,255,0.8)', fontFamily: 'Pretendard', align: 'left', letterSpacing: 0,  lineHeight: 1.3  },
        ]
        const init = [bgLayer, objectLayer, ...textLayers]
        earlyInit[tmpl.id] = init
        earlyHistoryInit[tmpl.id] = { history: [JSON.parse(JSON.stringify(init))], index: 0 }
      })
      setAllLayers(prev => ({ ...prev, ...earlyInit }))
      setAllHistory(prev => ({ ...prev, ...earlyHistoryInit }))
    }
    if (!uploadedImage?.url) return
    const allImages = [{ url: uploadedImage.url }, ...(uploadedImage.extra || [])]
    const loadImage = (url) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = url })
    Promise.all(allImages.map(({ url }) => loadImage(url))).then((imgs) => {
      const initAllLayers = {}
      const initAllHistory = {}
      selectedTemplateDetails.forEach((tmpl) => {
        const [w, h] = tmpl.size.split('\u00d7').map(Number)
        // 배경색 레이어 (최하단)
        const bgLayer = { id: 'background', type: 'background', color: (tmpl.id === 'b1' || tmpl.id === 'b2') ? '#777777' : tmpl.id === 'b12' ? '#F3F3F3' : '#ffffff', x: 0, y: 0, width: w, height: h, rotation: 0 }
        // b4 전용 레이아웃 상수는 파일 상단 전역 상수 사용
        const imgLayers = imgs.map((img, idx) => {
          let imgW, imgH, imgX, imgY
          if (tmpl.id === 'b12') {
            // 권장 이미지 영역 208×208 기준, 긴 쪽을 208에 맞춰 비율 유지 후 중앙 정렬
            const ratio = img.naturalWidth / img.naturalHeight
            if (ratio >= 1) { imgW = 208; imgH = Math.round(208 / ratio) }
            else { imgH = 208; imgW = Math.round(208 * ratio) }
            imgX = Math.round((w - imgW) / 2)
            imgY = Math.round((h - imgH) / 2)
          } else if (w === h) {
            // 정사각 템플릿: height 기준 fit, 비율 유지, 중앙 배치
            const ratio = img.naturalWidth / img.naturalHeight
            imgH = h; imgW = Math.round(h * ratio)
            imgX = Math.round((w - imgW) / 2); imgY = 0
          } else if (tmpl.id === 'b4') {
            // 우측 이미지 영역 가로 835px 채우고 세로 중앙 정렬
            const areaW = w - B4_IMG_X  // 835
            const ratio = img.naturalWidth / img.naturalHeight
            imgW = areaW
            imgH = Math.round(areaW / ratio)
            imgX = B4_IMG_X
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
          } else if (tmpl.id === 'e1') {
            // height 500 기준 fit, 비율 유지, 가로 중앙 정렬
            const ratio = img.naturalWidth / img.naturalHeight
            imgH = h
            imgW = Math.round(h * ratio)
            imgX = Math.round((w - imgW) / 2)
            imgY = 0
          } else if (tmpl.id === 'e2') {
            // 우측 이미지 영역 (x=516, w=484) 기준, 높이 캔버스에 맞춤
            const E2_IMG_X = 516
            const E2_IMG_W = w - E2_IMG_X  // 484
            const ratio = img.naturalWidth / img.naturalHeight
            imgH = h
            imgW = Math.round(h * ratio)
            imgX = E2_IMG_X + Math.round((E2_IMG_W - imgW) / 2)
            imgY = 0
          } else if (tmpl.id === 'e3') {
            // 우측 이미지 영역 (x=499, w=251) 기준, 높이 캔버스에 맞춤
            const E3_IMG_X = 499
            const E3_IMG_W = w - E3_IMG_X  // 251
            const ratio = img.naturalWidth / img.naturalHeight
            imgH = h
            imgW = Math.round(h * ratio)
            imgX = E3_IMG_X + Math.round((E3_IMG_W - imgW) / 2)
            imgY = 0
          } else if (tmpl.id === 'b6') {
            // 가로 210px 고정, 세로 비율 맞춰 중앙, 오른쪽 끝 정렬
            const ratio = img.naturalWidth / img.naturalHeight
            imgW = 210
            imgH = Math.round(210 / ratio)
            imgX = w - imgW
            imgY = Math.round((h - imgH) / 2)
          } else if (tmpl.id === 'b1') {
            // 피그마 1440 기준 A2(x=969) + offset 136 = 1105
            const ratio = img.naturalWidth / img.naturalHeight
            imgW = 300; imgH = Math.round(300 / ratio)
            imgX = 1105; imgY = Math.round((h - imgH) / 2)
          } else if (tmpl.id === 'b2') {
            // 가이드 기준: 이미지영역 x=402, w=188
            const ratio = img.naturalWidth / img.naturalHeight
            imgW = 188; imgH = Math.round(188 / ratio)
            imgX = 402; imgY = Math.round((h - imgH) / 2)
          } else if (tmpl.id === 'b7') {
            // A2 영역(x=960, w=300)에 가로 300px 맞춰 세로 중앙 정렬
            const ratio = img.naturalWidth / img.naturalHeight
            imgW = 300
            imgH = Math.round(300 / ratio)
            imgX = 960   // A2 시작 x
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

        // b2 전용 텍스트 레이어 (가이드 기준: x=590, w=470)
        const b2TextLayers = tmpl.id === 'b2' ? (() => {
          const lh = 1.4, fs = 30
          const textH = 80
          const startY = Math.round((h - textH) / 2)
          return [{ id: 'b2-text', type: 'text', text: '텍스트는\n최대 두줄까지 가능합니다', x: 590, y: startY, width: 470, height: textH, rotation: 0, fontSize: fs, fontWeight: '400', color: '#ffffff', fontFamily: 'Pretendard', align: 'left', letterSpacing: 0, lineHeight: lh, verticalCenter: true }]
        })() : []

        // b1 전용 텍스트 레이어 (피그마 기준: x=604, y=0, w=500, h=80)
        const b1TextLayers = tmpl.id === 'b1' ? (() => {
          const lh = 1.4
          const fs = 22
          const textH = Math.round(fs * lh * 2)  // 2줄
          const startY = Math.round((h - textH) / 2)
          return [{ id: 'b1-text', type: 'text', text: '텍스트는\n최대 두줄까지 가능합니다', x: 604, y: startY, width: 500, height: textH, rotation: 0, fontSize: fs, fontWeight: '400', color: '#ffffff', fontFamily: 'Pretendard', align: 'center', letterSpacing: 0, lineHeight: lh, verticalCenter: true }]
        })() : []

        // A1 복사 이미지 레이어 (b2는 이미지 1개라 A1 없음)
        const b7A1Layer = (tmpl.id === 'b7' || tmpl.id === 'b1') && imgLayers[0] ? (() => {
          const src = imgLayers[0]
          const A1_X = tmpl.id === 'b1' ? 192 : 260
          const A1_W = 300
          return [{ ...src, id: `${tmpl.id}-img-a1`, src: null, x: A1_X, y: src.y, width: A1_W, height: src.height, isB7A1: true }]
        })() : []

        const b6b7GradLayer = (tmpl.id === 'b6' || tmpl.id === 'b7' || tmpl.id === 'b1' || tmpl.id === 'b2') && imgLayers[0] ? (() => {
          if (tmpl.id === 'b6') {
            const gradX = (w - 210) - 10
            return [{ id: 'b6-gradient', type: 'gradient', direction: 'to-right', x: gradX, y: 0, width: 80, height: h, rotation: 0 }]
          } else if (tmpl.id === 'b2') {
            // b2: 이미지 영역(x=402, w=188) 양쪽 그라디언트
            const GRAD_W = 120, IMG_X = 402, IMG_W = 188
            return [
              { id: 'b2-grad-left',  type: 'gradient', direction: 'to-right', x: IMG_X - Math.round(GRAD_W / 2), y: 0, width: GRAD_W, height: h, rotation: 0 },
              { id: 'b2-grad-right', type: 'gradient', direction: 'to-left',  x: (IMG_X + IMG_W) - Math.round(GRAD_W / 2), y: 0, width: GRAD_W, height: h, rotation: 0 },
            ]
          } else {
            const GRAD_W = 140
            const A1_X = tmpl.id === 'b1' ? 192  : 260
            const A2_X = tmpl.id === 'b1' ? 1105 : 960
            const A1_W = 300, A2_W = 300
            const tid = tmpl.id
            return [
              { id: `${tid}-grad-a1-left`,  type: 'gradient', direction: 'to-right', x: A1_X - Math.round(GRAD_W / 2), y: 0, width: GRAD_W, height: h, rotation: 0 },
              { id: `${tid}-grad-a1-right`, type: 'gradient', direction: 'to-left',  x: (A1_X + A1_W) - Math.round(GRAD_W / 2), y: 0, width: GRAD_W, height: h, rotation: 0 },
              { id: `${tid}-grad-a2-left`,  type: 'gradient', direction: 'to-right', x: A2_X - Math.round(GRAD_W / 2), y: 0, width: GRAD_W, height: h, rotation: 0 },
              { id: `${tid}-grad-a2-right`, type: 'gradient', direction: 'to-left',  x: (A2_X + A2_W) - Math.round(GRAD_W / 2), y: 0, width: GRAD_W, height: h, rotation: 0 },
            ]
          }
        })() : []

        // e1 레퍼런스 + 텍스트 레이어 (Figma 5869:7386 기준, 캔버스 1440×500)
        const e1RefLayer = tmpl.id === 'e1'
          ? [{ id: 'e1-ref', name: '예시 이미지', type: 'image', src: '/guide/e1-reference.jpg', x: 0, y: 0, width: w, height: h, rotation: 0, opacity: 0.90, isReference: true }]
          : []
        const e1TextLayers = tmpl.id === 'e1' ? [
          { id: 'e1-main-title', name: '메인 타이틀', type: 'text', text: '연인을 위한 싱그러움\n샤넬이 제안하는 기프트', x: 216, y: 163, width: 401, height: 114, rotation: 0, fontSize: 44, fontWeight: '700', color: '#ffffff', fontFamily: 'Pretendard', align: 'left', letterSpacing: -1, lineHeight: 1.3 },
          { id: 'e1-sub-title',  name: '서브 타이틀',  type: 'text', text: '홀리데이 리미티드 에디션 런칭',          x: 216, y: 301, width: 334, height: 36,  rotation: 0, fontSize: 24,  fontWeight: '500', color: '#ffffff', fontFamily: 'Pretendard', align: 'left', letterSpacing: 0,  lineHeight: 1.5 },
        ] : []

        // e2 기본 레이어 (Figma 6861-2359, 1000×512→캔버스 높이 기준)
        const e2BgImgLayer = []
        const e2ObjectLayer = tmpl.id === 'e2'
          ? [{ id: 'e2-object', name: '메인 오브제', type: 'image', src: '/guide/e2-object-fd4a39.png', x: -150, y: Math.round(-220 * h / 512), width: 1667, height: Math.round(758 * h / 512), rotation: 0 }]
          : []
        const e2TextLayers = tmpl.id === 'e2' ? (() => {
          const mainH = Math.round(44 * 1.3 * 2)
          const mainY = Math.round(169 * h / 512)
          return [
            { id: 'e2-main-title', name: '메인 타이틀', type: 'text', text: '연인을 위한 싱그러움\n샤넬이 제안하는 기프트', x: 71, y: mainY, width: 445, height: mainH, rotation: 0, fontSize: 44, fontWeight: '700', color: '#ffffff', fontFamily: 'Pretendard', align: 'left', letterSpacing: -1, lineHeight: 1.3 },
            { id: 'e2-sub-title',  name: '서브 타이틀',  type: 'text', text: '홀리데이 리미티드 에디션 런칭',  x: 71, y: mainY + mainH + 24, width: 445, height: Math.round(28 * 1.3), rotation: 0, fontSize: 28, fontWeight: '700', color: 'rgba(255,255,255,0.8)', fontFamily: 'Pretendard', align: 'left', letterSpacing: 0, lineHeight: 1.3 },
          ]
        })() : []

        // e3 기본 레이어 (Figma 6863-2665, 750×500 — 좌표 1:1 대응)
        const e3BgImgLayer  = []
        const e3ObjectLayer = tmpl.id === 'e3' ? [{ id: 'e3-object', name: '메인 오브제', type: 'image', src: '/guide/e2-object-fd4a39.png', x: -158, y: -96, width: 1313, height: 597, rotation: 0 }] : []
        const e3TextLayers  = tmpl.id === 'e3' ? [
          { id: 'e3-main-title', name: '메인 타이틀', type: 'text', text: '연인을 위한\n샤넬 기프트 제안',    x: 54, y: 138, width: 401, height: 127, rotation: 0, fontSize: 50, fontWeight: '700', color: '#ffffff',              fontFamily: 'Pretendard', align: 'left', letterSpacing: -1, lineHeight: 1.21 },
          { id: 'e3-sub-title',  name: '서브 타이틀',  type: 'text', text: '홀리데이 리미티드\n에디션 런칭', x: 54, y: 289, width: 236, height: 85,  rotation: 0, fontSize: 30, fontWeight: '700', color: 'rgba(255,255,255,0.8)', fontFamily: 'Pretendard', align: 'left', letterSpacing: 0,  lineHeight: 1.3  },
        ] : []

        const init = [bgLayer, ...e1RefLayer, ...e2BgImgLayer, ...e2ObjectLayer, ...e3BgImgLayer, ...e3ObjectLayer, ...b7A1Layer, ...imgLayers, ...b6b7GradLayer, ...b4TextLayers, ...b11Layers, ...b1TextLayers, ...b2TextLayers, ...e1TextLayers, ...e2TextLayers, ...e3TextLayers]
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

      console.log('[setAllLayers]', Object.fromEntries(Object.entries(initAllLayers).map(([k, v]) => [k, v.map(l => l.type + ':' + l.id)])))
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

    // Shift+클릭: 다중 선택 토글
    if (e.shiftKey) {
      const layer = layers.find(l => l.id === id)
      if (!layer || layer.type === 'background') return
      setSelectedLayerIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) {
          next.delete(id)
          if (selectedLayerId === id) {
            const remaining = [...next]
            setSelectedLayerId(remaining.length > 0 ? remaining[remaining.length - 1] : null)
          }
        } else {
          next.add(id)
          setSelectedLayerId(id)
        }
        return next
      })
      return
    }

    // 이미 다중 선택 중인 레이어 클릭 → 선택 유지하고 드래그 시작
    const isMultiDrag = selectedLayerIds.has(id) && selectedLayerIds.size > 1
    if (isMultiDrag) {
      setSelectedLayerId(id)
    } else {
      setSelectedLayerId(id)
      setSelectedLayerIds(new Set([id]))
    }

    const layer = layers.find((l) => l.id === id)
    // b11은 텍스트 위치 고정 (레이아웃 유지), 나머지는 자유 이동
    const isB11Template = currentTemplateId === 'b11' || langCopies.find(lc => lc.id === currentTemplateId)?.baseId === 'b11'
    if (layer?.type === 'text' && isB11Template) return
    const { x: origX, y: origY, width: lW, height: lH } = layer
    const startX = e.clientX, startY = e.clientY
    const SNAP = 6
    let dragging = false

    // 멀티드래그: 선택된 모든 레이어의 초기 위치 캡처
    const dragSet = isMultiDrag ? new Set(selectedLayerIds) : new Set([id])
    const origPositions = {}
    ;(allLayers[currentTemplateId] || []).forEach(l => {
      if (dragSet.has(l.id)) origPositions[l.id] = { x: l.x, y: l.y }
    })

    const onMove = (ev) => {
      if (!dragging) {
        const dist = Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY)
        if (dist < 4) return
        dragging = true
      }
      if (isMultiDrag) {
        // 다중 선택: 스냅 없이 동일 delta로 모두 이동
        const dx = Math.round((ev.clientX - startX) / scale)
        const dy = Math.round((ev.clientY - startY) / scale)
        setAllLayers((prev) => {
          const cur = prev[currentTemplateId] || []
          return { ...prev, [currentTemplateId]: cur.map((l) => origPositions[l.id] ? { ...l, x: origPositions[l.id].x + dx, y: origPositions[l.id].y + dy } : l) }
        })
      } else {
        // 단일 선택: 기존 스냅 로직
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
        setAllLayers((prev) => {
          const cur = prev[currentTemplateId] || []
          return { ...prev, [currentTemplateId]: cur.map((l) => l.id === id ? { ...l, x: nx, y: ny } : l) }
        })
      }
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
    if (cropLayerId) return
    e.stopPropagation(); e.preventDefault()
    const layer = layers.find((l) => l.id === id)
    const { width: ow, height: oh, x: ox, y: oy } = layer
    const aspect = ow / oh
    const startX = e.clientX, startY = e.clientY
    const isTextLayer = layer.type === 'text'
    // 이미지: 항상 비율 고정 / rect·shape·text: Shift 시 비율 고정
    const isImage = layer.type === 'image'
    const isLineArrow = layer.type === 'shape' && (layer.shapeType === 'line' || layer.shapeType === 'arrow')
    const onMove = (ev) => {
      const dx = Math.round((ev.clientX - startX) / scale)
      const dy = Math.round((ev.clientY - startY) / scale)
      const shiftLock = ev.shiftKey
      setLayers(layers.map((l) => {
        if (l.id !== id) return l
        let nw = ow, nh = oh, nx = ox, ny = oy
        const isB1B2TextLayer = isTextLayer && (currentTemplateId === 'b1' || currentTemplateId === 'b2' || langCopies.find(lc => lc.id === currentTemplateId)?.baseId === 'b1' || langCopies.find(lc => lc.id === currentTemplateId)?.baseId === 'b2')
        if (isTextLayer && !isNoImageTemplate) {
          // b1/b2 텍스트: 좌우 핸들 모두 지원
          if (isB1B2TextLayer && handle === 'w') {
            nw = Math.max(60, ow - dx); nx = ox + (ow - nw)
          } else {
            nw = Math.max(60, ow + dx)
          }
        } else if (isCorner && (isImage || shiftLock)) {
          // 비율 고정 코너 리사이즈 (이미지 항상, 도형 Shift 시)
          if (handle === 'se') { nw = Math.max(20, ow + dx); nh = Math.round(nw / aspect) }
          else if (handle === 'sw') { nw = Math.max(20, ow - dx); nh = Math.round(nw / aspect); nx = ox + (ow - nw) }
          else if (handle === 'ne') { nw = Math.max(20, ow + dx); nh = Math.round(nw / aspect); ny = oy + (oh - nh) }
          else if (handle === 'nw') { nw = Math.max(20, ow - dx); nh = Math.round(nw / aspect); nx = ox + (ow - nw); ny = oy + (oh - nh) }
        } else {
          if (handle.includes('e')) nw = Math.max(20, ow + dx)
          if (handle.includes('s')) nh = Math.max(isLineArrow ? 1 : 20, oh + dy)
          if (handle.includes('w')) { nw = Math.max(20, ow - dx); nx = ox + (ow - nw) }
          if (handle.includes('n')) { nh = Math.max(isLineArrow ? 1 : 20, oh - dy); ny = oy + (oh - nh) }
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
      if (currentTemplateId === 'b12') {
        // 208×208 권장 영역 기준, 긴 쪽을 208에 맞춰 비율 유지 후 중앙
        if (ratio >= 1) { imgW = 208; imgH = Math.round(208 / ratio) }
        else { imgH = 208; imgW = Math.round(208 * ratio) }
      } else if (canvasW === canvasH) {
        // 정사각 캔버스: height 기준 fit, 비율 유지, 중앙 배치
        imgH = canvasH; imgW = Math.round(canvasH * ratio)
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

  const addShapeLayer = (shapeType) => {
    const id = `shape-${Date.now()}`
    const cx = Math.round(canvasW / 2), cy = Math.round(canvasH / 2)
    let newLayer
    if (shapeType === 'rect')    newLayer = { id, type: 'rect',  color: '#E5E7EB', borderRadius: 0, x: cx - 50,  y: cy - 50,  width: 100, height: 100, rotation: 0 }
    if (shapeType === 'ellipse') newLayer = { id, type: 'shape', shapeType: 'ellipse', color: '#E5E7EB', x: cx - 50, y: cy - 50, width: 100, height: 100, rotation: 0 }
    if (shapeType === 'line')    newLayer = { id, type: 'shape', shapeType: 'line',    color: '#374151', strokeWidth: 3, x: Math.round(canvasW * 0.2), y: cy, width: Math.round(canvasW * 0.6), height: 3, rotation: 0 }
    if (shapeType === 'arrow')   newLayer = { id, type: 'shape', shapeType: 'arrow',   color: '#374151', strokeWidth: 3, arrowEnd: true, arrowStart: false, x: Math.round(canvasW * 0.2), y: cy, width: Math.round(canvasW * 0.6), height: 20, rotation: 0 }
    // 정삼각형: 높이 = 변 * (√3/2) ≈ 0.866
    if (shapeType === 'polygon') newLayer = { id, type: 'shape', shapeType: 'polygon', color: '#E5E7EB', points: 3, x: cx - 50, y: cy - Math.round(50 * 0.866), width: 100, height: Math.round(100 * 0.866), rotation: 0 }
    if (shapeType === 'star')    newLayer = { id, type: 'shape', shapeType: 'star',    color: '#FBBA4B', points: 5, innerRadius: 0.4, x: cx - 50, y: cy - 50, width: 100, height: 100, rotation: 0 }
    if (newLayer) { updateLayers([...layers, newLayer]); setSelectedLayerId(id) }
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
          // b10 (메인 팝업 공지) — Figma 1266:339 기준
          'b10-badge':   ["Notice", "Important Notice"],
          'b10-title':   ["Expected Congestion\nat the Airport Pickup Desk", "Pickup Counter\nBusy Period Notice"],
          'b10-body':    ["Due to peak season holidays,\ncongestion is expected at the pickup desk.\nTo avoid any inconvenience,\nplease arrive at the airport\nat least 3 hours before departure.", "We expect high congestion at the pickup counter\nduring the holiday season. Kindly arrive\n3 hours prior to your departure time."],
          'b10-sub':     ["Wishing you a pleasant journey with Shinsegae Duty Free.", "We appreciate your visit and hope you have a wonderful trip."],
          'b10-contact': ["For inquiries: Customer Service  ☎ 1661-8778", "Contact  ☎ Customer Service 1661-8778"],
        },
        '中文': {
          'b4-main': ["春节购物 #限时特卖\n最高56折 仅限今日！", "新春特卖会\n精选商品低至56折 今日截止"],
          'b4-sub':  ["情人节 特别的时刻", "幸福情人节 · 专属礼遇"],
          'b11-sub':    ["专属优惠", "限时特卖"],
          'b11-title':  ["限时特卖\n优惠活动", "精品品牌\n专属折扣"],
          'b11-detail': ["立即购物 享受专属优惠", "最高56折 仅限今日"],
          // b10 (메인 팝업 공지) — Figma 1268:234 기준
          'b10-badge':   ["公告事项", "重要通知"],
          'b10-title':   ["提货处繁忙通知", "提货处繁忙提示"],
          'b10-body':    ["因旺季假期影响，预计提货处将出现繁忙情况。\n为避免影响您的提货，\n请您务必于出境前至少提前3小时抵达机场。", "节假日旺季期间，提货处预计十分繁忙。\n请于出境前至少3小时提前抵达机场，\n以便顺利完成提货。"],
          'b10-sub':     ["感谢您选择新世界免税店，祝您旅途愉快！", "感谢您的光临，祝您旅途顺利！"],
          'b10-contact': ["如有疑问，请联系客户中心  ☎ 400-842-8868", "联系我们  ☎ 客服热线 400-842-8868"],
        },
        '日本語': {
          'b4-main': ["お正月セール #SSG\n最大56%OFF 本日限り！", "新春ショッピング\n最大56%引き・本日のみ"],
          'b4-sub':  ["バレンタインの特別な瞬間", "ハッピーバレンタイン 特別なひととき"],
          'b11-sub':    ["特別オファー", "限定セール"],
          'b11-title':  ["期間限定\nスペシャルイベント", "プレミアムブランド\n限定セール"],
          'b11-detail': ["今すぐショッピング", "最大56%OFF 本日限り"],
          // b10 (메인 팝업 공지)
          'b10-badge':   ["サービスのお知らせ", "重要なお知らせ"],
          'b10-title':   ["空港受取カウンター\n混雑のご案内", "ピックアップエリア\n混雑予想のお知らせ"],
          'b10-body':    ["繁忙期のため、空港受取カウンターが\n大変混雑する見込みです。\nご出発の3時間前にはお越しください。", "ハイシーズンにより、受取カウンターの\n混雑が予想されます。出発の3時間前までに\n空港へお越しいただきますようお願いします。"],
          'b10-sub':     ["新世界免税店をご利用いただきありがとうございます。\n楽しいご旅行をお祈り申し上げます。", "ご来店いただきありがとうございます。\n素敵なご旅行をお過ごしください。"],
          'b10-contact': ["お問い合わせ  ☎ カスタマーセンター 1661-8778", "ご連絡先  ☎ お客様センター 1661-8778"],
        },
      }
      // 언어별 레이어 좌표/폰트 오버라이드 (rect 포함, 에디터 확정값 기준)
      const COORD_OVERRIDES = {
        'English': {
          // rect 레이어
          'b10-gray-box':  { x: 36, y: 193, width: 678, height: 292 },
          'b10-badge-box': { x: 304, y: 33, width: 142, height: 43 },
          // text 레이어 — Figma 1266:339 + 에디터 확정값
          'b10-badge':   { x: 320, y: 40, width: 110, height: 29 },
          'b10-title':   { x: 36, y: 88, width: 678, height: 98, fontSize: 38, lineHeight: 1.25 },
          'b10-body':    { x: 51, y: 213, width: 648, height: 195, fontSize: 23, fontWeight: '600', lineHeight: 1.6 },
          'b10-sub':     { x: 36, y: 423, width: 678, height: 26, fontSize: 20 },
          'b10-contact': { x: 0, y: 507, width: 750, height: 26, fontSize: 20 },
        },
      }
      // 첫 번째 번역 제안을 텍스트 레이어에 자동 적용 (rect도 오버라이드 적용)
      const translatedLayers = sourceLayers.map(l => {
        const coordOverride = COORD_OVERRIDES[lang]?.[l.id] || {}
        if (l.type !== 'text') {
          return Object.keys(coordOverride).length > 0 ? { ...l, ...coordOverride } : l
        }
        const translated = SUGGESTIONS[lang]?.[l.id]?.[0]
        if (translated || Object.keys(coordOverride).length > 0) {
          return { ...l, ...(translated ? { text: translated } : {}), ...coordOverride }
        }
        return l
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
      const origW = img.naturalWidth, origH = img.naturalHeight
      // 좌우 각 200px(이미지보다 작으면 10%) 스트립 샘플링
      const STRIP_W = Math.max(1, Math.min(200, Math.round(origW * 0.1)))

      const toHex = (r, g, b) => `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
      const QUANT = 16
      const colorMap = {}

      const sampleStrip = (sx, sw) => {
        const c = document.createElement('canvas')
        c.width = sw; c.height = origH
        const ctx = c.getContext('2d')
        ctx.drawImage(img, sx, 0, sw, origH, 0, 0, sw, origH)
        const data = ctx.getImageData(0, 0, sw, origH).data
        for (let i = 0; i < data.length; i += 4) {
          if (data[i+3] < 128) continue
          const r = Math.round(data[i]   / QUANT) * QUANT
          const g = Math.round(data[i+1] / QUANT) * QUANT
          const b = Math.round(data[i+2] / QUANT) * QUANT
          const key = `${r},${g},${b}`
          colorMap[key] = (colorMap[key] || 0) + 1
        }
      }

      sampleStrip(0, STRIP_W)                      // 왼쪽 200px
      sampleStrip(origW - STRIP_W, STRIP_W)        // 오른쪽 200px

      const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1])

      // 너무 어둡거나(명도 < 8%) 너무 밝은(명도 > 97%) 색 필터 — 스와치에서 안 보이는 색 제거
      const isUsable = ([key]) => {
        const [r, g, b] = key.split(',').map(Number)
        const l = (Math.max(r, g, b) + Math.min(r, g, b)) / 2 / 255
        return l >= 0.08 && l <= 0.97
      }
      const filtered = sorted.filter(isUsable)
      const source = filtered.length >= 3 ? filtered : sorted

      const colors = source.slice(0, 8).map(([key]) => {
        const [r, g, b] = key.split(',').map(Number); return toHex(r, g, b)
      })
      setSuggestedColors(colors)
      setIsExtractingColors(false)
    }
    img.src = uploadedImage.url
  }

  const deleteLayer = (id) => {
    updateLayers(layers.filter((l) => l.id !== id))
    setSelectedLayerId(null)
    setSelectedLayerIds(new Set())
  }

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.contentEditable === 'true') return
      if (e.code === 'Space' && !e.repeat && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setIsSpaceDown(true)
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault()
        setZoom((z) => { const steps = [10,25,50,75,100,150,200,300]; const i = steps.findIndex(s => s > z); return i === -1 ? steps[steps.length-1] : steps[i] })
      }
      if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault()
        setZoom((z) => { const steps = [10,25,50,75,100,150,200,300]; const i = steps.findLastIndex(s => s < z); return i === -1 ? steps[0] : steps[i] })
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

  // b2 레이어 가이드 위치 마이그레이션 (구버전 x=882/428 → 신버전 x=402/590)
  useEffect(() => {
    const b2Layers = allLayers['b2']
    if (!b2Layers || b2Layers.length === 0) return
    const imgLayer  = b2Layers.find(l => l.type === 'image')
    const textLayer = b2Layers.find(l => l.id === 'b2-text')
    if (!imgLayer && !textLayer) return
    const needsMigration = (imgLayer && imgLayer.x === 882) || (textLayer && (textLayer.x === 428 || textLayer.height !== 80))
    if (!needsMigration) return
    const migrated = b2Layers.map(l => {
      if (l.type === 'image' && l.x === 882)       return { ...l, x: 402, width: 188 }
      if (l.id === 'b2-text' && l.x === 428)       return { ...l, x: 590, width: 470, height: 80, y: 30 }
      if (l.id === 'b2-text' && l.height !== 80)   return { ...l, height: 80, y: 30 }
      if (l.id === 'b2-grad-left'  && l.x === 822) return { ...l, x: 342 }
      if (l.id === 'b2-grad-right' && l.x === 1082) return { ...l, x: 530 }
      return l
    })
    setAllLayers(prev => ({ ...prev, 'b2': migrated }))
    setAllHistory(prev => {
      const cur = prev['b2'] || { history: [[]], index: 0 }
      const next = [...cur.history.slice(0, cur.index + 1), JSON.parse(JSON.stringify(migrated))]
      return { ...prev, 'b2': { history: next, index: next.length - 1 } }
    })
  }, [allLayers['b2']?.length])

  // 화살표 키 이동 + Ctrl+Z 되돌리기
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.contentEditable === 'true') return
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      // Ctrl/Cmd + Z — Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        undo()
        return
      }

      // Delete / Backspace — 선택된 레이어 전체 삭제
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const ids = selectedLayerIdsRef.current
        if (!ids.size && !selectedLayerId) return
        e.preventDefault()
        const toDelete = ids.size > 0 ? ids : new Set([selectedLayerId])
        setAllLayers(prev => {
          const cur = prev[currentTemplateId] || []
          const updated = cur.filter(l => l.type === 'background' || !toDelete.has(l.id))
          if (updated.length === cur.length) return prev
          return { ...prev, [currentTemplateId]: updated }
        })
        setSelectedLayerId(null)
        setSelectedLayerIds(new Set())
        return
      }

      // 화살표 키 — 선택된 레이어 전체 이동
      const arrows = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
      if (!arrows.includes(e.key)) return
      e.preventDefault()
      const moveIds = selectedLayerIdsRef.current.size > 0 ? selectedLayerIdsRef.current : (selectedLayerId ? new Set([selectedLayerId]) : new Set())
      if (!moveIds.size) return
      const step = e.shiftKey ? 10 : 1
      setAllLayers(prev => {
        const cur = prev[currentTemplateId] || []
        const updated = cur.map(l => {
          if (!moveIds.has(l.id)) return l
          if (e.key === 'ArrowUp')    return { ...l, y: l.y - step }
          if (e.key === 'ArrowDown')  return { ...l, y: l.y + step }
          if (e.key === 'ArrowLeft')  return { ...l, x: l.x - step }
          if (e.key === 'ArrowRight') return { ...l, x: l.x + step }
          return l
        })
        return { ...prev, [currentTemplateId]: updated }
      })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedLayerId, currentTemplateId])

  useEffect(() => {
    if (!cropLayerId) return
    const onKeyDown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); applyCropRef.current?.() }
      if (e.key === 'Escape') { e.preventDefault(); cancelCropRef.current?.() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cropLayerId])

  useEffect(() => {
    const el = document.getElementById('editor-canvas')
    if (!el) return

    const onWheel = (e) => {
      if (!cropLayerRef.current) return
      e.preventDefault()
      e.stopPropagation()
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      setCropTemp(prev => prev ? { ...prev, cropScale: Math.max(0.05, Math.min(10, (prev.cropScale ?? 1) + delta)) } : prev)
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
    }
  }, [])

  const handleCanvasWheel = (e) => {
    e.preventDefault()
    if (cropLayerId) return
    // Cmd/Ctrl + 휠 = 줌
    if (e.metaKey || e.ctrlKey) {
      const steps = [10,25,50,75,100,150,200,300]
      setZoom((z) => {
        if (e.deltaY > 0) { const i = steps.findLastIndex(s => s < z); return i === -1 ? steps[0] : steps[i] }
        else { const i = steps.findIndex(s => s > z); return i === -1 ? steps[steps.length-1] : steps[i] }
      })
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
      300
    )
    const steps = [10,25,50,75,100,150,200,300]
    const nearest = steps.reduce((a, b) => Math.abs(b - fitZoom) < Math.abs(a - fitZoom) ? b : a)
    setZoom(Math.max(10, nearest))
    setPanOffset({ x: 0, y: 0 })
  }

  const applyCrop = () => {
    if (!cropLayerId || !cropTempRef.current) return
    const cur = allLayers[currentTemplateId] || []
    const t = cropTempRef.current
    const layer = cur.find(l => l.id === cropLayerId)
    if (!layer) return

    const oW = t.origW ?? layer.cropOrigW ?? layer.width
    const oH = t.origH ?? layer.cropOrigH ?? layer.height
    const cropScale = t.cropScale ?? 1
    const iW = oW * cropScale
    const iH = oH * cropScale
    const frameW = t.frameW ?? layer.width
    const frameH = t.frameH ?? layer.height
    const imgLeft = (t.imageX ?? (layer.x + layer.width / 2)) - (t.frameX ?? layer.x) - iW / 2
    const imgTop  = (t.imageY ?? (layer.y + layer.height / 2)) - (t.frameY ?? layer.y) - iH / 2

    // crop 결과를 canvas에 bake → 새 src로 교체, crop 메타데이터 전부 제거
    const canvas = document.createElement('canvas')
    canvas.width  = frameW
    canvas.height = frameH
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, imgLeft, imgTop, iW, iH)
      const newSrc = canvas.toDataURL('image/png')
      const newLayers = cur.map(l => l.id === cropLayerId ? {
        ...l,
        x: t.frameX ?? l.x, y: t.frameY ?? l.y,
        width: frameW, height: frameH,
        src: newSrc,
        cropX: undefined, cropY: undefined, cropScale: undefined,
        cropOrigW: undefined, cropOrigH: undefined
      } : l)
      updateLayers(newLayers)
    }
    img.onerror = () => {
      // canvas bake 실패 시 기존 방식 fallback
      const newLayers = cur.map(l => l.id === cropLayerId ? {
        ...l,
        x: t.frameX ?? l.x, y: t.frameY ?? l.y,
        width: frameW, height: frameH,
        cropX: t.imageX - t.frameX - frameW / 2, cropY: t.imageY - t.frameY - frameH / 2, cropScale,
        cropOrigW: oW, cropOrigH: oH
      } : l)
      updateLayers(newLayers)
    }
    img.src = layer.src

    cropLayerRef.current = null
    setCropLayerId(null)
    setCropTemp(null)
  }

  const cancelCrop = () => {
    cropLayerRef.current = null
    setCropLayerId(null)
    setCropTemp(null)
  }

  applyCropRef.current = applyCrop
  cancelCropRef.current = cancelCrop
  scaleRef.current = zoom / 100
  cropTempRef.current = cropTemp
  if (cropTemp) cropLayerRef.current = { x: cropTemp.frameX, y: cropTemp.frameY, width: cropTemp.frameW, height: cropTemp.frameH }

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
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
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

      {/* 링크 안내 모달 */}
      {linkInfoModalSlotId && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 700, background: 'rgba(0,0,0,0.45)' }} onClick={() => setLinkInfoModalSlotId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[360px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ background: '#FFF0E5' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F15A24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 leading-snug">링크 추가 안내</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">링크를 추가하면 HTML 형식으로 추출됩니다.</p>
            </div>
            <div className="px-6 pb-5 flex gap-2.5">
              <button onClick={() => setLinkInfoModalSlotId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
              <button
                onClick={() => {
                  const sl = layers.find(l => l.id === linkInfoModalSlotId)
                  setLinkInputValue(sl?.linkUrl || '')
                  setLinkInputModalSlotId(linkInfoModalSlotId)
                  setLinkInfoModalSlotId(null)
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)' }}
              >확인</button>
            </div>
          </div>
        </div>
      )}

      {/* URL 입력 모달 */}
      {linkInputModalSlotId && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 700, background: 'rgba(0,0,0,0.45)' }} onClick={() => setLinkInputModalSlotId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-[400px] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4">
              <h3 className="text-base font-bold text-gray-900 mb-3">링크 {layers.find(l => l.id === linkInputModalSlotId)?.linkUrl ? '수정' : '추가'}</h3>
              <input
                type="url"
                value={linkInputValue}
                onChange={e => setLinkInputValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.closest('div[class]')?.querySelector('button[data-save]')?.click() }}
                placeholder="https://example.com"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none transition-all"
                onFocus={e => { e.target.style.borderColor = '#F15A24'; e.target.style.boxShadow = '0 0 0 3px rgba(241,90,36,0.15)' }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }}
              />
              <p className="mt-1.5 text-xs text-gray-400">http:// 또는 https://로 시작하는 URL을 입력하세요.</p>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              {layers.find(l => l.id === linkInputModalSlotId)?.linkUrl && (
                <button
                  onClick={() => {
                    updateLayers(layers.map(l => l.id === linkInputModalSlotId ? { ...l, linkUrl: undefined } : l))
                    setLinkInputModalSlotId(null)
                  }}
                  className="py-2.5 px-4 rounded-xl border border-red-200 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
                >링크 삭제</button>
              )}
              <button onClick={() => setLinkInputModalSlotId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">취소</button>
              <button
                data-save
                onClick={() => {
                  const url = linkInputValue.trim()
                  if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    alert('http:// 또는 https://로 시작하는 URL을 입력해주세요.')
                    return
                  }
                  const hadLinks = layers.some(l => l.linkUrl)
                  updateLayers(layers.map(l => l.id === linkInputModalSlotId ? { ...l, linkUrl: url } : l))
                  if (!hadLinks) setDlFormat('HTML')
                  setLinkInputModalSlotId(null)
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                style={{ background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)' }}
              >저장</button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: 에디터 */}
      {step === STEP_EDITOR && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#f1f0f5' }}>

          {/* 상단 툴바 */}
          <div className="shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setShowGoHomeConfirm(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-all">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-800">KK Studio</span>
              </button>
              <span className="text-gray-300">›</span>
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 flex items-center gap-1 cursor-default select-none">
                <Check className="w-3 h-3" /> 1. 템플릿 선택
              </span>
              <span className="text-gray-300">›</span>
              {!isNoImageTemplate && (
                <>
                  <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 flex items-center gap-1 cursor-default select-none">
                    <Check className="w-3 h-3" /> 2. 이미지 입력
                  </span>
                  <span className="text-gray-300">›</span>
                </>
              )}
              <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary-600 text-white">{isNoImageTemplate ? '2. 에디터' : '3. 에디터'}</span>
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
              {/* 프레임 사이즈 변경 — heightResizable 템플릿 전용 */}
              {isHeightResizable && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setFrameHInput(String(canvasH)); setShowFrameSizePopover(v => !v) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${showFrameSizePopover ? '#F15A24' : '#e5e7eb'}`, background: showFrameSizePopover ? '#FFF0E5' : '#fff', color: showFrameSizePopover ? '#F15A24' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
                    </svg>
                    프레임 사이즈 변경
                  </button>
                  {showFrameSizePopover && (
                    <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 999, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.13)', padding: 16, width: 280 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        {/* W — 고정 비활성 */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 8, background: '#f3f4f6', border: '1.5px solid #e5e7eb' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>W</span>
                          <span style={{ fontSize: 14, color: '#9ca3af' }}>{canvasW}</span>
                        </div>
                        {/* H — 수정 가능 */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 12px', borderRadius: 8, background: '#fff', border: '1.5px solid #F15A24' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>H</span>
                          <input
                            type="number"
                            value={frameHInput}
                            onChange={e => setFrameHInput(e.target.value)}
                            min={500} max={5000}
                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, color: '#111827', background: 'transparent' }}
                          />
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>*사이즈 범위 500~5000 (px)</p>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => setShowFrameSizePopover(false)}
                          style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#f9fafb', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}
                        >취소</button>
                        <button
                          onClick={() => {
                            const v = parseInt(frameHInput, 10)
                            if (!isNaN(v) && v >= 500 && v <= 5000) {
                              setCustomHeights(prev => ({ ...prev, [currentTemplateId]: v }))
                            }
                            setShowFrameSizePopover(false)
                          }}
                          style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#F15A24', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
                        >적용</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {/* 가이드 보기 토글 */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => { const next = !showGuide; setShowGuide(next); if (!next) setLogoGuide(null) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${(showGuide || (isLogoTab && logoGuide)) ? '#F15A24' : '#e5e7eb'}`, background: (showGuide || (isLogoTab && logoGuide)) ? '#FFF0E5' : '#fff', color: (showGuide || (isLogoTab && logoGuide)) ? '#F15A24' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
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
                        style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${logoGuide === type ? '#F15A24' : 'transparent'}`, background: logoGuide === type ? '#FFF0E5' : 'transparent', color: logoGuide === type ? '#D44117' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        {type}
                      </button>
                    ))}
                  </div>
                )}
                {showGuide && !isLogoTab && (currentTemplateId === 'b6' || currentTemplateId === 'b7' || isB1Template || isB2Template || currentTemplateId === 'b3' || currentTemplateId === 'b12' || currentTemplateId === 'ev4') && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '6px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 150 }}>
                    {(isB1Template || isB2Template
                      ? [['layout', '레이아웃 가이드']]
                      : currentTemplateId === 'b3'
                      ? [['text', '메인배너 텍스트 미리보기']]
                      : currentTemplateId === 'b12'
                      ? [['layout', '레이아웃 가이드']]
                      : currentTemplateId === 'ev4'
                      ? [['landscape', '가로형 로고'], ['square', '정사각 로고'], ['portrait', '세로형 로고']]
                      : currentTemplateId === 'b4'
                      ? [['layout', '가이드 미리보기']]
                      : [['layout', '레이아웃 가이드'], ['text', '텍스트 미리보기']]
                    ).map(([mode, label]) => (
                      <button key={mode} onClick={() => setB6GuideMode(m => m === mode ? null : mode)}
                        style={{ padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${b6GuideMode === mode ? '#F15A24' : 'transparent'}`, background: b6GuideMode === mode ? '#FFF0E5' : 'transparent', color: b6GuideMode === mode ? '#D44117' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        {label}
                      </button>
                    ))}
                  </div>
                )}
                {showGuide && !isLogoTab && currentTemplateId !== 'b6' && currentTemplateId !== 'b7' && !isB1Template && !isB2Template && currentTemplateId !== 'b3' && currentTemplateId !== 'b4' && currentTemplateId !== 'b5' && currentTemplateId !== 'b11' && currentTemplateId !== 'b12' && currentTemplateId !== 'ev4' && currentTemplateId !== 'e2' && currentTemplateId !== 'e3' && currentTemplateId !== 'e5' && (
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
                <button onClick={() => setShowDlPopup(v => !v)} disabled={dlSelectedIds.size === 0} className="flex items-center gap-2 px-8 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)' }}>
                  <Download className="w-4 h-4" />
                  {dlSelectedIds.size <= 1 ? '이미지 다운로드' : `${dlSelectedIds.size}개 ZIP 다운로드`}
                  <ChevronDown className="w-3.5 h-3.5" style={{ transform: showDlPopup ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                </button>
                {showDlPopup && (
                  <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', zIndex: 500, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: 16, width: 220 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>파일 형식</p>
                    {hasLogoSelected ? (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <div style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px solid #F15A24', background: '#FFF0E5', color: '#D44117', textAlign: 'center' }}>PNG</div>
                      </div>
                    ) : (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                      {(currentTemplateId === 'e5' ? ['JPG','PNG','PDF','HTML'] : ['JPG','PNG','PDF']).map(fmt => (
                        <button key={fmt} onClick={() => setDlFormat(fmt)} style={{ flex: 1, minWidth: 0, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, border: dlFormat === fmt ? '1.5px solid #F15A24' : '1.5px solid #e5e7eb', background: dlFormat === fmt ? '#FFF0E5' : '#fff', color: dlFormat === fmt ? '#D44117' : '#6b7280', cursor: 'pointer' }}>{fmt}</button>
                      ))}
                    </div>
                    )}
                    {hasLogoSelected && <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12, textAlign: 'center' }}>로고배너는 투명 PNG로 저장</p>}
                    {dlEffectiveFmt === 'HTML' ? (
                      <p style={{ fontSize: 11, color: '#F15A24', marginBottom: 12, textAlign: 'center', lineHeight: 1.6 }}>HTML은 1440px 고정 이미지맵 기준으로 추출됩니다.<br />ZIP 안의 PNG 이미지를 이미지 서버에 업로드한 뒤,<br />index.html의 img src를 업로드된 이미지 URL로 변경해 사용하세요.</p>
                    ) : dlEffectiveFmt !== 'PDF' ? (
                      <>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>해상도</p>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                          {[['x1','1배 (원본)'],['x2','2배 (고화질)']].map(([sc, label]) => (
                            <button key={sc} onClick={() => setDlScale(sc)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 11, fontWeight: 600, border: dlScale === sc ? '1.5px solid #F15A24' : '1.5px solid #e5e7eb', background: dlScale === sc ? '#FFF0E5' : '#fff', color: dlScale === sc ? '#D44117' : '#6b7280', cursor: 'pointer' }}>{label}</button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p style={{ fontSize: 11, color: '#F15A24', marginBottom: 12, textAlign: 'center' }}>300dpi 고화질 출력</p>
                    )}
                    {currentTemplateId === 'b3' && dlSelectedIds.has('b3') && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: 'pointer', fontSize: 12, color: '#374151', fontWeight: 500 }}>
                        <input type="checkbox" checked={b3WithPreview} onChange={e => setB3WithPreview(e.target.checked)}
                          style={{ width: 15, height: 15, accentColor: '#F15A24', cursor: 'pointer', flexShrink: 0 }} />
                        메인배너 텍스트 미리보기 함께 다운로드
                      </label>
                    )}
                    <button
                      onClick={() => {
                        setShowDlPopup(false)
                        if (dlEffectiveFmt === 'HTML') handleDownloadImageMap()
                        else handleDownloadZip()
                      }}
                      style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)', color: '#fff', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Download style={{ width: 14, height: 14 }} />
                      {dlEffectiveFmt === 'HTML' ? 'ZIP 다운로드' : dlSelectedIds.size <= 1 ? '다운로드' : `${dlSelectedIds.size}개 다운로드`}
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
                {!isNoImageTemplate && (
                  <button onClick={() => setStep(STEP_IMAGE)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600">
                    <ArrowLeft className="w-4 h-4" /> 이미지 다시 선택
                  </button>
                )}

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
                            ? 'linear-gradient(270deg, #F6A23A, #E94E1B, #F6A23A)'
                            : 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)',
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
                                      onClick={() => { if (selectedLayer?.type === 'image') { updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, src: f.url, isB7A1: false } : l)) } else { addImageLayer(f) } }}
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
                            <div className="w-10 h-10 mx-auto mb-2 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)' }}>
                              <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <p className="text-xs font-medium text-gray-500">Creagen AI 이미지 생성</p>
                            <p className="text-gray-300 mt-1" style={{ fontSize: 10 }}>Coming soon</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )

                  const graphicsPanel = (
                    <div key="graphics" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">그래픽</h3>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'rect',    label: '사각형',  svg: <svg width="20" height="14" viewBox="0 0 20 14"><rect x="1" y="1" width="18" height="12" rx="0" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="1.5"/></svg> },
                          { id: 'ellipse', label: '타원',    svg: <svg width="20" height="14" viewBox="0 0 20 14"><ellipse cx="10" cy="7" rx="9" ry="6" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="1.5"/></svg> },
                          { id: 'line',    label: '선',      svg: <svg width="20" height="14" viewBox="0 0 20 14"><line x1="2" y1="7" x2="18" y2="7" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/></svg> },
                          { id: 'arrow',   label: '화살표',  svg: <svg width="20" height="14" viewBox="0 0 20 14"><line x1="2" y1="7" x2="14" y2="7" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/><polygon points="18,7 13,4 13,10" fill="#6B7280"/></svg> },
                          { id: 'polygon', label: '폴리곤',  svg: <svg width="20" height="14" viewBox="0 0 20 14"><polygon points="10,1 18,6 15,13 5,13 2,6" fill="#D1D5DB" stroke="#9CA3AF" strokeWidth="1.5"/></svg> },
                          { id: 'star',    label: '별',      svg: <svg width="20" height="14" viewBox="0 0 20 14"><polygon points="10,1 12,6 18,6 13,9 15,14 10,11 5,14 7,9 2,6 8,6" fill="#FBBA4B" stroke="#F59E0B" strokeWidth="0.5"/></svg> },
                        ].map(shape => (
                          <button key={shape.id} onClick={() => addShapeLayer(shape.id)}
                            className="flex flex-col items-center gap-1 py-2 rounded-xl bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all">
                            <div className="flex items-center justify-center" style={{ width: 24, height: 18 }}>{shape.svg}</div>
                            <span style={{ fontSize: 9, color: '#6b7280', lineHeight: 1.2, textAlign: 'center' }}>{shape.label}</span>
                          </button>
                        ))}
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
                            style={{ background: active ? '#FFF0E5' : '#fff', borderColor: active ? '#F15A24' : '#e5e7eb' }}>
                            <span className="text-xs font-semibold" style={{ color: active ? '#D44117' : '#374151' }}>{label}</span>
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
                          {icon: Expand, label: '배경 확장', skip: isLogoTab, comingSoon: true, onClick: () => {}},
                          {icon: Maximize2, label: '프레임에 맞추기', onClick: () => {
                            if (!selectedLayer || selectedLayer.type !== 'image' || !selectedLayer.src) return
                            const img = new Image()
                            img.crossOrigin = 'anonymous'
                            img.onload = () => {
                              const ratio = img.naturalWidth / img.naturalHeight
                              const newH = canvasH
                              const newW = Math.round(canvasH * ratio)
                              const centerX = selectedLayer.x + selectedLayer.width / 2
                              const newX = Math.round(centerX - newW / 2)
                              updateLayers(layers.map(l => l.id === selectedLayer.id ? { ...l, width: newW, height: newH, x: newX, y: 0 } : l))
                            }
                            img.src = selectedLayer.src
                          }},
                          {icon: ZoomIn, label: '화질 개선', onClick: null},
                          {icon: Wand2, label: '자동 보정', onClick: null},
                        ].map(({ icon: Icon, label, onClick, skip, comingSoon }) => {
                          if (skip) return null
                          const disabled = comingSoon || !onClick || (label.includes('처리 중') && isRemovingBg)
                          return (
                          <button key={label} onClick={comingSoon ? undefined : (onClick || undefined)} disabled={disabled}
                            style={comingSoon ? { position: 'relative' } : {}}
                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl bg-white border border-gray-200 transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary-300 hover:bg-primary-50'} ${isRemovingBg && label.includes('처리 중') ? 'animate-pulse border-primary-300 bg-primary-50' : ''}`}>
                            <Icon className={`w-5 h-5 ${isRemovingBg && label.includes('처리 중') ? 'text-primary-500' : 'text-gray-400'}`} />
                            <span className={`text-xs ${isRemovingBg && label.includes('처리 중') ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>{label}</span>
                            {comingSoon && (
                              <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 9, fontWeight: 700, color: '#F15A24', background: '#FFF0E5', borderRadius: 4, padding: '1px 5px', lineHeight: 1.4, whiteSpace: 'nowrap' }}>준비중</span>
                            )}
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
                          {type === 'image' && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-gray-400 shrink-0">W</span>
                              <input type="number" min={1} value={Math.round(selectedLayer.width)}
                                onChange={(e) => {
                                  const newW = Math.max(1, Number(e.target.value))
                                  const ratio = selectedLayer.width / selectedLayer.height
                                  updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, width: newW, height: Math.round(newW / ratio) } : l))
                                }}
                                onBlur={() => commitHistory(layers)}
                                className="w-16 px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-center" />
                              <span className="text-xs text-gray-400 shrink-0">H</span>
                              <input type="number" min={1} value={Math.round(selectedLayer.height)}
                                onChange={(e) => {
                                  const newH = Math.max(1, Number(e.target.value))
                                  const ratio = selectedLayer.width / selectedLayer.height
                                  updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, height: newH, width: Math.round(newH * ratio) } : l))
                                }}
                                onBlur={() => commitHistory(layers)}
                                className="w-16 px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white text-center" />
                            </div>
                          )}
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
                                style={{ width: 28, height: 28, borderRadius: 6, background: '#1E2023', border: selectedLayer.color === '#1E2023' || selectedLayer.color === '#1e2023' ? '2.5px solid #F15A24' : '2px solid #e5e7eb', cursor: 'pointer', flexShrink: 0 }} title="블랙" />
                              <button onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, color: '#ffffff' } : l))}
                                style={{ width: 28, height: 28, borderRadius: 6, background: '#ffffff', border: selectedLayer.color === '#ffffff' ? '2.5px solid #F15A24' : '2px solid #e5e7eb', cursor: 'pointer', flexShrink: 0 }} title="화이트" />
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
                    <div key="trans" style={{ background: 'linear-gradient(135deg, #FFF0E5 0%, #FEF7E6 100%)', borderRadius: 12, border: '1.5px solid #F9A94D', padding: '12px 12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Sparkles style={{ width: 11, height: 11, color: '#fff' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#7e22ce' }}>{currentLangCopy.lang} 번역 제안</span>
                      </div>
                      {currentSuggestions.map((item) => (
                        <div key={item.layerId} style={{ marginBottom: 10 }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', marginBottom: 4 }}>
                            {({
                              'b4-main': '메인카피', 'b4-sub': '서브카피',
                              'b11-sub': '서브타이틀', 'b11-title': '타이틀', 'b11-detail': '상세내용',
                              'b10-badge': '배지', 'b10-title': '타이틀', 'b10-body': '본문',
                              'b10-sub': '서브', 'b10-contact': '문의 안내',
                            })[item.layerId] || '텍스트'}
                          </p>
                          {item.suggestions.map((sug, si) => {
                            const isApplied = (layers.find(l => l.id === item.layerId)?.text || '') === sug
                            return (
                              <button key={si}
                                onClick={() => updateLayers(layers.map(l => l.id === item.layerId ? { ...l, text: sug } : l))}
                                style={{ width: '100%', textAlign: 'left', padding: '7px 10px', marginBottom: 4, borderRadius: 8, border: isApplied ? '1.5px solid #F15A24' : '1.5px solid #e9d5ff', background: isApplied ? '#FEF7E6' : '#fff', cursor: 'pointer', fontSize: 11, color: isApplied ? '#7e22ce' : '#374151', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all', display: 'flex', alignItems: 'flex-start', gap: 6 }}
                              >
                                {isApplied && <span style={{ color: '#F15A24', flexShrink: 0, marginTop: 1 }}>✓</span>}
                                <span>{sug}</span>
                              </button>
                            )
                          })}
                        </div>
                      ))}
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
                              {['English', '中文'].map((lang) => {
                                const langKey = lang === 'English' ? 'en' : 'zh'
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
                    </>
                  )

                  if (type === 'background') return <>{styleSync}{bgPanel}{translationPanel}{fileStorage}{graphicsPanel}{quickEdit}{selectedObj}{bottomPanels}</>
                  if (type === 'image') return <>{styleSync}{logoTypePanel}{fileStorage}{quickEdit}{selectedObj}{bgPanel}{translationPanel}{graphicsPanel}{bottomPanels}</>
                  if (type === 'text') return <>{styleSync}{selectedObj}{translationPanel}{fileStorage}{quickEdit}{bgPanel}{graphicsPanel}{bottomPanels}</>
                  if (type === 'rect') {
                    const rectColorPanel = (
                      <div key="rectColor" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">박스 속성</h3>
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2 py-1.5 mb-2">
                          <label className="cursor-pointer shrink-0" style={{ position: 'relative', width: 18, height: 18 }}>
                            <div style={{ width: 18, height: 18, borderRadius: 3, backgroundColor: selectedLayer.color || '#000000', border: '1px solid #e5e7eb' }} />
                            <input type="color" value={selectedLayer.color || '#000000'} onChange={(e) => updateLayers(layers.map(l => l.id === selectedLayerId ? { ...l, color: e.target.value } : l))} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                          </label>
                          <input type="text" value={selectedLayer.color || '#000000'}
                            onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) updateLayers(layers.map(l => l.id === selectedLayerId ? { ...l, color: e.target.value } : l)) }}
                            style={{ flex: 1, minWidth: 0, fontSize: 12, fontFamily: 'monospace', color: '#374151', background: 'transparent', border: 'none', outline: 'none' }} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>모서리</span>
                          <input type="range" min={0} max={Math.round(Math.min(selectedLayer.width, selectedLayer.height) / 2)} value={selectedLayer.borderRadius || 0}
                            onChange={(e) => updateLayers(layers.map(l => l.id === selectedLayerId ? { ...l, borderRadius: Number(e.target.value) } : l))}
                            onMouseUp={() => commitHistory(layers)} className="flex-1" />
                          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151', width: 28, textAlign: 'right', flexShrink: 0 }}>{selectedLayer.borderRadius || 0}</span>
                        </div>
                      </div>
                    )
                    return <>{rectColorPanel}{selectedObj}{graphicsPanel}{bgPanel}{bottomPanels}</>
                  }
                  if (type === 'shape') {
                    const shapeColorPanel = (
                      <div key="shapeColor" className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">도형 속성</h3>
                        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-2 py-1.5 mb-2">
                          <label className="cursor-pointer shrink-0" style={{ position: 'relative', width: 18, height: 18 }}>
                            <div style={{ width: 18, height: 18, borderRadius: 3, backgroundColor: selectedLayer.color || '#374151', border: '1px solid #e5e7eb' }} />
                            <input type="color" value={selectedLayer.color || '#374151'} onChange={(e) => updateLayers(layers.map(l => l.id === selectedLayerId ? { ...l, color: e.target.value } : l))} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                          </label>
                          <input type="text" value={selectedLayer.color || '#374151'}
                            onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) updateLayers(layers.map(l => l.id === selectedLayerId ? { ...l, color: e.target.value } : l)) }}
                            style={{ flex: 1, minWidth: 0, fontSize: 12, fontFamily: 'monospace', color: '#374151', background: 'transparent', border: 'none', outline: 'none' }} />
                        </div>
                        {(selectedLayer.shapeType === 'line' || selectedLayer.shapeType === 'arrow') && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>두께</span>
                              <input type="range" min={1} max={20} value={selectedLayer.strokeWidth || 3}
                                onChange={(e) => updateLayers(layers.map(l => l.id === selectedLayerId ? { ...l, strokeWidth: Number(e.target.value) } : l))}
                                onMouseUp={() => commitHistory(layers)} className="flex-1" />
                              <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151', width: 24, textAlign: 'right', flexShrink: 0 }}>{selectedLayer.strokeWidth || 3}</span>
                            </div>
                            {selectedLayer.shapeType === 'arrow' && (
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>방향</span>
                                <div className="flex gap-1 flex-1">
                                  {[
                                    { label: '→', end: true,  start: false },
                                    { label: '←', end: false, start: true  },
                                    { label: '↔', end: true,  start: true  },
                                  ].map(opt => (
                                    <button key={opt.label} onClick={() => updateLayers(layers.map(l => l.id === selectedLayerId ? { ...l, arrowEnd: opt.end, arrowStart: opt.start } : l))}
                                      style={{ flex: 1, padding: '3px 0', borderRadius: 6, fontSize: 13, border: (selectedLayer.arrowEnd === opt.end && selectedLayer.arrowStart === opt.start) ? '1.5px solid #F15A24' : '1px solid #e5e7eb', background: (selectedLayer.arrowEnd === opt.end && selectedLayer.arrowStart === opt.start) ? '#FFF0E5' : '#fff', cursor: 'pointer', color: (selectedLayer.arrowEnd === opt.end && selectedLayer.arrowStart === opt.start) ? '#F15A24' : '#4b5563' }}>
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {(selectedLayer.shapeType === 'polygon' || selectedLayer.shapeType === 'star') && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>꼭지점</span>
                              <input type="range" min={3} max={12} value={selectedLayer.points || (selectedLayer.shapeType === 'star' ? 5 : 6)}
                                onChange={(e) => updateLayers(layers.map(l => l.id === selectedLayerId ? { ...l, points: Number(e.target.value) } : l))}
                                onMouseUp={() => commitHistory(layers)} className="flex-1" />
                              <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151', width: 24, textAlign: 'right', flexShrink: 0 }}>{selectedLayer.points || (selectedLayer.shapeType === 'star' ? 5 : 6)}</span>
                            </div>
                            {selectedLayer.shapeType === 'star' && (
                              <div className="flex items-center gap-2">
                                <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0 }}>내부비율</span>
                                <input type="range" min={10} max={90} value={Math.round((selectedLayer.innerRadius ?? 0.4) * 100)}
                                  onChange={(e) => updateLayers(layers.map(l => l.id === selectedLayerId ? { ...l, innerRadius: Number(e.target.value) / 100 } : l))}
                                  onMouseUp={() => commitHistory(layers)} className="flex-1" />
                                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151', width: 28, textAlign: 'right', flexShrink: 0 }}>{Math.round((selectedLayer.innerRadius ?? 0.4) * 100)}%</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                    return <>{shapeColorPanel}{selectedObj}{graphicsPanel}{bgPanel}{bottomPanels}</>
                  }
                  return <>{translationPanel}{fileStorage}{graphicsPanel}{quickEdit}{bgPanel}{bottomPanels}</>
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
                onClick={(e) => { if (!isPanning) { if (cropLayerId) { cancelCrop(); return } setSelectedLayerId(null); setSelectedLayerIds(new Set()); setEditingTextId(null); setShowDlPopup(false) } }}
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
                        style={{ fontSize: 13, fontWeight: 600, color: '#374151', border: 'none', borderBottom: '2px solid #F15A24', outline: 'none', background: 'transparent', minWidth: 120, padding: '0 2px' }}
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
                    <input
                      ref={slotUploadInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        const slotId = pendingSlotLayerId
                        if (!file || !slotId) return
                        e.target.value = ''
                        const allowed = ['image/jpeg', 'image/png']
                        const ext = file.name.split('.').pop()?.toLowerCase()
                        if (!allowed.includes(file.type) || !['jpg','jpeg','png'].includes(ext)) {
                          alert('JPG 또는 PNG 파일만 업로드할 수 있습니다.')
                          setPendingSlotLayerId(null)
                          return
                        }
                        const reader = new FileReader()
                        reader.onload = ev => {
                          const url = ev.target.result
                          const tmpImg = new window.Image()
                          tmpImg.onload = () => {
                            const slotLayer = (allLayers[currentTemplateId] || []).find(l => l.id === slotId)
                            if (!slotLayer) return
                            const sw = slotLayer.width, sh = slotLayer.height
                            const scale = Math.max(sw / tmpImg.naturalWidth, sh / tmpImg.naturalHeight)
                            updateLayers((allLayers[currentTemplateId] || []).map(l => l.id === slotId
                              ? { ...l, src: url, cropOrigW: tmpImg.naturalWidth, cropOrigH: tmpImg.naturalHeight, cropScale: scale, cropX: 0, cropY: 0 }
                              : l
                            ))
                            setPendingSlotLayerId(null)
                          }
                          tmpImg.src = url
                        }
                        reader.readAsDataURL(file)
                      }}
                    />
                    <div id="editor-canvas" style={{ position: 'relative', width: canvasW, height: canvasH, border: '1px solid #e5e7eb', overflow: 'hidden', backgroundImage: isLogoTab && currentTemplate?.logoPair === 'white' ? 'linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%)' : 'linear-gradient(45deg, #e0e0e0 25%, transparent 25%), linear-gradient(-45deg, #e0e0e0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e0e0e0 75%), linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px', backgroundColor: isLogoTab && currentTemplate?.logoPair === 'white' ? '#333' : '#f8f8f8' }}>
                      {layers.map((layer, layerIdx) => {
                        // 배경색 레이어 렌더링
                        if (layer.type === 'background') {
                          return (
                            <div key={layer.id}
                              onMouseDown={(e) => { e.stopPropagation(); setSelectedLayerId(layer.id) }}
                              onClick={(e) => e.stopPropagation()}
                              style={{ position: 'absolute', inset: 0, background: layer.color === 'transparent' ? 'transparent' : layer.color, cursor: 'pointer', zIndex: 0, display: layer.visible === false ? 'none' : undefined }}
                            />
                          )
                        }
                        return (
                        <div key={layer.id}
                          onMouseDown={(e) => {
                            if (cropLayerId) { e.stopPropagation(); return }
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
                          onMouseEnter={() => { if (layer.isUploadSlot) setHoveredSlotLayerId(layer.id) }}
                          onMouseLeave={() => { if (layer.isUploadSlot) setHoveredSlotLayerId(null) }}
                          style={{ position: 'absolute', left: (cropLayerId === layer.id && cropTemp) ? cropTemp.frameX : layer.x, top: (cropLayerId === layer.id && cropTemp) ? cropTemp.frameY : layer.y, width: (cropLayerId === layer.id && cropTemp) ? cropTemp.frameW : layer.width, height: (cropLayerId === layer.id && cropTemp) ? cropTemp.frameH : layer.height, transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'center center', cursor: layer.type === 'text' ? (editingTextId === layer.id ? 'text' : 'default') : 'move', userSelect: editingTextId === layer.id ? 'text' : 'none', zIndex: layerIdx + 1, overflow: layer.type === 'image' ? (cropLayerId === layer.id ? 'visible' : 'hidden') : undefined, opacity: layer.opacity !== undefined ? layer.opacity : undefined, display: layer.visible === false ? 'none' : undefined, borderRadius: layer.type === 'image' && layer.borderRadius ? layer.borderRadius : undefined }}>
                          {layer.type === 'image' && layer.isUploadSlot && !layer.src && (
                            <div
                              style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, cursor: 'pointer', background: 'transparent' }}
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); setPendingSlotLayerId(layer.id); slotUploadInputRef.current?.click() }}
                            />
                          )}
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
                            return (
                              <>
                                {layer.src && (() => {
                                  const isCropping = cropLayerId === layer.id
                                  const cropX = layer.cropX ?? 0
                                  const cropY = layer.cropY ?? 0
                                  const cropScale = isCropping ? (cropTemp?.cropScale ?? 1) : (layer.cropScale ?? 1)
                                  const oW = isCropping ? (cropTemp?.origW || layer.width) : (layer.cropOrigW ?? null)
                                  const oH = isCropping ? (cropTemp?.origH || layer.height) : (layer.cropOrigH ?? null)
                                  const curFW = isCropping ? (cropTemp?.frameW ?? layer.width) : layer.width
                                  const curFH = isCropping ? (cropTemp?.frameH ?? layer.height) : layer.height
                                  const logoFilter = isLogoTab ? (currentTemplate.logoPair === 'black' ? 'brightness(0) saturate(0)' : 'brightness(0) saturate(0) invert(1)') : undefined
                                  if (oW && oH) {
                                    const iW = oW * cropScale, iH = oH * cropScale
                                    const imgLeft = isCropping ? ((cropTemp?.imageX ?? 0) - (cropTemp?.frameX ?? 0) - iW / 2) : (curFW / 2 - iW / 2 + cropX)
                                    const imgTop  = isCropping ? ((cropTemp?.imageY ?? 0) - (cropTemp?.frameY ?? 0) - iH / 2) : (curFH / 2 - iH / 2 + cropY)
                                    return <img src={layer.src} alt="" draggable={false} style={{ position: 'absolute', left: imgLeft, top: imgTop, width: iW, height: iH, maxWidth: 'none', maxHeight: 'none', objectFit: 'fill', display: 'block', pointerEvents: 'none', filter: logoFilter }} />
                                  }
                                  return <img src={layer.src} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: (layer.isReference || (layer.objectFit === 'cover' && !oW)) ? 'cover' : 'fill', display: 'block', pointerEvents: 'none', transform: `translate(${cropX}px, ${cropY}px) scale(${cropScale})`, transformOrigin: 'center center', filter: logoFilter }} />
                                })()}
                                {layer.isB7A1 && (
                                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', pointerEvents: 'none' }}>
                                    <div style={{ background: 'rgba(0,0,0,0.75)', borderRadius: 6, padding: '6px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap' }}>이 레이어를 선택 후</span>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap' }}>왼쪽에서 이미지를 교체하세요</span>
                                      <span style={{ fontSize: 9, fontWeight: 400, color: 'rgba(255,200,200,0.9)', fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap' }}>(좌우 동일 이미지 삽입 금지)</span>
                                    </div>
                                  </div>
                                )}
                              </>
                            )
                          })()}
                          {layer.type === 'gradient' && (() => {
                            const [rr, gg, bb] = hexToRgb(bgColor)
                            const dir = layer.direction === 'to-left' ? 'to left' : 'to right'
                            return <div style={{ width: '100%', height: '100%', background: `linear-gradient(${dir}, rgba(${rr},${gg},${bb},1) 0%, rgba(${rr},${gg},${bb},1) 50%, rgba(${rr},${gg},${bb},0) 100%)`, pointerEvents: 'none' }} />
                          })()}
                          {layer.type === 'rect' && (
                            <div style={{ width: '100%', height: '100%', background: layer.color || '#000000', borderRadius: layer.borderRadius || 0, pointerEvents: 'none' }} />
                          )}
                          {layer.type === 'shape' && (() => {
                            const { shapeType, color = '#374151', strokeWidth = 3, points, innerRadius = 0.4, arrowEnd = true, arrowStart = false, width: w, height: h } = layer
                            const pts = points || (shapeType === 'star' ? 5 : 6)
                            if (shapeType === 'ellipse') {
                              return <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', pointerEvents: 'none' }}>
                                <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill={color} />
                              </svg>
                            }
                            if (shapeType === 'line' || shapeType === 'arrow') {
                              const sw = strokeWidth
                              const x1 = arrowStart ? sw * 3 : 0
                              const x2 = w - (arrowEnd ? sw * 3 : 0)
                              return <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', pointerEvents: 'none' }} overflow="visible">
                                <line x1={x1} y1={h / 2} x2={x2} y2={h / 2} stroke={color} strokeWidth={sw} strokeLinecap="round" />
                                {arrowEnd   && <polygon points={`${w},${h/2} ${w-sw*3},${h/2-sw*2} ${w-sw*3},${h/2+sw*2}`} fill={color} />}
                                {arrowStart && <polygon points={`0,${h/2} ${sw*3},${h/2-sw*2} ${sw*3},${h/2+sw*2}`} fill={color} />}
                              </svg>
                            }
                            if (shapeType === 'polygon') {
                              const polyPts = Array.from({ length: pts }, (_, i) => {
                                const a = (i * 2 * Math.PI / pts) - Math.PI / 2
                                return `${w / 2 + w / 2 * Math.cos(a)},${h / 2 + h / 2 * Math.sin(a)}`
                              }).join(' ')
                              return <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', pointerEvents: 'none' }}>
                                <polygon points={polyPts} fill={color} />
                              </svg>
                            }
                            if (shapeType === 'star') {
                              const ir = innerRadius
                              const starPts = Array.from({ length: pts * 2 }, (_, i) => {
                                const a = (i * Math.PI / pts) - Math.PI / 2
                                const r = i % 2 === 0 ? 1 : ir
                                return `${w / 2 + w / 2 * r * Math.cos(a)},${h / 2 + h / 2 * r * Math.sin(a)}`
                              }).join(' ')
                              return <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', pointerEvents: 'none' }}>
                                <polygon points={starPts} fill={color} />
                              </svg>
                            }
                            return null
                          })()}
                          {layer.type === 'text' && layer.id === selectedLayerId && editingTextId !== layer.id && (
                            <div style={{ position: 'absolute', inset: -1, border: '2px solid #F15A24', pointerEvents: 'none', borderRadius: 1 }} />
                          )}
                          {layer.type === 'text' && (
                            editingTextId === layer.id ? (
                              <textarea autoFocus value={layer.text}
                                onChange={(e) => setLayers(layers.map((l) => l.id === layer.id ? { ...l, text: e.target.value } : l))}
                                onBlur={() => { commitHistory(layers); setEditingTextId(null) }}
                                onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') { commitHistory(layers); setEditingTextId(null) } }}
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                                style={{ width: '100%', height: '100%', fontSize: layer.fontSize, color: layer.color, fontFamily: layer.fontFamily || 'Pretendard', fontWeight: layer.fontWeight || (layer.bold ? '700' : '400'), textDecoration: layer.underline ? 'underline' : 'none', textAlign: layer.align || 'left', letterSpacing: `${layer.letterSpacing || 0}px`, lineHeight: layer.lineHeight || 1.4, background: 'rgba(255,255,255,0.15)', border: '1px dashed #F15A24', outline: 'none', resize: 'none', padding: 4, boxSizing: 'border-box', cursor: 'text' }}
                              />
                            ) : (
                              layer.bgColor ? (
                                <div style={{ width: '100%', height: layer.height, display: 'flex', alignItems: 'center', justifyContent: layer.align === 'center' ? 'center' : layer.align === 'right' ? 'flex-end' : 'flex-start', background: layer.bgColor, borderRadius: layer.borderRadius || 0, overflow: 'hidden', pointerEvents: 'none' }}>
                                  <span style={{ fontSize: layer.fontSize, color: layer.color, fontFamily: layer.fontFamily || 'Pretendard', fontWeight: layer.fontWeight || '400', letterSpacing: `${layer.letterSpacing || 0}px`, lineHeight: layer.lineHeight || 1.4, whiteSpace: 'nowrap' }}>{layer.text}</span>
                                </div>
                              ) : (
                                <div style={{ width: '100%', height: layer.height, overflow: isNoImageTemplate ? 'visible' : 'hidden', display: layer.verticalCenter ? 'flex' : 'block', alignItems: layer.verticalCenter ? 'center' : undefined, justifyContent: layer.verticalCenter ? 'center' : undefined, fontSize: layer.fontSize, color: layer.color, fontFamily: layer.fontFamily || 'Pretendard', fontWeight: layer.fontWeight || (layer.bold ? '700' : '400'), textDecoration: layer.underline ? 'underline' : 'none', textAlign: layer.align || 'left', letterSpacing: `${layer.letterSpacing || 0}px`, lineHeight: layer.lineHeight || 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', pointerEvents: 'none' }}>{layer.text}</div>
                              )
                            )
                          )}
                        </div>
                        )
                      })}
                    </div>

                    {/* 스마트 가이드선 */}
                    {(guides.x.length > 0 || guides.y.length > 0) && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 80, overflow: 'visible' }}>
                        {guides.x.map((gx, i) => <div key={`gx-${i}`} style={{ position: 'absolute', left: gx - 0.5, top: 0, width: 1, height: canvasH, background: '#F15A24', opacity: 0.85 }} />)}
                        {guides.y.map((gy, i) => <div key={`gy-${i}`} style={{ position: 'absolute', top: gy - 0.5, left: 0, height: 1, width: canvasW, background: '#F15A24', opacity: 0.85 }} />)}
                      </div>
                    )}

                    {/* 투명 클릭 레이어 — 레이어 배열 순서 기반 zIndex로 텍스트/도형/이미지 통합 */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, overflow: 'visible', pointerEvents: 'none', zIndex: 50 }}>
                      {layers.filter((layer) => layer.id !== editingTextId && layer.type !== 'background').map((layer) => {
                        const layerIdx = layers.findIndex(l => l.id === layer.id)
                        const isText = layer.type === 'text'
                        return (
                          <div key={`hit-${layer.id}`}
                            onMouseDown={(e) => { if (!isText && cropLayerId) return; onMouseDownLayer(e, layer.id) }}
                            onClick={(e) => e.stopPropagation()}
                            onDoubleClick={(e) => { e.stopPropagation(); if (isText) { setEditingTextId(layer.id); setSelectedLayerId(layer.id); return; } if (layer.type === 'image') { cropLayerRef.current = { x: layer.x, y: layer.y, width: layer.width, height: layer.height }; setCropLayerId(layer.id); setCropTemp({ imageX: layer.x + layer.width / 2 + (layer.cropX ?? 0), imageY: layer.y + layer.height / 2 + (layer.cropY ?? 0), cropScale: layer.cropScale ?? 1, frameX: layer.x, frameY: layer.y, frameW: layer.width, frameH: layer.height, origW: layer.cropOrigW ?? layer.width, origH: layer.cropOrigH ?? layer.height }); setSelectedLayerId(layer.id) } }}
                            style={{ position: 'absolute', left: layer.x, top: layer.y, width: layer.width, height: layer.height, transform: `rotate(${layer.rotation || 0}deg)`, transformOrigin: 'center center', cursor: 'move', pointerEvents: (layer.visible === false) ? 'none' : (isText || !cropLayerId) ? 'all' : 'none', background: 'transparent', zIndex: 51 + layerIdx }} />
                        )
                      })}
                    </div>

                    {/* 이미지/그라디언트 툴바 */}
                    {!cropLayerId && (selectedLayer?.type === 'image' || selectedLayer?.type === 'gradient') && (
                      <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: selectedLayer.x + selectedLayer.width / 2, top: selectedLayer.y - 48, transform: 'translateX(-50%)', zIndex: 200, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 2, padding: '4px 8px', pointerEvents: 'all', whiteSpace: 'nowrap' }}>
                        {selectedLayer?.type === 'gradient' && <span style={{ fontSize: 11, color: '#9ca3af', padding: '0 4px' }}>그라디언트</span>}
                        {selectedLayer?.type === 'image' && selectedLayer?.src && (
                          <Tip label="이미지 프레임에 맞춰 키우기">
                            <button onClick={() => {
                              const img = new Image()
                              img.crossOrigin = 'anonymous'
                              img.onload = () => {
                                const ratio = img.naturalWidth / img.naturalHeight
                                const newH = canvasH
                                const newW = Math.round(canvasH * ratio)
                                const centerX = selectedLayer.x + selectedLayer.width / 2
                                const newX = Math.round(centerX - newW / 2)
                                updateLayers(layers.map(l => l.id === selectedLayer.id ? { ...l, width: newW, height: newH, x: newX, y: 0 } : l))
                              }
                              img.src = selectedLayer.src
                            }} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                              <Maximize2 style={{ width: 14, height: 14 }} />
                            </button>
                          </Tip>
                        )}
                        {selectedLayer?.type === 'image' && (
                          <Tip label="최상단으로 올리기">
                            <button onClick={() => {
                              const rest = layers.filter(l => l.id !== selectedLayer.id)
                              updateLayers([...rest, selectedLayer])
                            }} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                              <BringToFront style={{ width: 14, height: 14 }} />
                            </button>
                          </Tip>
                        )}
                        {selectedLayer?.type === 'image' && selectedLayer?.src && (
                          <Tip label="크롭 (이미지 내 구도 조정)">
                            <button onClick={() => { cropLayerRef.current = { x: selectedLayer.x, y: selectedLayer.y, width: selectedLayer.width, height: selectedLayer.height }; setCropLayerId(selectedLayer.id); setCropTemp({ imageX: selectedLayer.x + selectedLayer.width / 2 + (selectedLayer.cropX ?? 0), imageY: selectedLayer.y + selectedLayer.height / 2 + (selectedLayer.cropY ?? 0), cropScale: selectedLayer.cropScale ?? 1, frameX: selectedLayer.x, frameY: selectedLayer.y, frameW: selectedLayer.width, frameH: selectedLayer.height, origW: selectedLayer.cropOrigW ?? selectedLayer.width, origH: selectedLayer.cropOrigH ?? selectedLayer.height }) }} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                              <Crop style={{ width: 14, height: 14 }} />
                            </button>
                          </Tip>
                        )}
                        {(isB1Template || isB2Template) && selectedLayer?.type === 'image' && (
                          <>
                            <div style={{ width: 1, height: 16, background: '#e5e7eb', margin: '0 4px' }} />
                            <TipDesc label="가로 중앙 정렬" desc="캔버스 기준 좌우 중앙으로 이동">
                              <button onClick={() => updateLayers(layers.map(l => l.id === selectedLayer.id ? { ...l, x: Math.round((canvasW - l.width) / 2) } : l))}
                                style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                <AlignCenterVertical style={{ width: 14, height: 14 }} />
                              </button>
                            </TipDesc>
                            <TipDesc label="세로 중앙 정렬" desc="캔버스 기준 상하 중앙으로 이동">
                              <button onClick={() => updateLayers(layers.map(l => l.id === selectedLayer.id ? { ...l, y: Math.round((canvasH - l.height) / 2) } : l))}
                                style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                                <AlignCenterHorizontal style={{ width: 14, height: 14 }} />
                              </button>
                            </TipDesc>
                          </>
                        )}
                        <Tip label="삭제">
                          <button onClick={() => deleteLayer(selectedLayer.id)} style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid transparent', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        </Tip>
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
                        <button onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, bold: !l.bold } : l))} style={{ width: 32, height: 32, borderRadius: 6, border: selectedLayer.bold ? '1.5px solid #F15A24' : '1px solid transparent', background: selectedLayer.bold ? '#FFF0E5' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedLayer.bold ? '#F15A24' : '#4b5563' }}>
                          <Bold style={{ width: 15, height: 15 }} />
                        </button>
                        <button onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, underline: !l.underline } : l))} style={{ width: 32, height: 32, borderRadius: 6, border: selectedLayer.underline ? '1.5px solid #F15A24' : '1px solid transparent', background: selectedLayer.underline ? '#FFF0E5' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedLayer.underline ? '#F15A24' : '#4b5563' }}>
                          <Underline style={{ width: 15, height: 15 }} />
                        </button>
                        <div style={{ width: 1, height: 22, background: '#e5e7eb', margin: '0 4px' }} />
                        {[{ v: 'left', Icon: AlignLeft }, { v: 'center', Icon: AlignCenter }, { v: 'right', Icon: AlignRight }].map(({ v, Icon }) => (
                          <button key={v} onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, align: v } : l))} style={{ width: 32, height: 32, borderRadius: 6, border: (selectedLayer.align || 'left') === v ? '1.5px solid #F15A24' : '1px solid transparent', background: (selectedLayer.align || 'left') === v ? '#FFF0E5' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: (selectedLayer.align || 'left') === v ? '#F15A24' : '#4b5563' }}>
                            <Icon style={{ width: 15, height: 15 }} />
                          </button>
                        ))}
                        <button onClick={() => updateLayers(layers.map((l) => l.id === selectedLayerId ? { ...l, verticalCenter: !l.verticalCenter } : l))} style={{ width: 32, height: 32, borderRadius: 6, border: selectedLayer.verticalCenter ? '1.5px solid #F15A24' : '1px solid transparent', background: selectedLayer.verticalCenter ? '#FFF0E5' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: selectedLayer.verticalCenter ? '#F15A24' : '#4b5563' }} title="수직 중앙 정렬">
                          <AlignCenterVertical style={{ width: 15, height: 15 }} />
                        </button>
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
                          <div style={{ position: 'absolute', left: 0, top: 0, width: marginX, height: canvasH, background: 'rgba(241,90,36,0.08)', borderRight: '2px dashed rgba(241,90,36,0.5)' }} />
                          <div style={{ position: 'absolute', left: 0, top: 10, width: marginX, textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#F15A24' }}>← 120px →</div>
                          <div style={{ position: 'absolute', left: marginX, top: startY - 24, fontSize: 11, fontWeight: 700, color: '#F15A24', background: 'rgba(243,232,255,0.95)', padding: '2px 8px', borderRadius: 4, border: '1px solid #F9A94D' }}>텍스트 영역 {textW}px</div>
                          <div style={{ position: 'absolute', left: marginX, top: startY, width: textW, height: totalH, border: '2px dashed #F15A24', borderRadius: 4 }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: mainH, background: 'rgba(241,90,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#D44117', background: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: 4 }}>메인카피 (48px Bold · 최대 2줄)</span>
                            </div>
                            <div style={{ position: 'absolute', left: 0, top: mainH, width: '100%', height: gap, background: 'rgba(241,90,36,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 10, color: '#F15A24', fontWeight: 600 }}>gap {gap}px</span>
                            </div>
                            <div style={{ position: 'absolute', left: 0, top: mainH + gap, width: '100%', height: subH, background: 'rgba(241,90,36,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#D44117', background: 'rgba(255,255,255,0.7)', padding: '2px 8px', borderRadius: 4 }}>서브카피 (28px Regular)</span>
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

                    {/* b5 통컨 기본배너 가이드 오버레이 */}
                    {showGuide && !isLogoTab && currentTemplateId === 'b5' && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, width: canvasW, height: canvasH, border: '3px solid rgba(239,68,68,0.8)', background: 'rgba(239,68,68,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
                          <div style={{ background: 'rgba(239,68,68,0.85)', borderRadius: 10, padding: '14px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>이미지영역 텍스트 삽입 금지</span>
                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>{canvasW} × {canvasH}px 전체 이미지 영역</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 기획전 상단 비주얼 (PC) e2 가이드 오버레이 */}
                    {showGuide && !isLogoTab && currentTemplateId === 'e2' && (
                      <TemplateGuideOverlay canvasW={canvasW} canvasH={canvasH} />
                    )}
                    {/* 기획전 상단 비주얼 (MO) e3 가이드 오버레이 */}
                    {showGuide && !isLogoTab && currentTemplateId === 'e3' && (
                      <E3GuideOverlay canvasW={canvasW} canvasH={canvasH} />
                    )}
                    {showGuide && !isLogoTab && currentTemplateId === 'e5' && (
                      <E5GuideOverlay canvasW={canvasW} canvasH={canvasH} />
                    )}

                    {/* 배경 제거 중 로딩 오버레이 */}
                    {isLogoTab && isRemovingBg && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 2 }}>
                        <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#F9A94D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>배경 제거 중…</span>
                      </div>
                    )}

                    {/* 로고 타입 가이드 오버레이 */}
                    {isLogoTab && logoGuide && <LogoGuideOverlay guide={logoGuide} canvasW={canvasW} canvasH={canvasH} margin={LOGO_MARGIN} onClose={() => setLogoGuide(null)} />}

                    {/* b6 텍스트 미리보기 가이드 */}
                    {showGuide && !isLogoTab && currentTemplateId === 'b6' && b6GuideMode === 'text' && (
                      <B6TextPreviewOverlay
                        canvasW={canvasW}
                        canvasH={canvasH}
                        color={b6PreviewText.color}
                        onColorChange={c => setB6PreviewText(prev => ({ ...prev, color: c }))}
                      />
                    )}

                    {/* b6 레이아웃 가이드 오버레이 */}
                    {showGuide && !isLogoTab && currentTemplateId === 'b6' && b6GuideMode === 'layout' && (() => {
                      const HIDDEN_W = 214   // 숨겨지는 영역
                      const TEXT_MARGIN = 32 // 숨겨지는 영역 이후 텍스트 시작 마진
                      const IMG_W = 210      // 이미지 영역 너비
                      const textStartX = HIDDEN_W + TEXT_MARGIN
                      const textAreaW = canvasW - textStartX - IMG_W - 20
                      return (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>
                          {/* 숨겨지는 영역 */}
                          <div style={{ position: 'absolute', left: 0, top: 0, width: HIDDEN_W, height: canvasH, background: 'rgba(239,68,68,0.18)', borderRight: '2px dashed rgba(239,68,68,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ background: 'rgba(239,68,68,0.85)', borderRadius: 6, padding: '4px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>숨겨지는 영역</span>
                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', fontFamily: 'system-ui, sans-serif' }}>{HIDDEN_W}px</span>
                            </div>
                          </div>
                          {/* 32px 마진 표시 */}
                          <div style={{ position: 'absolute', left: HIDDEN_W, top: 0, width: TEXT_MARGIN, height: canvasH, background: 'rgba(251,186,75,0.15)', borderRight: '1px dashed rgba(251,186,75,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#b45309', background: 'rgba(254,243,199,0.95)', borderRadius: 3, padding: '1px 4px', fontFamily: 'system-ui, sans-serif', writingMode: 'vertical-rl' }}>{TEXT_MARGIN}</span>
                          </div>
                          {/* 텍스트 영역 */}
                          <div style={{ position: 'absolute', left: textStartX, top: 8, width: textAreaW, height: canvasH - 16, border: '2px dashed #F15A24', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ background: 'rgba(241,90,36,0.85)', borderRadius: 6, padding: '4px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>텍스트 영역</span>
                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', fontFamily: 'system-ui, sans-serif' }}>BOS 시스템 폰트</span>
                            </div>
                          </div>
                          {/* 이미지 영역 */}
                          <div style={{ position: 'absolute', left: canvasW - IMG_W, top: 0, width: IMG_W, height: canvasH, border: '3px solid rgba(59,130,246,0.8)', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
                            <div style={{ background: 'rgba(59,130,246,0.85)', borderRadius: 6, padding: '4px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>이미지 영역</span>
                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', fontFamily: 'system-ui, sans-serif' }}>{IMG_W}×{canvasH}px</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* b7/b1/b2 텍스트 미리보기 */}
                    {showGuide && !isLogoTab && (currentTemplateId === 'b7' || currentTemplateId === 'b1' || currentTemplateId === 'b2') && b6GuideMode === 'text' && (
                      <B7TextPreviewOverlay
                        canvasW={canvasW}
                        canvasH={canvasH}
                        color={b7PreviewColor}
                        onColorChange={setB7PreviewColor}
                      />
                    )}

                    {/* b3 메인배너 텍스트 미리보기 */}
                    {showGuide && !isLogoTab && currentTemplateId === 'b3' && b6GuideMode === 'text' && (
                      <B3TextPreviewOverlay canvasW={canvasW} canvasH={canvasH} />
                    )}

                    {/* b12 퀵메뉴 레이아웃 가이드 */}
                    {showGuide && !isLogoTab && currentTemplateId === 'b12' && b6GuideMode === 'layout' && (
                      <B12GuideOverlay canvasW={canvasW} canvasH={canvasH} />
                    )}

                    {/* ev4 제휴 이벤트 공통 배너 — 가로형/정사각/세로형 가이드 */}
                    {showGuide && !isLogoTab && currentTemplateId === 'ev4' && (b6GuideMode === 'landscape' || b6GuideMode === 'square' || b6GuideMode === 'portrait') && (() => {
                      const sc = canvasW / 750
                      const SAFE = Math.round(80 * sc)   // 외부 안전 여백 80px
                      // 각 케이스 로고 영역 (750px 기준, 중앙 정렬)
                      const zones = {
                        landscape: { w: Math.round(590 * sc), h: Math.round(270 * sc), label: '가로형 로고 영역', sub: '590 × 270px' },
                        square:    { w: Math.round(430 * sc), h: Math.round(430 * sc), label: '정사각 로고 영역', sub: '430 × 430px' },
                        portrait:  { w: Math.round(270 * sc), h: Math.round(590 * sc), label: '세로형 로고 영역', sub: '270 × 590px' },
                      }
                      const zone = zones[b6GuideMode]
                      const zoneX = Math.round((canvasW - zone.w) / 2)
                      const zoneY = Math.round((canvasH - zone.h) / 2)
                      return (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>
                          {/* 외부 안전 여백 선 */}
                          <div style={{ position: 'absolute', left: SAFE, top: SAFE, width: canvasW - SAFE * 2, height: canvasH - SAFE * 2, border: '1.5px dashed rgba(241,90,36,0.5)', boxSizing: 'border-box', pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', background: 'rgba(241,90,36,0.85)', borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>안전 여백 {SAFE}px</span>
                            </div>
                          </div>
                          {/* 로고 배치 영역 */}
                          <div style={{ position: 'absolute', left: zoneX, top: zoneY, width: zone.w, height: zone.h, border: '2.5px solid rgba(59,130,246,0.85)', background: 'rgba(59,130,246,0.1)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ background: 'rgba(37,99,235,0.9)', borderRadius: 8, padding: '8px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>{zone.label}</span>
                              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontFamily: 'system-ui, sans-serif' }}>{zone.sub}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* b2 띠배너 MO 레이아웃 가이드 */}
                    {showGuide && !isLogoTab && isB2Template && b6GuideMode === 'layout' && (() => {
                      // 피그마 기준 (node 3735:206): 전체 1536×140
                      // A 영역: x=420, w=660px / 모바일 표시: x=393, w=750px
                      // ※ Non-display 딤·점선은 기존 코드가 이미 렌더링하므로 중복 제거
                      const A_X = 420, A_W = 660
                      const CLOSE_CX = 1120, CLOSE_SIZE = 24
                      return (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>

                          {/* A 영역 좌측 경계선 (x=420) — 빨간 점선 */}
                          <div style={{ position: 'absolute', left: A_X, top: 0, width: 0, height: canvasH, borderLeft: '2px dashed rgba(255,30,30,0.9)' }} />

                          {/* A 영역 우측 경계선 (x=1080) — 빨간 점선 */}
                          <div style={{ position: 'absolute', left: A_X + A_W, top: 0, width: 0, height: canvasH, borderLeft: '2px dashed rgba(255,30,30,0.9)' }} />

                          {/* A 영역 라벨 — 좌측 상단 */}
                          <div style={{ position: 'absolute', left: A_X + 6, top: 4, background: 'rgba(210,20,20,0.88)', borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'system-ui,sans-serif' }}>A 영역 · 660px</span>
                          </div>

                          {/* 660px 치수 라벨 — 하단 중앙 */}
                          <div style={{ position: 'absolute', bottom: 3, left: A_X, width: A_W, display: 'flex', justifyContent: 'center' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(210,20,20,0.95)', background: 'rgba(255,255,255,0.9)', borderRadius: 3, padding: '1px 6px', fontFamily: 'system-ui,sans-serif' }}>660px (텍스트+이미지)</span>
                          </div>

                          {/* X 닫기 버튼 위치 표시 */}
                          <div style={{ position: 'absolute', left: CLOSE_CX - CLOSE_SIZE / 2, top: '50%', transform: 'translateY(-50%)', width: CLOSE_SIZE, height: CLOSE_SIZE, border: '1.5px dashed rgba(255,255,255,0.85)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 9, color: '#fff', fontFamily: 'system-ui,sans-serif' }}>✕</span>
                          </div>

                        </div>
                      )
                    })()}

                    {/* b7/b1 띠배너 B 가이드 오버레이 */}
                    {showGuide && !isLogoTab && (currentTemplateId === 'b7' || currentTemplateId === 'b1') && b6GuideMode === 'layout' && (() => {
                      const isB1 = currentTemplateId === 'b1'
                      const A1_X = isB1 ? 192 : 260
                      const A2_X = isB1 ? 1105 : 960
                      const A1_W = 300, A2_W = 300
                      const T_X  = isB1 ? 604 : (260 + 300)
                      const T_W  = isB1 ? 500 : 400
                      return (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 90, overflow: 'hidden' }}>
                          {/* A1 이미지 영역 */}
                          <div style={{ position: 'absolute', left: A1_X, top: 0, width: A1_W, height: canvasH, border: '3px solid rgba(59,130,246,0.8)', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 3 }}>
                            <div style={{ background: 'rgba(59,130,246,0.85)', borderRadius: 6, padding: '3px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>A1 이미지 영역</span>
                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', fontFamily: 'system-ui, sans-serif' }}>{A1_W}×{canvasH}px</span>
                            </div>
                          </div>
                          {/* T 텍스트 영역 */}
                          <div style={{ position: 'absolute', left: T_X, top: 4, width: T_W, height: canvasH - 8, border: '2px dashed #F15A24', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ background: 'rgba(241,90,36,0.85)', borderRadius: 6, padding: '3px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>텍스트 영역</span>
                            </div>
                          </div>
                          {/* A2 이미지 영역 */}
                          <div style={{ position: 'absolute', left: A2_X, top: 0, width: A2_W, height: canvasH, border: '3px solid rgba(59,130,246,0.8)', background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 3 }}>
                            <div style={{ background: 'rgba(59,130,246,0.85)', borderRadius: 6, padding: '3px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>A2 이미지 영역</span>
                              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', fontFamily: 'system-ui, sans-serif' }}>{A2_W}×{canvasH}px</span>
                            </div>
                          </div>
                          {/* 치수 라벨 */}
                          <div style={{ position: 'absolute', bottom: 2, left: A1_X, width: A1_W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(59,130,246,0.9)', fontFamily: 'system-ui, sans-serif' }}>{A1_W}</span>
                          </div>
                          <div style={{ position: 'absolute', bottom: 2, left: T_X, width: T_W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(241,90,36,0.9)', fontFamily: 'system-ui, sans-serif' }}>{T_W}</span>
                          </div>
                          <div style={{ position: 'absolute', bottom: 2, left: A2_X, width: A2_W, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(59,130,246,0.9)', fontFamily: 'system-ui, sans-serif' }}>{A2_W}</span>
                          </div>
                        </div>
                      )
                    })()}

                    {/* b2 X 닫기 아이콘 항상 표시 */}
                    {!isLogoTab && isB2Template && (
                      <B2CloseIconOverlay canvasW={canvasW} canvasH={canvasH} />
                    )}

                    {/* b2 A영역 660px 경계 점선 항상 표시 */}
                    {!isLogoTab && isB2Template && (() => {
                      const sc = canvasW / 1536
                      const A_X = Math.round(420 * sc)
                      const A_W = Math.round(660 * sc)
                      return (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 88, overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', left: A_X, top: 0, width: 0, height: canvasH, borderLeft: '2px dashed rgba(255,30,30,0.7)' }} />
                          <div style={{ position: 'absolute', left: A_X + A_W, top: 0, width: 0, height: canvasH, borderLeft: '2px dashed rgba(255,30,30,0.7)' }} />
                        </div>
                      )
                    })()}

                    {/* b7 항상 표시: 점선만 */}
                    {!isLogoTab && currentTemplateId === 'b7' && (() => {
                      const VISIBLE_W = 1136
                      const VISIBLE_X = Math.round((canvasW - VISIBLE_W) / 2)
                      return (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 88, overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', left: VISIBLE_X - 2, top: 0, width: 2, height: canvasH, borderLeft: '2px dashed rgba(234,160,0,0.8)' }} />
                          <div style={{ position: 'absolute', left: VISIBLE_X + VISIBLE_W, top: 0, width: 2, height: canvasH, borderLeft: '2px dashed rgba(234,160,0,0.8)' }} />
                        </div>
                      )
                    })()}

                    {/* b1/b2 항상: 점선만 표시 */}
                    {!isLogoTab && (isB1Template || isB2Template) && (() => {
                      const VISIBLE_W = isB1Template ? 1440 : 750
                      const VISIBLE_X = Math.round((canvasW - VISIBLE_W) / 2)
                      return (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 88, overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', left: VISIBLE_X - 2, top: 0, width: 2, height: canvasH, borderLeft: '2px dashed rgba(234,160,0,0.8)' }} />
                          <div style={{ position: 'absolute', left: VISIBLE_X + VISIBLE_W, top: 0, width: 2, height: canvasH, borderLeft: '2px dashed rgba(234,160,0,0.8)' }} />
                        </div>
                      )
                    })()}

                    {/* b1/b2/b7 레이아웃 가이드 ON: 노란 딤 + 라벨 */}
                    {showGuide && !isLogoTab && b6GuideMode === 'layout' && (isB1Template || isB2Template || currentTemplateId === 'b7') && (() => {
                      const VISIBLE_W = isB1Template ? 1440 : isB2Template ? 750 : 1136
                      const VISIBLE_X = Math.round((canvasW - VISIBLE_W) / 2)
                      const LABEL = isB2Template ? '디바이스에 따라 가려지는 영역' : '가려지는 영역'
                      return (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 89, overflow: 'hidden' }}>
                          {[
                            { left: 0, width: VISIBLE_X, side: 'right' },
                            { left: VISIBLE_X + VISIBLE_W, width: canvasW - (VISIBLE_X + VISIBLE_W), side: 'left' }
                          ].map((s, i) => (
                            <div key={i} style={{ position: 'absolute', left: s.left, top: 0, width: s.width, height: canvasH, background: 'rgba(251,191,36,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                              <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(120,80,0,0.95)', fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap', letterSpacing: '0.05em', textAlign: 'center', padding: '0 4px' }}>{LABEL}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}

                    {/* b1 항상 표시: 피그마 BTN (오늘 그만볼래요 + 닫기) — export 제외 */}
                    {!isLogoTab && currentTemplateId === 'b1' && (
                      <div style={{ position: 'absolute', left: 1401, top: 28, width: 136, height: 24, display: 'flex', alignItems: 'center', gap: 14, pointerEvents: 'none', zIndex: 89 }}>
                        {/* 체크박스 그룹 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <div style={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }}>
                            <img src={btnCheckboxBg} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
                            <img src={btnCheckIcon} alt="" style={{ position: 'absolute', left: 4, top: 4, width: 12, height: 12 }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 400, color: '#fff', fontFamily: 'Pretendard, sans-serif', whiteSpace: 'nowrap', lineHeight: 1 }}>오늘 그만볼래요</span>
                        </div>
                        {/* 닫기 아이콘 */}
                        <img src={btnCloseIcon} alt="" style={{ width: 24, height: 24, flexShrink: 0 }} />
                      </div>
                    )}

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
                          <div style={{ position: 'absolute', left: B11_TEXT_X, top: startY - 24, fontSize: 11, fontWeight: 700, color: '#F15A24', background: 'rgba(243,232,255,0.95)', padding: '2px 8px', borderRadius: 4, border: '1px solid #F9A94D' }}>텍스트 영역 {B11_TEXT_W}px</div>
                          <div style={{ position: 'absolute', left: B11_TEXT_X, top: startY, width: B11_TEXT_W, height: totalH, border: '2px dashed #F15A24', borderRadius: 4 }}>
                            {/* 서브타이틀 */}
                            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: subH, background: 'rgba(241,90,36,0.08)', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#D44117', background: 'rgba(255,255,255,0.8)', padding: '1px 6px', borderRadius: 3 }}>서브타이틀 (34px · 선택)</span>
                            </div>
                            {/* gap1 */}
                            <div style={{ position: 'absolute', left: 0, top: subH, width: '100%', height: gap1, background: 'rgba(241,90,36,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 9, color: '#F15A24', fontWeight: 600 }}>{gap1}px</span>
                            </div>
                            {/* 타이틀 */}
                            <div style={{ position: 'absolute', left: 0, top: subH + gap1, width: '100%', height: titleH, background: 'rgba(241,90,36,0.12)', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#D44117', background: 'rgba(255,255,255,0.8)', padding: '1px 6px', borderRadius: 3 }}>타이틀 (56px Bold · 최대 2줄 · 필수)</span>
                            </div>
                            {/* gap2 */}
                            <div style={{ position: 'absolute', left: 0, top: subH + gap1 + titleH, width: '100%', height: gap2, background: 'rgba(241,90,36,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <span style={{ fontSize: 9, color: '#F15A24', fontWeight: 600 }}>{gap2}px</span>
                            </div>
                            {/* 상세내용 */}
                            <div style={{ position: 'absolute', left: 0, top: subH + gap1 + titleH + gap2, width: '100%', height: detailH, background: 'rgba(241,90,36,0.08)', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#D44117', background: 'rgba(255,255,255,0.8)', padding: '1px 6px', borderRadius: 3 }}>상세내용 (32px · opacity 80% · 선택)</span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {showGuide && !isLogoTab && currentTemplateId === 'b10' && (() => {
                      // Figma 1148:315 기준 고정값
                      return (
                        <div style={{ position: 'absolute', left: 0, top: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 95 }}>
                          {/* 회색 박스 영역 x=36 y=193 678×263 r=20 */}
                          <div style={{ position: 'absolute', left: 36, top: 193, width: 678, height: 263, border: '2px dashed rgba(107,114,128,0.5)', borderRadius: 20, background: 'rgba(107,114,128,0.04)' }}>
                            <span style={{ position: 'absolute', left: 8, top: 3, fontSize: 9, fontWeight: 700, color: '#6b7280', background: 'rgba(255,255,255,0.92)', padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap' }}>회색 박스 #F3F3F3 · r=20 · 678×263</span>
                          </div>
                          {/* 배지 x=304 y=48 142×43 r=8 */}
                          <div style={{ position: 'absolute', left: 304, top: 48, width: 142, height: 43, border: '2px dashed rgba(0,0,0,0.55)', borderRadius: 8 }}>
                            <span style={{ position: 'absolute', left: 0, bottom: 'calc(100% + 4px)', fontSize: 9, fontWeight: 700, color: '#1e2023', background: 'rgba(255,255,255,0.92)', padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap' }}>배지 24px ExtraBold · 142×43</span>
                          </div>
                          {/* 타이틀 x=51 y=111 648×53 */}
                          <div style={{ position: 'absolute', left: 51, top: 111, width: 648, height: 53, background: 'rgba(241,90,36,0.06)', border: '2px dashed rgba(241,90,36,0.5)', borderRadius: 3 }}>
                            <span style={{ position: 'absolute', left: 0, top: 1, fontSize: 9, fontWeight: 700, color: '#D44117', background: 'rgba(255,255,255,0.9)', padding: '1px 6px', borderRadius: 2, whiteSpace: 'nowrap' }}>타이틀 44px ExtraBold · 648×53</span>
                          </div>
                          {/* 본문 x=111 y=226 529×132 */}
                          <div style={{ position: 'absolute', left: 111, top: 226, width: 529, height: 132, background: 'rgba(55,65,81,0.07)', border: '1.5px dashed rgba(55,65,81,0.4)', borderRadius: 3 }}>
                            <span style={{ position: 'absolute', left: 0, top: 1, fontSize: 9, fontWeight: 700, color: '#374151', background: 'rgba(255,255,255,0.9)', padding: '1px 6px', borderRadius: 2, whiteSpace: 'nowrap' }}>본문 29px Bold · lh=44 · 529×132</span>
                          </div>
                          {/* 서브 x=36 y=390 678×33 */}
                          <div style={{ position: 'absolute', left: 36, top: 390, width: 678, height: 33, background: 'rgba(55,65,81,0.05)', border: '1.5px dashed rgba(55,65,81,0.3)', borderRadius: 3 }}>
                            <span style={{ position: 'absolute', left: 0, top: 1, fontSize: 9, fontWeight: 700, color: '#6b7280', background: 'rgba(255,255,255,0.9)', padding: '1px 6px', borderRadius: 2, whiteSpace: 'nowrap' }}>서브 22px Medium · 678×33</span>
                          </div>
                          {/* 문의 y=485 750×26 */}
                          <div style={{ position: 'absolute', left: 0, top: 485, width: 750, height: 26, background: 'rgba(156,163,175,0.10)', border: '1.5px dashed rgba(156,163,175,0.6)', borderRadius: 3 }}>
                            <span style={{ position: 'absolute', left: 8, top: 1, fontSize: 9, fontWeight: 700, color: '#9ca3af', background: 'rgba(255,255,255,0.9)', padding: '1px 6px', borderRadius: 2, whiteSpace: 'nowrap' }}>문의 22px Medium · 750×26</span>
                          </div>
                        </div>
                      )
                    })()}

                    {/* 텍스트 선택 테두리 (b10은 핸들 오버레이가 대신함) */}
                    {selectedLayer?.type === 'text' && !isNoImageTemplate && (
                      <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', zIndex: 100 }}>
                        <div style={{ position: 'absolute', left: selectedLayer.x - 2, top: selectedLayer.y - 2, width: selectedLayer.width + 4, height: selectedLayer.height + 4, border: '2px solid #F15A24', borderRadius: 3, pointerEvents: 'none' }} />
                      </div>
                    )}

                    {/* 크롭 모드 오버레이 */}
                    {cropLayerId && (() => {
                      const cl = layers.find(l => l.id === cropLayerId)
                      if (!cl) return null
                      const fX = cropTemp?.frameX ?? cl.x
                      const fY = cropTemp?.frameY ?? cl.y
                      const fW = cropTemp?.frameW ?? cl.width
                      const fH = cropTemp?.frameH ?? cl.height
                      const MIN = 20
                      const stop = e => e.stopPropagation()
                      const startDrag = (e, fn) => {
                        e.stopPropagation(); e.preventDefault()
                        const s = scaleRef.current || 1
                        const sx = e.clientX, sy = e.clientY
                        const snap = cropTempRef.current ? { ...cropTempRef.current } : null
                        if (!snap) return
                        const onMove = ev => setCropTemp(fn((ev.clientX - sx) / s, (ev.clientY - sy) / s, snap))
                        const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); const b = ce => { ce.stopPropagation(); window.removeEventListener('click', b, true) }; window.addEventListener('click', b, true) }
                        window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
                      }
                      const cS = cropTemp?.cropScale ?? 1
                      const oW = cropTemp?.origW ?? cl.width
                      const oH = cropTemp?.origH ?? cl.height
                      const imgCX = cropTemp?.imageX ?? (fX + fW / 2)
                      const imgCY = cropTemp?.imageY ?? (fY + fH / 2)
                      const imgHW = oW * cS / 2
                      const imgHH = oH * cS / 2
                      const fHandles = [
                        { id:'nw', l:fX-5,       t:fY-5,       cur:'nw-resize', fn:(dx,dy,p)=>{ const nw=Math.max(MIN,p.frameW-dx),nh=Math.max(MIN,p.frameH-dy); return {...p,frameX:p.frameX+p.frameW-nw,frameY:p.frameY+p.frameH-nh,frameW:nw,frameH:nh} }},
                        { id:'ne', l:fX+fW-5,    t:fY-5,       cur:'ne-resize', fn:(dx,dy,p)=>{ const nh=Math.max(MIN,p.frameH-dy); return {...p,frameY:p.frameY+p.frameH-nh,frameW:Math.max(MIN,p.frameW+dx),frameH:nh} }},
                        { id:'sw', l:fX-5,       t:fY+fH-5,    cur:'sw-resize', fn:(dx,dy,p)=>{ const nw=Math.max(MIN,p.frameW-dx); return {...p,frameX:p.frameX+p.frameW-nw,frameW:nw,frameH:Math.max(MIN,p.frameH+dy)} }},
                        { id:'se', l:fX+fW-5,    t:fY+fH-5,    cur:'se-resize', fn:(dx,dy,p)=>({...p,frameW:Math.max(MIN,p.frameW+dx),frameH:Math.max(MIN,p.frameH+dy)})},
                        { id:'n',  l:fX+fW/2-5,  t:fY-5,       cur:'n-resize',  fn:(dx,dy,p)=>{ const nh=Math.max(MIN,p.frameH-dy); return {...p,frameY:p.frameY+p.frameH-nh,frameH:nh} }},
                        { id:'s',  l:fX+fW/2-5,  t:fY+fH-5,    cur:'s-resize',  fn:(dx,dy,p)=>({...p,frameH:Math.max(MIN,p.frameH+dy)})},
                        { id:'e',  l:fX+fW-5,    t:fY+fH/2-5,  cur:'e-resize',  fn:(dx,dy,p)=>({...p,frameW:Math.max(MIN,p.frameW+dx)})},
                        { id:'w',  l:fX-5,       t:fY+fH/2-5,  cur:'w-resize',  fn:(dx,dy,p)=>{ const nw=Math.max(MIN,p.frameW-dx); return {...p,frameX:p.frameX+p.frameW-nw,frameW:nw} }},
                      ]
                      const iHandles = [
                        { id:'inw', l:imgCX-imgHW-5, t:imgCY-imgHH-5, cur:'nw-resize', fn:(dx,dy,p)=>{ const iHD=Math.sqrt((p.origW*p.cropScale/2)**2+(p.origH*p.cropScale/2)**2)||1; const proj=(-dx-dy)/Math.SQRT2; return {...p,cropScale:Math.max(0.1,Math.min(10,p.cropScale*(1+proj/iHD)))} }},
                        { id:'ine', l:imgCX+imgHW-5, t:imgCY-imgHH-5, cur:'ne-resize', fn:(dx,dy,p)=>{ const iHD=Math.sqrt((p.origW*p.cropScale/2)**2+(p.origH*p.cropScale/2)**2)||1; const proj=(dx-dy)/Math.SQRT2;  return {...p,cropScale:Math.max(0.1,Math.min(10,p.cropScale*(1+proj/iHD)))} }},
                        { id:'isw', l:imgCX-imgHW-5, t:imgCY+imgHH-5, cur:'sw-resize', fn:(dx,dy,p)=>{ const iHD=Math.sqrt((p.origW*p.cropScale/2)**2+(p.origH*p.cropScale/2)**2)||1; const proj=(-dx+dy)/Math.SQRT2; return {...p,cropScale:Math.max(0.1,Math.min(10,p.cropScale*(1+proj/iHD)))} }},
                        { id:'ise', l:imgCX+imgHW-5, t:imgCY+imgHH-5, cur:'se-resize', fn:(dx,dy,p)=>{ const iHD=Math.sqrt((p.origW*p.cropScale/2)**2+(p.origH*p.cropScale/2)**2)||1; const proj=(dx+dy)/Math.SQRT2;  return {...p,cropScale:Math.max(0.1,Math.min(10,p.cropScale*(1+proj/iHD)))} }},
                      ]
                      return (
                        <>
                          <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, zIndex: 155, pointerEvents: 'none' }}>
                            {/* dim areas */}
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: fY, background: 'rgba(0,0,0,0.65)', pointerEvents: 'none' }} />
                            <div style={{ position: 'absolute', top: fY + fH, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.65)', pointerEvents: 'none' }} />
                            <div style={{ position: 'absolute', top: fY, left: 0, width: fX, height: fH, background: 'rgba(0,0,0,0.65)', pointerEvents: 'none' }} />
                            <div style={{ position: 'absolute', top: fY, left: fX + fW, right: 0, height: fH, background: 'rgba(0,0,0,0.65)', pointerEvents: 'none' }} />
                            {/* frame border visual */}
                            <div style={{ position: 'absolute', left: fX, top: fY, width: fW, height: fH, border: '2px solid rgba(255,255,255,0.85)', boxSizing: 'border-box', pointerEvents: 'none' }} />
                            {/* z1: image drag (full frame body) */}
                            <div style={{ position: 'absolute', left: fX, top: fY, width: fW, height: fH, cursor: 'move', pointerEvents: 'all', zIndex: 1 }}
                              onClick={stop}
                              onMouseDown={e => startDrag(e, (dx, dy, snap) => ({ ...snap, imageX: snap.imageX + dx, imageY: snap.imageY + dy }))} />
                            {/* z2: frame move strips (4 sides, 10px wide) */}
                            {[[fX - 10, fY - 10, fW + 20, 10], [fX - 10, fY + fH, fW + 20, 10], [fX - 10, fY, 10, fH], [fX + fW, fY, 10, fH]].map(([l, t, w, h], i) => (
                              <div key={`fm-${i}`} style={{ position: 'absolute', left: l, top: t, width: w, height: h, cursor: 'grab', pointerEvents: 'all', zIndex: 2 }}
                                onClick={stop}
                                onMouseDown={e => startDrag(e, (dx, dy, snap) => ({ ...snap, frameX: snap.frameX + dx, frameY: snap.frameY + dy }))} />
                            ))}
                            {/* z3: image scale handles (4 inner corners, blue circle) */}
                            {iHandles.map(h => (
                              <div key={h.id} style={{ position: 'absolute', left: h.l, top: h.t, width: 10, height: 10, background: 'rgba(255,255,255,0.92)', border: '1.5px solid #3b82f6', borderRadius: '50%', cursor: h.cur, pointerEvents: 'all', zIndex: 3 }}
                                onClick={stop} onMouseDown={e => startDrag(e, h.fn)} />
                            ))}
                            {/* z4: frame resize handles (8, purple square) */}
                            {fHandles.map(h => (
                              <div key={h.id} style={{ position: 'absolute', left: h.l, top: h.t, width: 10, height: 10, background: '#fff', border: '1.5px solid #F15A24', borderRadius: 2, cursor: h.cur, pointerEvents: 'all', zIndex: 4 }}
                                onClick={stop} onMouseDown={e => startDrag(e, h.fn)} />
                            ))}
                          </div>
                          {/* toolbar */}
                          <div style={{ position: 'absolute', left: fX + fW / 2, top: Math.max(0, fY - 52), transform: 'translateX(-50%)', zIndex: 250, background: '#18181b', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', pointerEvents: 'all', whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,0.35)' }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontFamily: 'system-ui, sans-serif' }}>크롭 모드</span>
                            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.18)' }} />
                            <button onClick={e => { stop(e); applyCrop() }} style={{ padding: '4px 13px', background: '#F15A24', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'system-ui, sans-serif' }}>적용</button>
                            <button onClick={e => { stop(e); cancelCrop() }} style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'system-ui, sans-serif' }}>취소</button>
                          </div>
                        </>
                      )
                    })()}

                    {/* 다중 선택 테두리 — 주 선택(selectedLayerId) 제외한 나머지 */}
                    {selectedLayerIds.size > 1 && [...selectedLayerIds].filter(sid => sid !== selectedLayerId).map(sid => {
                      const sl = layers.find(l => l.id === sid)
                      if (!sl || sl.visible === false) return null
                      return (
                        <div key={`ms-${sid}`} style={{ position: 'absolute', left: sl.x, top: sl.y, width: sl.width, height: sl.height, zIndex: 99, transform: `rotate(${sl.rotation || 0}deg)`, transformOrigin: 'center center', pointerEvents: 'none' }}>
                          <div style={{ position: 'absolute', inset: -1, border: '2px dashed #F15A24', opacity: 0.65, pointerEvents: 'none', borderRadius: sl.borderRadius || 0 }} />
                        </div>
                      )
                    })}

                    {/* 핸들 오버레이 */}
                    {(() => {
                      const isB1B2Text = selectedLayer?.type === 'text' && (isB1Template || isB2Template)
                      const showHandles = selectedLayer && selectedLayer.type !== 'background' && (selectedLayer.type !== 'text' || isNoImageTemplate || isB1B2Text) && !cropLayerId
                      if (!showHandles) return null
                      const visibleHandles = isB1B2Text ? RESIZE_HANDLES.filter(h => h.id === 'w' || h.id === 'e') : RESIZE_HANDLES
                      return (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: canvasW, height: canvasH, pointerEvents: 'none', overflow: 'visible', zIndex: 100 }}>
                          <div style={{ position: 'absolute', left: selectedLayer.x, top: selectedLayer.y, width: selectedLayer.width, height: selectedLayer.height, transform: `rotate(${selectedLayer.rotation || 0}deg)`, transformOrigin: 'center center', pointerEvents: 'none' }}>
                            <div style={{ position: 'absolute', inset: -1, border: '2px solid #F15A24', pointerEvents: 'none' }} />
                            {visibleHandles.map((h) => (
                              <div key={h.id} onMouseDown={(e) => onMouseDownResize(e, selectedLayer.id, h.id, h.corner)}
                                style={{ position: 'absolute', left: `calc(${h.cx * 100}% - ${HS / 2}px)`, top: `calc(${h.cy * 100}% - ${HS / 2}px)`, width: HS, height: HS, background: '#ffffff', border: '2px solid #F15A24', borderRadius: '50%', cursor: h.cursor, pointerEvents: 'all', zIndex: 110 }} />
                            ))}
                            {!isB1B2Text && <>
                              <div style={{ position: 'absolute', left: '100%', top: '50%', width: 24, height: 1, background: '#F15A24', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                              <div onMouseDown={(e) => onMouseDownRotate(e, selectedLayer.id)} style={{ position: 'absolute', left: '100%', top: '50%', marginLeft: 24, transform: 'translateY(-50%)', width: 24, height: 24, background: '#F15A24', border: '2px solid #fff', borderRadius: '50%', cursor: 'grab', pointerEvents: 'all', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
                                <RotateCw style={{ width: 12, height: 12, color: '#fff' }} />
                              </div>
                            </>}
                          </div>
                        </div>
                      )
                    })()}

                    {/* 링크 배지 오버레이 — linkUrl 있는 레이어에 표시 (export 제외) */}
                    {layers.filter(l => l.linkUrl).map((l, idx) => (
                      <div key={`link-badge-${l.id}`} style={{ position: 'absolute', left: l.x, top: l.y, width: l.width, height: l.height, zIndex: 195, pointerEvents: 'none', transform: `rotate(${l.rotation || 0}deg)`, transformOrigin: 'center center' }}>
                        <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(241,90,36,0.5)', borderRadius: l.borderRadius || 0, pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(241,90,36,0.92)', color: '#fff', fontSize: 10, fontWeight: 700, fontFamily: 'Pretendard', padding: '3px 7px 3px 5px', borderRadius: 99, pointerEvents: 'none', userSelect: 'none' }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                          링크 {idx + 1}
                        </div>
                      </div>
                    ))}

                    {/* 업로드 슬롯 CTA 오버레이 — 항상 표시, 모든 슬롯 */}
                    {layers.filter(l => l.isUploadSlot).map(sl => {
                      const isLarge = sl.width >= 200
                      const isE5 = currentTemplateId === 'e5'
                      return (
                        <div
                          key={`cta-${sl.id}`}
                          style={{ position: 'absolute', left: sl.x, top: sl.y, width: sl.width, height: sl.height, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: isLarge ? 8 : 5, pointerEvents: 'none', borderRadius: sl.borderRadius || 0, overflow: 'hidden' }}
                        >
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: isLarge ? 8 : 4, background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)', color: '#fff', fontSize: isLarge ? 14 : 11, fontWeight: 700, fontFamily: 'Pretendard', padding: isLarge ? '11px 22px' : '6px 10px', borderRadius: isLarge ? 10 : 6, cursor: 'pointer', boxShadow: '0 4px 16px rgba(241,90,36,0.55)', whiteSpace: 'nowrap', userSelect: 'none', pointerEvents: 'all' }}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => { e.stopPropagation(); setPendingSlotLayerId(sl.id); slotUploadInputRef.current?.click() }}
                          >
                            <svg width={isLarge ? 16 : 12} height={isLarge ? 16 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                            </svg>
                            이미지 교체
                          </div>
                          {isE5 && (
                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: isLarge ? 6 : 4, background: sl.linkUrl ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.82)', color: sl.linkUrl ? '#F15A24' : '#374151', fontSize: isLarge ? 12 : 10, fontWeight: 600, fontFamily: 'Pretendard', padding: isLarge ? '7px 16px' : '4px 9px', borderRadius: isLarge ? 8 : 5, cursor: 'pointer', border: sl.linkUrl ? '1.5px solid #F15A24' : '1.5px solid #d1d5db', whiteSpace: 'nowrap', userSelect: 'none', pointerEvents: 'all', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); setLinkInfoModalSlotId(sl.id) }}
                            >
                              <svg width={isLarge ? 12 : 10} height={isLarge ? 12 : 10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                              </svg>
                              {sl.linkUrl ? '링크 수정' : '링크 추가'}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 줌 컨트롤 - 캔버스 영역 하단 중앙 */}
                <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: 'rgba(255,255,255,0.97)', borderRadius: 999, border: '1px solid #e5e7eb', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px' }}>
                  <button onClick={() => setZoom((z) => { const steps=[10,25,50,75,100,150,200,300]; const i=steps.findLastIndex(s=>s<z); return i===-1?steps[0]:steps[i] })} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }} onMouseEnter={e => e.currentTarget.style.background='#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <ZoomOut style={{ width: 16, height: 16 }} />
                  </button>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', color: '#374151', width: 42, textAlign: 'center' }}>{zoom}%</span>
                  <button onClick={() => setZoom((z) => { const steps=[10,25,50,75,100,150,200,300]; const i=steps.findIndex(s=>s>z); return i===-1?steps[steps.length-1]:steps[i] })} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }} onMouseEnter={e => e.currentTarget.style.background='#f3f4f6'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
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
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#F15A24', background: '#FFF0E5', borderRadius: 99, padding: '1px 7px' }}>{layers.length}</span>
                      </div>
                      <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                        {[...layers].reverse().map((layer, i) => {
                          const isSelected = selectedLayerIds.has(layer.id)
                          const idx = layers.length - i
                          const isDragOver = dragOverLayerId === layer.id && dragLayerId !== layer.id
                          const isHovered = hoverLayerId === layer.id
                          const displayName = layer.name
                            || (layer.type === 'background' ? '배경색'
                              : layer.type === 'image' ? `이미지 ${idx}`
                              : layer.type === 'gradient' ? '그라디언트'
                              : layer.type === 'rect' ? `도형 ${idx}`
                              : layer.type === 'shape' ? `도형 ${idx}`
                              : `텍스트 ${idx}`)
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
                              onMouseEnter={() => setHoverLayerId(layer.id)}
                              onMouseLeave={() => setHoverLayerId(null)}
                              onClick={(e) => {
                                if (e.shiftKey && layer.type !== 'background') {
                                  setSelectedLayerIds(prev => {
                                    const next = new Set(prev)
                                    if (next.has(layer.id)) {
                                      next.delete(layer.id)
                                      if (selectedLayerId === layer.id) {
                                        const rem = [...next]
                                        setSelectedLayerId(rem.length > 0 ? rem[rem.length - 1] : null)
                                      }
                                    } else {
                                      next.add(layer.id)
                                      setSelectedLayerId(layer.id)
                                    }
                                    return next
                                  })
                                } else {
                                  setSelectedLayerId(layer.id)
                                  setSelectedLayerIds(new Set([layer.id]))
                                }
                              }}
                              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', cursor: 'grab', background: isSelected ? '#faf5ff' : isDragOver ? '#FFF0E5' : 'transparent', borderLeft: isSelected ? '2.5px solid #F15A24' : '2.5px solid transparent', borderTop: isDragOver ? '2px solid #F15A24' : '2px solid transparent', opacity: dragLayerId === layer.id ? 0.4 : layer.visible === false ? 0.4 : 1, transition: 'all 0.1s' }}>
                              <span style={{ fontSize: 10, color: '#d1d5db', flexShrink: 0 }}>⠿</span>
                              <div style={{ width: 26, height: 26, borderRadius: 4, background: '#f3f4f6', border: '1px solid #e5e7eb', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {layer.type === 'background'
                                  ? <div style={{ width: '100%', height: '100%', background: layer.color }} />
                                  : layer.type === 'image'
                                    ? <img src={layer.src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : layer.type === 'gradient'
                                      ? <div style={{ width: '100%', height: '100%', background: `linear-gradient(to right, ${bgColor}, transparent)` }} />
                                      : layer.type === 'rect'
                                        ? <div style={{ width: 14, height: 10, background: layer.color || '#e5e7eb', borderRadius: layer.borderRadius ? 2 : 0 }} />
                                        : layer.type === 'shape'
                                          ? <svg width="14" height="14" viewBox="0 0 14 14">
                                              {layer.shapeType === 'ellipse' && <ellipse cx="7" cy="7" rx="6" ry="5" fill={layer.color || '#e5e7eb'} />}
                                              {layer.shapeType === 'line'    && <line x1="1" y1="7" x2="13" y2="7" stroke={layer.color || '#374151'} strokeWidth="2" strokeLinecap="round"/>}
                                              {layer.shapeType === 'arrow'   && <><line x1="1" y1="7" x2="10" y2="7" stroke={layer.color || '#374151'} strokeWidth="2" strokeLinecap="round"/><polygon points="13,7 9,5 9,9" fill={layer.color || '#374151'}/></>}
                                              {layer.shapeType === 'polygon' && <polygon points="7,1 12,5 10,12 4,12 2,5" fill={layer.color || '#e5e7eb'}/>}
                                              {layer.shapeType === 'star'    && <polygon points="7,1 8.5,5.5 13,5.5 9.5,8.5 11,13 7,10.5 3,13 4.5,8.5 1,5.5 5.5,5.5" fill={layer.color || '#FBBA4B'}/>}
                                            </svg>
                                          : <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>T</span>
                                }
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: isSelected ? '#7e22ce' : '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {displayName}
                                </p>
                                {layer.isReference && <span style={{ fontSize: 9, fontWeight: 700, color: '#9ca3af', background: '#f3f4f6', borderRadius: 3, padding: '1px 4px', letterSpacing: '0.02em' }}>예시</span>}
                              </div>
                              {/* 눈 (보이기/숨기기) 버튼 */}
                              <button
                                title={layer.visible === false ? '표시' : '숨기기'}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  updateLayers(layers.map(l => l.id === layer.id ? { ...l, visible: l.visible === false ? true : false } : l))
                                }}
                                style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 4, cursor: 'pointer', color: layer.visible === false ? '#F15A24' : '#d1d5db', padding: 0, flexShrink: 0, opacity: isHovered || isSelected || layer.visible === false ? 1 : 0, transition: 'opacity 0.12s' }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#FFF0E5'; e.currentTarget.style.color = '#F15A24' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = layer.visible === false ? '#F15A24' : '#d1d5db' }}
                              >
                                {layer.visible === false
                                  ? <EyeOff style={{ width: 12, height: 12 }} />
                                  : <Eye style={{ width: 12, height: 12 }} />
                                }
                              </button>
                              {/* 복사 / 삭제 버튼 */}
                              <div style={{ display: 'flex', gap: 1, flexShrink: 0, opacity: isHovered || isSelected ? 1 : 0, transition: 'opacity 0.12s' }}>
                                <button
                                  title="복사"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const newId = `${layer.type}-${Date.now()}`
                                    const copy = { ...layer, id: newId, x: (layer.x || 0) + 10, y: (layer.y || 0) + 10, name: `${displayName} 복사` }
                                    const fromIdx = layers.findIndex(l => l.id === layer.id)
                                    const newLayers = [...layers]
                                    newLayers.splice(fromIdx + 1, 0, copy)
                                    updateLayers(newLayers)
                                    setSelectedLayerId(newId)
                                  }}
                                  style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 4, cursor: 'pointer', color: '#9ca3af', padding: 0 }}
                                  onMouseEnter={e => { e.currentTarget.style.background = '#FFF0E5'; e.currentTarget.style.color = '#F15A24' }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af' }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                  </svg>
                                </button>
                                <button
                                  title="삭제"
                                  disabled={layers.length <= 1}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (layers.length <= 1) return
                                    const fromIdx = layers.findIndex(l => l.id === layer.id)
                                    const newLayers = layers.filter(l => l.id !== layer.id)
                                    updateLayers(newLayers)
                                    if (selectedLayerId === layer.id) {
                                      setSelectedLayerId(newLayers[Math.min(fromIdx, newLayers.length - 1)]?.id || null)
                                    }
                                  }}
                                  style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'transparent', borderRadius: 4, cursor: layers.length <= 1 ? 'not-allowed' : 'pointer', color: '#9ca3af', padding: 0, opacity: layers.length <= 1 ? 0.3 : 1 }}
                                  onMouseEnter={e => { if (layers.length > 1) { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444' } }}
                                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af' }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                                  </svg>
                                </button>
                              </div>
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
                      style={{ fontSize: 11, fontWeight: 600, color: dlSelectedIds.size === allDisplayTemplates.length ? '#9ca3af' : '#F15A24', background: dlSelectedIds.size === allDisplayTemplates.length ? '#f3f4f6' : '#FFF0E5', border: 'none', borderRadius: 99, padding: '2px 10px', cursor: 'pointer' }}
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
                  <button onClick={() => setShowAddTemplatePopup(true)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#F15A24', background: '#FFF0E5', border: 'none', borderRadius: 99, padding: '3px 10px', cursor: 'pointer' }}>
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
                        onClick={() => { setActivePreviewTab(i); setSelectedLayerId(null); setLogoGuide(null); setShowGuide(false); setB6GuideMode(null) }}
                        className="shrink-0 flex flex-col items-start gap-1"
                        style={{ cursor: 'grab', opacity: dragTplId === tmpl.id ? 0.4 : 1, borderLeft: dragOverTplId === tmpl.id && dragTplId !== tmpl.id ? '3px solid #F15A24' : '3px solid transparent', transition: 'all 0.1s' }}
                      >
                        <div style={{ width: CARD_W, height: CARD_H, borderRadius: 4, outline: isActive ? '2.5px solid #F15A24' : '2.5px solid transparent', outlineOffset: '2px', background: tmpl.logoPair === 'white' ? '#3a3a3a' : '#e9e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', boxShadow: isActive ? '0 0 0 4px #F9A94D22' : 'none' }}>
                          <div onClick={(e) => { e.stopPropagation(); setDlSelectedIds((prev) => { const next = new Set(prev); if (next.has(tmpl.id)) next.delete(tmpl.id); else next.add(tmpl.id); return next }) }}
                            style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 4, border: isDlChecked ? '2px solid #F15A24' : '2px solid #d1d5db', background: isDlChecked ? '#F15A24' : 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transition: 'all 0.15s' }}>
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
                                  return <div style={{ width: '100%', height: '100%', background: `linear-gradient(to right, rgba(${rr},${gg},${bb},1) 0%, rgba(${rr},${gg},${bb},1) 50%, rgba(${rr},${gg},${bb},0) 100%)` }} />
                                })()}
                                {layer.type === 'text' && <div style={{ fontSize: layer.fontSize * Math.min(tScaleX, tScaleY), fontWeight: layer.fontWeight || '400', color: layer.color, fontFamily: layer.fontFamily || 'Pretendard', lineHeight: layer.lineHeight || 1.4, letterSpacing: `${(layer.letterSpacing || 0) * Math.min(tScaleX, tScaleY)}px`, overflow: 'hidden', whiteSpace: 'pre-wrap', wordBreak: 'break-all', width: '100%', height: '100%' }}>{layer.text}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ width: CARD_W, marginTop: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <p className="text-xs font-medium text-gray-700 truncate" style={{ flex: 1, minWidth: 0 }}>{i + 1}.{tmpl.name}</p>
                            {tmpl.lang && <span style={{ fontSize: 9, fontWeight: 700, color: '#F15A24', background: '#FFF0E5', borderRadius: 4, padding: '1px 5px', flexShrink: 0 }}>{tmpl.lang}</span>}
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
