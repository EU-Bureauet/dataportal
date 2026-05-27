const currentYear = new Date().getFullYear();

function LinkedInIcon({ className }: Readonly<{ className?: string }>) {
  // Refined LinkedIn monogram: bare "in" letterform without the surrounding
  // brand-block chrome — sits cleanly inside the circular button.
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="currentColor"
    >
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001 2.5 2.5 0 0 1 0-5.001zM3 9.75h3.96V21H3V9.75zM9.5 9.75h3.79v1.54h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.49 4.78 5.73V21h-3.96v-5.13c0-1.22-.02-2.79-1.84-2.79-1.84 0-2.13 1.32-2.13 2.69V21H9.5V9.75z" />
    </svg>
  );
}

function FacebookIcon({ className }: Readonly<{ className?: string }>) {
  // Refined Facebook "f" monogram (no surrounding rounded-square plate).
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="currentColor"
    >
      <path d="M14.5 8.25h2.5V4.5h-2.83c-2.97 0-4.92 1.85-4.92 4.95v2.55H7v3.85h2.25V21h3.96v-5.15h2.65l.46-3.85h-3.11V9.85c0-1.13.42-1.6 1.79-1.6z" />
    </svg>
  );
}

interface SocialLinkProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Hex brand color shown on hover. */
  brandColor: string;
}

function SocialLink({ href, label, icon, brandColor }: Readonly<SocialLinkProps>) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{ "--brand": brandColor } as React.CSSProperties}
      className="group inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-b from-white to-slate-100 text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-slate-300/70 transition-all duration-200 hover:-translate-y-0.5 hover:from-white hover:to-white hover:text-[var(--brand)] hover:shadow-[0_6px_12px_-4px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.9)] hover:ring-[var(--brand)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 active:translate-y-0 active:shadow-[inset_0_2px_4px_rgba(15,23,42,0.08)]"
    >
      {icon}
      <span className="sr-only">{label}</span>
    </a>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-auto bg-gradient-to-br from-slate-100 via-blue-100/70 to-emerald-50/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),inset_0_8px_16px_-12px_rgba(15,23,42,0.18)] before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-slate-300 before:to-transparent before:content-['']">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-12">
          {/* About */}
          <section className="md:col-span-7" aria-labelledby="footer-about-heading">
            <h2
              id="footer-about-heading"
              className="text-xs font-semibold uppercase tracking-widest text-gray-900"
            >
              Om EU-bureauets dataportal
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              Dataportalen er udviklet af{" "}
              <a
                href="/om-eu-bureauet/"
                className="text-gray-900 underline-offset-4 hover:text-blue-700 hover:underline"
              >
                EU-bureauet
              </a>{" "}
              i samarbejde med analysebureauet{" "}
              <a
                href="https://www.ogtal.dk/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 underline-offset-4 hover:text-blue-700 hover:underline"
              >
                Analyse &amp; Tal
              </a>
              . Den er en del af projektet &quot;Dataværktøjer og analyser:
              Få styr på Europa-Parlamentet&quot;, som har modtaget støtte fra{" "}
              <a
                href="https://slks.dk/omraader/folkeoplysning/europa-naevnet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 underline-offset-4 hover:text-blue-700 hover:underline"
              >
                Europa-Nævnet
              </a>. Ansvar for indholdet er alene tilskudsmodtagers.
            </p>
          </section>

          {/* Newsletter */}
          <section className="md:col-span-5" aria-labelledby="footer-newsletter-heading">
            <h2
              id="footer-newsletter-heading"
              className="text-xs font-semibold uppercase tracking-widest text-gray-900"
            >
              Nyhedsbrev
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              Modtag invitationer til EU-netværket i civilsamfundet og analyser
              af europæisk politik.
            </p>
            <a
              href="https://www.eubureauet.dk/abonner-paa-vores-nyhedsbrev/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center justify-center rounded-md bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Tilmeld nyhedsbrev
            </a>
          </section>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col-reverse items-start justify-between gap-6 border-t border-gray-200 pt-6 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:gap-4">

          </div>

          <nav aria-label="Sociale medier">
            <ul className="flex items-center gap-3">
              <li>
                <SocialLink
                  href="https://www.linkedin.com/company/eu-bureauet/"
                  label="EU-bureauet på LinkedIn"
                  brandColor="#0A66C2"
                  icon={<LinkedInIcon className="h-[18px] w-[18px]" />}
                />
              </li>
              <li>
                <SocialLink
                  href="https://www.facebook.com/profile.php?id=61573867791459"
                  label="EU-bureauet på Facebook"
                  brandColor="#1877F2"
                  icon={<FacebookIcon className="h-[18px] w-[18px]" />}
                />
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}