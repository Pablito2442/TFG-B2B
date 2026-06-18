export function RoleBadge({ role }: { role: string }) {
  const cls =
    role === "SUPPLIER" ? "bg-teal-50 text-teal-700 border-teal-200"
    : role === "BUYER"  ? "bg-violet-50 text-violet-700 border-violet-200"
    : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] font-semibold ${cls}`}>
      {role}
    </span>
  );
}