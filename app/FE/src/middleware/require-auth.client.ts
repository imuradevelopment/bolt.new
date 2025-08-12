export default defineNuxtRouteMiddleware(() => {
  const { getAuthHeader } = useJwtAuth()
  const headers = getAuthHeader()
  if (!headers.Authorization) {
    return navigateTo('/')
  }
})


