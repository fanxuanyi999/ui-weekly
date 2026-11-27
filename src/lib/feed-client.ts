const entries = document.querySelector<HTMLDivElement>('#feed-entries')!
const index = document.querySelector<HTMLElement>('.issue-index')!
const toggle = index.querySelector<HTMLButtonElement>('.issue-index-toggle')!
const links = [...index.querySelectorAll<HTMLAnchorElement>('[data-issue]')]
const next = document.querySelector<HTMLAnchorElement>('.feed-next')
const status = document.querySelector<HTMLElement>('.feed-status')!
const firstPage = Number(index.dataset.feedPage)
const linksById = new Map(links.map(link => [link.dataset.issue!, link]))
let activeLink: HTMLAnchorElement | undefined
let pending: Promise<boolean> | undefined
let jumpVersion = 0
let scheduled = false

index.dataset.enhanced = ''
toggle.hidden = false

function setDirectoryOpen(open: boolean) {
  toggle.setAttribute('aria-expanded', String(open))
  index.toggleAttribute('data-open', open)
}

function markCurrent(id: string) {
  const link = linksById.get(id)
  if (link === activeLink) return
  activeLink?.removeAttribute('aria-current')
  link?.setAttribute('aria-current', 'location')
  activeLink = link
}

function syncCurrent() {
  scheduled = false
  const line = document.querySelector('.top')!.getBoundingClientRect().bottom + 30
  let current = entries.firstElementChild
  for (const article of entries.children) {
    if (article.getBoundingClientRect().top > line) break
    current = article
  }
  if (current) markCurrent(current.id)
}

function scheduleCurrent() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(syncCurrent)
}

const observer = 'IntersectionObserver' in window
  ? new IntersectionObserver(records => {
      if (records.some(record => record.isIntersecting)) void loadNext()
    }, { rootMargin: '0px 0px 360px' })
  : undefined

async function appendNext(link: HTMLAnchorElement) {
  observer?.unobserve(link)
  status.textContent = '正在加载周报…'
  try {
    const response = await fetch(link.href)
    if (!response.ok) throw new Error('Could not load feed page')
    const page = new DOMParser().parseFromString(await response.text(), 'text/html')
    const articles = page.querySelectorAll('#feed-entries > article')
    if (!articles.length || [...articles].some(article => !article.id || document.getElementById(article.id))) {
      throw new Error('Feed page contains missing or duplicate articles')
    }
    const following = page.querySelector('.feed-next')?.getAttribute('href')
    entries.append(...articles)
    if (following) {
      link.href = following
      observer?.observe(link)
    } else {
      link.hidden = true
    }
    status.textContent = ''
    scheduleCurrent()
    return true
  } catch {
    status.textContent = '加载失败，可以点击下方链接重试。'
    return false
  }
}

function loadNext() {
  if (pending) return pending
  if (!next || next.hidden) return Promise.resolve(false)
  pending = appendNext(next).finally(() => { pending = undefined })
  return pending
}

async function jumpTo(link: HTMLAnchorElement, saveHistory: boolean) {
  const version = ++jumpVersion
  const id = link.dataset.issue!
  setDirectoryOpen(false)
  while (version === jumpVersion && !document.getElementById(id)) {
    if (!await loadNext()) {
      if (version === jumpVersion) location.assign(link.href)
      return
    }
  }
  if (version !== jumpVersion) return
  const article = document.getElementById(id)!
  if (saveHistory && location.hash !== '#' + id) history.pushState(null, '', '#' + id)
  article.focus({ preventScroll: true })
  article.scrollIntoView()
  markCurrent(id)
}

function plainClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}

next?.addEventListener('click', async event => {
  if (!plainClick(event)) return
  event.preventDefault()
  if (!await loadNext()) location.assign(next.href)
})
if (next) observer?.observe(next)

for (const link of links) {
  link.addEventListener('click', event => {
    if (!plainClick(event) || Number(link.dataset.page) < firstPage) return
    event.preventDefault()
    void jumpTo(link, true)
  })
}

function followHash() {
  const link = linksById.get(location.hash.slice(1))
  if (link && Number(link.dataset.page) >= firstPage) void jumpTo(link, false)
}

toggle.addEventListener('click', () => setDirectoryOpen(!index.hasAttribute('data-open')))
document.addEventListener('click', event => {
  if (event.target instanceof Node && !index.contains(event.target)) setDirectoryOpen(false)
})
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !index.hasAttribute('data-open')) return
  setDirectoryOpen(false)
  toggle.focus()
})
window.addEventListener('scroll', scheduleCurrent, { passive: true })
window.addEventListener('hashchange', followHash)
syncCurrent()
followHash()
