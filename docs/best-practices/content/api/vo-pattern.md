---
title: VO 클래스 패턴
description: 서버 응답 데이터에 비즈니스 로직을 캡슐화하는 방법
outline: deep
---

# VO 클래스 패턴

## Overview

VO(Value Object)는 서버 응답 데이터에 비즈니스 로직을 추가하여 캡슐화하는 패턴입니다. 컴포넌트에 흩어진 계산 로직을 한 곳에 모아 재사용성과 테스트 용이성을 높입니다.

## 1. 문제 상황

```tsx
// ❌ 컴포넌트에서 직접 계산
function MovieDetail({ movie }: { movie: Movie }) {
  const hours = Math.floor(movie.runtime / 60);
  const minutes = movie.runtime % 60;
  const formattedRuntime = `${hours}시간 ${minutes}분`;

  const releaseYear = movie.releaseDate.split('-')[0];
  const genres = movie.genres.map(g => g.name).join(' • ');
  const movieInfo = `${releaseYear} • ${formattedRuntime} • ${genres}`;

  return <div>{movieInfo}</div>;
}
```

**문제:**
- 계산 로직이 컴포넌트에 흩어짐
- 같은 계산이 여러 컴포넌트에서 중복
- 비즈니스 로직과 UI가 혼재

## 2. createBaseModel 유틸

```tsx
// utils/createBaseModel.ts
export const createBaseModel = <T>() => {
  return class {
    constructor(props: T) {
      Object.assign(this, props);
    }
  } as { new (args: T): Exclude<T, null | undefined> };
};
```

## 3. VO 클래스 정의

```tsx
// models/movie.service.ts
import { createBaseModel } from '@/utils/createBaseModel';
import type { MovieDetail } from './movie.dto';

abstract class MovieBase extends createBaseModel<MovieDetail>() {
  protected constructor(detail: MovieDetail) {
    super(detail);
  }

  get directors() {
    return this.credits.crew.filter((item) => item.department === 'Directing');
  }

  get formattedRuntime(): string {
    const hours = Math.floor(this.runtime / 60);
    const minutes = this.runtime % 60;
    return `${hours}시간 ${minutes}분`;
  }

  get movieInfo(): string {
    const releaseYear = this.releaseDate.split('-')[0];
    const genres = this.genres.map((item) => item.name).join(' • ');
    return `${releaseYear} • ${this.formattedRuntime} • ${genres}`;
  }

  get formattedRating(): string {
    return this.voteAverage.toFixed(1);
  }
}

export class Movie extends MovieBase {
  constructor(detail: MovieDetail) {
    super(detail);
  }
}
```

## 4. API에서 사용

```tsx
// remotes/movie.ts
import { httpClient } from '@/remotes/httpClient';
import { Movie } from '../models/movie.service';

export async function fetchMovieDetail(params: { id: string }) {
  const response = await httpClient.get<MovieDetail>(`/movie/${params.id}`);
  return new Movie(response); // VO 클래스로 감싸서 반환
}
```

## 5. 컴포넌트

```tsx
// ✅ 깔끔해진 컴포넌트
function MovieDetail({ movie }: { movie: Movie }) {
  return (
    <div>
      <p>{movie.movieInfo}</p>
      <p>감독: {movie.directors.map(d => d.name).join(', ')}</p>
      <p>평점: {movie.formattedRating}</p>
    </div>
  );
}
```

**장점:**
- 비즈니스 로직 한 곳 집중
- 컴포넌트 간결
- 로직 독립 테스트 가능

**사용 권장:**
- 복잡한 계산 로직 필요 (영화, 주문, 결제)
- 같은 변환 로직이 여러 곳에서 반복
- 도메인 로직을 명확히 분리하고 싶을 때
