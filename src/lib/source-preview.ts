const feedbackTimers = new WeakMap<HTMLButtonElement, number>()

document.addEventListener('click', async event => {
  if (!(event.target instanceof Element)) return
  const button = event.target.closest<HTMLButtonElement>('.source-copy')
  const source = button?.closest('.source')
  const link = source?.querySelector<HTMLAnchorElement>('.source-link')
  const status = source?.querySelector<HTMLElement>('[role="status"]')
  if (!button || !link || !status) return

  let copied = false
  try {
    await navigator.clipboard.writeText(link.href)
    copied = true
  } catch {}

  button.textContent = copied ? '已复制' : '复制失败'
  status.textContent = copied ? '已复制原文链接' : '未能复制原文链接'
  window.clearTimeout(feedbackTimers.get(button))
  feedbackTimers.set(button, window.setTimeout(() => {
    button.textContent = '复制'
    status.textContent = ''
  }, 1800))
})

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return
  const focused = document.activeElement?.closest('.source')
  const source = focused ?? document.querySelector('.source:hover')
  if (!source) return
  source.setAttribute('data-preview-dismissed', '')
  if (focused) focused.querySelector<HTMLElement>('.source-link')?.focus()
})

function resetPreview(event: PointerEvent | FocusEvent) {
  if (!(event.target instanceof Element)) return
  const source = event.target.closest('.source[data-preview-dismissed]')
  if (source && !(event.relatedTarget instanceof Node && source.contains(event.relatedTarget))) {
    source.removeAttribute('data-preview-dismissed')
  }
}

document.addEventListener('pointerout', resetPreview)
document.addEventListener('focusout', resetPreview)
