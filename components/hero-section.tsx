interface HeroSectionProps {
  title: string;
  image: string;
}

export function HeroSection({ title, image }: HeroSectionProps) {
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
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white drop-shadow-lg text-center px-4">
            {title}
          </h1>
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
