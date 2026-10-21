/**
 * Curated high-performance WebP tech photography pool for coding, laptops, cybersecurity, servers, and cloud computing.
 * All URLs specify WebP format (&fm=webp) with 80% compression and 1200px width.
 */

export interface TechImage {
  url: string;
  category: "coding" | "laptop" | "security" | "cloud" | "mobile";
  alt_id: string;
  alt_en: string;
  title_id: string;
  title_en: string;
}

export const TECH_IMAGES: TechImage[] = [
  // 1. Coding & Development
  {
    url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80&fm=webp",
    category: "coding",
    alt_id: "Layar monitor menampilkan baris kode program website dan aplikasi modern",
    alt_en: "Computer monitor displaying clean software development and programming code",
    title_id: "Visual Coding & Software Development",
    title_en: "Coding and Software Development Screen",
  },
  {
    url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80&fm=webp",
    category: "coding",
    alt_id: "Pengembang sedang mengetik kode pemrograman di laptop modern",
    alt_en: "Software developer typing clean programming code on modern laptop",
    title_id: "Aktivitas Coding dan Pembuatan Website",
    title_en: "Developer Coding and Web Development Workflow",
  },
  {
    url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80&fm=webp",
    category: "coding",
    alt_id: "Laptop terbuka di meja kerja menampilkan editor kode pemrograman",
    alt_en: "Laptop on desk showing source code editor in modern workstation",
    title_id: "Workstation Programming & Web Development",
    title_en: "Modern Programming Laptop Workstation",
  },

  // 2. PC & Laptop Workstations
  {
    url: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=1200&auto=format&fit=crop&q=80&fm=webp",
    category: "laptop",
    alt_id: "Laptop profesional di meja kantor modern untuk produktivitas digital",
    alt_en: "Professional modern laptop on office desk for digital business productivity",
    title_id: "Laptop Produktivitas Bisnis Digital",
    title_en: "Professional Business Laptop Setup",
  },
  {
    url: "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=1200&auto=format&fit=crop&q=80&fm=webp",
    category: "laptop",
    alt_id: "Setup laptop dan komputer modern minimalis untuk kerja teknologi",
    alt_en: "Minimalist modern laptop and computer setup for tech work",
    title_id: "Meja Kerja Komputer & Laptop Modern",
    title_en: "Clean Laptop Workstation Desk",
  },
  {
    url: "https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=1200&auto=format&fit=crop&q=80&fm=webp",
    category: "laptop",
    alt_id: "Komputer desktop PC modern dengan periferal lengkap untuk developer",
    alt_en: "Modern desktop PC workstation with keyboard and mouse for developers",
    title_id: "Desktop PC Setup untuk Developer",
    title_en: "Desktop PC Developer Setup",
  },

  // 3. Cybersecurity & Data Protection
  {
    url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80&fm=webp",
    category: "security",
    alt_id: "Grafis keamanan siber gembok digital dan enkripsi proteksi data",
    alt_en: "Cybersecurity digital lock concept with data encryption and privacy protection",
    title_id: "Keamanan Siber & Enkripsi Data",
    title_en: "Cybersecurity and Digital Data Protection",
  },
  {
    url: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&auto=format&fit=crop&q=80&fm=webp",
    category: "security",
    alt_id: "Visual teknologi jaringan keamanan siber dan perlindungan server",
    alt_en: "Futuristic cybersecurity network grid and server protection system",
    title_id: "Jaringan Keamanan Siber Server",
    title_en: "Cyber Security Server Shield Network",
  },
  {
    url: "https://images.unsplash.com/photo-1510511459019-5dda7724fd87?w=1200&auto=format&fit=crop&q=80&fm=webp",
    category: "security",
    alt_id: "Layar monitor pemantauan sistem keamanan siber dan deteksi ancaman",
    alt_en: "Cybersecurity monitoring screen with threat detection and system audit",
    title_id: "Monitoring Keamanan Sistem Digital",
    title_en: "Digital Security Audit and Monitoring",
  },

  // 4. Cloud Infrastructure & Server
  {
    url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80&fm=webp",
    category: "cloud",
    alt_id: "Rak server data center teknologi cloud computing dengan kabel fiber optik",
    alt_en: "Data center server rack hardware with cloud infrastructure and fiber optics",
    title_id: "Server Data Center & Cloud Computing",
    title_en: "Cloud Data Center Server Infrastructure",
  },

  // 5. Mobile & Android Development
  {
    url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&auto=format&fit=crop&q=80&fm=webp",
    category: "mobile",
    alt_id: "Smartphone layar sentuh menampilkan antarmuka aplikasi mobile modern",
    alt_en: "Modern smartphone touchscreen displaying clean mobile application user interface",
    title_id: "Pengembangan Aplikasi Mobile & Android",
    title_en: "Mobile App Development and Smartphone Interface",
  },
];

/**
 * Deterministically pick a relevant tech image based on keywords or title.
 * Automatically aligns with categories: coding, security, laptop, mobile, or cloud.
 */
export function matchTechImage(title: string, keywords: string[] = []): TechImage {
  const haystack = `${title} ${keywords.join(" ")}`.toLowerCase();

  if (haystack.includes("android") || haystack.includes("mobile") || haystack.includes("aplikasi") || haystack.includes("app") || haystack.includes("smartphone")) {
    return TECH_IMAGES.find((i) => i.category === "mobile") ?? TECH_IMAGES[0];
  }

  if (haystack.includes("security") || haystack.includes("keamanan") || haystack.includes("malware") || haystack.includes("hacker") || haystack.includes("ssl") || haystack.includes("cyber") || haystack.includes("protect")) {
    return TECH_IMAGES.find((i) => i.category === "security") ?? TECH_IMAGES[6];
  }

  if (haystack.includes("server") || haystack.includes("cloud") || haystack.includes("hosting") || haystack.includes("migrasi") || haystack.includes("database")) {
    return TECH_IMAGES.find((i) => i.category === "cloud") ?? TECH_IMAGES[9];
  }

  if (haystack.includes("code") || haystack.includes("koding") || haystack.includes("json") || haystack.includes("schema") || haystack.includes("script") || haystack.includes("api") || haystack.includes("developer")) {
    return TECH_IMAGES.find((i) => i.category === "coding") ?? TECH_IMAGES[0];
  }

  // Consistent hash for stable image per title
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % TECH_IMAGES.length;
  return TECH_IMAGES[index];
}

/**
 * Generate locale-tailored image attributes (src, alt, title) for high SEO ranking.
 */
export function getOptimizedArticleImage(params: {
  title: string;
  keywords?: string[];
  coverImageUrl?: string | null;
  locale?: string;
}): { src: string; alt: string; title: string } {
  const isEn = params.locale === "en";
  const matched = matchTechImage(params.title, params.keywords ?? []);

  // Use custom cover_image_url if present, else use curated WebP tech photo
  let src = matched.url;
  if (params.coverImageUrl && params.coverImageUrl.trim().startsWith("http")) {
    let custom = params.coverImageUrl.trim();
    if (custom.includes("images.unsplash.com") && !custom.includes("fm=webp")) {
      custom += (custom.includes("?") ? "&" : "?") + "fm=webp&q=80";
    }
    src = custom;
  }

  const alt = isEn
    ? `${params.title} — ${matched.alt_en}`
    : `${params.title} — ${matched.alt_id}`;

  const title = isEn
    ? `${params.title} (${matched.title_en})`
    : `${params.title} (${matched.title_id})`;

  return { src, alt, title };
}
