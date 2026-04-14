import { useState } from 'react'
import { Palette, Type, Building2, Key, Plus, Trash2, Save, Sparkles } from 'lucide-react'

const tabs = [
  { id: 'brand', label: '브랜드 프리셋', icon: Palette },
  { id: 'partner', label: '제휴사 프리셋', icon: Building2 },
  { id: 'event', label: '대형행사 프리셋', icon: Sparkles },
  { id: 'api', label: 'API 키 관리', icon: Key },
]

const mockPartners = [
  { id: 1, name: '대한항공', category: '항공', color: '#00256C', logo: '✈️' },
  { id: 2, name: 'SKT', category: '통신사', color: '#E4002B', logo: '📱' },
  { id: 3, name: '삼성카드', category: '카드사', color: '#0047BB', logo: '💳' },
  { id: 4, name: '국민은행', category: '은행', color: '#FFB800', logo: '🏦' },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState('brand')
  const [brandColors, setBrandColors] = useState(['#7c3aed', '#ec4899', '#1a1a2e'])
  const [apiKey, setApiKey] = useState('')

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-sm text-gray-500 mt-1">브랜드 프리셋과 생성 옵션을 관리하세요</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Brand Preset */}
      {activeTab === 'brand' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">브랜드 컬러</h3>
            <div className="flex gap-3 mb-4">
              {brandColors.map((c, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div
                    className="w-14 h-14 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:scale-105 transition-all"
                    style={{ backgroundColor: c }}
                  />
                  <span className="text-xs text-gray-500 font-mono">{c}</span>
                  <button
                    onClick={() => setBrandColors((prev) => prev.filter((_, j) => j !== i))}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setBrandColors((prev) => [...prev, '#000000'])}
                className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-primary-400 transition-all"
              >
                <Plus className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">브랜드 폰트</h3>
            <div className="space-y-3">
              {['Pretendard', 'Noto Sans KR'].map((font) => (
                <div
                  key={font}
                  className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-primary-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Type className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{font}</p>
                      <p className="text-xs text-gray-400">기본 폰트</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 text-xs rounded-full bg-primary-50 text-primary-700">사용 중</span>
                </div>
              ))}
              <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-primary-300 hover:text-primary-600 transition-all">
                <Plus className="w-4 h-4 inline mr-1" />
                폰트 추가
              </button>
            </div>
          </div>

          <button className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all">
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      )}

      {/* Partner Preset */}
      {activeTab === 'partner' && (
        <div className="max-w-2xl space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {mockPartners.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-4 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: p.color + '20' }}
                >
                  {p.logo}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-xs text-gray-500 font-mono">{p.color}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-primary-300 transition-all">
            <Plus className="w-4 h-4" />
            제휴사 추가
          </button>
        </div>
      )}

      {/* Event Preset */}
      {activeTab === 'event' && (
        <div className="max-w-2xl space-y-4">
          {['설 / 신년', '봄 시즌', '여름 시즌', '블랙프라이데이', '크리스마스'].map((event) => (
            <div
              key={event}
              className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 hover:border-primary-300 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-100 to-purple-100 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{event}</p>
                  <p className="text-xs text-gray-400">상단 비주얼 · bg 컬러 프리셋</p>
                </div>
              </div>
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">편집</button>
            </div>
          ))}
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-primary-300 transition-all">
            <Plus className="w-4 h-4" />
            행사 프리셋 추가
          </button>
        </div>
      )}

      {/* API Key */}
      {activeTab === 'api' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-1">AI 생성 모델 API 키</h3>
            <p className="text-sm text-gray-500 mb-4">이미지 생성에 사용할 AI 모델 API 키를 등록하세요</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">모델 선택</label>
                <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30">
                  <option>DALL-E 3</option>
                  <option>Stable Diffusion XL</option>
                  <option>Midjourney API</option>
                </select>
              </div>
            </div>
            <button className="mt-4 flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all">
              <Save className="w-4 h-4" />
              저장
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
