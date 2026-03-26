interface HeroSectionProps {
  title: string;
  subtitle?: string;
  image: string;
}

export function HeroSection({ title, subtitle, image }: HeroSectionProps) {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || "dataportal";

  return (
    <div className="relative w-full">
      <div className="relative h-64 sm:h-80 md:h-96 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/${basePath}${image}`}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative text-center px-6 sm:px-10 py-6 sm:py-8 max-w-3xl">
          {/* Soft radial glow behind text — no visible border */}
          <div className="absolute inset-0 bg-black/45 rounded-[50%] blur-3xl scale-110 pointer-events-none" />
          <h1 className="relative text-4xl sm:text-5xl md:text-6xl font-bold text-white drop-shadow-lg">
            {title}
          </h1>
          {subtitle && (
            <p className="relative mt-4 text-base sm:text-lg text-[#FFCC00] drop-shadow-md">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {/* Wave bottom border */}
      <div className="absolute -bottom-px left-0 right-0">
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          className="block w-full h-10 sm:h-14 md:h-16"
        >
          <path
            d="M0,60 C480,0 960,80 1440,60 L1440,80 L0,80 Z"
            className="fill-gray-50"
          />
        </svg>
      </div>
    </div>
  );
}
