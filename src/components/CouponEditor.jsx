import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Download, ChevronUp, ChevronDown, Copy, Trash2, Undo2, Redo2 } from 'lucide-react'

// ── 상수 ──────────────────────────────────────────────────────
const DW = 375
const EW = 750
const ff = 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif'
const PH = 24
const PV = 20
const CW = DW - PH * 2
const GAP = 12

const C = { red: '#FE324B', black: '#1E2023', gray: '#5A5F64', lg: '#6B6E73', line: '#DCDFE3' }
const BG = { white: '#FFFFFF', blue: '#F7F7FD', gray: '#E8E8E8', dark: '#EBEBEB' }
const COUPON_COLORS = [
  { name: '블랙',     v: '#000000' },
  { name: '보라핑크', v: 'linear-gradient(135deg,#90A3FF,#FF7998)' },
  { name: '핑크오렌지', v: 'linear-gradient(270deg,#FF9F55,#FE66CC)' },
  { name: '실버',     v: 'linear-gradient(90deg,#62666B,#A8ABB1,#5F6368,#EDF0F6)' },
  { name: '다크레드', v: '#D96161' },
  { name: '블루',     v: '#4D6EE4' },
  { name: '민트',     v: 'linear-gradient(270deg,#26DAB2,#26C9DC)' },
]

const MAX_HISTORY = 50

// ── 모듈 정의 ──────────────────────────────────────────────────
export const MODULE_DEFS = [
  { type: 'header',           label: '상단',           group: '기본' },
  { type: 'title_white',      label: '타이틀 (흰)',    group: '타이틀' },
  { type: 'title_info_white', label: '타이틀 정보',    group: '타이틀' },
  { type: 'title_notes_card', label: '타이틀 유의사항',group: '타이틀' },
  { type: 'title_blue',       label: '본문A 타이틀',   group: '본문A' },
  { type: 'image_blue',       label: '본문A 이미지',   group: '본문A' },
  { type: 'info_blue',        label: '본문A 정보',     group: '본문A' },
  { type: 'table_2row',       label: '혜택표 2행',     group: '본문A' },
  { type: 'table_3row',       label: '혜택표 3행',     group: '본문A' },
  { type: 'table_4row',       label: '혜택표 4행',     group: '본문A' },
  { type: 'table_5row',       label: '혜택표 5행',     group: '본문A' },
  { type: 'notes_white',      label: '유의사항',        group: '유의사항' },
  { type: 'title_dark',       label: '본문B 타이틀',   group: '본문B' },
  { type: 'info_dark',        label: '본문B 정보',     group: '본문B' },
  { type: 'body_b_image',     label: '본문B 이미지',   group: '본문B' },
  { type: 'offer_3row',       label: '오퍼 3행',       group: '본문B' },
  { type: 'offer_4row',       label: '오퍼 4행',       group: '본문B' },
  { type: 'offer_5row',       label: '오퍼 5행',       group: '본문B' },
  { type: 'notes_dark_4row',  label: '유의사항 4행',   group: '본문B' },
  { type: 'notes_dark_5row',  label: '유의사항 5행',   group: '본문B' },
  { type: 'notes_dark_6row',  label: '유의사항 6행',   group: '본문B' },
  { type: 'timeline',         label: '타임라인',        group: '기본' },
  { type: 'coupon_1a',        label: '쿠폰 1개 A',     group: '쿠폰' },
  { type: 'coupon_1b',        label: '쿠폰 1개 B',     group: '쿠폰' },
  { type: 'coupon_1c',        label: '쿠폰 1개 C',     group: '쿠폰' },
  { type: 'coupon_2',         label: '쿠폰 2개',       group: '쿠폰' },
  { type: 'coupon_3',         label: '쿠폰 3개',       group: '쿠폰' },
]

let _uid = 0
const uid = () => `m${++_uid}`

export function makeModule(type) {
  const id = uid()
  const infoBullets = [
    { label: '대상',  value: '온라인몰 회원 누구나' },
    { label: '기간',  value: '발급일로부터 30일까지 (ID 당 1회 참여)' },
    { label: '사용처', value: '온라인몰, 오프라인 전점' },
  ]
  const noteItems = [
    '추가 적립금이란, 신세계 면세점 기본 적립금 사용 후, 추가 적용 가능한 할인 혜택입니다.',
    '제휴캐시, 결제 할인 포인트 및 면세 포인트와 중복 사용 가능합니다.',
  ]
  const tr2 = [{ condition: '$100이상 구매 시', amount: '35,000원' }, { condition: '$150이상 구매 시', amount: '60,000원' }]
  const tr3 = [...tr2, { condition: '$200이상 구매 시', amount: '80,000원' }]
  const tr4 = [...tr3, { condition: '$280이상 구매 시', amount: '95,000원' }]
  const tr5 = [...tr4, { condition: '$400이상 구매 시', amount: '120,000원' }]
  const dr  = ['온라인몰 회원 누구나', '발급일로부터 30일까지 (ID 당 1회 참여)', '온라인몰, 오프라인 전점', '$100 이상 구매 시']
  switch (type) {
    case 'header':           return { id, type, image: null }
    case 'title_white':      return { id, type, bg: BG.white, flag: '진행중', headline: '페이지 헤드라인 텍스트\n페이지 헤드라인 텍스트', body: '본문 텍스트 본문 텍스트 본문 텍스트' }
    case 'title_blue':       return { id, type, bg: BG.blue,  flag: '진행중', headline: '페이지 헤드라인 텍스트\n페이지 헤드라인 텍스트', body: '본문 텍스트 본문 텍스트 본문 텍스트' }
    case 'title_dark':       return { id, type, bg: BG.dark,  flag: '진행중', headline: '페이지 헤드라인 텍스트\n페이지 헤드라인 텍스트', body: '본문 텍스트 본문 텍스트 본문 텍스트' }
    case 'title_info_white': return { id, type, bg: BG.gray,  rows: infoBullets }
    case 'title_notes_card': return { id, type, bg: BG.gray,  title: '유의사항', items: noteItems }
    case 'image_blue':       return { id, type, bg: BG.blue,  image: null }
    case 'info_blue':        return { id, type, bg: BG.blue,  rows: infoBullets }
    case 'info_dark':        return { id, type, bg: BG.dark,  rows: infoBullets }
    case 'notes_white':      return { id, type, bg: BG.white, title: '유의사항', items: noteItems }
    case 'table_2row':       return { id, type, bg: BG.white, rows: tr2, note: '추가 적립금이란, 신세계 면세점 기본 적립금 사용 후, 추가 적용 가능한 할인 혜택입니다.' }
    case 'table_3row':       return { id, type, bg: BG.white, rows: tr3, note: '추가 적립금이란, 신세계 면세점 기본 적립금 사용 후, 추가 적용 가능한 할인 혜택입니다.' }
    case 'table_4row':       return { id, type, bg: BG.white, rows: tr4, note: '추가 적립금이란, 신세계 면세점 기본 적립금 사용 후, 추가 적용 가능한 할인 혜택입니다.' }
    case 'table_5row':       return { id, type, bg: BG.white, rows: tr5, note: '추가 적립금이란, 신세계 면세점 기본 적립금 사용 후, 추가 적용 가능한 할인 혜택입니다.' }
    case 'body_b_image':     return { id, type, bg: BG.white, items: infoBullets, notes: noteItems }
    case 'offer_3row':       return { id, type, bg: BG.white, offerType: '오퍼종류', rows: tr3 }
    case 'offer_4row':       return { id, type, bg: BG.white, offerType: '오퍼종류', rows: tr4 }
    case 'offer_5row':       return { id, type, bg: BG.white, offerType: '오퍼종류', rows: tr5 }
    case 'notes_dark_4row':  return { id, type, bg: BG.dark,  rows: dr }
    case 'notes_dark_5row':  return { id, type, bg: BG.dark,  rows: [...dr, '기타 조건을 입력하세요'] }
    case 'notes_dark_6row':  return { id, type, bg: BG.dark,  rows: [...dr, '기타 조건', '추가 항목을 입력하세요'] }
    case 'timeline':         return { id, type, bg: BG.white, items: [{ step: '01', text: '타임라인 항목 1' }, { step: '02', text: '타임라인 항목 2' }, { step: '03', text: '타임라인 항목 3' }] }
    case 'coupon_1a':        return { id, type, bg: BG.white, couponColor: '#000000', offerName: '오퍼명\n두줄 케이스', subLabel: '최대', amount: '3,000,000', unit: '원', note: '명동점 전용' }
    case 'coupon_1b':        return { id, type, bg: BG.white, couponColor: '#000000', offerName: '오퍼명\n두줄 케이스', subLabel: '최대', amount: '3,000,000', unit: '원', note: '명동점 전용' }
    case 'coupon_1c':        return { id, type, bg: BG.white, couponColor: '#000000', offerName: '오퍼명\n두줄까지 가능', subLabel: '최대', amount: '3,000,000', unit: '원', note: '명동점 전용' }
    case 'coupon_2':         return { id, type, bg: BG.white, couponColor: '#000000', c1: { offerName: '오퍼명\n두줄 케이스', subLabel: '최대', amount: '3,000,000', unit: '원', note: '' }, c2: { offerName: '오퍼명\n두줄 케이스', subLabel: '최대', amount: '3,000,000', unit: '원', note: '' } }
    case 'coupon_3':         return { id, type, bg: BG.white, couponColor: '#000000', coupons: [{ offerName: '오퍼명\n두줄 케이스', subLabel: '최대', amount: '3,000,000', unit: '원', note: '' }, { offerName: '오퍼명\n두줄 케이스', subLabel: '최대', amount: '3,000,000', unit: '원', note: '' }, { offerName: '오퍼명\n두줄 케이스', subLabel: '최대', amount: '3,000,000', unit: '원', note: '' }] }
    default: return { id, type }
  }
}

