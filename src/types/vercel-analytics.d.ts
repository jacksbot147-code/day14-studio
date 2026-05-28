// Ambient shim so typecheck passes between the package.json bump and the
// next `npm install`. Once `@vercel/analytics` is installed its bundled
// types take over (this declaration is harmless because the real module
// exports a `<Analytics />` component with the same call signature).
declare module "@vercel/analytics/react" {
  import type { FC } from "react";
  export const Analytics: FC<Record<string, unknown>>;
}
