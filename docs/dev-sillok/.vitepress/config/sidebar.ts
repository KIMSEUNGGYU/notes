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
function shouldFilterItem(item: SidebarItem, phase: string | undefined): boolean {
  // PHASE가 'live'가 아니면 모든 항목 표시 (dev, local에서는 draft 표시)
  if (phase !== 'live') return false;

  // sidebar 객체의 draft 속성 체크
  return item.draft === true;
}

/**
 * sidebar 배열에서 draft 항목을 필터링합니다
 */
function filterSidebarItems(items: SidebarItem[], phase: string | undefined): SidebarItem[] {
  return items
    .map((item) => {
      // 하위 items가 있는 경우 재귀적으로 필터링
      if (item.items) {
        const filteredItems = filterSidebarItems(item.items, phase);

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
      if (shouldFilterItem(item, phase)) {
        return null;
      }

      return item;
    })
    .filter((item): item is SidebarItem => item !== null);
}

/**
 * sidebar에서 draft 항목을 필터링합니다
 */
export async function filterDraftFromSidebar(sidebar: SidebarItem[], phase?: string): Promise<SidebarItem[]> {
  return filterSidebarItems(sidebar, phase);
}
