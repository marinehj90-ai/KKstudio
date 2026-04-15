import { useState } from 'react'
import {
  Search, Grid3x3, List, Download, Copy, Trash2, Edit3, Filter,
  Calendar, ChevronDown, MoreHorizontal, Eye
} from 'lucide-react'

const mockItems = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  name: `생성물_${String(i + 1).padStart(3, '0')}`,
  template: ['메인 대배너', '최상단 띠배너', '기획전 썸네일', '상품 대표이미지', '이벤트 상단'][i % 5],
  device: ['공통', 'PC', 'MO'][i % 3],
  size: ['750×750', '1712×80', '750×750', '1500×1500', '860×400'][i % 5],
  date: `2026-04-${String(14 - i).padStart(2, '0')}`,
  gradient: [
    'linear-gradient(135deg, #7c3aed, #a855f7)',
    'linear-gradient(135deg, #8b5cf6, #c4b5fd)',
    'linear-gradient(135deg, #6366f1, #818cf8)',
    'linear-gradient(135deg, #d946ef, #f0abfc)',
    'linear-gradient(135deg, #f59e0b, #fbbf24)',
  ][i % 5],
}))

export default function MyContent() {
  const [viewMode, setViewMode] = useState('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItems, setSelectedItems] = useState([])

  const toggleSelect = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const filteredItems = mockItems.filter(
    (item) => !searchQuery || item.name.includes(searchQuery) || item.template.includes(searchQuery)
  )

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">내 콘텐츠</h1>
          <p className="text-sm text-gray-500 mt-1">생성한 이미지를 관리하고 다시 다운로드하세요</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="이름, 템플릿으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-primary-300">
          <Calendar className="w-4 h-4" />
          날짜
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-primary-300">
          <Filter className="w-4 h-4" />
          필터
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2.5 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-400'}`}
          >
            <Grid3x3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2.5 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-400'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedItems.length > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-primary-50 rounded-xl">
          <span className="text-sm font-medium text-primary-700">{selectedItems.length}개 선택</span>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-sm text-gray-600 hover:text-primary-600 border border-primary-200">
            <Download className="w-3.5 h-3.5" /> 일괄 다운로드
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-sm text-gray-600 hover:text-primary-600 border border-primary-200">
            <Copy className="w-3.5 h-3.5" /> 일괄 복제
          </button>
          <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-sm text-red-500 hover:text-red-600 border border-red-200">
            <Trash2 className="w-3.5 h-3.5" /> 일괄 삭제
          </button>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const isSelected = selectedItems.includes(item.id)
            return (
              <div
                key={item.id}
                className={`group relative rounded-2xl overflow-hidden border-2 transition-all bg-white ${
                  isSelected
                    ? 'border-primary-500 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-primary-300 hover:shadow-md'
                }`}
              >
                <div className="aspect-square relative cursor-pointer" onClick={() => toggleSelect(item.id)}>
                  <div className="absolute inset-0" style={{ background: item.gradient }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-white/50 text-xs font-mono">{item.size}</span>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex gap-2">
                      <button className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white shadow-sm">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white shadow-sm">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-full bg-white/90 text-gray-700 hover:bg-white shadow-sm">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{item.template}</p>
                  <p className="text-xs text-gray-400">{item.date}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">미리보기</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">이름</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">템플릿</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">디바이스</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">사이즈</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">생성일</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden" style={{ background: item.gradient }} />
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{item.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.template}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{item.device}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-mono">{item.size}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{item.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
