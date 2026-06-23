import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, Grid3x3, List, Download, Edit3, Filter,
  Calendar, ChevronDown, Star, X, RotateCcw, Trash2,
  Layers, BookImage, CalendarRange, Sparkles, Image, BellDot, ChevronRight,
  Folder, FolderOpen, FolderPlus, MoreHorizontal, Pencil,
} from 'lucide-react'
import { getAllContents } from '../utils/contentStorage'
import { renderCouponToDataUrl } from '../utils/couponExport'
import { renderStandardToDataUrl } from '../utils/standardExport'

// ─── 상수 ────────────────────────────────────────────────────────────────────

const CATEGORIES = ['전체', '배너', '브랜드애셋', '기획전', '이벤트·상세', '상품이미지', '메인공지팝업']
const FORMATS    = ['전체', 'JPG', 'PNG']
const STATUSES   = ['전체', '완료', '편집중']
const FAVORITES  = ['전체', '즐겨찾기만']
const SORTS      = ['최신순', '오래된순', '이름순', '즐겨찾기순']


const DATE_OPTIONS = [
  { label: '전체 기간', value: 'all' },
  { label: '오늘',      value: 'today' },
  { label: '최근 7일',  value: '7days' },
  { label: '최근 30일', value: '30days' },
  { label: '이번 달',   value: 'this_month' },
  { label: '지난 달',   value: 'last_month' },
]

const CATEGORY_ICONS = {
  '배너':        Layers,
  '브랜드애셋':  BookImage,
  '기획전':      CalendarRange,
  '이벤트·상세': Sparkles,
  '상품이미지':  Image,
  '메인공지팝업': BellDot,
}

const CATEGORY_COLORS = {
  '배너':        { hex: '#F15A24', light: '#FFF0E5' },
  '브랜드애셋':  { hex: '#F6A23A', light: '#FFF7EF' },
  '기획전':      { hex: '#F15A24', light: '#FFF0E5' },
  '이벤트·상세': { hex: '#F6A23A', light: '#FFF7EF' },
  '상품이미지':  { hex: '#F6A23A', light: '#FFF7EF' },
  '메인공지팝업': { hex: '#F6A23A', light: '#FFF7EF' },
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────

function getDateRange(value) {
  const now   = new Date()
  const start = new Date()
  if (value === 'today')      { start.setHours(0, 0, 0, 0); return { from: start, to: now } }
  if (value === '7days')      { start.setDate(now.getDate() - 7); return { from: start, to: now } }
  if (value === '30days')     { start.setDate(now.getDate() - 30); return { from: start, to: now } }
  if (value === 'this_month') { start.setDate(1); start.setHours(0, 0, 0, 0); return { from: start, to: now } }
  if (value === 'last_month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to:   new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
    }
  }
  return null
}

function statusLabel(s) {
  return s === 'editing' ? '편집중' : '완료'
}

// handleEditItem은 MyContent 컴포넌트 내부로 이동 (useNavigate 사용)

// ─── 훅 ──────────────────────────────────────────────────────────────────────

