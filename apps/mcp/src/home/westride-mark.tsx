import type { SVGProps } from "react";

/**
 * The WeStride stamp: four strides and a spark, painted with the brand
 * tokens the WeStride theme publishes, so it stays in step with the palette.
 */
export function WestrideMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 1024 700" {...props}>
      <g strokeLinecap="round" strokeWidth={96} fill="none">
        <line x1={52} y1={642} x2={202} y2={390} stroke="var(--color-brand-indigo)" />
        <line x1={228} y1={642} x2={430} y2={296} stroke="var(--color-brand-purple)" />
        <line x1={406} y1={642} x2={662} y2={206} stroke="var(--color-brand-blue)" />
        <line x1={584} y1={642} x2={872} y2={144} stroke="var(--color-brand-teal)" />
      </g>
      <path
        d="M955 0 C965 45 980 58 1022 66 C980 74 965 88 955 132 C945 88 930 74 888 66 C930 58 945 45 955 0 Z"
        fill="var(--color-brand-orange)"
      />
    </svg>
  );
}
