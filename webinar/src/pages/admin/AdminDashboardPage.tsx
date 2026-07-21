import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AiOutlineArrowDown,
  AiOutlineArrowUp,
  AiOutlineCalendar,
  AiOutlineExport,
  AiOutlineFileText,
  AiOutlineRead,
  AiOutlineTeam,
  AiOutlineVideoCamera,
  AiOutlineWallet,
} from "react-icons/ai";
import { useAuth } from "../../store/AuthContext";
import { isSuperAdmin } from "../../features/auth/roles";
import { fetchDashboardSummary } from "../../features/admin/api";
import type { DashboardStat, DashboardSummary, SeriesPoint } from "../../features/admin/types";
import { formatManilaDateTime } from "../../features/webinars/format";
import { formatPrice } from "../../utils/formatPrice";

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section
    className={`rounded-xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1220] ${className}`}
  >
    {children}
  </section>
);

const PanelHeader = ({ title, action }: { title: string; action?: React.ReactNode }) => (
  <div className="mb-4 flex items-center justify-between">
    <h2 className="text-base font-semibold">{title}</h2>
    {action}
  </div>
);

const DeltaChip = ({ delta }: { delta: number | null }) => {
  if (delta === null) return null;
  const up = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        up ? "text-lantern" : "text-rose-500"
      }`}
    >
      {up ? <AiOutlineArrowUp /> : <AiOutlineArrowDown />}
      {Math.abs(delta)}%
      <span className="font-normal text-slate-400">vs last 7 days</span>
    </span>
  );
};

const StatCard = ({
  label,
  stat,
  icon,
  format,
}: {
  label: string;
  stat: DashboardStat;
  icon: React.ReactNode;
  format?: (value: number) => string;
}) => (
  <Card>
    <div className="mb-3 flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lantern/15 text-lg text-lantern">
        {icon}
      </span>
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
    </div>
    <p className="mb-1 text-2xl font-bold">
      {format ? format(stat.value) : stat.value.toLocaleString()}
    </p>
    <DeltaChip delta={stat.delta} />
  </Card>
);

const StatusPill = ({ status }: { status: string }) => {
  const tone =
    status === "verified" || status === "paid" || status === "upcoming"
      ? "bg-lantern/15 text-lantern"
      : status === "cancelled" || status === "failed"
        ? "bg-rose-500/15 text-rose-500"
        : "bg-amber-500/15 text-amber-500";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone}`}>
      {status}
    </span>
  );
};

const CHART_WIDTH = 560;
const CHART_HEIGHT = 180;

