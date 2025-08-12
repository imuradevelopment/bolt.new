export default defineNuxtRouteMiddleware(() => {
  const { getAuthHeader } = useBasicAuth()
  const headers = getAuthHeader()
  if (!headers.Authorization) {
    return navigateTo('/')
  }
})


