export default function StatCard({ label, value, green }) {
  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
      <div className="text-[#666] text-xs uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-2xl font-bold ${green ? "text-[#00c853]" : "text-white"}`}>{value ?? "—"}</div>
    </div>
  );
}
