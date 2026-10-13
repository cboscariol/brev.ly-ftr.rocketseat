/** Navega para uma URL externa substituindo a entrada atual do histórico. */
export function redirectTo(url: string) {
  window.location.replace(url)
}