// ── 데이터 업데이트 헬퍼 ──────────────────────────────────────
function getLayerUpdatePatch(mod, layer, value) {
  const { dataKey, couponPath } = layer
  if (!dataKey) return {}
  if (couponPath) {
    if (couponPath.startsWith('coupons.')) {
      const idx = parseInt(couponPath.split('.')[1])
      const coupons = (mod.coupons || []).map((c, i) => i === idx ? { ...c, [dataKey]: value } : c)
      return { coupons }
    }
    return { [couponPath]: { ...(mod[couponPath] || {}), [dataKey]: value } }
  }
  const parts = dataKey.split('.')
  if (parts.length === 1) return { [dataKey]: value }
  if (parts.length === 3 && !isNaN(parts[1])) {
    const [arrKey, idxStr, propKey] = parts
    const arr = (mod[arrKey] || []).map((item, i) => i === parseInt(idxStr) ? { ...item, [propKey]: value } : item)
    return { [arrKey]: arr }
  }
  if (parts.length === 2 && !isNaN(parts[1])) {
    const [arrKey, idxStr] = parts
    const arr = (mod[arrKey] || []).map((item, i) => i === parseInt(idxStr) ? value : item)
    return { [arrKey]: arr }
  }
  return { [dataKey]: value }
}

function applyAo(layerId, opts, mod) {
  return { ...opts, ...(mod._layerStyles?.[layerId] || {}) }
}

// ── 쿠폰 레이어 빌더 ──────────────────────────────────────────
const L_CX = Math.round((DW - 270) / 2)
const L_CY = 20
const CPGAP = 139

