module.exports = {
  prompt: ({ inquirer }) => {
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
    ];

    return inquirer.prompt(questions).then((answers) => {
      // base path는 name에서 자동 생성
      answers.base = `/${answers.name}/`;
      return answers;
    });
  },
};
