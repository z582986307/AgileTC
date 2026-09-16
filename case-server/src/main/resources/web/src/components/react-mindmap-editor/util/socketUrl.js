export const getSocketUrl = location => {
  const port = location.protocol === 'http:' && location.port ? Number(location.port) + 1 : 8095
  return `${location.protocol}//${location.hostname}:${port}`
}
