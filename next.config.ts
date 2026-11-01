import type { NextConfig } from "next";
const config: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: { "/*": ["./db/migrations/*.sql", "./node_modules/@electric-sql/pglite/**/*"] },
  distDir:process.env.SK_E2E==='1'?'.next-e2e':'.next',
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
};
export default config;
