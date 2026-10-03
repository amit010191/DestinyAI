import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["geo-tz", "geojson-vt"],
};

export default nextConfig;
