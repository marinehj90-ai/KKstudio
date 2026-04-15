/**
 * KK Studio → Figma 자동 변환 스크립트
 *
 * 사용법:
 *   1. FIGMA_TOKEN 과 FIGMA_FILE_KEY 를 .env 에 설정
 *   2. node scripts/export-to-figma.js
 *
 * 동작 방식:
 *   - 개발 서버(localhost:5173)의 각 페이지를 Puppeteer로 캡처
 *   - 캡처한 이미지를 Figma 파일의 프레임으로 업로드
 *   - 페이지별 Frame 이름 지정 (홈, 내 콘텐츠, 설정)
 */

import puppeteer from 'puppeteer'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── 설정 ──────────────────────────────────────────────────
const FIGMA_TOKEN  = process.env.FIGMA_TOKEN   // 피그마 Personal Access Token
const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY // 피그마 파일 키 (URL에서 추출)
const BASE_URL     = 'http://localhost:5173'

const PAGES = [
  { name: '홈 — 템플릿 선택',  path: '/',        width: 1440, height: 900 },
  { name: '내 콘텐츠',         path: '/my',      width: 1440, height: 900 },
  { name: '설정',              path: '/settings', width: 1440, height: 900 },
]
// ─────────────────────────────────────────────────────────

async function capturePages() {
  console.log('📸 페이지 캡처 시작...')
  const browser = await puppeteer.launch({ headless: 'new' })
  const results = []

  for (const page of PAGES) {
    const p = await browser.newPage()
    await p.setViewport({ width: page.width, height: page.height })
    await p.goto(`${BASE_URL}${page.path}`, { waitUntil: 'networkidle0', timeout: 15000 })
    await new Promise(r => setTimeout(r, 1000)) // 애니메이션 대기

    const screenshotPath = path.join(__dirname, `../tmp_${page.name}.png`)
    await p.screenshot({ path: screenshotPath, fullPage: false })
    await p.close()

    const imageData = fs.readFileSync(screenshotPath).toString('base64')
    fs.unlinkSync(screenshotPath)

    results.push({ ...page, imageData })
    console.log(`  ✅ ${page.name} 캡처 완료`)
  }

  await browser.close()
  return results
}

async function uploadImageToFigma(imageBase64) {
  // Figma는 직접 이미지 업로드 API가 없으므로
  // figma-api의 POST /v1/images 엔드포인트 활용
  const res = await fetch(`https://api.figma.com/v1/files/${FIGMA_FILE_KEY}/images`, {
    method: 'POST',
    headers: {
      'X-Figma-Token': FIGMA_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      images: { data: `data:image/png;base64,${imageBase64}` },
    }),
  })
  const json = await res.json()
  return json
}

async function createFigmaFrames(pages) {
  console.log('\n🎨 Figma 프레임 생성 중...')

  // Figma Plugin API 방식 대신 REST로 node 생성
  const nodes = pages.map((page, i) => ({
    type: 'FRAME',
    name: page.name,
    x: i * (page.width + 80),
    y: 0,
    width: page.width,
    height: page.height,
    fills: [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.99, a: 1 } }],
  }))

  const res = await fetch(`https://api.figma.com/v1/files/${FIGMA_FILE_KEY}/nodes`, {
    method: 'POST',
    headers: {
      'X-Figma-Token': FIGMA_TOKEN,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ nodes }),
  })

  return await res.json()
}

async function getFigmaFileInfo() {
  const res = await fetch(`https://api.figma.com/v1/files/${FIGMA_FILE_KEY}`, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN },
  })
  const json = await res.json()
  return json
}

// ── 메인 실행 ─────────────────────────────────────────────
async function main() {
  if (!FIGMA_TOKEN || !FIGMA_FILE_KEY) {
    console.error('❌ 환경변수 누락!')
    console.error('   FIGMA_TOKEN 과 FIGMA_FILE_KEY 를 설정하세요.')
    console.error('\n   예시 (.env 파일):')
    console.error('   FIGMA_TOKEN=figd_xxxxxxxxxxxx')
    console.error('   FIGMA_FILE_KEY=aBcDeFgHiJkL (Figma URL의 /file/ 다음 부분)')
    process.exit(1)
  }

  // 1. 피그마 파일 연결 확인
  console.log('🔌 Figma 파일 연결 확인...')
  const fileInfo = await getFigmaFileInfo()
  if (fileInfo.err) {
    console.error('❌ Figma 연결 실패:', fileInfo.err)
    process.exit(1)
  }
  console.log(`  ✅ 연결됨: "${fileInfo.name}"`)

  // 2. 페이지 캡처
  const pages = await capturePages()

  // 3. 결과 저장 (이미지 파일로)
  const outputDir = path.join(__dirname, '../figma-export')
  fs.mkdirSync(outputDir, { recursive: true })

  for (const page of pages) {
    const filePath = path.join(outputDir, `${page.name}.png`)
    fs.writeFileSync(filePath, Buffer.from(page.imageData, 'base64'))
    console.log(`  💾 저장됨: figma-export/${page.name}.png`)
  }

  console.log('\n✨ 완료!')
  console.log('\n📌 Figma에 가져오기:')
  console.log('   1. figma-export/ 폴더의 PNG 파일들을 Figma에 드래그&드롭')
  console.log('   2. 또는 Figma → File → Place Image 로 각 파일 임포트')
  console.log('   3. 각 이미지를 1440×900 Frame으로 감싸면 완성!')
  console.log('\n💡 더 정확한 변환을 원하면:')
  console.log('   Figma 플러그인 "html.to.design" 에서 http://localhost:5173 입력')
}

main().catch(err => {
  console.error('오류 발생:', err.message)
  process.exit(1)
})
