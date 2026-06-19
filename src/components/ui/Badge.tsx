import { cn } from "@/lib/utils";

const variants = {
  default: "bg-slate-700 text-slate-200",
  success: "bg-green-900/50 text-green-300",
  warning: "bg-yellow-900/50 text-yellow-300",
  danger: "bg-red-900/50 text-red-300",
  info: "bg-blue-900/50 text-blue-300",
};

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusVariant(
  status: string,
): keyof typeof variants {
  switch (status) {
    case "available":
    case "confirmed":
    case "completed":
      return "success";
    case "pending":
    case "new":
    case "reserved":
      return "warning";
    case "sold":
    case "cancelled":
    case "closed":
      return "danger";
    case "replied":
      return "info";
    default:
      return "default";
  }
}

export const statusBadgeVariant = statusVariant;
