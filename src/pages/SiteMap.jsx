import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Monitor, Smartphone, AppWindow, X, ArrowRight, MapPin } from 'lucide-react'
import { siteMapConfig } from '../data/siteMapData'
import { templateGroups } from '../data/templateData'

const allTemplates = templateGroups.flatMap((g) => g.templates)

const PLATFORM_TABS = [
  { id: 'PC',  label: 'PC',  icon: Monitor },
  { id: 'MO',  label: 'MO',  icon: Smartphone },
  { id: 'APP', label: 'APP', icon: AppWindow },
]

export default function SiteMap() {
  const navigate = useNavigate()
  const [platform, setPlatform] = useState('PC')
  const [selectedZone, setSelectedZone] = useState(null)
  const [hoveredZone, setHoveredZone] = useState(null)

  const config = siteMapConfig[platform]

  const handleCreate = (zone) => {
    if (zone.noCreate) return
    if (zone.templateId) sessionStorage.setItem('preSelectedTemplate', zone.templateId)
    navigate('/')
  }

  return (
    <div className="min-h-screen" style={{ background: '#f8f7fc' }}>
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-5 h-5" style={{ color: '#9F48CE' }} />
            <h1 className="text-xl font-bold text-gray-900">영역 찾기</h1>
          </div>
          <p className="text-sm text-gray-500">
            신세계면세점 사이트의 배너 영역을 클릭하면 바로 제작을 시작할 수 있어요.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-6">
        {/* 플랫폼 탭 */}
        <div className="flex gap-2 mb-6">
          {PLATFORM_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setPlatform(id); setSelectedZone(null) }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={
                platform === id
                  ? { background: 'linear-gradient(135deg,#9F48CE,#C084FC)', color: '#fff', boxShadow: '0 4px 16px #9F48CE44' }
                  : { background: '#fff', color: '#4b5563', border: '1px solid #e5e7eb' }
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}

          {/* 범례 */}
          <div className="ml-auto flex items-center gap-4 px-4 py-2 bg-white rounded-xl border border-gray-100">
            <div className="flex items-center gap-1.5">
              <div style={{ width: 12, height: 12, borderRadius: 2, border: '2px solid #9F48CE', background: 'rgba(159,72,206,0.12)' }} />
              <span className="text-xs text-gray-500">배너 영역</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div style={{ width: 12, height: 12, borderRadius: 2, border: '2px solid #9F48CE', background: 'rgba(159,72,206,0.3)' }} />
              <span className="text-xs text-gray-500">선택됨</span>
            </div>
          </div>
        </div>

        <div className="flex gap-5">
          {/* 이미지 + 핫스팟 영역 */}
          <div className="flex-1 min-w-0">
            <div
              className="rounded-2xl shadow-lg border border-gray-200"
              style={{ background: '#fff', overflowX: 'auto' }}
            >
              <div style={{ position: 'relative', width: config.pxFrame ? config.pxFrame.width : '100%' }}>
                {/* 가이드 이미지 */}
                <img
                  src={config.image}
                  alt={`${platform} 메인 가이드`}
                  style={{ width: '100%', display: 'block' }}
                  onError={(e) => {
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                {/* 이미지 로드 실패 시 폴백 */}
                <div
                  style={{ display: 'none', width: '100%', height: 400, background: '#f3f4f6', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}
                >
                  <Monitor style={{ width: 40, height: 40, color: '#d1d5db' }} />
                  <p style={{ fontSize: 14, color: '#9ca3af' }}>가이드 이미지를 불러오는 중...</p>
                </div>

                {/* 핫스팟 오버레이 */}
                {config.zones.map((zone) => {
                  const isSelected = selectedZone?.id === zone.id
                  const isHovered = hoveredZone === zone.id
                  return (
                    <div
                      key={zone.id}
                      onClick={() => setSelectedZone(isSelected ? null : zone)}
                      onMouseEnter={() => setHoveredZone(zone.id)}
                      onMouseLeave={() => setHoveredZone(null)}
                      style={{
                        position: 'absolute',
                        top: zone.pos.top,
                        left: zone.pos.left,
                        width: zone.pos.width,
                        height: zone.pos.height,
                        border: `2px solid ${zone.color}`,
                        background: isSelected
                          ? `${zone.color}35`
                          : isHovered
                          ? `${zone.color}20`
                          : `${zone.color}08`,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        boxSizing: 'border-box',
                        zIndex: isSelected ? 20 : isHovered ? 15 : 10,
                      }}
                    >
                      {/* 배지 */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 4,
                          left: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: zone.color,
                          borderRadius: 99,
                          padding: '2px 8px 2px 6px',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          opacity: isHovered || isSelected ? 1 : 0.7,
                          transition: 'opacity 0.15s',
                          pointerEvents: 'none',
                        }}
                      >
                        <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>{zone.code}</span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{zone.name}</span>
                      </div>

                      {/* 사이즈 표시 (호버 시) */}
                      {(isHovered || isSelected) && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            background: 'rgba(0,0,0,0.65)',
                            borderRadius: 6,
                            padding: '2px 7px',
                            pointerEvents: 'none',
                          }}
                        >
                          <span style={{ fontSize: 9, color: '#fff', fontFamily: 'monospace', fontWeight: 600 }}>{zone.size}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              ※ 이미지 출처: 신세계면세점 배너 제작 가이드 (sdl.ssgdfs.com) · 배너 영역 클릭 시 바로 제작 가능
            </p>
          </div>

          {/* 우측 패널: 선택된 영역 정보 */}
          <div style={{ width: 240, flexShrink: 0 }}>
            {selectedZone ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
                {/* 헤더 */}
                <div style={{ background: `linear-gradient(135deg, ${selectedZone.color}, ${selectedZone.color}99)`, padding: '14px 16px' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.08em' }}>{selectedZone.code}</span>
                    <button onClick={() => setSelectedZone(null)} style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <X style={{ width: 11, height: 11, color: '#fff' }} />
                    </button>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>{selectedZone.name}</p>
                </div>

                <div className="p-4">
                  {/* 사이즈 */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-1">사이즈</p>
                    <p className="text-sm font-mono font-semibold text-gray-800">{selectedZone.size}</p>
                  </div>

                  {/* 비율 미리보기 */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-400 mb-2">비율 미리보기</p>
                    {(() => {
                      const [w, h] = selectedZone.size.split('×').map(Number)
                      const ratio = w / h
                      const maxW = 180, maxH = 80
                      let bW = maxW, bH = bW / ratio
                      if (bH > maxH) { bH = maxH; bW = bH * ratio }
                      bH = Math.max(bH, 10)
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: maxH + 8, background: '#f8f7fc', borderRadius: 8 }}>
                          <div style={{ width: bW, height: bH, background: `${selectedZone.color}22`, border: `2px solid ${selectedZone.color}`, borderRadius: 3 }} />
                        </div>
                      )
                    })()}
                  </div>

                  {/* 연결된 템플릿 */}
                  {(() => {
                    const t = allTemplates.find((t) => t.id === selectedZone.templateId)
                    return t ? (
                      <div className="mb-4 p-3 rounded-xl" style={{ background: '#f8f7fc' }}>
                        <p className="text-xs text-gray-400 mb-1">연결된 템플릿</p>
                        <p className="text-xs font-semibold text-gray-700">{t.name}</p>
                        <p className="text-xs text-gray-400">{t.device}</p>
                      </div>
                    ) : null
                  })()}

                  {/* 제작 시작 버튼 */}
                  {selectedZone.noCreate ? (
                    <div className="w-full py-2.5 rounded-xl text-sm text-center text-gray-400 bg-gray-50 border border-gray-100">
                      BO에서 텍스트만 입력
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCreate(selectedZone)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
                      style={{ background: `linear-gradient(135deg, ${selectedZone.color}, #C084FC)` }}
                    >
                      이 배너 제작하기 <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* 미선택 상태 안내 */
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center sticky top-6">
                <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: '#F3E8FF' }}>
                  <MapPin className="w-6 h-6" style={{ color: '#9F48CE' }} />
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-1">영역을 선택하세요</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  왼쪽 이미지에서 배너 영역을 클릭하면 상세 정보와 제작 버튼이 나타납니다.
                </p>

                {/* 전체 영역 목록 */}
                <div className="mt-4 text-left space-y-1.5">
                  {config.zones.map((zone) => (
                    <button
                      key={zone.id}
                      onClick={() => setSelectedZone(zone)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all hover:bg-gray-50"
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: zone.color, flexShrink: 0 }} />
                      <span className="text-xs font-medium text-gray-600 flex-1 truncate">{zone.name}</span>
                      <span className="text-xs text-gray-400 font-mono shrink-0">{zone.size}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
