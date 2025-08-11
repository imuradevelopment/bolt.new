<template>
  <div>
    <slot />
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
</script>

<style>
.fade-enter-active, .fade-leave-active { transition: opacity .2s }
.fade-enter-from, .fade-leave-to { opacity: 0 }
</style>


