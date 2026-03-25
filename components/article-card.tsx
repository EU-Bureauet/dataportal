import Image from "next/image";

interface ArticleCardProps {
  title: string;
  description: string;
  image: string;
  url: string;
}

export function ArticleCard({ title, description, image, url }: ArticleCardProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
    >
      <div className="relative w-full h-40">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, 30vw"
        />
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
          {title}
        </h3>
        <p className="mt-2 text-sm text-gray-600 line-clamp-3">
          {description}
        </p>
        <span className="mt-3 inline-block text-sm font-medium text-blue-600 group-hover:underline">
          Læs artiklen &rarr;
        </span>
      </div>
    </a>
  );
}
