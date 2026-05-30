interface SectionHeaderProps {
  icon:       React.ElementType;
  title:      string;
  subtitle:   string;
  iconColor?: string;
  iconBg?:    string;
}

export default function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  iconColor = "text-[var(--primary)]",
  iconBg    = "bg-[var(--primary-dim)]",
}: SectionHeaderProps) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className={`p-2 ${iconBg} rounded-lg shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${iconColor}`} aria-hidden />
      </div>
      <div>
        <h3 className="text-[var(--text-primary)] font-semibold text-sm leading-snug">{title}</h3>
        <p className="text-[var(--text-muted)] text-xs mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}
