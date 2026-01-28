export default interface EventCardData {
  id: number;
  banner_image_url: string;
  title: string;
  description: string;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  cta_label: string | null;
  cta_url: string | null;
  duration_hours: number | null;
}
