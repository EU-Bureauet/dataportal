import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Configure to build a static package
    output: "export",
    assetPrefix: '/dataportal',
    basePath: "/dataportal",
    trailingSlash: false,
    images: {
        // Images cannot be optimized when compiling a static package
        unoptimized: true,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'www-static.eubureauet.dk',
                port: '',
                pathname: '/wp-content/uploads/**',
            },
            {
                protocol: 'https',
                hostname: 'www.europarl.europa.eu',
                port: '',
                pathname: '/mepphoto/**',
            },
        ],
    },
};

// https://github.com/vercel/next.js/discussions/48567#discussioncomment-5660455
export default (phase: string) => {
        if (phase === PHASE_DEVELOPMENT_SERVER) {
            return {
                ...nextConfig,
                output: "standalone",
                async rewrites() {
                    return [
                        {
                            // This path is relative to the basepath of the
                            // application. So if the application is deployed to
                            // "/dataportal", then "/data/:path*" only triggers on
                            // requests to e.g.
                            // "/dataportal/data/meps_clean.json".
                            source: '/data/:path*',
                            destination: `${process.env.NEXT_PUBLIC_DATA_SERVER}/data/:path*`, // Proxy to Backend
                        },
                        {
                            // Serve RSS feed from public folder in development
                            source: '/feed',
                            destination: '/feed/rss.xml',
                        },
                    ]
                },
            };
    }
    return nextConfig;
};
