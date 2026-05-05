// Small initialed avatars with a soft slate→blue gradient (soothing theme).
// `b` variant uses a soft sage→sky gradient for visual variety.

interface Avatar { name: string; variant?: "a" | "b" }

const VARIANTS: Record<string, string> = {
  a: "bg-gradient-to-br from-bi-navy-700 to-bi-blue-500",
  b: "bg-gradient-to-br from-emerald-400 to-bi-blue-400",
};

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0,2).toUpperCase();
}

export function AvatarMini({ name, variant = "a", className = "" }: Avatar & { className?: string }) {
  return (
    <span className={`inline-grid place-items-center w-6 h-6 rounded-full text-[10px] font-bold text-white tracking-wider ${VARIANTS[variant]} ${className}`}>
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ avatars }: { avatars: Avatar[] }) {
  return (
    <span className="inline-flex">
      {avatars.map((a, i) => (
        <span key={i} className={`${VARIANTS[a.variant ?? "a"]} ${i > 0 ? "-ml-1.5 ring-2 ring-white" : ""} inline-grid place-items-center w-6 h-6 rounded-full text-[10px] font-bold text-white tracking-wider`}>
          {initials(a.name)}
        </span>
      ))}
    </span>
  );
}
