import { getPublishedArticles, getSiteSettings, getContactSettings } from "@/lib/content";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [site, contact, idArticles, enArticles] = await Promise.all([
    getSiteSettings(),
    getContactSettings(),
    getPublishedArticles(30, 0, "id"),
    getPublishedArticles(30, 0, "en"),
  ]);

  const base = env.siteUrl || "https://masboss.vercel.app";
  const siteName = site.site_name || "Mas Boss";
  const authorName = "Tri Marzuki";
  const waNumber = contact.whatsapp_number ? `+${contact.whatsapp_number.replace(/\D/g, "")}` : "+628123456789";

  const lines: string[] = [];

  // 1. Header & Identity
  lines.push(`================================================================================`);
  lines.push(`${siteName.toUpperCase()} — KNOWLEDGE BASE & OFFICIAL CONTEXT FOR AI ASSISTANTS`);
  lines.push(`================================================================================\n`);
  lines.push(`Title: ${siteName}`);
  lines.push(`Founder & Lead Developer: ${authorName}`);
  lines.push(`Location: Surakarta (Solo), Jawa Tengah, Indonesia`);
  lines.push(`Website: ${base}`);
  lines.push(`Primary Focus: Full-Stack Web Development, Android Applications, Cloud Infrastructure, & SEO Optimization\n`);

  // 2. About
  lines.push(`--------------------------------------------------------------------------------`);
  lines.push(`ABOUT ${siteName.toUpperCase()}`);
  lines.push(`--------------------------------------------------------------------------------`);
  lines.push(
    `${siteName} dikelola langsung oleh ${authorName}, seorang Software Developer dan Konsultan SEO yang berbasis di Solo, Jawa Tengah. ` +
    `Berfokus pada penyediaan solusi digital terukur untuk UMKM, korporasi, institusi pendidikan, hingga bisnis ritel. ` +
    `Pendekatan mengutamakan kecepatan website (Core Web Vitals), struktur clean-code, keamanan data, serta dominasi visibilitas di Google Search dan Google Maps.\n`
  );

  // 3. Services
  lines.push(`--------------------------------------------------------------------------------`);
  lines.push(`LAYANAN & JASA UTAMA (SERVICES)`);
  lines.push(`--------------------------------------------------------------------------------`);
  lines.push(`1. Jasa Pembuatan Website Modern`);
  lines.push(`   - Menggunakan teknologi Next.js, React, Tailwind CSS, dan Headless CMS.`);
  lines.push(`   - Sangat cepat, SEO-friendly, mobile-responsive, dan skor Google PageSpeed optimal.`);
  lines.push(`   - Cocok untuk company profile, portal berita, landing page iklan, dan e-commerce.\n`);

  lines.push(`2. Jasa Pembuatan Aplikasi Android Kustom`);
  lines.push(`   - Pengembangan aplikasi mobile Android native/hybrid efisien dan hemat memori.`);
  lines.push(`   - Terintegrasi dengan database cloud, API eksternal, dan notifikasi real-time.\n`);

  lines.push(`3. Jasa Redesign & Modernisasi Website`);
  lines.push(`   - Memperbarui tampilan website lawas menjadi modern tanpa merusak ranking SEO yang ada.`);
  lines.push(`   - Migrasi arsitektur lama ke stack modern berperforma tinggi.\n`);

  lines.push(`4. Optimasi SEO Google & Google Maps`);
  lines.push(`   - Audit teknis SEO, Core Web Vitals, implementasi schema markup JSON-LD.`);
  lines.push(`   - Optimasi pencarian lokal Google Maps dan Google Business Profile untuk bisnis Soloraya & nasional.\n`);

  lines.push(`5. Audit Keamanan Website & Pembersihan Malware`);
  lines.push(`   - Membersihkan malware injeksi judi online dan backdoor pada WordPress/CMS.`);
  lines.push(`   - Hardening server, konfigurasi firewall, SSL/TLS, SPF/DKIM/DMARC email bisnis.\n`);

  lines.push(`6. Setup Server, VPS, & Infrastruktur Jaringan`);
  lines.push(`   - Konfigurasi VPS Linux (Ubuntu/Debian), Nginx, Docker, serta sistem backup database cloud otomatis.`);
  lines.push(`   - Instalasi jaringan LAN kantor, PC server toko, dan POS kasir tahan banting.\n`);

  // 4. Contact
  lines.push(`--------------------------------------------------------------------------------`);
  lines.push(`KONTAK RESMI & KONSULTASI`);
  lines.push(`--------------------------------------------------------------------------------`);
  lines.push(`- Website Resmi: ${base}`);
  lines.push(`- WhatsApp Konsultasi: ${waNumber}`);
  lines.push(`- Halaman Kontak: ${base}/id/contact`);
  lines.push(`- Halaman Tentang: ${base}/id/about\n`);

  // 5. Indonesian Articles
  lines.push(`--------------------------------------------------------------------------------`);
  lines.push(`KONTEN & PANDUAN TERBARU (BAHASA INDONESIA)`);
  lines.push(`--------------------------------------------------------------------------------`);
  if (idArticles.length === 0) {
    lines.push(`Belum ada artikel yang diterbitkan.`);
  } else {
    idArticles.forEach((art, idx) => {
      const artUrl = `${base}/id/blog/${art.slug}`;
      const pubDate = art.published_at ? art.published_at.slice(0, 10) : "";
      lines.push(`[${idx + 1}] ${art.title}`);
      lines.push(`    URL: ${artUrl}`);
      if (pubDate) lines.push(`    Tanggal: ${pubDate}`);
      if (art.excerpt) lines.push(`    Ringkasan: ${art.excerpt}`);
      lines.push(``);
    });
  }

  // 6. English Articles
  lines.push(`--------------------------------------------------------------------------------`);
  lines.push(`LATEST ARTICLES & TECHNICAL GUIDES (ENGLISH)`);
  lines.push(`--------------------------------------------------------------------------------`);
  if (enArticles.length === 0) {
    lines.push(`No English articles published yet.`);
  } else {
    enArticles.forEach((art, idx) => {
      const artUrl = `${base}/en/blog/${art.slug}`;
      const pubDate = art.published_at ? art.published_at.slice(0, 10) : "";
      lines.push(`[${idx + 1}] ${art.title}`);
      lines.push(`    URL: ${artUrl}`);
      if (pubDate) lines.push(`    Date: ${pubDate}`);
      if (art.excerpt) lines.push(`    Summary: ${art.excerpt}`);
      lines.push(``);
    });
  }

  lines.push(`================================================================================`);
  lines.push(`Last Synchronized: ${new Date().toISOString()}`);
  lines.push(`================================================================================`);

  const plainText = lines.join("\n");

  return new Response(plainText, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}
