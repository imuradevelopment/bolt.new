<template>
  <header class="header">
    <div class="left">
      <NuxtLink to="/" class="brand">MVP Chat</NuxtLink>
    </div>
    <div class="right">
      <div v-if="isLoggedIn" class="user">
        <button class="user-btn" @click="toggle">{{ name }}</button>
        <div v-if="open" class="menu" @click.outside="open = false">
          <button class="menu-item" @click="goChat">Chat</button>
          <button class="menu-item" @click="logout">Logout</button>
        </div>
      </div>
      <NuxtLink v-else to="/login" class="login">Login</NuxtLink>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useJwtAuth } from '~/composables/useJwtAuth'

const { token, name: displayName, clear } = useJwtAuth()
const isLoggedIn = computed(() => Boolean(token.value))
const name = computed(() => displayName.value || 'user')
const open = ref(false)

function toggle() { open.value = !open.value }
function logout() { clear(); open.value = false; navigateTo('/login') }
function goChat() { navigateTo('/chat'); open.value = false }
</script>

<style scoped>
.header { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; border-bottom: 1px solid #e5e5e5; position: sticky; top: 0; background: #fff; z-index: 20; }
.brand { font-weight: 700; text-decoration: none; color: #111; }
.user { position: relative; }
.user-btn { border: 1px solid #ccc; padding: 6px 10px; border-radius: 6px; background: #fff; cursor: pointer; }
.menu { position: absolute; right: 0; top: calc(100% + 6px); border: 1px solid #ddd; border-radius: 8px; background: #fff; min-width: 140px; box-shadow: 0 6px 18px rgba(0,0,0,0.08); display: flex; flex-direction: column; }
.menu-item { text-align: left; background: #fff; border: none; padding: 10px 12px; cursor: pointer; }
.menu-item:hover { background: #f5f5f5; }
.login { border: 1px solid #ccc; padding: 6px 10px; border-radius: 6px; text-decoration: none; color: inherit; }
</style>


