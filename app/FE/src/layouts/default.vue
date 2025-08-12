<template>
  <AppHeader />
  <div class="app-root">
    <aside class="app-aside">
      <AppSidebar />
    </aside>
    <main class="app-main">
      <slot />
    </main>
    <transition name="fade">
      <div v-if="visible" class="fixed bottom-4 right-4 z-50 bg-red-600 text-white px-4 py-2 rounded shadow">
        {{ message }}
      </div>
    </transition>
  </div>
  
</template>

<script setup lang="ts">
import { useGlobalAlert } from '~/composables/useGlobalAlert'
const { message, visible } = useGlobalAlert()
import AppSidebar from '~/components/organisms/AppSidebar.vue'
import AppHeader from '~/components/organisms/AppHeader.vue'
</script>

<style>
html, body, #__nuxt { margin: 0; height: 100%; }
* { box-sizing: border-box; }
.app-root { display: grid; grid-template-columns: 240px 1fr; height: calc(100dvh - 56px); overflow: hidden; }
.app-aside { background: #fff; height: 100%; overflow: auto; }
.app-main { padding: 0; height: 100%; overflow: auto; }
.fade-enter-active, .fade-leave-active { transition: opacity .2s }
.fade-enter-from, .fade-leave-to { opacity: 0 }
@media (max-width: 860px) {
  .app-root { grid-template-columns: 200px 1fr; }
}
</style>


