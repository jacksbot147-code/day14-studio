import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0B0B0A",
          color: "#F8F6F1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: "-0.05em",
        }}
      >
        14
      </div>
    ),
    { ...size },
  );
}
