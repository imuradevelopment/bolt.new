<template>
  <section class="min-h-screen flex flex-col items-center p-6 gap-4">
    <header class="w-full max-w-3xl">
      <slot name="title">
        <h1 class="text-2xl font-bold">MVP Chat</h1>
      </slot>
    </header>
    <main class="w-full max-w-3xl">
      <slot />
    </main>
  </section>
</template>

<script setup lang="ts">
// Presentation-only template. Page injects organisms into default slot.
</script>


