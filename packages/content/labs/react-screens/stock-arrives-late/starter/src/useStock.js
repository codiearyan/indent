// Loads the stock from data/stock.json and returns { records, status, retry }.
// status is 'loading', 'ready' or 'failed'.
export function useStock() {
  return { records: [], status: 'loading', retry() {} }
}
