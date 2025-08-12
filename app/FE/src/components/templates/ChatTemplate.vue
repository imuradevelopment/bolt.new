<template>
  <section class="container">
    <header class="header">
      <slot name="title"><h1 class="title">MVP Chat</h1></slot>
    </header>
    <main class="content">
      <slot />
    </main>
  </section>
  
</template>

<script setup lang="ts">
// Presentation-only template. Page injects organisms into default slot.
</script>

<style scoped>
.container { display: flex; flex-direction: column; gap: 16px; }
.header { padding: 8px 0; }
.title { font-weight: 700; font-size: 20px; }
.content { }
</style>