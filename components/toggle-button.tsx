"use client";

export function ToggleButton({
  active,
  onToggle,
  label,
  activeColor = "bg-blue-600",
}: Readonly<{
  active: boolean;
  onToggle: () => void;
  label: string;
  activeColor?: string;
}>) {
  return (
    <button
      onClick={onToggle}
      className="text-xs font-medium cursor-pointer flex items-center gap-2 group"
    >
      <span
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 ${
          active ? activeColor : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 mt-0.5 ${
            active ? "translate-x-4 ml-0.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className={active ? "text-gray-700" : "text-gray-400"}>{label}</span>
    </button>
  );
}
