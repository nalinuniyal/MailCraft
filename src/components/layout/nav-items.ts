import {
  LayoutDashboard, FolderKanban, Code2, LayoutTemplate, Blocks, ShieldCheck, Cloud, FileCheck2, Settings,
} from "lucide-react";

export const NAV_SECTIONS = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/studio", label: "Code Studio", icon: Code2 },
    ],
  },
  {
    label: "Libraries",
    items: [
      { href: "/templates", label: "Templates", icon: LayoutTemplate },
      { href: "/components", label: "Components", icon: Blocks },
    ],
  },
  {
    label: "Quality",
    items: [
      { href: "/compatibility", label: "Compatibility", icon: ShieldCheck },
      { href: "/reports", label: "QA Reports", icon: FileCheck2 },
      { href: "/sfmc", label: "SFMC Toolkit", icon: Cloud },
    ],
  },
] as const;

export const SETTINGS_ITEM = { href: "/settings", label: "Settings", icon: Settings };
