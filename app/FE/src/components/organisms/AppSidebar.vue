<template>
  <nav class="sidebar">
    <div class="brand">MVP Chat</div>
    <ul class="menu">
      <li><NuxtLink to="/chat" class="link">Chat</NuxtLink></li>
      <li v-if="!isLoggedIn"><NuxtLink to="/login" class="link">Login</NuxtLink></li>
      <li v-else><button class="link btn" @click="logout">Logout</button></li>
    </ul>
    <div class="profile" v-if="isLoggedIn">
      <div class="label">Signed in</div>
      <div class="name">{{ name }}</div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useJwtAuth } from '~/composables/useJwtAuth'

const { token, name: displayName, clear } = useJwtAuth()
const isLoggedIn = computed(() => Boolean(token.value))
const name = computed(() => displayName.value || 'guest')

function logout() {
  clear()
  navigateTo('/login')
}
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-right: 1px solid #ddd;
  min-height: 100vh;
  width: 220px;
}
.brand {
  font-weight: 700;
  font-size: 18px;
}
.menu {
  list-style: none;
  padding: 0;
  margin: 8px 0 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.link {
  display: inline-block;
  padding: 6px 8px;
  border: 1px solid #ccc;
  border-radius: 6px;
  text-decoration: none;
  color: inherit;
  background: #fafafa;
}
.link:hover { background: #f2f2f2; }
.btn { cursor: pointer; background: #fff; }
.profile { margin-top: auto; font-size: 12px; color: #555; }
.name { font-weight: 600; color: #333; }

@media (max-width: 860px) {
  .sidebar { width: 180px; }
}
</style>


