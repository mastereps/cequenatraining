interface AdminPlaceholderPageProps {
  title: string;
}

/** Sidebar sections that have no backend yet. Deliberately shows no data. */
const AdminPlaceholderPage = ({ title }: AdminPlaceholderPageProps) => (
  <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-white/10 dark:bg-[#0b1220]">
    <h2 className="mb-2 text-lg font-semibold">{title}</h2>
    <p className="text-sm text-slate-500 dark:text-slate-400">
      This section is not built yet.
    </p>
  </div>
);

export default AdminPlaceholderPage;
