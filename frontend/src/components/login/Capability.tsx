export default function Capability({ stat, label, detail }: { stat: string; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 w-1 h-1 rounded-full bg-[#89ceff] shrink-0 mt-2" />
      <div>
        <span className="font-mono text-xs font-semibold text-[#89ceff]">{stat}</span>
        <span className="text-xs text-[#bec8d2] font-medium ml-2">{label}</span>
        <p className="text-[10px] text-[#88929b] mt-0.5 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}