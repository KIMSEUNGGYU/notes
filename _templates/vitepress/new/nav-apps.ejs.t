---
to: packages/shared/src/nav-apps.ts
inject: true
before: "// hygen:apps"
---
  {
    base: '<%= base %>',
    devPort: <%= devPort %>,
    tooltip: '<%= navTooltip %>',
    // TODO: https://heroicons.com/ (Solid) 에서 아이콘을 골라 교체
    icon: `<path d="M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z"/>`,
    draft: true,
  },
