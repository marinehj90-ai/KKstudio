/**
 * KK Studio — IndexedDB 기반 콘텐츠 저장 유틸
 *
 * 저장 데이터 구조:
 * {
 *   id: string,
 *   title: string,
 *   templateId: string,          // 첫 번째 templateId (대표)
 *   templateIds: string[],       // 선택된 모든 template ids
 *   templateName: string,
 *   category: string,            // categoryId (e.g. 'banner', 'event')
 *   editorType: 'standard' | 'coupon' | 'customSize',
 *   routePath: string,           // 편집 재진입 경로 (e.g. '/templates/event')
 *   width: number,
 *   height: number,
 *   thumbnailUrl: string,        // base64 data URL
 *   editorState: object,         // 에디터별 상태 스냅샷
 *   status: 'draft' | 'completed',
 *   folderId?: string,
 *   createdAt: string,           // ISO 8601
 *   updatedAt: string,
 * }
 *
 * 나중에 서버 DB로 교체 시: saveContent/updateContent 함수 내부만 교체하면 됩니다.
 */

const DB_NAME = 'kk-studio-db'
const DB_VERSION = 1
const STORE = 'contents'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
        store.createIndex('status',    'status',    { unique: false })
        store.createIndex('category',  'category',  { unique: false })
      }
    }
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror   = (e) => reject(e.target.error)
  })
}

/** 새 콘텐츠 저장 (id가 없으면 생성, 있으면 덮어쓰기) */
export async function saveContent(data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const now   = new Date().toISOString()
    const record = {
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: now,
    }
    store.put(record)
    tx.oncomplete = () => resolve(record)
    tx.onerror    = (e) => reject(e.target.error)
  })
}

/** 기존 콘텐츠 부분 업데이트 */
export async function updateContent(id, updates) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const req   = store.get(id)
    req.onsuccess = () => {
      const existing = req.result
      if (!existing) { reject(new Error(`Content not found: ${id}`)); return }
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() }
      store.put(updated)
      tx.oncomplete = () => resolve(updated)
    }
    req.onerror  = (e) => reject(e.target.error)
    tx.onerror   = (e) => reject(e.target.error)
  })
}

/** 단일 콘텐츠 조회 */
export async function getContent(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve(req.result || null)
    req.onerror   = (e) => reject(e.target.error)
  })
}

/** 전체 콘텐츠 목록 조회 (updatedAt 내림차순) */
export async function getAllContents() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () => {
      const items = (req.result || []).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      resolve(items)
    }
    req.onerror = (e) => reject(e.target.error)
  })
}

/** 콘텐츠 삭제 */
export async function deleteContent(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror    = (e) => reject(e.target.error)
  })
}

/** 간단한 uid 생성 */
export function generateId() {
  return `kk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
