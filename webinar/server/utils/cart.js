export const toLineItems = (items) =>
  items.map((item) => ({
    name: item.title || "Item",
    amount: Math.round(Number(item.price_cents)),
    currency: item.currency || "PHP",
    quantity: Math.round(Number(item.quantity)),
  }));

export const filterValidLineItems = (lineItems) =>
  lineItems.filter(
    (item) =>
      Number.isFinite(item.amount) &&
      item.amount > 0 &&
      Number.isFinite(item.quantity) &&
      item.quantity > 0
  );
