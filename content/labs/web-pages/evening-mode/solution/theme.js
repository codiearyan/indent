const toggle = document.querySelector('#theme-toggle')

toggle.addEventListener('click', () => {
  const root = document.documentElement
  const dark = root.dataset.theme !== 'dark'
  root.dataset.theme = dark ? 'dark' : 'light'
  toggle.setAttribute('aria-pressed', String(dark))
})
