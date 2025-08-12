<template>
  <ChatTemplate>
    <div class="border rounded p-4 max-w-xl mx-auto space-y-3">
      <h2 class="text-xl font-semibold">Welcome</h2>
      <p class="text-sm text-gray-600">このアプリを使うにはログインしてください。</p>
      <div class="flex gap-2">
        <NuxtLink to="/login" class="px-3 py-1 border rounded">Login</NuxtLink>
        <NuxtLink to="/chat" class="px-3 py-1 border rounded">Chat</NuxtLink>
      </div>
    </div>
  </ChatTemplate>
</template>

<script setup lang="ts">
import ChatTemplate from '~/components/templates/ChatTemplate.vue'
</script>

<style>
html, body, #__nuxt { height: 100%; }
</style>


