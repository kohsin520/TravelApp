import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isDev = process.env.NODE_ENV !== "production";

const baseConfig: NextConfig = {
  output: "standalone",
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: isDev,
});

export default isDev ? baseConfig : withSerwist(baseConfig);
