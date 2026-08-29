const { readdirSync, readFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

// 이미 쓰고 있는 dev 포트를 읽어 다음 번호를 제안한다
function nextDevPort() {
  const base = 'docs';
  if (!existsSync(base)) return 5173;
  const ports = readdirSync(base)
    .map((d) => join(base, d, '.vitepress', 'config.mts'))
    .filter((p) => existsSync(p))
    .map((p) => readFileSync(p, 'utf8').match(/port:\s*(\d+)/)?.[1])
    .filter(Boolean)
    .map(Number);
  return ports.length > 0 ? Math.max(...ports) + 1 : 5173;
}

module.exports = {
  prompt: ({ inquirer, args }) => {
    const questions = [
      {
        type: 'input',
        name: 'name',
        message: '프로젝트 이름 (kebab-case, 예: my-docs)',
        validate: (input) => {
          if (!/^[a-z][a-z0-9-]*$/.test(input)) {
            return 'kebab-case로 입력해주세요 (예: my-docs)';
          }
          return true;
        },
      },
      {
        type: 'input',
        name: 'title',
        message: '사이트 제목 (예: My Docs)',
      },
      {
        type: 'input',
        name: 'description',
        message: '사이트 설명',
      },
      {
        type: 'input',
        name: 'navTooltip',
        message: '좌측 네비게이션 툴팁 (예: My Docs)',
      },
      {
        type: 'input',
        name: 'devPort',
        message: 'dev 서버 포트',
        default: String(nextDevPort()),
        validate: (input) => (/^\d{4,5}$/.test(input) ? true : '숫자로 입력해주세요'),
      },
    ];

    // CLI 인자로 넘어온 값은 다시 묻지 않는다 (비대화형 실행 가능)
    const given = args || {};
    const remaining = questions.filter((q) => given[q.name] === undefined);

    return inquirer.prompt(remaining).then((asked) => {
      const answers = { ...given, ...asked };

      // 안 물은 항목의 기본값 보정
      answers.devPort = answers.devPort ?? String(nextDevPort());

      // base path는 name에서 자동 생성
      answers.base = `/${answers.name}/`;

      console.log(`
생성 후 남은 작업 2가지:
  1. 루트 package.json 에 스크립트 추가
       "docs:${answers.name}:dev": "pnpm --filter ${answers.name} dev",
       "docs:${answers.name}:build": "pnpm --filter ${answers.name} build",
       "docs:${answers.name}:preview": "pnpm --filter ${answers.name} preview"
  2. pnpm install 후 packages/shared/src/nav-apps.ts 의 아이콘 TODO 교체
`);

      return answers;
    });
  },
};
