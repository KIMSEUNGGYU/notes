import { loadEnv } from 'vitepress';

// .env 파일과 환경 변수 모두 읽기 (환경 변수 우선)
const env = loadEnv('', process.cwd(), '');

export const phase = process.env.PHASE || env.PHASE || 'dev';
export const isProduction = phase === 'live';
