---
title: 인프라
description: 개발 환경 설정과 인프라 구축 경험
---

# 인프라

프론트엔드 개발 환경과 배포 인프라 구축 경험을 정리합니다.

## 주요 영역

### 개발 환경
- 로컬 개발 환경 설정
- Docker를 이용한 환경 통일
- 개발 도구 설정 (ESLint, Prettier, TypeScript)

### CI/CD
- GitHub Actions 설정
- 자동화된 테스트 및 배포
- 브랜치 전략과 배포 플로우

### 모니터링
- 에러 트래킹 (Sentry)
- 성능 모니터링
- 사용자 분석

## 인프라 설정 예시

### Docker Compose로 개발 환경 구성

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
```

### GitHub Actions 워크플로우

```yaml
name: CI/CD

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
```
