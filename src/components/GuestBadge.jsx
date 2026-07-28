/**
 * GuestBadge — 사이드바 내 게스트 사용자 표시 컴포넌트
 *
 * 게스트 세션으로 진입한 경우 표시됩니다.
 * "로그인 화면으로 돌아가기" 클릭 시 게스트 세션만 초기화하고
 * IndexedDB 제작물은 삭제하지 않습니다.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, LogOut, HardDrive, X } from 'lucide-react'
import { useGuestSession } from '../auth/GuestSessionContext'

export default function GuestBadge() {
  const navigate = useNavigate()
  const { handleLogout } = useGuestSession()
  const [showTip, setShowTip] = useState(false)

  function onLogout() {
    handleLogout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="p-3 mx-3 mb-3 rounded-xl border border-gray-100 bg-gray-50">
      {/* 사용자 표시 행 */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-gray-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 truncate">게스트 사용자</p>
        </div>
        {/* 저장 안내 툴팁 트리거 */}
        <button
          onClick={() => setShowTip(p => !p)}
          className="shrink-0 p-1 rounded-lg hover:bg-gray-200 transition-colors"
          title="저장 안내"
        >
          <HardDrive className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* 툴팁 */}
      {showTip && (
        <div className="relative mb-2 p-2.5 rounded-lg bg-white border border-gray-200 shadow-sm">
          <button
            onClick={() => setShowTip(false)}
            className="absolute top-1.5 right-1.5 p-0.5 text-gray-300 hover:text-gray-500"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="text-[11px] text-gray-500 leading-relaxed pr-3">
            작업물은 현재 브라우저에만 저장됩니다.<br />
            다른 기기에서는 표시되지 않을 수 있습니다.
          </p>
        </div>
      )}

      {/* 로그인 화면으로 돌아가기 */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
      >
        <LogOut className="w-3.5 h-3.5" />
        로그인 화면으로 돌아가기
      </button>
    </div>
  )
}