function buildCouponUnitLayers(pfx, data, cpColor, x0, y0, couponPath) {
  const bodyW = 222, tabW = 48, cpH = 135
  const bx = x0, tx = x0 + bodyW
  const ls = [
    { id: `${pfx}_body`, type: 'shape', selectable: false, x: bx, y: y0, w: bodyW, h: cpH, fill: cpColor, borderRadius: '0px 6px 6px 0px', couponPath, dataKey: null },
    { id: `${pfx}_tab`,  type: 'shape', selectable: false, x: tx, y: y0, w: tabW,  h: cpH, fill: cpColor, borderRadius: '6px 0px 0px 6px', couponPath, dataKey: null },
    { id: `${pfx}_dot`,  type: 'dot',   selectable: false, x: tx + 0.5, y: y0 + 17.5, w: 0, h: 100, couponPath, dataKey: null },
  ]
  ls.push({ id: `${pfx}_offerName`, type: 'text', selectable: true, x: bx+16, y: y0+16, w: 190, h: 32, text: data.offerName||'', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', lineHeight: 1.3, whiteSpace: 'pre-line', wordBreak: 'keep-all', couponPath, dataKey: 'offerName' })
  ls.push(
    { id: `${pfx}_subLabel`, type: 'text', selectable: true, x: bx+16, y: y0+53,  w: 190, h: 14, text: data.subLabel||'', fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.6)', lineHeight: 1, couponPath, dataKey: 'subLabel' },
    { id: `${pfx}_amount`,   type: 'text', selectable: true, x: bx+16, y: y0+69,  w: 140, h: 28, text: data.amount||'',   fontSize: 28, fontWeight: 600, color: '#ffffff',              lineHeight: 1, couponPath, dataKey: 'amount' },
    { id: `${pfx}_unit`,     type: 'text', selectable: true, x: bx+160,y: y0+84,  w: 30,  h: 13, text: data.unit||'',     fontSize: 13, fontWeight: 700, color: '#ffffff',              lineHeight: 1, couponPath, dataKey: 'unit' },
    { id: `${pfx}_note`,     type: 'text', selectable: true, x: bx+16, y: y0+107, w: 190, h: 12, text: data.note||'',     fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.8)', lineHeight: 1, couponPath, dataKey: 'note' },
  )
  return ls
}

function getCouponLayout(mod) {
  const cpColor = mod.couponColor || '#000000'
  const bgH = mod.type === 'coupon_3' ? 453 : mod.type === 'coupon_2' ? 314 : 175
  const ls = [{ id: 'bg', type: 'shape', selectable: false, x: 0, y: 0, w: DW, h: bgH, fill: mod.bg || BG.white, dataKey: null }]
  if (mod.type === 'coupon_1a' || mod.type === 'coupon_1b' || mod.type === 'coupon_1c') {
    ls.push(...buildCouponUnitLayers('c', mod, cpColor, L_CX, L_CY, null))
  } else if (mod.type === 'coupon_2') {
    ls.push(...buildCouponUnitLayers('c1', mod.c1 || {}, cpColor, L_CX, L_CY,        'c1'))
    ls.push(...buildCouponUnitLayers('c2', mod.c2 || {}, cpColor, L_CX, L_CY+CPGAP,  'c2'))
  } else if (mod.type === 'coupon_3') {
    ;(mod.coupons || []).forEach((cp, i) => ls.push(...buildCouponUnitLayers(`cp${i}`, cp, cpColor, L_CX, L_CY + i * CPGAP, `coupons.${i}`)))
  }
  return { h: bgH, layers: ls }
}

// ── 전체 모듈 레이아웃 계산 ──────────────────────────────────
function getRawModuleLayout(mod) {
  const T  = (id, opts) => ({ id, type: 'text',  selectable: true,  ...opts })
  const S  = (id, opts) => ({ id, type: 'shape', selectable: true,  ...opts })
  const I  = (id, opts) => ({ id, type: 'image', selectable: true,  ...opts })
  const bg = (fill, h) => ({ id: 'bg', type: 'shape', selectable: false, x: 0, y: 0, w: DW, h, fill })
  const ao = (id, opts) => applyAo(id, opts, mod)

  switch (mod.type) {
    case 'header': return { h: 240, layers: [
      S('bg_rect', { x:0, y:0, w:DW, h:240, fill:'#717171', selectable:false }),
      I('img', { x:0, y:0, w:DW, h:240, value:mod.image, dataKey:'image' }),
    ]}

    case 'title_white': case 'title_blue': case 'title_dark': {
      const ls = []; let y = PV
      if (mod.flag) {
        const fw = Math.min(mod.flag.length * 9 + 24, 140)
        const fx = Math.round((DW - fw) / 2)
        ls.push(S('flag_bg', { x:fx, y, w:fw, h:26, fill:C.red, borderRadius:'4px', selectable:false }))
        ls.push(T('flag', ao('flag', { x:fx, y:y+6, w:fw, h:14, text:mod.flag, fontSize:13, fontWeight:700, color:'#fff', textAlign:'center', lineHeight:1, dataKey:'flag' })))
        y += 26 + GAP
      }
      const hlLines = (mod.headline||'').split('\n').length
      const hlH = Math.max(29, hlLines * Math.round(22 * 1.3))
      ls.push(T('headline', ao('headline', { x:PH, y, w:CW, h:hlH, text:mod.headline||'', fontSize:22, fontWeight:700, color:C.black, lineHeight:1.3, textAlign:'center', whiteSpace:'pre-line', wordBreak:'keep-all', dataKey:'headline' })))
      y += hlH + GAP
      if (mod.body) {
        const bLines = (mod.body||'').split('\n').length
        const bH = Math.max(20, bLines * Math.round(15 * 1.3))
        ls.push(T('body', ao('body', { x:PH, y, w:CW, h:bH, text:mod.body, fontSize:15, color:'#333', lineHeight:1.3, textAlign:'center', wordBreak:'keep-all', dataKey:'body' })))
        y += bH + GAP
      }
      const h = Math.max(60, y + PV - GAP)
      return { h, layers: [bg(mod.bg, h), ...ls] }
    }

    case 'title_info_white': {
      const ls = []; let y = PV
      ;(mod.rows||[]).forEach((row, i) => {
        ls.push(S(`row_bg_${i}`, { x:PH, y, w:80, h:29, fill:'#fff', borderRadius:'4px', selectable:false }))
        ls.push(T(`row_label_${i}`, ao(`row_label_${i}`, { x:PH, y:y+7, w:80, h:15, text:row.label, fontSize:12, fontWeight:700, color:C.black, textAlign:'center', lineHeight:1, dataKey:`rows.${i}.label` })))
        ls.push(T(`row_value_${i}`, ao(`row_value_${i}`, { x:PH+88, y:y+5, w:CW-88, h:20, text:row.value, fontSize:15, color:C.gray, lineHeight:1.3, dataKey:`rows.${i}.value` })))
        y += 29 + GAP
      })
      const h = Math.max(60, y + PV - GAP)
      return { h, layers: [bg(mod.bg, h), ...ls] }
    }

    case 'title_notes_card': {
      const ls = []; let y = PV + 16
      if (mod.title) {
        ls.push(T('title', ao('title', { x:PH+16, y, w:CW-32, h:20, text:mod.title, prefix:'• ', fontSize:14, fontWeight:700, color:C.black, lineHeight:1.3, dataKey:'title' })))
        y += 20 + 8
      }
      ;(mod.items||[]).forEach((item, i) => {
        const lines = Math.ceil((item||'').length / 34)
        const itemH = Math.max(18, lines * Math.round(12 * 1.3))
        ls.push(T(`item_${i}`, ao(`item_${i}`, { x:PH+16, y, w:CW-32, h:itemH, text:item, prefix:'* ', fontSize:12, color:C.lg, lineHeight:1.3, dataKey:`items.${i}` })))
        y += itemH + 6
      })
      const cardH = y - PV + 16
      const h = PV + cardH + PV
      return { h, layers: [bg(mod.bg, h), S('card', { x:PH, y:PV, w:CW, h:cardH, fill:'#fff', borderRadius:'8px', selectable:false }), ...ls] }
    }

    case 'image_blue': {
      const h = 200 + PV * 2
      return { h, layers: [
        bg(mod.bg, h),
        I('img', { x:Math.round((DW-270)/2), y:PV, w:270, h:200, value:mod.image, dataKey:'image', borderRadius:'8px' }),
      ]}
    }

    case 'info_blue': case 'info_dark': {
      const PH2 = 30, CW2 = DW - PH2 * 2
      const ls = []; let y = PV
      ;(mod.rows||[]).forEach((row, i) => {
        ls.push(S(`row_bg_${i}`, { x:PH2, y, w:80, h:29, fill:'#fff', borderRadius:'4px', selectable:false }))
        ls.push(T(`row_label_${i}`, ao(`row_label_${i}`, { x:PH2, y:y+7, w:80, h:15, text:row.label, fontSize:12, fontWeight:700, color:C.black, textAlign:'center', lineHeight:1, dataKey:`rows.${i}.label` })))
        ls.push(T(`row_value_${i}`, ao(`row_value_${i}`, { x:PH2+88, y:y+5, w:CW2-88, h:20, text:row.value, fontSize:15, color:C.gray, lineHeight:1.3, dataKey:`rows.${i}.value` })))
        y += 29 + GAP
      })
      const h = Math.max(60, y + PV - GAP)
      return { h, layers: [bg(mod.bg, h), ...ls] }
    }

    case 'notes_white': {
      const ls = []; let y = 16
      if (mod.title) {
        ls.push(T('title', ao('title', { x:PH, y, w:CW, h:20, text:mod.title, prefix:'• ', fontSize:14, fontWeight:700, color:C.black, lineHeight:1.3, dataKey:'title' })))
        y += 20 + 8
      }
      ;(mod.items||[]).forEach((item, i) => {
        const lines = Math.ceil((item||'').length / 36)
        const itemH = Math.max(16, lines * Math.round(12 * 1.3))
        ls.push(T(`item_${i}`, ao(`item_${i}`, { x:PH, y, w:CW, h:itemH, text:item, prefix:'* ', fontSize:12, color:C.lg, lineHeight:1.3, dataKey:`items.${i}` })))
        y += itemH + 4
      })
      const h = Math.max(40, y + 14)
      return { h, layers: [bg(mod.bg, h), ...ls] }
    }

    case 'table_2row': case 'table_3row': case 'table_4row': case 'table_5row': {
      const ls = []; let y = PV
      ;(mod.rows||[]).forEach((row, i) => {
        ls.push(T(`cond_${i}`, ao(`cond_${i}`, { x:PH+8, y:y+10, w:Math.round(CW*0.55), h:21, text:row.condition, fontSize:15, color:C.lg, lineHeight:1.4, dataKey:`rows.${i}.condition` })))
        ls.push(T(`amt_${i}`,  ao(`amt_${i}`,  { x:PH+Math.round(CW*0.55), y:y+10, w:Math.round(CW*0.45)-8, h:21, text:row.amount, fontSize:15, fontWeight:600, color:C.black, textAlign:'right', lineHeight:1.4, dataKey:`rows.${i}.amount` })))
        if (i < (mod.rows||[]).length - 1) ls.push(S(`line_${i}`, { x:PH, y:y+41, w:CW, h:1, fill:C.line, selectable:false }))
        y += 41
      })
      if (mod.note) {
        ls.push(T('note', ao('note', { x:PH, y:y+GAP, w:CW, h:30, text:mod.note, fontSize:12, color:C.lg, lineHeight:1.3, dataKey:'note' })))
        y += GAP + 30
      }
      const h = y + PV
      return { h, layers: [bg(mod.bg, h), ...ls] }
    }

    case 'body_b_image': {
      const cardX = Math.round((DW-327)/2), cardW = 327
      const ls = []; let y = PV + 24
      ;(mod.items||[]).forEach((item, i) => {
        ls.push(T(`label_${i}`, ao(`label_${i}`, { x:cardX+24, y, w:60, h:20, text:item.label, fontSize:14, fontWeight:700, color:C.black, lineHeight:1.3, dataKey:`items.${i}.label` })))
        ls.push(T(`value_${i}`, ao(`value_${i}`, { x:cardX+92, y, w:cardW-116, h:20, text:item.value, fontSize:14, color:C.gray, lineHeight:1.3, dataKey:`items.${i}.value` })))
        y += 20 + 8
      })
      y += 16
      ;(mod.notes||[]).forEach((note, i) => {
        ls.push(T(`note_${i}`, ao(`note_${i}`, { x:cardX+24, y, w:cardW-48, h:18, text:note, prefix:'* ', fontSize:12, color:C.lg, lineHeight:1.3, dataKey:`notes.${i}` })))
        y += 18 + 4
      })
      const cardH = y - PV + 8
      const h = PV + cardH + PV
      return { h, layers: [bg(mod.bg, h), S('card', { x:cardX, y:PV, w:cardW, h:cardH, fill:'#E5E5E5', borderRadius:'8px', selectable:false }), ...ls] }
    }

    case 'offer_3row': case 'offer_4row': case 'offer_5row': {
      const ls = []; let y = PV
      if (mod.offerType) {
        ls.push(T('offerType', ao('offerType', { x:PH, y, w:CW, h:20, text:mod.offerType, fontSize:14, fontWeight:700, color:C.black, lineHeight:1.3, dataKey:'offerType' })))
        y += 20 + GAP
      }
      ;(mod.rows||[]).forEach((row, i) => {
        ls.push(T(`cond_${i}`, ao(`cond_${i}`, { x:PH+8, y:y+10, w:Math.round(CW*0.55), h:21, text:row.condition, fontSize:15, color:C.lg, lineHeight:1.4, dataKey:`rows.${i}.condition` })))
        ls.push(T(`amt_${i}`,  ao(`amt_${i}`,  { x:PH+Math.round(CW*0.55), y:y+10, w:Math.round(CW*0.45)-8, h:21, text:row.amount, fontSize:15, fontWeight:600, color:C.black, textAlign:'right', lineHeight:1.4, dataKey:`rows.${i}.amount` })))
        if (i < (mod.rows||[]).length - 1) ls.push(S(`line_${i}`, { x:PH, y:y+41, w:CW, h:1, fill:C.line, selectable:false }))
        y += 41
      })
      const h = y + PV
      return { h, layers: [bg(mod.bg, h), ...ls] }
    }

    case 'notes_dark_4row': case 'notes_dark_5row': case 'notes_dark_6row': {
      const ls = []; let y = PV
      ;(mod.rows||[]).forEach((row, i) => {
        ls.push(T(`row_${i}`, ao(`row_${i}`, { x:PH, y, w:CW, h:20, text:row, prefix:'• ', fontSize:13, color:'#555', lineHeight:1.3, dataKey:`rows.${i}` })))
        y += 20 + 8
      })
      const h = Math.max(60, y + PV - 8)
      return { h, layers: [bg(mod.bg, h), ...ls] }
    }

    case 'timeline': {
      const ls = []; const circX = PH + 12; let y = PV
      const items = mod.items || []
      if (items.length > 1) ls.push(S('tl_line', { x:circX, y:y+12, w:1, h:(items.length-1)*52, fill:'#D9D9D9', selectable:false }))
      items.forEach((item, i) => {
        ls.push(S(`circ_${i}`, { x:circX-12, y, w:24, h:24, fill:C.black, borderRadius:'50%', selectable:false }))
        ls.push(T(`step_${i}`, ao(`step_${i}`, { x:circX-12, y:y+6, w:24, h:12, text:item.step, fontSize:10, fontWeight:700, color:'#fff', textAlign:'center', lineHeight:1, dataKey:`items.${i}.step` })))
        ls.push(T(`text_${i}`, ao(`text_${i}`, { x:PH+28, y:y+4, w:CW-28, h:20, text:item.text, fontSize:15, color:C.black, lineHeight:1.3, dataKey:`items.${i}.text` })))
        y += 52
      })
      const h = y + PV
      return { h, layers: [bg(mod.bg, h), ...ls] }
    }

    case 'coupon_1a': case 'coupon_1b': case 'coupon_1c': case 'coupon_2': case 'coupon_3':
      return getCouponLayout(mod)

    default:
      return { h: 80, layers: [{ id:'bg', type:'shape', selectable:false, x:0, y:0, w:DW, h:80, fill:'#F5F5F5' }] }
  }
}

function getModuleLayout(mod) {
  const raw = getRawModuleLayout(mod)
  const deleted = new Set(mod._deletedLayerIds || [])
  return { ...raw, layers: raw.layers.filter(l => !deleted.has(l.id)).concat(mod._extraLayers || []) }
}

// ── 색상 hex 변환 ──────────────────────────────────────────────
function toHex(color) {
  if (!color || color === 'transparent') return '#000000'
  if (color.startsWith('#')) return color.slice(0, 7)
  const m = color.match(/\d+/g)
  if (!m || m.length < 3) return '#000000'
  return '#' + m.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('')
}

// ── 플로팅 툴바 ───────────────────────────────────────────────
function FloatingToolbar({ layer, mod, onUpdateMod, onCopyLayer, onDeleteLayer }) {
  const fileRef = useRef(null)
  const toolbarH = 40
  const top  = (layer.y - toolbarH - 8) < 0 ? layer.y + layer.h + 8 : layer.y - toolbarH - 8
  const left = Math.max(0, Math.min(layer.x, DW - 280))

  const setStyle = (patch) => {
    const prev = mod._layerStyles || {}
    onUpdateMod({ _layerStyles: { ...prev, [layer.id]: { ...(prev[layer.id] || {}), ...patch } } })
  }

  const barStyle = {
    position: 'absolute', top, left, zIndex: 300,
    background: '#1E2023', borderRadius: 8, padding: '5px 8px',
    display: 'flex', alignItems: 'center', gap: 6,
    boxShadow: '0 3px 14px rgba(0,0,0,0.4)', pointerEvents: 'all', whiteSpace: 'nowrap',
  }
  const numInp = { width:40, padding:'3px 4px', textAlign:'center', borderRadius:4, border:'1px solid #444', background:'#2d3035', color:'#fff', fontSize:12, fontFamily:ff, outline:'none' }
  const sep = <div style={{ width:1, height:18, background:'#444', flexShrink:0 }} />
  const iconBtn = (label, emoji, onClick, danger) => (
    <button onClick={onClick} title={label}
      style={{ width:26, height:26, border:'none', borderRadius:4, cursor:'pointer', background:'#3a3d42',
        color: danger ? '#fc8181' : '#ddd', fontSize:12, fontFamily:ff, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {emoji}
    </button>
  )
  const copyDeleteBtns = (
    <>
      {sep}
      {iconBtn('복사 (Cmd+D)', '⧉', onCopyLayer)}
      {iconBtn('삭제 (Delete)', '✕', onDeleteLayer, true)}
    </>
  )

  if (layer.type === 'text') {
    return (
      <div style={barStyle} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <input type="number" value={layer.fontSize||14} min={8} max={80}
          onChange={e => setStyle({ fontSize: parseInt(e.target.value) || 14 })}
          style={numInp} />
        <span style={{ color:'#888', fontSize:11 }}>px</span>
        <button onClick={() => setStyle({ fontWeight: (layer.fontWeight||400) >= 700 ? 400 : 700 })}
          style={{ width:26, height:26, border:'none', borderRadius:4, cursor:'pointer', fontFamily:ff, fontSize:13, fontWeight:700,
            background: (layer.fontWeight||400) >= 700 ? '#4299E1' : '#3a3d42', color:'#fff' }}>B</button>
        <input type="color" value={toHex(layer.color || '#000000')}
          onChange={e => setStyle({ color: e.target.value })}
          style={{ width:26, height:26, padding:2, border:'1px solid #555', borderRadius:4, background:'none', cursor:'pointer' }} />
        {copyDeleteBtns}
      </div>
    )
  }

  if (layer.type === 'image') {
    return (
      <div style={barStyle} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        <button onClick={() => fileRef.current?.click()}
          style={{ padding:'3px 10px', borderRadius:4, border:'none', background:'#4299E1', color:'#fff', fontSize:11, fontFamily:ff, cursor:'pointer' }}>
          이미지 교체
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={e => {
            const file = e.target.files?.[0]
            if (!file) return
            onUpdateMod(getLayerUpdatePatch(mod, layer, URL.createObjectURL(file)))
          }} />
        {copyDeleteBtns}
      </div>
    )
  }

  if (layer.type === 'shape' && layer.selectable) {
    return (
      <div style={barStyle} onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
        {COUPON_COLORS.map(cc => (
          <div key={cc.v} title={cc.name} onClick={() => setStyle({ fill: cc.v })}
            style={{ width:18, height:18, borderRadius:3, background:cc.v, cursor:'pointer', flexShrink:0,
              border: layer.fill === cc.v ? '2px solid #4299E1' : '2px solid transparent' }} />
        ))}
        <input type="color" onChange={e => setStyle({ fill: e.target.value })}
          style={{ width:22, height:22, padding:1, border:'1px solid #555', borderRadius:3, background:'none', cursor:'pointer' }} />
        {copyDeleteBtns}
      </div>
    )
  }

  return null
}

// ── 레이어 엘리먼트 ───────────────────────────────────────────
function LayerEl({ layer, isSelected, isEditing, offset = { dx:0, dy:0 }, onDown, onDbl, onSave, onCancel, onHoverIn, onHoverOut }) {
  const x = layer.x + offset.dx
  const y = layer.y + offset.dy
  const [editText, setEditText] = useState('')

  useEffect(() => {
    if (isEditing) setEditText(layer.text || '')
  }, [isEditing, layer.id]) // eslint-disable-line

  const base = {
    position:'absolute', left:x, top:y, width:layer.w, height:layer.h,
    boxSizing:'border-box', userSelect:'none',
    cursor: layer.selectable ? (isSelected ? 'grab' : 'pointer') : 'default',
  }

  if (layer.type === 'dot') {
    return <div style={{ position:'absolute', left:layer.x, top:layer.y, width:0, height:layer.h, borderLeft:'1px dashed rgba(255,255,255,0.65)' }} />
  }
  if (layer.type === 'shape') {
    return (
      <div
        style={{ ...base, background:layer.fill||'#ccc', borderRadius:layer.borderRadius||0, border:layer.border||'none' }}
        onMouseDown={layer.selectable ? onDown : undefined}
        onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}
        onClick={e => e.stopPropagation()}
      />
    )
  }
  if (layer.type === 'image') {
    return (
      <div
        style={{ ...base, background:'#D8D8D8', borderRadius:layer.borderRadius||0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}
        onMouseDown={layer.selectable ? onDown : undefined}
        onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}
        onClick={e => e.stopPropagation()}
      >
        {layer.value
          ? <img src={layer.value} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
          : <span style={{ fontSize:11, color:'#999', fontFamily:ff }}>이미지</span>}
      </div>
    )
  }
  if (layer.type === 'text') {
    return (
      <div
        style={{ ...base, overflow:'hidden' }}
        onMouseDown={layer.selectable ? onDown : undefined}
        onDoubleClick={layer.selectable ? onDbl : undefined}
        onMouseEnter={onHoverIn} onMouseLeave={onHoverOut}
        onClick={e => e.stopPropagation()}
      >
        {isEditing ? (
          <textarea
            autoFocus
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onBlur={() => onSave(editText)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(editText) }
              if (e.key === 'Escape') { e.preventDefault(); onCancel() }
            }}
            style={{
              position:'absolute', inset:0, width:'100%', height:'100%', resize:'none',
              border:'2px solid #4299E1', borderRadius:2, padding:'0 2px', outline:'none',
              background:'rgba(255,255,255,0.95)', fontFamily:ff,
              fontSize:layer.fontSize, fontWeight:layer.fontWeight||400,
              color:'#000', lineHeight:layer.lineHeight||1.3,
            }}
          />
        ) : (
          <div style={{
            width:'100%', height:'100%', fontFamily:ff,
            fontSize:layer.fontSize, fontWeight:layer.fontWeight||400,
            color:layer.color||C.black, lineHeight:layer.lineHeight||1.3,
            textAlign:layer.textAlign||'left',
            whiteSpace:layer.whiteSpace||'normal', wordBreak:layer.wordBreak||'break-all',
            overflow:'hidden',
          }}>
            {(layer.prefix || '') + (layer.text || '')}
          </div>
        )}
      </div>
    )
  }
  return null
}

// ── 유니버설 모듈 뷰 ─────────────────────────────────────────
function UniversalModuleView({ mod, selLayerId, editLayerId, onBgClick, onLayerDown, onDbl, onSave, onCancel, layerOffsets, onUpdateMod, onCopyLayer, onDeleteLayer }) {
  const { layers, h } = getModuleLayout(mod)
  const [hoveredLayerId, setHoveredLayerId] = useState(null)

  const selectedLayer = selLayerId ? layers.find(l => l.id === selLayerId) : null
  const resolvedSelLayer = selectedLayer
    ? {
        ...selectedLayer,
        ...(mod._layerStyles?.[selectedLayer.id] || {}),
        x: selectedLayer.x + (layerOffsets[`${mod.id}_${selectedLayer.id}`]?.dx || 0),
        y: selectedLayer.y + (layerOffsets[`${mod.id}_${selectedLayer.id}`]?.dy || 0),
      }
    : null

  const hoveredLayer = hoveredLayerId && hoveredLayerId !== selLayerId
    ? layers.find(l => l.id === hoveredLayerId && l.selectable)
    : null

  return (
    <div style={{ position:'relative', width:DW, height:h, flexShrink:0, overflow:'visible' }} onClick={onBgClick}>
      {layers.map(layer => {
        const key = `${mod.id}_${layer.id}`
        const offset = layerOffsets[key] || { dx:0, dy:0 }
        const resolvedLayer = { ...layer, ...(mod._layerStyles?.[layer.id] || {}) }
        return (
          <LayerEl
            key={layer.id}
            layer={resolvedLayer}
            isSelected={false}
            isEditing={editLayerId === layer.id}
            offset={offset}
            onDown={e => { e.stopPropagation(); onLayerDown(e, mod.id, layer.id) }}
            onDbl={e => { e.stopPropagation(); onDbl(mod.id, layer.id) }}
            onSave={val => onSave(mod.id, layer, val)}
            onCancel={onCancel}
            onHoverIn={layer.selectable ? () => setHoveredLayerId(layer.id) : undefined}
            onHoverOut={layer.selectable ? () => setHoveredLayerId(null) : undefined}
          />
        )
      })}
      {/* 레이어 hover 오버레이 (dashed blue) */}
      {hoveredLayer && (
        <div style={{ position:'absolute', left:hoveredLayer.x, top:hoveredLayer.y, width:hoveredLayer.w, height:hoveredLayer.h,
          border:'1px dashed #2F80ED', borderRadius:2, pointerEvents:'none', boxSizing:'border-box', zIndex:100 }} />
      )}
      {/* 레이어 선택 오버레이 (solid blue) */}
      {resolvedSelLayer && !editLayerId && (
        <div style={{ position:'absolute', left:resolvedSelLayer.x, top:resolvedSelLayer.y, width:resolvedSelLayer.w, height:resolvedSelLayer.h,
          border:'2px solid #2F80ED', borderRadius:2, pointerEvents:'none', boxSizing:'border-box', zIndex:101 }} />
      )}
      {/* selectable layer에 플로팅 툴바 표시 */}
      {resolvedSelLayer && !editLayerId && resolvedSelLayer.selectable && (
        <FloatingToolbar
          layer={resolvedSelLayer} mod={mod}
          onUpdateMod={patch => onUpdateMod(mod.id, patch)}
          onCopyLayer={() => onCopyLayer(mod.id, resolvedSelLayer.id)}
          onDeleteLayer={() => onDeleteLayer(mod.id, resolvedSelLayer.id)}
        />
      )}
    </div>
  )
}

// ── 모듈 썸네일 ───────────────────────────────────────────────
const THUMB_W = 80, THUMB_H = 72
const SCALE_T = THUMB_W / DW

function ModuleThumbnail({ type, label, onClick }) {
  const defMod = makeModule(type)
  return (
    <button onClick={onClick} title={label}
      style={{ flexShrink:0, width:THUMB_W+4, display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'none', border:'none', cursor:'pointer', padding:'4px 2px' }}>
      <div style={{ width:THUMB_W, height:THUMB_H, overflow:'hidden', borderRadius:4, border:'1px solid #DDE0E4', position:'relative', background:'#fff', flexShrink:0 }}>
        <div style={{ transform:`scale(${SCALE_T})`, transformOrigin:'top left', width:DW, pointerEvents:'none' }}>
          <UniversalModuleView
            mod={defMod} selLayerId={null} editLayerId={null}
            onBgClick={()=>{}} onLayerDown={()=>{}} onDbl={()=>{}} onSave={()=>{}} onCancel={()=>{}}
            layerOffsets={{}} onUpdateMod={()=>{}}
          />
        </div>
      </div>
      <span style={{ fontSize:9, color:'#666', fontFamily:ff, textAlign:'center', lineHeight:1.2, maxWidth:THUMB_W+4, wordBreak:'keep-all' }}>{label}</span>
    </button>
  )
}

function CtrlBtn({ icon: Icon, label, onClick, danger }) {
  return (
    <button onClick={onClick} title={label}
      style={{ width:28, height:28, border:'none', borderRadius:5, background:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:danger?'#e53e3e':'#666' }}>
      <Icon size={14} />
    </button>
  )
}

const COUPON_TYPES = new Set(['coupon_1a','coupon_1b','coupon_1c','coupon_2','coupon_3'])

// ── 메인 에디터 ───────────────────────────────────────────────
export default function CouponEditor({ onBack }) {
  const [modules, setModules] = useState([
    makeModule('header'),
    makeModule('title_white'),
    makeModule('coupon_1a'),
  ])
  const [selectedId,  setSelectedId]  = useState(null)
  const [selLayerId,  setSelLayerId]  = useState(null)
  const [editLayerId, setEditLayerId] = useState(null)
  const [layerOffsets, setLayerOffsets] = useState({})
  const [hoveredModId, setHoveredModId] = useState(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const dragRef        = useRef(null)
  const undoStack      = useRef([])
  const redoStack      = useRef([])
  const modulesRef     = useRef(modules)
  const layerOffsetsRef = useRef(layerOffsets)
  const editLayerIdRef  = useRef(editLayerId)

  useEffect(() => { modulesRef.current = modules },      [modules])
  useEffect(() => { layerOffsetsRef.current = layerOffsets }, [layerOffsets])
  useEffect(() => { editLayerIdRef.current = editLayerId },   [editLayerId])

  const pushHistory = (snapModules, snapOffsets) => {
    undoStack.current = [...undoStack.current, { modules: snapModules, layerOffsets: snapOffsets }].slice(-MAX_HISTORY)
    redoStack.current = []
    setCanUndo(true)
    setCanRedo(false)
  }

  const undo = () => {
    if (!undoStack.current.length) return
    const snap = undoStack.current[undoStack.current.length - 1]
    undoStack.current = undoStack.current.slice(0, -1)
    redoStack.current = [...redoStack.current, { modules: modulesRef.current, layerOffsets: layerOffsetsRef.current }]
    setModules(snap.modules)
    setLayerOffsets(snap.layerOffsets)
    setSelLayerId(prev => {
      const allLayerIds = snap.modules.flatMap(m => getModuleLayout(m).layers.map(l => l.id))
      return allLayerIds.includes(prev) ? prev : null
    })
    setCanUndo(undoStack.current.length > 0)
    setCanRedo(true)
  }

  const redo = () => {
    if (!redoStack.current.length) return
    const snap = redoStack.current[redoStack.current.length - 1]
    redoStack.current = redoStack.current.slice(0, -1)
    undoStack.current = [...undoStack.current, { modules: modulesRef.current, layerOffsets: layerOffsetsRef.current }]
    setModules(snap.modules)
    setLayerOffsets(snap.layerOffsets)
    setSelLayerId(prev => {
      const allLayerIds = snap.modules.flatMap(m => getModuleLayout(m).layers.map(l => l.id))
      return allLayerIds.includes(prev) ? prev : null
    })
    setCanUndo(true)
    setCanRedo(redoStack.current.length > 0)
  }

  // 키보드 단축키 (ref 기반으로 stale closure 없음)
  const selectedIdRef  = useRef(selectedId)
  const selLayerIdRef  = useRef(selLayerId)
  useEffect(() => { selectedIdRef.current = selectedId },  [selectedId])
  useEffect(() => { selLayerIdRef.current = selLayerId },  [selLayerId])

  useEffect(() => {
    const onKey = (e) => {
      if (editLayerIdRef.current) return  // 텍스트 편집 중엔 브라우저 기본 동작 유지
      const ctrl = e.metaKey || e.ctrlKey

      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (ctrl && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) { e.preventDefault(); redo(); return }

      // Cmd/Ctrl+D: 선택 레이어 복제
      if (ctrl && e.key === 'd') {
        const modId = selectedIdRef.current
        const layId = selLayerIdRef.current
        if (modId && layId) { e.preventDefault(); copyLayer(modId, layId) }
        return
      }

      // Delete / Backspace: 선택 레이어 삭제
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const modId = selectedIdRef.current
        const layId = selLayerIdRef.current
        if (modId && layId) { e.preventDefault(); deleteLayer(modId, layId) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return
      const { key, startX, startY, origDx, origDy } = dragRef.current
      setLayerOffsets(prev => ({ ...prev, [key]: { dx: origDx + (e.clientX - startX), dy: origDy + (e.clientY - startY) } }))
    }
    const onUp = () => {
      if (!dragRef.current) return
      const { key, origDx, origDy, snapModules, snapOffsets } = dragRef.current
      const cur = layerOffsetsRef.current[key] || { dx:0, dy:0 }
      if (cur.dx !== origDx || cur.dy !== origDy) {
        pushHistory(snapModules, snapOffsets)
      }
      dragRef.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const updateModule = (id, patch) => {
    pushHistory(modulesRef.current, layerOffsetsRef.current)
    setModules(prev => prev.map(m => m.id === id ? { ...m, ...patch } : m))
  }

  const handleLayerDown = (e, modId, layerId) => {
    if (editLayerId) return
    e.preventDefault()
    setSelectedId(modId); setSelLayerId(layerId)
    const key = `${modId}_${layerId}`
    const orig = layerOffsets[key] || { dx:0, dy:0 }
    dragRef.current = { key, startX:e.clientX, startY:e.clientY, origDx:orig.dx, origDy:orig.dy, snapModules: modulesRef.current, snapOffsets: layerOffsetsRef.current }
  }

  const handleDbl = (modId, layerId) => {
    const mod = modules.find(m => m.id === modId)
    if (!mod) return
    const { layers } = getModuleLayout(mod)
    const layer = layers.find(l => l.id === layerId)
    if (layer?.type === 'text') {
      pushHistory(modulesRef.current, layerOffsetsRef.current)
      setEditLayerId(layerId)
    }
  }

  const handleSave = (modId, layer, value) => {
    const mod = modules.find(m => m.id === modId)
    if (!mod) return
    if (!layer.dataKey) {
      // _extraLayers에 속한 레이어는 직접 업데이트
      setModules(prev => prev.map(m => {
        if (m.id !== modId) return m
        return { ...m, _extraLayers: (m._extraLayers || []).map(l => l.id === layer.id ? { ...l, text: value } : l) }
      }))
    } else {
      setModules(prev => prev.map(m => m.id === modId ? { ...m, ...getLayerUpdatePatch(mod, layer, value) } : m))
    }
    setEditLayerId(null)
  }

  const copyLayer = (modId, layerId) => {
    const mod = modules.find(m => m.id === modId)
    if (!mod) return
    const { layers } = getModuleLayout(mod)
    const layer = layers.find(l => l.id === layerId)
    if (!layer || !layer.selectable) return
    pushHistory(modulesRef.current, layerOffsetsRef.current)
    const newId = uid()
    const newLayer = { ...layer, id: newId, x: layer.x + 12, y: layer.y + 12, dataKey: null }
    setModules(prev => prev.map(m => m.id === modId
      ? { ...m, _extraLayers: [...(m._extraLayers || []), newLayer] }
      : m
    ))
    setSelLayerId(newId)
  }

  const deleteLayer = (modId, layerId) => {
    const mod = modules.find(m => m.id === modId)
    if (!mod) return
    const { layers } = getModuleLayout(mod)
    const layer = layers.find(l => l.id === layerId)
    if (!layer || !layer.selectable) return
    pushHistory(modulesRef.current, layerOffsetsRef.current)
    const isExtra = (mod._extraLayers || []).some(l => l.id === layerId)
    if (isExtra) {
      setModules(prev => prev.map(m => m.id === modId
        ? { ...m, _extraLayers: (m._extraLayers || []).filter(l => l.id !== layerId) }
        : m
      ))
    } else {
      setModules(prev => prev.map(m => m.id === modId
        ? { ...m, _deletedLayerIds: [...(m._deletedLayerIds || []), layerId] }
        : m
      ))
    }
    setSelLayerId(null)
    setEditLayerId(null)
  }

  const selectedMod = modules.find(m => m.id === selectedId)
  const selIdx = modules.findIndex(m => m.id === selectedId)
  const selModLayout = selectedMod ? getModuleLayout(selectedMod) : null
  const selLayer = selModLayout && selLayerId ? selModLayout.layers.find(l => l.id === selLayerId) : null

  const addModule = (type) => {
    pushHistory(modulesRef.current, layerOffsetsRef.current)
    const m = makeModule(type)
    setModules(prev => {
      if (selectedId) { const idx = prev.findIndex(x => x.id === selectedId); const next = [...prev]; next.splice(idx+1, 0, m); return next }
      return [...prev, m]
    })
    setSelectedId(m.id); setSelLayerId(null)
  }

  const moveUp = () => {
    if (selIdx <= 0) return
    pushHistory(modulesRef.current, layerOffsetsRef.current)
    setModules(prev => { const a=[...prev]; [a[selIdx-1],a[selIdx]]=[a[selIdx],a[selIdx-1]]; return a })
  }
  const moveDown = () => {
    if (selIdx<0||selIdx>=modules.length-1) return
    pushHistory(modulesRef.current, layerOffsetsRef.current)
    setModules(prev => { const a=[...prev]; [a[selIdx],a[selIdx+1]]=[a[selIdx+1],a[selIdx]]; return a })
  }
  const copyMod = () => {
    if (!selectedMod) return
    pushHistory(modulesRef.current, layerOffsetsRef.current)
    const c={...selectedMod,id:uid()}
    setModules(prev=>{const a=[...prev];a.splice(selIdx+1,0,c);return a})
    setSelectedId(c.id)
  }
  const deleteMod = () => {
    if (!selectedMod) return
    pushHistory(modulesRef.current, layerOffsetsRef.current)
    setModules(prev=>prev.filter(m=>m.id!==selectedId))
    setSelectedId(null); setSelLayerId(null); setEditLayerId(null)
  }

  const groups = [...new Set(MODULE_DEFS.map(d => d.group))]

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'#F0F2F5', fontFamily:ff }}>
      {/* 헤더 */}
      <div style={{ height:52, background:'#fff', borderBottom:'1px solid #E4E6EA', display:'flex', alignItems:'center', padding:'0 16px', gap:12, flexShrink:0 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer', color:'#555', display:'flex', alignItems:'center', gap:6, fontSize:13, fontFamily:ff }}>
          <ArrowLeft size={16} /> 나가기
        </button>
        <div style={{ display:'flex', gap:2 }}>
          <button onClick={undo} disabled={!canUndo} title="실행 취소 (Cmd+Z)"
            style={{ width:32, height:32, border:'none', borderRadius:6, background:'none', cursor:canUndo?'pointer':'default',
              color:canUndo?'#333':'#C0C4CC', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Undo2 size={16} />
          </button>
          <button onClick={redo} disabled={!canRedo} title="다시 실행 (Cmd+Shift+Z)"
            style={{ width:32, height:32, border:'none', borderRadius:6, background:'none', cursor:canRedo?'pointer':'default',
              color:canRedo?'#333':'#C0C4CC', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Redo2 size={16} />
          </button>
        </div>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:14, fontWeight:700, color:'#1E2023' }}>쿠폰 프로모션 에디터</span>
        <div style={{ flex:1 }} />
        <button style={{ padding:'6px 16px', borderRadius:8, border:'none', background:'#1E2023', color:'#fff', fontSize:13, fontFamily:ff, cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          <Download size={14} /> 다운로드
        </button>
      </div>

      <div style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* 좌측 패널 */}
        <div style={{ width:220, background:'#fff', borderRight:'1px solid #E4E6EA', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
          <div style={{ padding:'10px 14px', borderBottom:'1px solid #F0F0F0', fontSize:11, fontWeight:700, color:'#888', letterSpacing:'0.05em' }}>모듈 목록</div>
          <div style={{ flex:1, overflowY:'auto', padding:'6px 8px' }}>
            {modules.map((mod, i) => {
              const def = MODULE_DEFS.find(d => d.type === mod.type)
              const isSel = mod.id === selectedId
              return (
                <div key={mod.id}
                  onClick={() => { setSelectedId(mod.id); setSelLayerId(null); setEditLayerId(null) }}
                  style={{ padding:'7px 10px', borderRadius:6, marginBottom:2, cursor:'pointer',
                    background:isSel?'#E0EEFF':'transparent', border:isSel?'1.5px solid #2B8EFF':'1px solid transparent',
                    display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#222' }}>{def?.label||mod.type}</div>
                    <div style={{ fontSize:10, color:'#999', marginTop:1 }}>#{i+1}</div>
                  </div>
                  {isSel && (
                    <div style={{ display:'flex', gap:1, flexShrink:0 }}>
                      <CtrlBtn icon={ChevronUp}   label="위로" onClick={e=>{e.stopPropagation();moveUp()}} />
                      <CtrlBtn icon={ChevronDown} label="아래" onClick={e=>{e.stopPropagation();moveDown()}} />
                      <CtrlBtn icon={Copy}        label="복사" onClick={e=>{e.stopPropagation();copyMod()}} />
                      <CtrlBtn icon={Trash2}      label="삭제" onClick={e=>{e.stopPropagation();deleteMod()}} danger />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {selectedMod && COUPON_TYPES.has(selectedMod.type) && (() => {
            const isCustom = selectedMod.couponColor && !COUPON_COLORS.find(cc => cc.v === selectedMod.couponColor)
            const customColor = isCustom ? selectedMod.couponColor : (selectedMod._customColor || '#FF6A00')
            return (
              <div style={{ padding:'10px 14px', borderTop:'1px solid #F0F0F0' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#888', marginBottom:8, letterSpacing:'0.05em' }}>쿠폰 색상</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {COUPON_COLORS.map(cc => (
                    <div key={cc.v} title={cc.name} onClick={() => updateModule(selectedId, { couponColor: cc.v })}
                      style={{ width:26, height:26, borderRadius:6, background:cc.v, cursor:'pointer',
                        border: selectedMod.couponColor === cc.v ? '3px solid #2F80ED' : '2px solid rgba(0,0,0,0.1)' }} />
                  ))}
                  {/* 커스텀 컬러칩 */}
                  <div style={{ position:'relative', width:26, height:26, flexShrink:0 }}>
                    <div title="직접 선택"
                      style={{ width:26, height:26, borderRadius:6, cursor:'pointer', boxSizing:'border-box',
                        background: isCustom ? selectedMod.couponColor : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                        border: isCustom ? '3px solid #2F80ED' : '2px solid rgba(0,0,0,0.1)',
                        display:'flex', alignItems:'center', justifyContent:'center' }}
                      onClick={() => document.getElementById(`custom-color-${selectedId}`)?.click()}
                    >
                      {!isCustom && <span style={{ fontSize:14, fontWeight:700, color:'#fff', textShadow:'0 0 2px rgba(0,0,0,0.5)', lineHeight:1 }}>+</span>}
                    </div>
                    <input id={`custom-color-${selectedId}`} type="color" value={customColor}
                      style={{ position:'absolute', inset:0, opacity:0, width:'100%', height:'100%', cursor:'pointer', padding:0, border:'none' }}
                      onChange={e => updateModule(selectedId, { couponColor: e.target.value, _customColor: e.target.value })} />
                  </div>
                </div>
              </div>
            )
          })()}

          {selLayer && (
            <div style={{ padding:'10px 14px', borderTop:'1px solid #F0F0F0', background:'#F8F9FA' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#555', marginBottom:4 }}>선택된 레이어</div>
              <div style={{ fontSize:11, color:'#888' }}>
                {selLayer.type === 'text' ? '텍스트 · 더블클릭 편집' : selLayer.type === 'image' ? '이미지' : '도형'}
              </div>
            </div>
          )}
        </div>

        {/* 캔버스 */}
        <div
          style={{ flex:1, overflowY:'auto', display:'flex', justifyContent:'center', padding:'32px 0 200px' }}
          onClick={() => { if (!editLayerId) setSelLayerId(null) }}
        >
          <div style={{ width:DW }}>
            {modules.map(mod => {
              const isSel = mod.id === selectedId
              const isHov = !isSel && mod.id === hoveredModId
              return (
                <div key={mod.id}
                  style={{ position:'relative', cursor:'pointer' }}
                  onMouseEnter={() => setHoveredModId(mod.id)}
                  onMouseLeave={() => setHoveredModId(null)}
                  onClick={e => { e.stopPropagation(); setSelectedId(mod.id); setSelLayerId(null); setEditLayerId(null) }}
                >
                  {/* 모듈 hover 오버레이 (dashed orange) */}
                  {isHov && (
                    <div style={{ position:'absolute', inset:0, border:'1px dashed #F15A24', pointerEvents:'none', zIndex:200, boxSizing:'border-box' }} />
                  )}
                  {/* 모듈 선택 오버레이 (solid orange 2px) */}
                  {isSel && (
                    <div style={{ position:'absolute', inset:0, border:'2px solid #F15A24', pointerEvents:'none', zIndex:200, boxSizing:'border-box' }} />
                  )}
                  {/* 조각 선택 라벨 */}
                  {isSel && !selLayerId && (
                    <div style={{ position:'absolute', top:-20, left:0, zIndex:210, background:'#F15A24', color:'#fff', fontSize:9, padding:'2px 6px', borderRadius:'4px 4px 0 0', fontFamily:ff, pointerEvents:'none', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>
                      조각 선택 중
                    </div>
                  )}
                  {/* 요소 편집 라벨 */}
                  {isSel && selLayerId && (
                    <div style={{ position:'absolute', top:-20, left:0, zIndex:210, background:'#2F80ED', color:'#fff', fontSize:9, padding:'2px 6px', borderRadius:'4px 4px 0 0', fontFamily:ff, pointerEvents:'none', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>
                      요소 편집 중
                    </div>
                  )}
                  <UniversalModuleView
                    mod={mod}
                    selLayerId={isSel ? selLayerId : null}
                    editLayerId={isSel ? editLayerId : null}
                    onBgClick={e => { e.stopPropagation(); setSelectedId(mod.id); setSelLayerId(null); setEditLayerId(null) }}
                    onLayerDown={handleLayerDown}
                    onDbl={handleDbl}
                    onSave={handleSave}
                    onCancel={() => setEditLayerId(null)}
                    layerOffsets={layerOffsets}
                    onUpdateMod={updateModule}
                    onCopyLayer={copyLayer}
                    onDeleteLayer={deleteLayer}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 하단 썸네일 바 */}
      <div style={{ height:118, background:'#fff', borderTop:'1px solid #E4E6EA', display:'flex', flexDirection:'column', flexShrink:0 }}>
        <div style={{ flex:1, overflowX:'auto', display:'flex', alignItems:'center', padding:'0 12px', gap:8 }}>
          {groups.map(group => {
            const defs = MODULE_DEFS.filter(d => d.group === group)
            return (
              <div key={group} style={{ display:'flex', alignItems:'center', gap:2, flexShrink:0 }}>
                <div style={{ fontSize:9, color:'#bbb', fontWeight:700, writingMode:'vertical-rl', marginRight:2, letterSpacing:'0.06em' }}>{group}</div>
                {defs.map(def => (
                  <ModuleThumbnail key={def.type} type={def.type} label={def.label} onClick={() => addModule(def.type)} />
                ))}
                <div style={{ width:1, height:56, background:'#EAEAEA', flexShrink:0, marginLeft:6 }} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
