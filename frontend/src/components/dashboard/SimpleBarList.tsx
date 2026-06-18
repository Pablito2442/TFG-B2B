import BarList from "@/components/charts/BarList";

const SUFFIX_FORMATTER = (suffix: string) => (value: number) => `${value} ${suffix}`;

const COLOR_MAP: Record<string, string> = {
  primary: "indigo",
  cyan:    "indigo",
  violet:  "violet",
  blue:    "blue",
  accent:  "violet",
};

interface SimpleBarListProps {
  data:    { name: string; value: number }[];
  suffix:  string;
  color?:  string;
}

export default function SimpleBarList({ data, suffix, color = "primary" }: SimpleBarListProps) {
  return (
    <BarList
      data={data}
      valueFormatter={SUFFIX_FORMATTER(suffix)}
      color={COLOR_MAP[color] ?? "indigo"}
      showRank={false}
    />
  );
}