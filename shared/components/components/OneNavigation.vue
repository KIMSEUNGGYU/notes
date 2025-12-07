<template>
  <div class="one-navigation">
    <div class="nav-items">
      <div
        v-for="item in NAVIGATION_ITEMS"
        :key="item.path"
        class="nav-item"
        :class="{ active: isActive(item.path) }"
        :data-tooltip="item.tooltip"
      >
        <a :href="item.href" @click.prevent="handleNavigation(item.href)">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="nav-icon"
            v-html="item.icon"
          />
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vitepress'
import { NAVIGATION_ITEMS } from '../config/NavigationItems'

const route = useRoute()

function isActive(path: string): boolean {
  return route.path.startsWith(path)
}

function handleNavigation(href: string): void {
  if (typeof window !== 'undefined') {
    window.location.href = href
  }
}
</script>

<style scoped>
.one-navigation {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 64px;
  background-color: var(--vp-c-bg);
  border-right: 1px solid var(--vp-c-divider);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 16px;
  z-index: 100;
}

.nav-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.nav-item:hover {
  background-color: var(--vp-c-default-soft);
}

.nav-item.active {
  background-color: var(--vp-c-brand-soft);
}

.nav-item.active .nav-icon {
  color: var(--vp-c-brand-1);
}

.nav-item a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  text-decoration: none;
}

.nav-icon {
  width: 24px;
  height: 24px;
  color: var(--vp-c-text-2);
  transition: color 0.2s ease;
}

.nav-item:hover .nav-icon {
  color: var(--vp-c-text-1);
}

.nav-item::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 100%;
  margin-left: 12px;
  padding: 4px 8px;
  background-color: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.nav-item:hover::after {
  opacity: 1;
}

@media (max-width: 768px) {
  .one-navigation {
    width: 100%;
    height: 64px;
    bottom: auto;
    flex-direction: row;
    justify-content: center;
    padding-top: 0;
    border-right: none;
    border-bottom: 1px solid var(--vp-c-divider);
  }

  .nav-items {
    flex-direction: row;
  }

  .nav-item::after {
    display: none;
  }
}
</style>
