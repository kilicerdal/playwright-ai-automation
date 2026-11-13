const descriptions: Record<string, { label: string; category: 'inventory' | 'pricing' }> = {
  'price-round-to-dollars': { label: 'Prices are rounded to whole dollars', category: 'pricing' },
  'price-last-line-only': { label: 'Only the last cart line is charged', category: 'pricing' },
  'price-ignore-quantity': { label: 'Product quantities are ignored', category: 'pricing' },
  'price-add-instead-of-multiply': {
    label: 'Price and quantity are added instead of multiplied',
    category: 'pricing',
  },
  'price-one-cent-surcharge': { label: 'An extra cent is added to the total', category: 'pricing' },
  'price-inflate-unit-snapshot': {
    label: 'The stored unit price is increased by one cent',
    category: 'pricing',
  },
  'inventory-reject-exact-stock': {
    label: 'Buying the exact available stock is rejected',
    category: 'inventory',
  },
  'inventory-ignore-existing-cart': {
    label: 'Items already in the cart are ignored',
    category: 'inventory',
  },
  'inventory-skip-decrement': {
    label: 'Checkout skips the stock deduction',
    category: 'inventory',
  },
  'inventory-decrement-one-only': {
    label: 'Checkout deducts only one unit',
    category: 'inventory',
  },
  'inventory-skip-restock': {
    label: 'Cancellation and refund skip restocking',
    category: 'inventory',
  },
  'inventory-restock-one-only': {
    label: 'Cancellation and refund restore only one unit',
    category: 'inventory',
  },
};
export function mutationDescription(id: string) {
  const description = descriptions[id];
  if (!description) throw new Error(`Missing mutation description: ${id}`);
  return description;
}
