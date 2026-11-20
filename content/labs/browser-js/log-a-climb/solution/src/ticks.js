export function watchTicks(list, onToggle) {
  list.addEventListener('click', (event) => {
    const button = event.target.closest('.tick')
    if (button) onToggle(button.closest('.route').dataset.id)
  })
}
