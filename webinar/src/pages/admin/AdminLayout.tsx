import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  AiOutlineAppstore,
  AiOutlineBell,
  AiOutlineFileText,
  AiOutlineLeft,
  AiOutlineLogout,
  AiOutlineRead,
  AiOutlineRight,
  AiOutlineSearch,
  AiOutlineSetting,
  AiOutlineShopping,
  AiOutlineTeam,
  AiOutlineUser,
  AiOutlineVideoCamera,
  AiOutlineWallet,
} from "react-icons/ai";
import { useAuth } from "../../store/AuthContext";
import { isSuperAdmin, roleLabel } from "../../features/auth/roles";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  end?: boolean;
  superAdminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: <AiOutlineAppstore />, end: true },
  { label: "Webinars", to: "/admin/webinars", icon: <AiOutlineVideoCamera /> },
  { label: "Registrations", to: "/admin/registrations", icon: <AiOutlineTeam /> },
  { label: "Orders", to: "/admin/orders", icon: <AiOutlineShopping /> },
  { label: "Books", to: "/admin/books", icon: <AiOutlineRead /> },
  {
    label: "Content Manager",
    to: "/admin/content",
    icon: <AiOutlineFileText />,
    superAdminOnly: true,
  },
  { label: "Users", to: "/admin/users", icon: <AiOutlineUser /> },
  { label: "Payments", to: "/admin/webinars/payments", icon: <AiOutlineWallet /> },
  { label: "Settings", to: "/admin/settings", icon: <AiOutlineSetting /> },
];

const pageTitle = (pathname: string) => {
  if (pathname === "/admin" || pathname === "/admin/") return "Dashboard";
  const match = NAV_ITEMS.filter((item) => !item.end).find((item) =>
    pathname.startsWith(item.to),
  );
  return match?.label ?? "Admin";
};

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  // Starts collapsed on small screens so the icon rail leaves room for content.
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024,
  );

  const items = NAV_ITEMS.filter((item) => !item.superAdminOnly || isSuperAdmin(user));
  const initials = (user?.name || "A")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900 dark:bg-[#060b18] dark:text-slate-100">
      <aside
        className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-white/10 dark:bg-[#0b1220] ${
          collapsed ? "w-[76px]" : "w-[240px]"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-6">
          {!collapsed && (
            <Link to="/" className="text-xl font-bold tracking-[0.15em] text-lantern">
              ADMIN
            </Link>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="ml-auto inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/10"
          >
            {collapsed ? <AiOutlineRight size={14} /> : <AiOutlineLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      isActive
                        ? "bg-lantern/15 font-semibold text-lantern"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5"
                    } ${collapsed ? "justify-center" : ""}`
                  }
                >
                  <span className="text-lg">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-3 p-3">
          {!collapsed && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-white/10 dark:bg-white/5">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold">System Status</span>
                <span className="h-2 w-2 rounded-full bg-lantern" />
              </div>
              <p className="text-slate-500 dark:text-slate-400">All systems operational</p>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <AiOutlineLogout className="text-lg" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-[#0b1220]">
          <h1 className="text-xl font-bold">{pageTitle(pathname)}</h1>

          <div className="ml-auto flex items-center gap-4">
            <label className="relative hidden sm:block">
              <AiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search..."
                className="w-56 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-lantern dark:border-white/10 dark:bg-white/5"
              />
            </label>
            <button
              type="button"
              aria-label="Notifications"
              className="relative cursor-pointer text-lg text-slate-500 dark:text-slate-400"
            >
              <AiOutlineBell />
            </button>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-lantern/20 text-sm font-semibold text-lantern">
                {initials}
              </span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-sm font-semibold">{user?.name}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {roleLabel(user)}
                </span>
              </span>
            </div>
          </div>
        </header>

        {/* A div, not <main> - the nested pages bring their own <main>. */}
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
