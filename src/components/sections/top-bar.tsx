import { PanelLeft } from "lucide-react";

export default function TopBar() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-6">
      <button
        data-slot="sidebar-trigger"
        data-sidebar="trigger"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground size-7 -ml-2"
      >
        <PanelLeft />
        <span className="sr-only">Toggle Sidebar</span>
      </button>
    </header>
  );
}