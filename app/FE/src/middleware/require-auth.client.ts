export default defineNuxtRouteMiddleware(() => {
  // できるだけ同期的に判定（localStorage を直接確認）
  if (process.client) {
    const token = localStorage.getItem('jwtToken') || ''
    if (!token) return navigateTo('/login')
  }
})


