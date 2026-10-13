/** Dispara o download de um arquivo público sem sair da página. */
export function downloadFile(url: string, fileName?: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.rel = 'noopener'
  if (fileName) anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
