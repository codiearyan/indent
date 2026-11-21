// Task: One listener for the whole list
//
// watchTicks(list, onToggle) calls onToggle(routeId) whenever a tick button in the list is
// clicked. This version works for the first click only. Find out why.
export function watchTicks(list, onToggle) {
  for (const button of list.querySelectorAll('.tick')) {
    button.addEventListener('click', () => {
      onToggle(button.closest('.route').dataset.id)
    })
  }
}
