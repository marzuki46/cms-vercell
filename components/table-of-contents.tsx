"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/article-seo";

export default function TableOfContents({
  items,
  variant = "sidebar",
}: {
  items: TocItem[];
  variant?: "sidebar" | "inline";
}) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: [0, 1] },
    );

    const nodes = items
      .map((i) => document.getElementById(i.id))
      .filter((n): n is HTMLElement => n !== null);

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Daftar isi" className="text-sm">
      <ul
        className={
          variant === "sidebar"
            ? "flex flex-col gap-1 border-l border-line"
            : "flex flex-col gap-1"
        }
      >
        {items.map((item) => {
          const isActive = active === item.id;
          const indent = item.level === 3 ? "pl-4 text-xs" : "font-medium";
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "location" : undefined}
                className={`block border-l-2 py-1 pr-2 leading-snug transition ${
                  variant === "sidebar" ? "-ml-px" : ""
                } ${
                  isActive
                    ? "border-accent text-accent"
                    : "border-transparent text-muted hover:border-line hover:text-foreground"
                } ${indent}`}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
