import Link from "next/link";
import { getSiteSettings } from "@/lib/content";

export const revalidate = 300;

export default async function AboutPage() {
  const site = await getSiteSettings();
  const isEn = site.language === "en";

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-16">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-accent">
              {isEn ? "Home" : "Beranda"}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{isEn ? "About Us" : "Tentang Kami"}</li>
        </ol>
      </nav>

      <div className="border-b border-line pb-8 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          {isEn ? `About ${site.site_name}` : `Tentang ${site.site_name}`}
        </h1>
        <p className="mt-3 text-lg text-muted">
          {isEn
            ? `Official publishing platform dedicated to delivering authoritative, research-backed insights for our audience.`
            : `Pusat publikasi konten berkualitas tinggi yang dirancang untuk memberikan informasi kredibel dan terpercaya bagi pembaca.`}
        </p>
      </div>

      <div className="prose prose-slate max-w-none text-base leading-relaxed text-foreground/90 flex flex-col gap-6">
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {isEn ? "Our Mission" : "Misi Kami"}
          </h2>
          <p className="text-muted leading-relaxed">
            {isEn
              ? `${site.site_name} delivers updated knowledge, in-depth analysis, and well-researched insights tailored to contemporary industry needs. We bridge complex topics with clear, actionable narratives.`
              : `${site.site_name} hadir dengan komitmen menyajikan informasi terupdate, panduan mendalam, dan wawasan berbasis riset yang relevan dengan kebutuhan audiens modern. Kami memadukan strategi riset mendalam dengan penyajian yang mudah dipahami.`}
          </p>
        </section>

        <section className="bg-surface p-6 rounded-xl border border-line">
          <h2 className="text-xl font-bold text-foreground mb-3">
            {isEn ? "Editorial Standards" : "Standar Kualitas Konten"}
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-muted">
            <li>
              <strong>{isEn ? "Accurate & Verified:" : "Akurat & Terverifikasi:"}</strong>{" "}
              {isEn
                ? "Every article is supported by rigorous research and verifiable data sources."
                : "Setiap artikel disusun melalui riset data dan fakta kredibel."}
            </li>
            <li>
              <strong>{isEn ? "Practical & Objective:" : "Relevan & Terkini:"}</strong>{" "}
              {isEn
                ? "Focused on addressing real-world queries with actionable guidance."
                : "Membahas topik-topik krusial yang relevan untuk pembaca."}
            </li>
            <li>
              <strong>{isEn ? "Structured Long-Form:" : "Struktur Lengkap & Mudah Dibaca:"}</strong>{" "}
              {isEn
                ? "Crafted with clean typography, clear headings, and reader-first accessibility."
                : "Ditulis dalam format long-form dengan visualisasi informasi yang ramah pembaca."}
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {isEn ? "Get in Touch" : "Hubungi Tim Kami"}
          </h2>
          <p className="text-muted leading-relaxed">
            {isEn ? (
              <>
                Have questions, topic suggestions, or partnership inquiries? Feel free to reach out via our{" "}
                <Link href="/contact" className="text-accent underline font-semibold">
                  Contact Page
                </Link>{" "}
                or via direct WhatsApp support.
              </>
            ) : (
              <>
                Apakah Anda memiliki pertanyaan, saran topik, atau peluang kolaborasi? Jangan ragu untuk menghubungi kami langsung melalui halaman{" "}
                <Link href="/contact" className="text-accent underline font-semibold">
                  Kontak Kami
                </Link>{" "}
                atau via layanan pesan WhatsApp resmi kami.
              </>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
