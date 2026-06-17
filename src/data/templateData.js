import { Layers, Image, CalendarRange, Sparkles, BookImage, BellDot } from 'lucide-react'

// 공통 preview gradient — 히어로와 동일 톤
const PV_HERO = 'linear-gradient(135deg, #E06038 0%, #F27848 35%, #F5A255 68%, #FFD28A 100%)'
const PV_STD  = PV_HERO
const PV_DEEP = PV_HERO
const PV_WARM = PV_HERO
const PV_RICH = PV_HERO

export const templateGroups = [
  {
    id: 'banner',
    label: '배너',
    icon: Layers,
    hex: '#F15A24',
    light: '#FFF0E5',
    dark: '#D44117',
    gradient: 'linear-gradient(135deg, #F6A23A 0%, #F15A24 55%, #E94E1B 100%)',
    templates: [
      { id: 'b1',  name: '최상단 띠배너 (PC)',         size: '1712×80',   device: 'PC',   preview: PV_DEEP },
      { id: 'b2',  name: '최상단 띠배너 (MO)',         size: '1536×140',  device: 'MO',   preview: PV_RICH },
      { id: 'b3',  name: '메인 대배너',               size: '750×750',   device: '공통', preview: PV_STD  },
      { id: 'b4',  name: 'PC 와이드 대배너',           size: '1440×480',  device: 'PC',   preview: PV_DEEP },
      { id: 'b5',  name: '통컨 기본배너',             size: '750×750',   device: '공통', preview: PV_WARM },
      { id: 'b6',  name: '통컨 띠배너 A (MO)',         size: '750×140',   device: 'MO',   preview: PV_RICH },
      { id: 'b7',  name: '통컨 띠배너 B (PC)',         size: '1520×130',  device: 'PC',   preview: PV_STD  },
      { id: 'b11', name: '메인 팝업 프로모션',         size: '750×560',   device: '공통', preview: PV_WARM },
      { id: 'b12', name: '메인 퀵메뉴 이미지',         size: '300×300',   device: '공통', preview: PV_STD  },
    ],
  },
  {
    id: 'notice',
    label: '메인공지팝업',
    icon: BellDot,
    hex: '#F6A23A',
    light: '#FFF7EF',
    dark: '#D44117',
    gradient: 'linear-gradient(135deg, #FFD58A 0%, #F6A23A 55%, #F15A24 100%)',
    templates: [
      { id: 'b10', name: '메인 팝업 공지', size: '750×560', device: '공통', preview: PV_WARM },
    ],
  },
  {
    id: 'brand',
    label: '브랜드어셋',
    icon: BookImage,
    hex: '#F6A23A',
    light: '#FFF7EF',
    dark: '#D44117',
    gradient: 'linear-gradient(135deg, #FFD58A 0%, #F6A23A 55%, #F15A24 100%)',
    templates: [
      { id: 'b8',  name: '브랜드 필수배너 (로고)',           size: '320×120',  device: '공통', preview: PV_DEEP },
      { id: 'b9',  name: '브랜드 필수배너 이미지 (정사각)', size: '750×750',  device: '공통', preview: PV_STD  },
      { id: 'b9r', name: '브랜드 필수배너 이미지 (직사각)', size: '1000×600', device: '공통', preview: PV_WARM },
    ],
  },
  {
    id: 'product',
    label: '상품이미지',
    icon: Image,
    hex: '#F6A23A',
    light: '#FFF7EF',
    dark: '#D44117',
    gradient: 'linear-gradient(135deg, #FFD58A 0%, #F6A23A 55%, #F15A24 100%)',
    templates: [
      { id: 'p1', name: '상품 대표이미지', size: '1500×1500', device: '공통', preview: PV_RICH },
      { id: 'p2', name: 'GWP 대표이미지', size: '1500×1500', device: '공통', preview: PV_DEEP },
    ],
  },
  {
    id: 'exhibition',
    label: '기획전',
    icon: CalendarRange,
    hex: '#F15A24',
    light: '#FFF0E5',
    dark: '#D44117',
    gradient: 'linear-gradient(135deg, #F6A23A 0%, #F15A24 55%, #E94E1B 100%)',
    templates: [
      { id: 'e1', name: '기획전 상단 비주얼 (PC와이드)', size: '1440×500', device: 'PC',   preview: PV_DEEP, heightResizable: true },
      { id: 'e2', name: '기획전 상단 비주얼 (PC)',       size: '1000×500', device: 'PC',   preview: PV_STD,  heightResizable: true },
      { id: 'e3', name: '기획전 상단 비주얼 (MO)',       size: '750×500',  device: 'MO',   preview: PV_RICH, heightResizable: true },
      { id: 'e4', name: '기획전 모듈용 썸네일',         size: '750×750',  device: '공통', preview: PV_WARM, heightResizable: true },
      { id: 'e5', name: '기획전 MD추천 모듈',           size: '1440×1048', device: 'PC',   preview: PV_DEEP, heightResizable: true },
    ],
  },
  {
    id: 'event',
    label: '이벤트·상세',
    icon: Sparkles,
    hex: '#F6A23A',
    light: '#FFF7EF',
    dark: '#D44117',
    gradient: 'linear-gradient(135deg, #FFD58A 0%, #F6A23A 55%, #F15A24 100%)',
    templates: [
      { id: 'ev1', name: '이벤트 상단 비주얼 (PC와이드)', size: '1440×500', device: 'PC',   preview: PV_WARM, heightResizable: true },
      { id: 'ev2', name: '이벤트 상단 비주얼 (PC)',       size: '1000×500', device: 'PC',   preview: PV_STD,  heightResizable: true },
      { id: 'ev3', name: '이벤트 상단 비주얼 (MO)',       size: '750×500',  device: 'MO',   preview: PV_RICH, heightResizable: true },
      { id: 'ev4', name: '제휴 이벤트 공통 배너',         size: '750×750',  device: '공통', preview: PV_DEEP, heightResizable: true },
    ],
  },
]
