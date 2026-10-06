import { PAGE, dashPattern } from "../pdf"
import { cssFamily } from "../resumeStyle"

const PT = 25.4 / 72

// Draws the shared layout as A4 pages. It uses the same positions, fonts and line breaks as the PDF.
export default function PageView({ layout }) {
  if (!layout) return <div className="page-view-loading" aria-busy="true">Laying out pages…</div>
  return (
    <div className="page-view">
      {layout.pages.map((items, i) => (
        <svg
          key={i}
          className="page-sheet"
          viewBox={`0 0 ${PAGE.width} ${PAGE.height}`}
          role="img"
          aria-label={`Page ${i + 1} of ${layout.pages.length}`}
        >
          <rect x="0" y="0" width={PAGE.width} height={PAGE.height} fill="#ffffff" />
          {items.map((item, j) => {
            if (item.t === "text") {
              return (
                <text
                  key={j}
                  x={item.x}
                  y={item.y}
                  fontFamily={cssFamily(item.font)}
                  fontWeight={item.variant.includes("bold") ? 700 : 400}
                  fontStyle={item.variant.includes("italic") ? "italic" : "normal"}
                  fontSize={item.size * PT}
                  fill={item.color}
                >
                  {item.text}
                </text>
              )
            }
            if (item.t === "rect" && item.fill) {
              return <rect key={j} x={item.x} y={item.y} width={item.w} height={item.h} rx={item.rx || 0} fill={item.fill} />
            }
            const stroke = {
              stroke: item.color || "#1b1f27",
              strokeWidth: item.width * PT,
              strokeDasharray: dashPattern(item.dash, item.width).join(" ") || undefined,
              strokeLinecap: item.dash === "dotted" ? "round" : "butt",
              fill: "none"
            }
            if (item.t === "line") return <line key={j} x1={item.x1} y1={item.y1} x2={item.x2} y2={item.y2} {...stroke} />
            return <rect key={j} x={item.x} y={item.y} width={item.w} height={item.h} rx={item.rx || 0} {...stroke} />
          })}
        </svg>
      ))}
    </div>
  )
}
