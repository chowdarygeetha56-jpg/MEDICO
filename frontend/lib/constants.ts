import type { NavigationLink } from "@/types/navigation";

export const SITE_NAME = "MEDICO";

export const NAVIGATION_LINKS = [
  { label: "Medicines", href: "/medicines" },
  { label: "Categories", href: "/categories" },
  { label: "Prescription", href: "/prescription" },
  { label: "Orders", href: "/orders" },
] as const satisfies readonly NavigationLink[];