// Task 2: show what customers typed as text, never as HTML (ticket LL-15).
//
// renderOrderCard(order) returns the HTML of one order card. The same card is on the customer's
// order page and on the staff board, where Rune and Deshawn are signed in with staff rights.
// order is { id, title, status, customerName, note }: the title, the name and the note are
// typed by customers; the id and the status are set by the shop.
// Keep the function name, its argument and the HTML around the values.

export function renderOrderCard(order) {
  return `<article class="order">
  <h2>${order.title}</h2>
  <p class="customer">${order.customerName}</p>
  <p class="status">${order.status}</p>
  <p class="note">${order.note}</p>
  <form method="post" action="/orders/${order.id}/note">
    <input name="note" value="${order.note}">
    <button>Save note</button>
  </form>
</article>`
}
