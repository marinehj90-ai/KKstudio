import { Layers, Image, CalendarRange, Sparkles } from 'lucide-react'

export const templateGroups = [
  {
    id: 'banner',
    label: '배너',
    icon: Layers,
    color: 'from-violet-500 to-purple-600',
    templates: [
      { id: 'b1', name: '최상단 띠배너 (PC)', size: '1712×80', device: 'PC', preview: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)' },
      { id: 'b2', name: '최상단 띠배너 (MO)', size: '1536×140', device: 'MO', preview: 'linear-gradient(135deg, #8b5cf6 0%, #c4b5fd 100%)' },
      { id: 'b3', name: '메인 대배너', size: '750×750', device: '공통', preview: 'linear-gradient(135deg, #6d28d9 0%, #a855f7 50%, #c084fc 100%)' },
      { id: 'b4', name: 'PC 와이드 대배너', size: '1440×480', device: 'PC', preview: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)' },
      { id: 'b5', name: '통컨 기본배너', size: '750×750', device: '공통', preview: 'linear-gradient(135deg, #7e22ce 0%, #a855f7 100%)' },
      { id: 'b6', name: '통컨 띠배너 A (MO)', size: '750×140', device: 'MO', preview: 'linear-gradient(135deg, #9333ea 0%, #d8b4fe 100%)' },
      { id: 'b7', name: '통컨 띠배너 B (PC)', size: '1520×130', device: 'PC', preview: 'linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)' },
      { id: 'b8', name: '브랜드 필수배너 (로고)', size: '320×120', device: '공통', preview: 'linear-gradient(135deg, #581c87 0%, #9333ea 100%)' },
      { id: 'b9', name: '브랜드 필수배너 (이미지)', size: '750×750', device: '공통', preview: 'linear-gradient(135deg, #6b21a8 0%, #a855f7 100%)' },
      { id: 'b10', name: '메인 팝업 공지', size: '750×560', device: '공통', preview: 'linear-gradient(135deg, #7e22ce 0%, #c084fc 100%)' },
      { id: 'b11', name: '메인 팝업 프로모션', size: '750×560', device: '공통', preview: 'linear-gradient(135deg, #9333ea 0%, #e9d5ff 100%)' },
      { id: 'b12', name: '메인 퀵메뉴 이미지', size: '300×300', device: '공통', preview: 'linear-gradient(135deg, #a855f7 0%, #f3e8ff 100%)' },
    ],
  },
  {
    id: 'product',
    label: '상품이미지',
    icon: Image,
    color: 'from-fuchsia-500 to-pink-600',
    templates: [
      { id: 'p1', name: '상품 대표이미지', size: '1500×1500', device: '공통', preview: 'linear-gradient(135deg, #d946ef 0%, #f0abfc 100%)' },
      { id: 'p2', name: 'GWP 대표이미지', size: '1500×1500', device: '공통', preview: 'linear-gradient(135deg, #c026d3 0%, #e879f9 100%)' },
    ],
  },
  {
    id: 'exhibition',
    label: '기획전',
    icon: CalendarRange,
    color: 'from-indigo-500 to-blue-600',
    templates: [
      { id: 'e1', name: '기획전 썸네일', size: '750×750', device: '공통', preview: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' },
      { id: 'e2', name: '기획전 상단 비주얼 (PC)', size: '1440×500', device: 'PC', preview: 'linear-gradient(135deg, #4f46e5 0%, #a5b4fc 100%)' },
      { id: 'e3', name: '기획전 상단 비주얼 (MO)', size: '750×500', device: 'MO', preview: 'linear-gradient(135deg, #4338ca 0%, #818cf8 100%)' },
    ],
  },
  {
    id: 'event',
    label: '이벤트·상세',
    icon: Sparkles,
    color: 'from-amber-500 to-orange-600',
    templates: [
      { id: 'ev1', name: '이벤트 상세 상단', size: '860×400', device: '공통', preview: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)' },
      { id: 'ev2', name: '상세페이지 대표이미지', size: '860×860', device: '공통', preview: 'linear-gradient(135deg, #d97706 0%, #fcd34d 100%)' },
      { id: 'ev3', name: '상세 섹션 컷', size: '860×400', device: '공통', preview: 'linear-gradient(135deg, #b45309 0%, #fbbf24 100%)' },
    ],
  },
]
