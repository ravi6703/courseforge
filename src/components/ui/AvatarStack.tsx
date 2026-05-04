// Small initialed avatars with a navy→blue gradient (BI hub pattern).
// `b` variant uses a violet→pink gradient for visual variety.

interface Avatar { name: string; variant?: "a" | "b" }

const VARIANTS: Record<string, string> = {
  a: "bg-gradient-to-br from-bi-navy-700 to-bi-blue-600",
  b: "bg-gradient-to-br from-violet-600 to-fuchsia-500",
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
