import fs from 'fs';
import matter from 'gray-matter';
import path from 'path';

// 프로덕션 환경 체크
const isProduction = process.env.NODE_ENV === 'production';

interface SidebarItem {
  text: string;
  link?: string;
  collapsed?: boolean;
  items?: SidebarItem[];
}

/**
 * 링크에 해당하는 마크다운 파일 경로를 찾습니다
 */
function getLinkFilePath(link: string): string | null {
  const docsDir = path.resolve(__dirname, '../../');

  // /introduce -> /Users/.../docs/best-practices/introduce/index.md
  // /api/ -> /Users/.../docs/best-practices/api/index.md
  // /folder-structure/feature-based -> /Users/.../docs/best-practices/folder-structure/feature-based.md

  const cleanLink = link.replace(/^\//, '').replace(/\/$/, '');

  const possiblePaths = [
    path.join(docsDir, `${cleanLink}/index.md`),
    path.join(docsDir, `${cleanLink}.md`),
    path.join(docsDir, `${cleanLink}/index.md`),
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  return null;
}

/**
 * 마크다운 파일에서 draft 여부를 체크합니다
 */
function isDraft(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data } = matter(content);
    return data.draft === true;
  } catch (error) {
    console.warn(`Failed to parse ${filePath}:`, error);
    return false;
  }
}

/**
 * sidebar 아이템이 draft인지 확인합니다
 */
function shouldFilterItem(item: SidebarItem): boolean {
  // 프로덕션이 아니면 모든 항목 표시
  if (!isProduction) return false;

  // link가 없으면 필터링하지 않음 (그룹 항목)
  if (!item.link) return false;

  const filePath = getLinkFilePath(item.link);
  if (!filePath) return false;

  return isDraft(filePath);
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
