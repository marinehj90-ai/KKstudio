/**
 * EntryGate — 진입 경로 제어 컴포넌트 (세션 가드)
 *
 * 실제 보안 인증이 아닙니다. sessionStorage 기반 게스트 진입 여부만 확인합니다.
 * 향후 AWS 인증 연동 시 authAdapter.checkSession()을 교체하면
 * 이 컴포넌트는 수정 없이 재사용 가능합니다.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useGuestSession } from '../auth/GuestSessionContext'

export default function EntryGate() {
  const { isAuthorized } = useGuestSession()
  const location = useLocation()

  if (!isAuthorized) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
