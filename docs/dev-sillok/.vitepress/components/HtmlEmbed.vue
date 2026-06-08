<script setup lang="ts">
import { withBase } from 'vitepress';

defineProps<{
  /** public 기준 경로. 예: '/cc-plugin.html' */
  src: string;
  title?: string;
}>();
</script>

<template>
  <!-- 자체 완결형 HTML(발표자료 등)을 layout:false 페이지에서 전체화면으로 임베드 -->
  <iframe
    class="embed-frame--full"
    :src="withBase(src)"
    :title="title ?? 'embedded content'"
  />
</template>
