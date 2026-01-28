export const formatPrice = (
  priceCents: number | null | undefined,
  currency = "PHP"
) => {
  if (priceCents == null || Number.isNaN(priceCents)) return "";
  return `${currency} ${(priceCents / 100).toFixed(2)}`;
};
