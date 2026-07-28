/**
 * authAdapter — 인증 어댑터 (현재: 프론트엔드 mock)
 *
 * 향후 AWS Cognito / 자체 서버 연동 시 이 파일만 교체하면 됩니다.
 * 화면 컴포넌트(LoginPreviewPage, EntryGate 등)는 이 인터페이스만 호출합니다.
 *
 * 교체 대상 함수:
 *   login(email, password)  → cognitoSignIn / fetch('/api/login') 등
 *   logout()                → cognitoSignOut / fetch('/api/logout') 등
 *   checkSession()          → Auth.currentSession() / 쿠키·JWT 검증 등
 *   getCurrentUser()        → Auth.currentAuthenticatedUser() 등
 *   continueAsGuest()       → 현재 구현 유지 가능
 */

const SESSION_KEY = 'kk-guest-session'

/**
 * 로그인 시도 — 현재는 계정 시스템 미구현으로 항상 null 반환
 * @returns {Promise<null>}
 */
export async function login(_email, _password) {
  // TODO: AWS 연동 시 → return await cognitoSignIn(email, password)
  return null
}

/**
 * 로그아웃 — 게스트 세션 초기화
 * IndexedDB 제작물은 삭제하지 않습니다.
 */
export function logout() {
  sessionStorage.removeItem(SESSION_KEY)
  // TODO: AWS 연동 시 → await Auth.signOut() 추가
}

/**
 * 현재 세션 유효 여부 확인 (동기)
 * @returns {boolean}
 */
export function checkSession() {
  return sessionStorage.getItem(SESSION_KEY) === 'guest'
  // TODO: AWS 연동 시 → JWT 만료 검사 / Auth.currentSession() 등으로 교체
}

/**
 * 현재 로그인된 사용자 정보
 * @returns {{ type: 'guest' } | null}
 */
export function getCurrentUser() {
  if (checkSession()) return { type: 'guest', displayName: '게스트 사용자' }
  return null
  // TODO: AWS 연동 시 → { type: 'user', email, name, ... } 등으로 확장
}

/**
 * 계정 없이 시작하기 — 게스트 세션 등록
 */
export function continueAsGuest() {
  sessionStorage.setItem(SESSION_KEY, 'guest')
}
