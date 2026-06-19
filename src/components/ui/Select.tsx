import { cn } from "@/lib/utils";
import { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
};

export function Select({ className, label, error, id, options, placeholder, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          "w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500",
          error && "border-red-500",
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