const toPath = (points: SeriesPoint[], max: number) => {
  if (points.length === 0) return "";
  const stepX = points.length > 1 ? CHART_WIDTH / (points.length - 1) : 0;
  return points
    .map((point, index) => {
      const x = index * stepX;
      const y = CHART_HEIGHT - (point.total / max) * CHART_HEIGHT;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

const dayLabel = (day: string) =>
  new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );

const RegistrationsChart = ({
  current,
  previous,
}: {
  current: SeriesPoint[];
  previous: SeriesPoint[];
}) => {
  const max = Math.max(1, ...current.map((p) => p.total), ...previous.map((p) => p.total));
  const stepX = current.length > 1 ? CHART_WIDTH / (current.length - 1) : 0;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 24}`}
        className="h-[220px] w-full min-w-[420px]"
        role="img"
        aria-label="Registrations over the last 7 days"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1={0}
            x2={CHART_WIDTH}
            y1={CHART_HEIGHT * ratio}
            y2={CHART_HEIGHT * ratio}
            className="stroke-slate-200 dark:stroke-white/10"
            strokeWidth={1}
          />
        ))}
        <path
          d={toPath(previous, max)}
          fill="none"
          strokeDasharray="4 4"
          className="stroke-slate-400"
          strokeWidth={2}
        />
        <path
          d={toPath(current, max)}
          fill="none"
          stroke="var(--color-lantern)"
          strokeWidth={2.5}
        />
        {current.map((point, index) => (
          <circle
            key={point.day}
            cx={index * stepX}
            cy={CHART_HEIGHT - (point.total / max) * CHART_HEIGHT}
            r={4}
            fill="var(--color-lantern)"
          />
        ))}
        {current.map((point, index) => (
          <text
            key={point.day}
            x={index * stepX}
            y={CHART_HEIGHT + 18}
            textAnchor={index === 0 ? "start" : index === current.length - 1 ? "end" : "middle"}
            className="fill-slate-500 text-[11px] dark:fill-slate-400"
          >
            {dayLabel(point.day)}
          </text>
        ))}
      </svg>
    </div>
  );
};

const EmptyRow = ({ message }: { message: string }) => (
  <li className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{message}</li>
);

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const summary = await fetchDashboardSummary();
        if (active) setData(summary);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error ? loadError.message : "Unable to load the dashboard.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0b1220]"
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
        {error ?? "Unable to load the dashboard."}
      </div>
    );
  }

  const { stats, registrationsSeries, upcomingWebinars, recentRegistrations, recentOrders } = data;

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-lantern/15 text-xl text-lantern">
          <AiOutlineTeam />
        </span>
        <div>
          <h2 className="text-lg font-bold">Welcome back, {user?.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Here's what's happening with your platform today.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Registrations"
          stat={stats.totalRegistrations}
          icon={<AiOutlineTeam />}
        />
        <StatCard
          label="Upcoming Webinars"
          stat={stats.upcomingWebinars}
          icon={<AiOutlineVideoCamera />}
        />
        <StatCard label="Book Sales" stat={stats.bookSales} icon={<AiOutlineRead />} />
        <StatCard
          label="Revenue"
          stat={stats.revenueCents}
          icon={<AiOutlineWallet />}
          format={(value) => formatPrice(value)}
        />
        <StatCard label="Active Users" stat={stats.activeUsers} icon={<AiOutlineTeam />} />
        <StatCard
          label="Published Sections"
          stat={stats.publishedPages}
          icon={<AiOutlineFileText />}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <PanelHeader
            title="Registrations Overview"
            action={
              <span className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 bg-lantern" /> This week
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-0.5 w-4 border-t-2 border-dashed border-slate-400" /> Last week
                </span>
              </span>
            }
          />
          <RegistrationsChart
            current={registrationsSeries.current}
            previous={registrationsSeries.previous}
          />
        </Card>

        <Card>
          <PanelHeader
            title="Upcoming Webinars"
            action={
              <Link to="/webinars" className="text-xs font-semibold text-lantern">
                View All
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {upcomingWebinars.length === 0 && <EmptyRow message="No upcoming webinars." />}
            {upcomingWebinars.map((webinar) => (
              <li key={webinar.slug} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{webinar.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatManilaDateTime(webinar.start_at)}
                  </p>
                </div>
                <StatusPill status={webinar.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <PanelHeader
            title="Recent Registrations"
            action={
              <Link to="/admin/registrations" className="text-xs font-semibold text-lantern">
                View All
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {recentRegistrations.length === 0 && <EmptyRow message="No registrations yet." />}
            {recentRegistrations.map((registration) => (
              <li
                key={`${registration.email}-${registration.created_at}`}
                className="flex items-center gap-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{registration.full_name}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {registration.email}
                  </p>
                  <p className="truncate text-xs text-slate-400">{registration.webinar_title}</p>
                </div>
                <StatusPill status={registration.status} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <PanelHeader
            title="Recent Orders"
            action={
              <Link to="/admin/orders" className="text-xs font-semibold text-lantern">
                View All
              </Link>
            }
          />
          <ul className="divide-y divide-slate-100 dark:divide-white/5">
            {recentOrders.length === 0 && <EmptyRow message="No orders yet." />}
            {recentOrders.map((order) => (
              <li key={order.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{order.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    #{order.id.slice(0, 8)}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatPrice(order.total_cents)}</span>
                <StatusPill status={order.payment_status} />
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <PanelHeader title="Quick Actions" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              to="/admin/webinars/payments"
              className="rounded-lg border border-slate-200 p-4 transition hover:border-lantern dark:border-white/10"
            >
              <AiOutlineWallet className="mb-2 text-lg text-lantern" />
              <p className="text-sm font-semibold">Review Payments</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Approve payment proofs</p>
            </Link>
            <Link
              to="/webinars"
              className="rounded-lg border border-slate-200 p-4 transition hover:border-lantern dark:border-white/10"
            >
              <AiOutlineCalendar className="mb-2 text-lg text-lantern" />
              <p className="text-sm font-semibold">Browse Webinars</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">See the public listing</p>
            </Link>
            {isSuperAdmin(user) && (
              <Link
                to="/admin/content"
                className="rounded-lg border border-slate-200 p-4 transition hover:border-lantern dark:border-white/10"
              >
                <AiOutlineFileText className="mb-2 text-lg text-lantern" />
                <p className="text-sm font-semibold">Edit Content</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manage page sections</p>
              </Link>
            )}
            <Link
              to="/"
              className="rounded-lg border border-slate-200 p-4 transition hover:border-lantern dark:border-white/10"
            >
              <AiOutlineExport className="mb-2 text-lg text-lantern" />
              <p className="text-sm font-semibold">View Site</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Open the live site</p>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
