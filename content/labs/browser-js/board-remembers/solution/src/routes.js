export async function loadRoutes() {
  const response = await fetch('data/routes.json')
  if (!response.ok) throw new Error(`data/routes.json answered ${response.status}`)
  return response.json()
}
