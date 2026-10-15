/** @type {import('next').NextConfig} */

const ADFORGE = "https://ad-forge-amber.vercel.app";

/** @param {string} source @param {string} destination */
function redirect(source, destination) {
  return { source, destination, statusCode: 301 };
}

function home(source) {
  return redirect(source, "/");
}

const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Marque lives on AdForge. These must precede the /brands catch-all.
      redirect("/brands/marque", ADFORGE),
      redirect("/brands/marque/:path*", ADFORGE),
      redirect("/marque", ADFORGE),
      redirect("/marque/:path*", ADFORGE),

      // Side brands retired from this site.
      home("/brands/hot-flash-co"),
      home("/brands/hot-flash-co/:path*"),
      home("/brands/kennum-lawn-care"),
      home("/brands/kennum-lawn-care/:path*"),
      home("/brands/life-loophole"),
      home("/brands/life-loophole/:path*"),
      home("/brands/angela-music"),
      home("/brands/angela-music/:path*"),
      home("/brands"),
      home("/brands/:path*"),

      // Off-funnel pages folded into the core site.
      home("/local"),
      home("/capture"),
      home("/insights"),
      home("/insights/:path*"),
      home("/newsletter"),
      home("/newsletter/:path*"),
      home("/tools"),
      home("/honest"),
      home("/voice-check"),
      home("/press"),
      home("/changelog"),
      home("/stack"),
      home("/compare"),
      home("/status"),
      home("/builds"),
      home("/builds/:path*"),
      home("/preview/cinematic"),
      home("/verticals/:path*"),
      home("/capabilities"),
      redirect("/work-with-us", "/book"),
      home("/case-studies/hot-flash-co"),
      home("/case-studies/casamore"),
      home("/case-studies/buildbridge"),

      // StepInside realty admin is archived off this site.
      redirect("/admin/realty", "/admin"),
      redirect("/admin/realty/:path*", "/admin"),
    ];
  },
};

export default nextConfig;
