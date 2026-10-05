import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * The old section addresses, kept working after the menus were merged
   * into Market, Stocks and Portfolio. Emails already sent link to /brief
   * and /watchlist. Temporary (307) rather than permanent, so a browser does
   * not cache them forever in case a path is reused later. Query strings
   * pass through, so /compare?symbols=... keeps its stocks.
   */
  async redirects() {
    return [
      { source: "/brief", destination: "/market", permanent: false },
      { source: "/compare", destination: "/stocks/compare", permanent: false },
      { source: "/watchlist", destination: "/portfolio", permanent: false },
      // Pages merged into others when the menus were slimmed down.
      { source: "/market/sectors", destination: "/market#sectors", permanent: false },
      { source: "/market/track-record", destination: "/market#track-record", permanent: false },
      { source: "/stocks/list", destination: "/stocks", permanent: false },
      { source: "/portfolio/calendar", destination: "/portfolio#calendar", permanent: false },
    ];
  },
};

export default nextConfig;
