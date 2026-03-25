interface HeroSectionProps {
  title: string;
  image: string;
}

export function HeroSection({ title, image }: HeroSectionProps) {
  const basePath = process.env.NEXT_PUBLIC_BASEPATH || "dataportal";

  return (
    <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden">
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
  );
}
