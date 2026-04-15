/**
 * 페이지별 포인트 컬러 정의
 * 홈: #9F48CE  배너: #968AD1  상품이미지: #685BAD  기획전: #F38C5C  이벤트·상세: #FBBA4B
 */

export const PAGE_COLORS = {
  home: {
    base: '#9F48CE',
    light: '#F3E8FF',
    dark: '#7B2FA8',
    shadow: 'rgba(159,72,206,0.25)',
    gradient: 'linear-gradient(135deg, #9F48CE 0%, #C084FC 100%)',
    ring: 'rgba(159,72,206,0.3)',
  },
  banner: {
    base: '#968AD1',
    light: '#EDE9F8',
    dark: '#7060B8',
    shadow: 'rgba(150,138,209,0.25)',
    gradient: 'linear-gradient(135deg, #968AD1 0%, #C4B5FD 100%)',
    ring: 'rgba(150,138,209,0.3)',
  },
  product: {
    base: '#685BAD',
    light: '#EBE8F8',
    dark: '#4D4289',
    shadow: 'rgba(104,91,173,0.25)',
    gradient: 'linear-gradient(135deg, #685BAD 0%, #968AD1 100%)',
    ring: 'rgba(104,91,173,0.3)',
  },
  exhibition: {
    base: '#F38C5C',
    light: '#FEF0E8',
    dark: '#D46830',
    shadow: 'rgba(243,140,92,0.25)',
    gradient: 'linear-gradient(135deg, #F38C5C 0%, #FDBA74 100%)',
    ring: 'rgba(243,140,92,0.3)',
  },
  event: {
    base: '#FBBA4B',
    light: '#FEF7E6',
    dark: '#D9920A',
    shadow: 'rgba(251,186,75,0.25)',
    gradient: 'linear-gradient(135deg, #FBBA4B 0%, #FDE68A 100%)',
    ring: 'rgba(251,186,75,0.3)',
  },
}

// categoryId → color 매핑
export const CATEGORY_COLOR_MAP = {
  banner: PAGE_COLORS.banner,
  product: PAGE_COLORS.product,
  exhibition: PAGE_COLORS.exhibition,
  event: PAGE_COLORS.event,
}

export function getPageColor(categoryId) {
  return CATEGORY_COLOR_MAP[categoryId] ?? PAGE_COLORS.home
}
