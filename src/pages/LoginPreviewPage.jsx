/**
 * LoginPreviewPage — 로그인 안내 화면
 *
 * 실제 인증을 수행하지 않습니다. 계정 시스템 준비 중 상태를 안내합니다.
 *
 * 향후 AWS 연동 시:
 *   - handleLogin 내 authAdapter.login() 호출부를 활성화
 *   - 로그인 버튼 disabled 제거 및 에러 메시지 표시 로직 추가
 */

import { useNavigate, useLocation } from 'react-router-dom'
import { Sparkles, Mail, Lock, ArrowRight } from 'lucide-react'
import { useGuestSession } from '../auth/GuestSessionContext'

export default function LoginPreviewPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { handleContinueAsGuest } = useGuestSession()

  const from = location.state?.from?.pathname || '/'

  function onGuestEnter() {
    handleContinueAsGuest()
    navigate(from, { replace: true })
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: '#F5F3F0' }}
    >
      {/* 카드 위 — 신세계면세점 BI */}
      <div className="text-center mb-6">
        <img
          src="/assets/logos/shinsegae-dutyfree-logo.png"
          alt="신세계면세점"
          className="h-9 object-contain mx-auto"
        />
      </div>

      {/* 카드 */}
      <div className="w-full max-w-[560px] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        {/* 카드 상단 — 소개 헤더 */}
        <div
          className="px-10 pt-8 pb-8 text-center"
          style={{ background: 'linear-gradient(160deg, #F6A23A 0%, #F15A24 55%, #E94E1B 100%)' }}
        >
          {/* KK Studio 서비스명 */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.25)' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">KK Studio</span>
          </div>

          {/* 핵심 소개 문구 */}
          <p className="text-white text-2xl font-bold leading-tight mb-3">
            온라인몰 이미지 제작을 더 쉽고 빠르게
          </p>
          <p className="text-white/80 text-sm leading-relaxed">
            배너, 기획전, 이벤트, 상품이미지 등 신세계면세점 온라인몰 운영에 필요한<br />
            모든 이미지를 템플릿 기반으로 빠르게 제작할 수 있습니다.
          </p>
        </div>

        {/* 카드 본문 */}
        <div className="px-8 py-7 space-y-4">

          {/* 계정 시스템 준비 중 배지 */}
          <div className="text-center">
            <span
              className="inline-block text-xs font-medium px-3 py-1 rounded-full"
              style={{ background: '#FFF0E5', color: '#C2410C' }}
            >
              계정 시스템 준비 중
            </span>
          </div>

          {/* 이메일 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">이메일</label>
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 opacity-50"
            >
              <Mail className="w-4 h-4 text-gray-300 shrink-0" />
              <span className="text-sm text-gray-300">준비 중</span>
            </div>
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5">비밀번호</label>
            <div
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 opacity-50"
            >
              <Lock className="w-4 h-4 text-gray-300 shrink-0" />
              <span className="text-sm text-gray-300">준비 중</span>
            </div>
          </div>

          {/* 로그인 버튼 — 비활성 */}
          <button
            disabled
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-400 bg-gray-100 cursor-not-allowed"
          >
            로그인
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300">또는</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* 계정 없이 시작하기 */}
          <button
            onClick={onGuestEnter}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'linear-gradient(135deg, #F6A23A 0%, #F15A24 55%, #E94E1B 100%)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(233,78,27,0.3)',
            }}
          >
            계정 없이 시작하기
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 카드 하단 안내 */}
        <div className="px-8 pb-7 text-center">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            계정 없이 시작한 작업물은 현재 브라우저에만 저장됩니다.<br />
            브라우저 데이터 삭제 또는 다른 기기 이용 시<br />기존 작업물이 표시되지 않을 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
