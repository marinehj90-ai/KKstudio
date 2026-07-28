/**
 * GuestSessionContext — 게스트 세션 상태 Context
 *
 * sessionStorage 기반으로 세션을 관리합니다.
 * 탭/브라우저 종료 시 세션이 소멸되어 재접속 시 로그인 화면이 다시 노출됩니다.
 *
 * 향후 AWS 연동 시: checkSession / logout 을 authAdapter에서 교체하면
 * 이 Context는 수정 없이 재사용 가능합니다.
 */

import { createContext, useContext, useState, useCallback } from 'react'
import { checkSession, continueAsGuest, logout } from './authAdapter'

const GuestSessionContext = createContext(null)

export function GuestSessionProvider({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(() => checkSession())

  const handleContinueAsGuest = useCallback(() => {
    continueAsGuest()
    setIsAuthorized(true)
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    setIsAuthorized(false)
  }, [])

  return (
    <GuestSessionContext.Provider value={{ isAuthorized, handleContinueAsGuest, handleLogout }}>
      {children}
    </GuestSessionContext.Provider>
  )
}

export function useGuestSession() {
  const ctx = useContext(GuestSessionContext)
  if (!ctx) throw new Error('useGuestSession must be used inside GuestSessionProvider')
  return ctx
}
