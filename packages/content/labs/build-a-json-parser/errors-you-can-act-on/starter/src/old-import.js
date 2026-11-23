// The import script Sefton wrote years ago, when the lists were short. It does not read JSON: it
// looks for the pieces it expects in each item and hopes for the best.
export function oldImport(text) {
  const items = []
  for (const block of text.split('{').slice(2)) {
    const code = /"code":\s*"([^"]*)"/.exec(block)
    const name = /"name":\s*"([^"]*)"/.exec(block)
    const price = /"price":\s*([\d.]+)/.exec(block)
    if (!code || !name || !price) throw new Error('Could not read the file')
    items.push({ code: code[1], name: name[1], price: Number(price[1]) })
  }
  return items
}
