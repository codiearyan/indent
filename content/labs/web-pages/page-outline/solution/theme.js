const toggle = document.querySelector('#theme-toggle')

toggle.addEventListener('click', () => {
  const root = document.documentElement
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
})
