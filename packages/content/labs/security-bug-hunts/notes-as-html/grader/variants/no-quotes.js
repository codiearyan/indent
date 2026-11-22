const escape = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

export function renderOrderCard(order) {
  return `<article class="order">
  <h2>${escape(order.title)}</h2>
  <p class="customer">${escape(order.customerName)}</p>
  <p class="status">${escape(order.status)}</p>
  <p class="note">${escape(order.note)}</p>
  <form method="post" action="/orders/${order.id}/note">
    <input name="note" value="${escape(order.note)}">
    <button>Save note</button>
  </form>
</article>`
}