function useOutsideClick(ref, handler) {
  useEffect(() => {
    function listener(e) {
      if (ref.current && !ref.current.contains(e.target)) handler()
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [ref, handler])
}

// ─── 체크박스 (indeterminate 지원) ──────────────────────────────────────────

function Checkbox({ checked, indeterminate = false, onChange, onClick, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={onClick}
      className={`w-4 h-4 rounded border-gray-300 accent-blue-600 cursor-pointer ${className}`}
    />
  )
}

// ─── 폴더로 이동 드롭다운 ─────────────────────────────────────────────────────

function MoveToFolderButton({ folders, onMove }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOutsideClick(ref, () => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 text-sm text-blue-700 font-medium hover:text-blue-900 transition-colors"
      >
        <Folder className="w-3.5 h-3.5" />
        폴더로 이동
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-44 bg-white rounded-xl border border-gray-100 shadow-lg z-50 py-1">
          <button
            onClick={() => { onMove(null); setOpen(false) }}
            className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 italic"
          >
            폴더 없음 (해제)
          </button>
          {folders.length > 0 && <div className="h-px bg-gray-100 mx-2" />}
          {folders.map(f => (
            <button
              key={f.id}
              onClick={() => { onMove(f.id); setOpen(false) }}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{f.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 선택 액션바 ─────────────────────────────────────────────────────────────

function SelectionBar({ count, onDownload, onDelete, folders, onMoveToFolder }) {
  return (
    <div className="px-6 py-2 flex items-center gap-3 bg-blue-50 border-b border-blue-100">
      <span className="text-sm font-semibold text-blue-700">{count}개 선택</span>
      <div className="h-4 w-px bg-blue-200" />
      <button
        onClick={onDownload}
        className="flex items-center gap-1.5 text-sm text-blue-700 font-medium hover:text-blue-900 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
        다운로드
      </button>
      <div className="h-4 w-px bg-blue-200" />
      <MoveToFolderButton folders={folders} onMove={onMoveToFolder} />
      <div className="h-4 w-px bg-blue-200" />
      <button
        onClick={onDelete}
        className="flex items-center gap-1.5 text-sm text-red-600 font-medium hover:text-red-800 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        삭제
      </button>
    </div>
  )
}

// ─── 폴더 카드 ───────────────────────────────────────────────────────────────

function FolderCard({ folder, count, onClick, onRename, onDelete }) {
  const [menuOpen, setMenuOpen]   = useState(false)
  const [renaming, setRenaming]   = useState(false)
  const [nameInput, setNameInput] = useState(folder.name)
  const menuRef  = useRef(null)
  const inputRef = useRef(null)

  useOutsideClick(menuRef, () => setMenuOpen(false))
  useEffect(() => { if (renaming && inputRef.current) inputRef.current.focus() }, [renaming])

  function confirmRename() {
    const v = nameInput.trim()
    if (v) onRename(folder.id, v)
    else setNameInput(folder.name)
    setRenaming(false)
  }

  return (
    <div className="relative group">
      <button
        onClick={renaming ? undefined : onClick}
        className="w-full flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50/40 transition-all text-left"
      >
        <FolderOpen className="w-8 h-8 text-amber-400" />
        {renaming ? (
          <input
            ref={inputRef}
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') { setRenaming(false); setNameInput(folder.name) } }}
            onBlur={confirmRename}
            onClick={e => e.stopPropagation()}
            className="w-full text-xs text-center border border-purple-300 rounded px-1 py-0.5 outline-none focus:ring-1 ring-purple-400 bg-white"
          />
        ) : (
          <span className="text-xs font-medium text-gray-700 truncate w-full text-center leading-tight">
            {folder.name}
          </span>
        )}
        <span className="text-[10px] text-gray-400 tabular-nums">{count}개</span>
      </button>

      {/* 3-dot 메뉴 */}
      <div ref={menuRef} className="absolute top-1.5 right-1.5 z-10">
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(p => !p) }}
          className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 transition-opacity"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-6 w-28 bg-white rounded-lg border border-gray-100 shadow-lg py-1">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(false); setRenaming(true); setNameInput(folder.name) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="w-3 h-3" />이름 변경
            </button>
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete(folder.id) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />삭제
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 폴더 섹션 (루트에서만 표시) ─────────────────────────────────────────────

function FolderSection({ folders, items, onFolderClick, onCreate, onRename, onDelete }) {
  const [creating, setCreating] = useState(false)
  const [newName,  setNewName]  = useState('')
  const newInputRef = useRef(null)

  useEffect(() => { if (creating && newInputRef.current) newInputRef.current.focus() }, [creating])

  function confirmCreate() {
    const v = newName.trim()
    if (v) onCreate(v)
    setCreating(false)
    setNewName('')
  }

  const folderCount = fid => items.filter(it => it.folderId === fid).length

  return (
    <div className="px-6 pt-4 pb-3 border-b border-gray-100">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">폴더</span>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1 text-xs text-purple-600 font-medium hover:text-purple-700 transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" />새 폴더
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
        {folders.map(f => (
          <FolderCard
            key={f.id}
            folder={f}
            count={folderCount(f.id)}
            onClick={() => onFolderClick(f.id)}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
        {creating && (
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50/30">
            <FolderPlus className="w-8 h-8 text-purple-400" />
            <input
              ref={newInputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmCreate(); if (e.key === 'Escape') { setCreating(false); setNewName('') } }}
              onBlur={confirmCreate}
              placeholder="폴더 이름"
              className="w-full text-xs text-center border border-purple-300 rounded px-1 py-0.5 outline-none focus:ring-1 ring-purple-400 bg-white"
            />
            <span className="text-[10px] text-gray-400">0개</span>
          </div>
        )}
        {folders.length === 0 && !creating && (
          <div className="col-span-full text-xs text-gray-400 py-2">
            폴더가 없습니다. <button onClick={() => setCreating(true)} className="text-purple-500 underline">새 폴더 만들기</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 드롭다운: 날짜 ──────────────────────────────────────────────────────────

function DateDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOutsideClick(ref, () => setOpen(false))
  const label = DATE_OPTIONS.find(o => o.value === value)?.label ?? '전체 기간'
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors"
      >
        <Calendar className="w-3.5 h-3.5" />
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-40 bg-white rounded-xl border border-gray-100 shadow-lg z-50 py-1">
          {DATE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                value === opt.value ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 드롭다운: 정렬 ──────────────────────────────────────────────────────────

function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useOutsideClick(ref, () => setOpen(false))
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-gray-300 transition-colors"
      >
        {value}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-36 bg-white rounded-xl border border-gray-100 shadow-lg z-50 py-1">
          {SORTS.map(s => (
            <button
              key={s}
              onClick={() => { onChange(s); setOpen(false) }}
              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                value === s ? 'bg-purple-50 text-purple-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 팝오버: 상세 필터 ───────────────────────────────────────────────────────

function FilterPopover({ filters, onApply }) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState(filters)
  const ref = useRef(null)
  useOutsideClick(ref, () => setOpen(false))

  const activeCount = [
    filters.category !== '전체',
    filters.format !== '전체',
    filters.status !== '전체',
    filters.favorite !== '전체',
  ].filter(Boolean).length

  const set = (key, val) => setLocal(p => ({ ...p, [key]: val }))

  function handleApply() { onApply(local); setOpen(false) }
  function handleReset() {
    const reset = { category: '전체', format: '전체', status: '전체', favorite: '전체' }
    setLocal(reset); onApply(reset); setOpen(false)
  }

  const ChipGroup = ({ label, options, field }) => (
    <div>
      <p className="text-xs font-semibold text-gray-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => set(field, opt)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              local[field] === opt
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => { setLocal(filters); setOpen(p => !p) }}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium border transition-colors ${
          activeCount > 0 ? 'bg-purple-50 border-purple-300 text-purple-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        필터
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] flex items-center justify-center font-bold">
            {activeCount}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-xl border border-gray-100 shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">상세 필터</span>
            <button onClick={() => setOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <div className="p-4 space-y-4">
            <ChipGroup label="카테고리" options={CATEGORIES} field="category" />
            <ChipGroup label="파일 형식" options={FORMATS} field="format" />
            <ChipGroup label="상태" options={STATUSES} field="status" />
            <ChipGroup label="즐겨찾기" options={FAVORITES} field="favorite" />
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />초기화
            </button>
            <button
              onClick={handleApply}
              className="flex-1 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              적용
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── 프리뷰 래퍼 (고정 높이, 내부에서 비율 유지) ────────────────────────────

const PREVIEW_H = 200 // px — 모든 카드 동일

function PreviewWrapper({ children }) {
  return (
    <div
      className="relative w-full bg-gray-100 flex items-center justify-center overflow-hidden"
      style={{ height: `${PREVIEW_H}px` }}
    >
      {children}
    </div>
  )
}

// ─── MockCreativePreview ─────────────────────────────────────────────────────
// thumbnailUrl 로딩 실패 시에만 사용하는 단순 fallback

function MockCreativePreview({ item }) {
  const bg = item.previewConfig?.fallbackBg ?? 'linear-gradient(135deg, #E5E7EB, #D1D5DB)'
  return <div className="w-full h-full" style={{ background: bg }} />
}

// ─── 썸네일 이미지 or MockCreativePreview ───────────────────────────────────

function Thumbnail({ item }) {
  const [error, setError] = useState(false)

  // 극단적 비율 정규화: 너무 얇거나 좁으면 텍스트가 보이도록 클램프
  const rawRatio = item.width / item.height
  const displayRatio = Math.min(Math.max(rawRatio, 0.3), 3.5)

  // width: 100% + aspectRatio → height = width/ratio, capped at PREVIEW_H
  // 이렇게 하면 img의 object-fit:contain과 동일한 letterbox 효과를 얻는다
  const canvasStyle = {
    width: '100%',
    height: 'auto',
    aspectRatio: String(displayRatio),
    maxHeight: `${PREVIEW_H}px`,
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
  }

  if (item.thumbnailUrl && !error) {
    return (
      <img
        src={item.thumbnailUrl}
        alt={item.title}
        style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', flex: 'none' }}
        onError={() => setError(true)}
      />
    )
  }

  return (
    <div style={canvasStyle}>
      <MockCreativePreview item={item} />
    </div>
  )
}

// ─── 사이즈 배지 ─────────────────────────────────────────────────────────────

function SizeBadge({ width, height }) {
  return (
    <span className="absolute bottom-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-black/40 text-white backdrop-blur-sm leading-none">
      {width}×{height}
    </span>
  )
}

// ─── 상태 배지 ───────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  if (status !== 'editing') return null
  return (
    <span className="absolute top-2 left-8 px-2 py-0.5 rounded-full text-[10px] font-semibold z-10 bg-amber-100 text-amber-700">
      편집중
    </span>
  )
}

// ─── 다운로드 유틸 ───────────────────────────────────────────────────────────

function makeFilename(item) {
  const now   = new Date()
  const pad   = n => String(n).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
  const safe  = (item.title || '제목없음').replace(/[\\/:*?"<>|]/g, '_')
  return `${safe}-${stamp}.png`
}

function triggerAnchorDownload(url, filename) {
  const a  = document.createElement('a')
  a.href   = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// ─── 그리드 카드 ─────────────────────────────────────────────────────────────

function GridCard({ item, isSelected, onToggleSelect, onToggleFavorite, onEdit, onDownload, isDownloading }) {
  const canDownload = !!(item._idbRecord?.editorState || item.downloadUrl)

  return (
    <div
      onClick={() => onToggleSelect(item.id)}
      className={`group relative bg-white rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
        isSelected
          ? 'border-blue-500 shadow-md shadow-blue-100'
          : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
      }`}
    >
      {/* 프리뷰 — 원본 비율 유지 */}
      <PreviewWrapper item={item}>
        <Thumbnail item={item} />

        {/* 좌상단 체크박스 */}
        <div className="absolute top-2 left-2 z-20" onClick={e => e.stopPropagation()}>
          <Checkbox checked={isSelected} onChange={() => onToggleSelect(item.id)} />
        </div>

        {/* 상태 배지 */}
        <StatusBadge status={item.status} />

        {/* 사이즈 배지 */}
        <SizeBadge width={item.width} height={item.height} />

        {/* hover overlay — 편집하기만 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-all pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-gray-800 text-sm font-semibold shadow-lg hover:bg-gray-50 transition-colors pointer-events-auto"
              onClick={e => { e.stopPropagation(); onEdit(item) }}
            >
              <Edit3 className="w-3.5 h-3.5" />
              편집하기
            </button>
          </div>
        </div>

        {/* 즐겨찾기 */}
        <button
          onClick={e => { e.stopPropagation(); onToggleFavorite(item.id) }}
          className="absolute top-2 right-2 z-20 p-0.5"
        >
          <Star
            className="w-4 h-4 drop-shadow"
            style={item.isFavorite
              ? { fill: '#FBBA4B', color: '#FBBA4B' }
              : { color: 'white', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }
            }
          />
        </button>
      </PreviewWrapper>

      {/* 메타 */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate leading-tight">{item.title}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.templateType || item.templateName || ''}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-gray-400 tabular-nums">
            {new Date(item.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' })}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{item.format}</span>
            {item.count > 1 && (
              <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{item.count}</span>
            )}
          </div>
        </div>
        <button
          disabled={!canDownload || isDownloading}
          onClick={e => { e.stopPropagation(); if (canDownload && !isDownloading) onDownload(item) }}
          className={`mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            canDownload ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' : 'bg-gray-50 text-gray-400 cursor-not-allowed'
          }`}
        >
          <Download className="w-3 h-3" />
          {isDownloading ? '다운로드 중...' : '다운로드'}
        </button>
      </div>
    </div>
  )
}

// ─── 리스트 행 ───────────────────────────────────────────────────────────────

function ListRow({ item, isSelected, onToggleSelect, onToggleFavorite, onEdit, onDownload, isDownloading }) {
  const canDownload = !!(item._idbRecord?.editorState || item.downloadUrl)

  return (
    <tr
      onClick={() => onToggleSelect(item.id)}
      className={`border-b border-gray-50 transition-colors cursor-pointer ${
        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50/80'
      }`}
    >
      {/* 체크박스 */}
      <td className="px-4 py-3 w-10" onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onChange={() => onToggleSelect(item.id)} />
      </td>

      {/* 썸네일 (hover: 편집하기) */}
      <td className="px-2 py-3 w-16">
        <div className="group/thumb w-12 h-12 rounded-lg overflow-hidden relative bg-gray-100 shrink-0">
          <Thumbnail item={item} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover/thumb:opacity-100">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(item) }}
              className="p-1 rounded-full bg-white text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
              title="편집하기"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </td>

      <td className="px-3 py-3">
        <p className="text-sm font-medium text-gray-800 truncate max-w-[200px]">{item.title}</p>
        <p className="text-xs text-gray-400 truncate">{item.id}</p>
      </td>
      <td className="px-3 py-3">
        <span
          className="text-xs px-2 py-1 rounded-full font-medium"
          style={{
            backgroundColor: CATEGORY_COLORS[item.category]?.light ?? '#F3F4F6',
            color: CATEGORY_COLORS[item.category]?.hex ?? '#6B7280',
          }}
        >
          {item.category}
        </span>
      </td>
      <td className="px-3 py-3 text-sm text-gray-600 truncate max-w-[160px]">{item.templateType || item.templateName || ''}</td>
      <td className="px-3 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">{item.size || `${item.width}×${item.height}`}</td>
      <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
        {new Date(item.createdAt).toLocaleDateString('ko-KR')}
      </td>
      <td className="px-3 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          item.status === 'editing' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
        }`}>
          {statusLabel(item.status)}
        </span>
      </td>
      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggleFavorite(item.id)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Star className="w-4 h-4" style={item.isFavorite ? { fill: '#FBBA4B', color: '#FBBA4B' } : { color: '#D1D5DB' }} />
          </button>
          <button
            disabled={!canDownload || isDownloading}
            onClick={() => canDownload && !isDownloading && onDownload(item)}
            title={isDownloading ? '다운로드 중...' : '다운로드'}
            className={`p-1.5 rounded-lg transition-colors ${canDownload ? 'hover:bg-purple-50 text-gray-400 hover:text-purple-600' : 'text-gray-200 cursor-not-allowed'}`}
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── 삭제 확인 모달 ──────────────────────────────────────────────────────────

function DeleteConfirmModal({ count, onConfirm, onCancel }) {
  const single = count === 1
  return (
    // 백드롭
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onCancel}
    >
      {/* 모달 패널 */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4">
          {/* 경고 아이콘 */}
          <div className="w-11 h-11 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>

          <h3 className="text-base font-bold text-gray-900 leading-snug">
            {single
              ? '제작물을 삭제할까요?'
              : `선택한 제작물 ${count}개를 삭제할까요?`}
          </h3>
          <p className="mt-2 text-sm text-red-600 font-medium">
            삭제한 제작물은 복구할 수 없습니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="px-6 pb-5 flex gap-2.5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ background: '#EF4444' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#DC2626' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#EF4444' }}
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 좌측 카테고리 사이드바 ──────────────────────────────────────────────────

function CategorySidebar({ selected, onChange, counts }) {
  return (
    <aside className="w-52 shrink-0 border-r border-gray-100 py-5 px-3">
      <p className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">카테고리</p>
      <nav className="space-y-0.5">
        {CATEGORIES.map(cat => {
          const isActive = selected === cat
          const color    = CATEGORY_COLORS[cat]
          const Icon     = CATEGORY_ICONS[cat]
          const count    = counts[cat] ?? 0
          return (
            <button
              key={cat}
              onClick={() => onChange(cat)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all"
              style={isActive && color ? { backgroundColor: color.light, color: color.hex, fontWeight: 600 } : { color: '#4B5563' }}
            >
              {Icon
                ? <Icon className="w-4 h-4 shrink-0" style={isActive && color ? { color: color.hex } : { color: '#9CA3AF' }} />
                : <div className="w-4 h-4" />
              }
              <span className="flex-1 text-left truncate">{cat}</span>
              <span className="text-xs tabular-nums" style={isActive && color ? { color: color.hex } : { color: '#9CA3AF' }}>
                {count}
              </span>
              <ChevronRight className="w-3 h-3 shrink-0" style={{ color: isActive && color ? color.hex : '#D1D5DB' }} />
            </button>
          )
        })}
      </nav>
    </aside>
  )
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────

export default function MyContent() {
  const navigate = useNavigate()

  const [items, setItems] = useState([])

  // IndexedDB에서 실제 저장된 콘텐츠만 로드
  useEffect(() => {
    getAllContents().then(saved => {
      const idbItems = saved.map(c => ({
        id: c.id,
        title: c.title || '제목 없음',
        templateName: c.templateName || '',
        templateType: c.templateName || c.editorType || '',
        category: c.category || '',
        size: `${c.width || 0}×${c.height || 0}`,
        width: c.width || 0,
        height: c.height || 0,
        thumbnailUrl: c.thumbnailUrl || '',
        status: c.status || 'draft',
        isFavorite: false,
        format: 'PNG',
        folderId: c.folderId ?? null,
        updatedAt: c.updatedAt,
        createdAt: c.createdAt,
        _idbRecord: c,
      }))
      setItems(idbItems)
    }).catch(() => { /* IndexedDB 미지원 환경 무시 */ })
  }, [])

  const [downloadingId, setDownloadingId] = useState(null)
  const [downloadToast, setDownloadToast] = useState('')

  async function handleDownloadContent(item) {
    if (downloadingId) return
    setDownloadingId(item.id)
    const rec = item._idbRecord
    try {
      const filename = makeFilename(item)

      // 우선순위 1: 완성 파일 URL
      if (item.downloadUrl) {
        triggerAnchorDownload(item.downloadUrl, filename)
        return
      }

      // 우선순위 2: editorState 기반 원본 크기 export
      if (rec?.editorState) {
        const { editorType, editorState, width, height } = rec
        const templateId = rec.templateId || (rec.templateIds || [])[0]

        console.log('[my-content download route]', {
          id: rec.id, editorType, width, height,
          hasEditorState: true,
          hasDownloadUrl: !!item.downloadUrl,
          hasThumbnailUrl: !!rec.thumbnailUrl,
          route: 'editorState-export',
        })

        let dataUrl = null

        if (editorType === 'coupon') {
          // 등록용 750px (pixelRatio:2 × DW:375 = 750px)
          dataUrl = await renderCouponToDataUrl(
            editorState.modules,
            editorState.layerOffsets || {},
            { pixelRatio: 2 }
          )
        } else if (editorType === 'standard' || editorType === 'customSize') {
          // multiplier=1 → 원본 크기 (width×height)
          dataUrl = await renderStandardToDataUrl(templateId, editorState, { multiplier: 1 })
        }
        // mdRecommend → 향후 구현 예정

        if (dataUrl) {
          triggerAnchorDownload(dataUrl, filename)
          return
        }
        // editorType 미지원이면 아래 fallback으로
        console.warn('[my-content download] editorType not supported yet:', editorType)
      }

      // 우선순위 3 (fallback — editorState 없는 경우만)
      const thumbUrl = rec?.thumbnailUrl || item.thumbnailUrl
      if (thumbUrl) {
        console.warn('[my-content download route]', {
          id: item.id, route: 'thumbnail-fallback',
          reason: 'no editorState and no downloadUrl',
        })
        triggerAnchorDownload(thumbUrl, filename)
        return
      }

      setDownloadToast('다운로드 중 오류가 발생했습니다. 다시 시도해주세요.')
    } catch (err) {
      console.error('[my-content download] failed', err)
      setDownloadToast('다운로드 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleEditItem = (item) => {
    const rec = item._idbRecord
    if (!rec) {
      // mock 데이터 항목은 알림만
      alert(`편집 화면으로 이동: ${item.title} (ID: ${item.id})`)
      return
    }
    // IDB 저장 콘텐츠: 에디터로 이동
    navigate(rec.routePath || '/templates/banner', {
      state: {
        contentId: rec.id,
        initialState: rec.editorState,
        selectedTemplateIds: rec.templateIds || [rec.templateId],
        editorType: rec.editorType,
        category: rec.category,
        routePath: rec.routePath,
      },
    })
  }
  const [folders, setFolders]           = useState([])
  const [currentFolderId, setCurrentFolderId] = useState(null)   // null = 전체(루트)
  const [deleteModal, setDeleteModal]   = useState(null)         // null | { ids: Set }
  const [viewMode, setViewMode]         = useState('grid')
  const [searchQuery, setSearchQuery]   = useState('')
  const [dateFilter, setDateFilter]     = useState('all')
  const [sortBy, setSortBy]             = useState('최신순')
  const [sidebarCategory, setSidebarCategory] = useState('전체')
  const [filters, setFilters]           = useState({ category: '전체', format: '전체', status: '전체', favorite: '전체' })
  const [selectedIds, setSelectedIds]   = useState(new Set())

  // 필터/검색/폴더 변경 시 선택 초기화
  useEffect(() => { setSelectedIds(new Set()) }, [searchQuery, dateFilter, filters, sidebarCategory, currentFolderId])

  const toggleFavorite = useCallback((id) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, isFavorite: !it.isFavorite } : it))
  }, [])

  // ── 폴더 핸들러 ────────────────────────────────────────────────────────────
  function handleCreateFolder(name) {
    const id = `f${Date.now()}`
    setFolders(prev => [...prev, { id, name }])
  }

  function handleRenameFolder(id, name) {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f))
  }

  function handleDeleteFolder(id) {
    if (!window.confirm('폴더를 삭제하면 안에 있는 이미지는 전체 목록으로 이동합니다.\n계속하시겠습니까?')) return
    setFolders(prev => prev.filter(f => f.id !== id))
    setItems(prev => prev.map(it => it.folderId === id ? { ...it, folderId: null } : it))
    if (currentFolderId === id) setCurrentFolderId(null)
  }

  function handleFolderClick(id) { setCurrentFolderId(id) }
  function handleBackToRoot()    { setCurrentFolderId(null) }

  function handleMoveToFolder(folderId) {
    setItems(prev => prev.map(it =>
      selectedIds.has(it.id) ? { ...it, folderId } : it
    ))
    setSelectedIds(new Set())
  }

  // 카테고리 카운트 (폴더 범위 기준)
  const categoryCounts = useMemo(() => {
    const base = currentFolderId !== null
      ? items.filter(it => it.folderId === currentFolderId)
      : items
    const counts = { '전체': base.length }
    CATEGORIES.slice(1).forEach(cat => { counts[cat] = base.filter(it => it.category === cat).length })
    return counts
  }, [items, currentFolderId])

  // 필터링 + 정렬
  const filteredItems = useMemo(() => {
    let result = [...items]
    // 1) 폴더 범위
    if (currentFolderId !== null) result = result.filter(it => it.folderId === currentFolderId)
    // 2) 기존 필터들
    if (sidebarCategory !== '전체') result = result.filter(it => it.category === sidebarCategory)
    if (filters.category !== '전체') result = result.filter(it => it.category === filters.category)
    if (filters.format   !== '전체') result = result.filter(it => it.format === filters.format)
    if (filters.status   !== '전체') {
      const map = { '완료': 'completed', '편집중': 'editing' }
      result = result.filter(it => it.status === map[filters.status])
    }
    if (filters.favorite === '즐겨찾기만') result = result.filter(it => it.isFavorite)
    const range = getDateRange(dateFilter)
    if (range) result = result.filter(it => { const d = new Date(it.createdAt); return d >= range.from && d <= range.to })
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(it =>
        it.title.toLowerCase().includes(q) || it.id.includes(q) ||
        (it.category || '').toLowerCase().includes(q) || (it.templateType || '').toLowerCase().includes(q)
      )
    }
    if (sortBy === '최신순')    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    else if (sortBy === '오래된순') result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    else if (sortBy === '이름순')   result.sort((a, b) => a.title.localeCompare(b.title, 'ko'))
    else if (sortBy === '즐겨찾기순') result.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite))
    return result
  }, [items, currentFolderId, sidebarCategory, filters, dateFilter, searchQuery, sortBy])

  // 선택 관련
  const filteredIds    = useMemo(() => new Set(filteredItems.map(it => it.id)), [filteredItems])
  const selectedCount  = useMemo(() => [...selectedIds].filter(id => filteredIds.has(id)).length, [selectedIds, filteredIds])
  const allSelected    = filteredItems.length > 0 && selectedCount === filteredItems.length
  const someSelected   = selectedCount > 0 && !allSelected

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  function handleSelectAll() {
    if (allSelected) {
      setSelectedIds(prev => { const next = new Set(prev); filteredItems.forEach(it => next.delete(it.id)); return next })
    } else {
      setSelectedIds(prev => { const next = new Set(prev); filteredItems.forEach(it => next.add(it.id)); return next })
    }
  }

  function handleBulkDownload() {
    const targets = filteredItems.filter(it => selectedIds.has(it.id))
    const urls = targets.map(it => `${it.title}_${it.width}x${it.height}.${it.format.toLowerCase()}`)
    console.log('일괄 다운로드:', targets.map(it => it.downloadUrl))
    alert(`다운로드: ${targets.length}개 항목\n${urls.join('\n')}`)
  }

  function handleBulkDelete() {
    const targets = filteredItems.filter(it => selectedIds.has(it.id))
    if (targets.length === 0) return
    setDeleteModal({ ids: new Set(targets.map(it => it.id)) })
  }

  function handleDeleteConfirm() {
    const idsToDelete = deleteModal.ids
    setItems(prev => prev.filter(it => !idsToDelete.has(it.id)))
    setSelectedIds(new Set())
    setDeleteModal(null)
  }

  function handleDeleteCancel() {
    setDeleteModal(null)
  }

  function handleSidebarCategory(cat) {
    setSidebarCategory(cat)
  }

  const currentFolder   = folders.find(f => f.id === currentFolderId) ?? null
  const hasActiveFilter = searchQuery || dateFilter !== 'all' || sidebarCategory !== '전체' || filters.category !== '전체' || filters.format !== '전체' || filters.status !== '전체' || filters.favorite !== '전체'

  // 다운로드 에러 토스트 자동 해제
  useEffect(() => {
    if (!downloadToast) return
    const t = setTimeout(() => setDownloadToast(''), 3500)
    return () => clearTimeout(t)
  }, [downloadToast])

  return (
    <div className="flex h-full">
      {/* 다운로드 오류 토스트 */}
      {downloadToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl bg-red-600 text-white text-sm font-medium shadow-xl pointer-events-none">
          {downloadToast}
        </div>
      )}
      {/* 삭제 확인 모달 */}
      {deleteModal && (
        <DeleteConfirmModal
          count={deleteModal.ids.size}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {/* 좌측 카테고리 */}
      <CategorySidebar selected={sidebarCategory} onChange={handleSidebarCategory} counts={categoryCounts} />

      {/* 콘텐츠 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          {/* 브레드크럼 */}
          {currentFolder ? (
            <div className="flex items-center gap-1.5 text-sm mb-2">
              <button
                onClick={handleBackToRoot}
                className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
              >
                제작한 이미지
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <div className="flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-gray-800">{currentFolder.name}</span>
              </div>
            </div>
          ) : (
            <h1 className="text-xl font-bold text-gray-900 mb-0.5">제작한 이미지</h1>
          )}
          <p className="text-sm text-gray-400">생성한 이미지를 관리하고 다운로드하세요</p>
        </div>

        {/* 툴바 */}
        <div className="px-6 py-3 flex items-center gap-2 border-b border-gray-100 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="제목, ID, 카테고리, 템플릿으로 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 bg-white"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          <DateDropdown value={dateFilter} onChange={setDateFilter} />
          <FilterPopover filters={filters} onApply={setFilters} />
          <SortDropdown value={sortBy} onChange={setSortBy} />

          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-purple-50 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors ${viewMode === 'list' ? 'bg-purple-50 text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 선택 액션바 */}
        {selectedCount > 0 && (
          <SelectionBar
            count={selectedCount}
            onDownload={handleBulkDownload}
            onDelete={handleBulkDelete}
            folders={folders}
            onMoveToFolder={handleMoveToFolder}
          />
        )}

        {/* 결과 수 + 전체 선택 */}
        <div className="px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={handleSelectAll}
            />
            <span className="text-xs text-gray-500">
              {selectedCount > 0
                ? <span className="font-semibold text-blue-600">{selectedCount}개 선택</span>
                : <>전체 <span className="font-semibold text-gray-700">{filteredItems.length}</span>개
                    {filteredItems.length !== items.length && <span className="text-gray-400"> / {items.length}개 중</span>}
                  </>
              }
            </span>
          </div>
          {hasActiveFilter && (
            <button
              onClick={() => {
                setSearchQuery(''); setDateFilter('all'); setSidebarCategory('전체')
                setFilters({ category: '전체', format: '전체', status: '전체', favorite: '전체' })
              }}
              className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              필터 초기화
            </button>
          )}
        </div>

        {/* 폴더 섹션 (루트에서만) */}
        {currentFolderId === null && (
          <FolderSection
            folders={folders}
            items={items}
            onFolderClick={handleFolderClick}
            onCreate={handleCreateFolder}
            onRename={handleRenameFolder}
            onDelete={handleDeleteFolder}
          />
        )}

        {/* 목록 */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {filteredItems.length === 0 ? (
            items.length === 0 ? (
              /* 전체 저장 콘텐츠 없음 — 빈 상태 UI */
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="w-16 h-16 mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <BookImage className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">저장된 콘텐츠가 없습니다</p>
                <p className="text-xs text-gray-400 mb-5">에디터에서 작업물을 저장하면 이곳에 표시됩니다.</p>
                <button
                  onClick={() => navigate('/templates/banner')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg,#F6A23A 0%,#F15A24 55%,#E94E1B 100%)', boxShadow: '0 4px 16px rgba(233,78,27,0.3)' }}
                >
                  템플릿 만들러 가기
                </button>
              </div>
            ) : (
              /* 필터 결과 없음 */
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Search className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">검색 결과가 없습니다</p>
                <p className="text-xs mt-1">다른 검색어나 필터를 시도해보세요</p>
              </div>
            )
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filteredItems.map(item => (
                <GridCard
                  key={item.id}
                  item={item}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={toggleSelect}
                  onToggleFavorite={toggleFavorite}
                  onEdit={handleEditItem}
                  onDownload={handleDownloadContent}
                  isDownloading={downloadingId === item.id}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-2.5 w-10">
                      <Checkbox checked={allSelected} indeterminate={someSelected} onChange={handleSelectAll} />
                    </th>
                    <th className="text-left px-2 py-2.5 text-xs font-semibold text-gray-500 w-16">미리보기</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">제목</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">카테고리</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">템플릿</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">사이즈</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">생성일</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">상태</th>
                    <th className="px-3 py-2.5 w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => (
                    <ListRow
                      key={item.id}
                      item={item}
                      isSelected={selectedIds.has(item.id)}
                      onToggleSelect={toggleSelect}
                      onToggleFavorite={toggleFavorite}
                      onEdit={handleEditItem}
                      onDownload={handleDownloadContent}
                      isDownloading={downloadingId === item.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
