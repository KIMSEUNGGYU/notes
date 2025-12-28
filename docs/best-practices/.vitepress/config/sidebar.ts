// 프로덕션 환경 체크
const isProduction = process.env.NODE_ENV === 'production';

interface SidebarItem {
  text: string;
  link?: string;
  collapsed?: boolean;
  draft?: boolean;
  items?: SidebarItem[];
}

/**
 * sidebar 아이템이 draft인지 확인합니다
 */
function shouldFilterItem(item: SidebarItem): boolean {
  // 프로덕션이 아니면 모든 항목 표시
  if (!isProduction) return false;

  // sidebar 객체의 draft 속성 체크
  return item.draft === true;
}

/**
 * sidebar 배열에서 draft 항목을 필터링합니다
 */
function filterSidebarItems(items: SidebarItem[]): SidebarItem[] {
  return items
    .map((item) => {
      // 하위 items가 있는 경우 재귀적으로 필터링
      if (item.items) {
        const filteredItems = filterSidebarItems(item.items);

        // 하위 항목이 모두 필터링되면 그룹도 제거
        if (filteredItems.length === 0) {
          return null;
        }

        return {
          ...item,
          items: filteredItems,
        };
      }

      // draft 항목 필터링
      if (shouldFilterItem(item)) {
        return null;
      }

      return item;
    })
    .filter((item): item is SidebarItem => item !== null);
}

/**
 * sidebar에서 draft 항목을 필터링합니다
 */
export async function filterDraftFromSidebar(sidebar: SidebarItem[]): Promise<SidebarItem[]> {
  return filterSidebarItems(sidebar);
}
