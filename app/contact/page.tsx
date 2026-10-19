import Link from "next/link";
import WhatsAppChatButton from "@/components/whatsapp/chat-button";
import { getContactSettings, getSiteSettings } from "@/lib/content";

export const revalidate = 300;

export default async function ContactPage() {
  const [site, contact] = await Promise.all([
    getSiteSettings(),
    getContactSettings(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-16">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm text-muted">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/" className="hover:text-accent">
              Beranda
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">Kontak</li>
        </ol>
      </nav>

      <div className="border-b border-line pb-8 mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          Hubungi Kami
        </h1>
        <p className="mt-3 text-lg text-muted">
          Kami siap mendengar masukan, pertanyaan, atau tawaran kerja sama dengan {site.site_name}.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Info Box */}
        <div className="bg-surface p-8 rounded-xl border border-line flex flex-col justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-4">Chat Langsung</h2>
            <p className="text-muted leading-relaxed mb-6">
              Untuk respons paling cepat, silakan hubungi tim kami langsung via WhatsApp. Kami siap membantu setiap hari kerja.
            </p>

            <div className="flex flex-col gap-3 text-sm text-muted">
              <div>
                <strong className="text-foreground block">Waktu Operasional:</strong>
                Senin - Jumat: 09:00 - 18:00 WIB
              </div>
              <div>
                <strong className="text-foreground block">Lokasi:</strong>
                Indonesia
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-line">
            <WhatsAppChatButton
              variant="inline"
              number={contact.whatsapp_number}
              message={contact.whatsapp_message}
              label="Buka Chat WhatsApp Sekarang"
            />
          </div>
        </div>

        {/* FAQ Card */}
        <div className="border border-line p-8 rounded-xl flex flex-col gap-6">
          <h2 className="text-xl font-bold text-foreground">Pertanyaan Sering Diajukan (FAQ)</h2>
          
          <div>
            <h3 className="font-semibold text-foreground text-sm">Bagaimana cara mengirim saran artikel?</h3>
            <p className="text-muted text-sm mt-1">
              Kirimkan ide atau permintaan topik melalui pesan WhatsApp dengan subjek saran konten.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground text-sm">Apakah konten di situs ini diperbarui berkala?</h3>
            <p className="text-muted text-sm mt-1">
              Ya, sistem autopilot kami memantau dan memperbarui artikel secara berkesinambungan untuk menjaga akurasi SEO.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
