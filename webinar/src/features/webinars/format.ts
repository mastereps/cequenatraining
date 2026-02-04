export const formatManilaDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));

export const formatSeatLabel = (availableSeats: number | null) => {
  if (availableSeats === null) return "Unlimited seats";
  if (availableSeats <= 0) return "Fully booked";
  if (availableSeats === 1) return "1 seat left";
  return `${availableSeats} seats left`;
};
