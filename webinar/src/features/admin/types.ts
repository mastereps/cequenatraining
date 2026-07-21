export interface DashboardStat {
  value: number;
  /** Percent change vs the previous 7 days, or null when there is no baseline. */
  delta: number | null;
}

export interface DashboardStats {
  totalRegistrations: DashboardStat;
  upcomingWebinars: DashboardStat;
  bookSales: DashboardStat;
  revenueCents: DashboardStat;
  activeUsers: DashboardStat;
  publishedPages: DashboardStat;
}

export interface SeriesPoint {
  day: string;
  total: number;
}

export interface DashboardUpcomingWebinar {
  slug: string;
  title: string;
  start_at: string;
  status: "upcoming" | "scheduled";
}

export interface DashboardRegistration {
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  webinar_title: string;
}

export interface DashboardOrder {
  id: string;
  title: string;
  total_cents: number;
  payment_status: string;
  created_at: string;
}

export interface DashboardSummary {
  stats: DashboardStats;
  registrationsSeries: {
    current: SeriesPoint[];
    previous: SeriesPoint[];
  };
  upcomingWebinars: DashboardUpcomingWebinar[];
  recentRegistrations: DashboardRegistration[];
  recentOrders: DashboardOrder[];
}
