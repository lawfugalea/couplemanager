import dynamic from "next/dynamic";
import {
  Chart as ChartJS,
  LineElement, PointElement, LinearScale, CategoryScale,
  ArcElement, Tooltip, Legend, Filler, TimeScale
} from "chart.js";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, ArcElement, Tooltip, Legend, Filler, TimeScale);

export const Line = dynamic(() => import("react-chartjs-2").then(m => m.Line), { ssr: false });
export const Doughnut = dynamic(() => import("react-chartjs-2").then(m => m.Doughnut), { ssr: false });

export function themedDefaults() {
  if (typeof window === "undefined") return {
    grid: "#3c4352", ticks: "#cfd5e1", text: "#e8ecf5", accent: "#7a86ff"
  };
  const rs = getComputedStyle(document.documentElement);
  const get = (v, fallback) => rs.getPropertyValue(v).trim() || fallback;
  return {
    grid: get("--border", "#3c4352"),
    ticks: get("--muted", "#cfd5e1"),
    text: get("--text", "#e8ecf5"),
    accent: get("--accent", "#7a86ff")
  };
}

// Build a vertical gradient for the current canvas
export function makeAreaGradient(ctx, colorHex, alphaTop = 0.28, alphaBottom = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, ctx.canvas.clientHeight || 300);
  // colorHex "#7a86ff" -> rgba
  const toRGBA = (hex, a) => {
    const h = hex.replace("#",""); const r = parseInt(h.substring(0,2),16);
    const g2 = parseInt(h.substring(2,4),16); const b = parseInt(h.substring(4,6),16);
    return `rgba(${r},${g2},${b},${a})`;
  };
  g.addColorStop(0, toRGBA(colorHex, alphaTop));
  g.addColorStop(1, toRGBA(colorHex, alphaBottom));
  return g;
}
