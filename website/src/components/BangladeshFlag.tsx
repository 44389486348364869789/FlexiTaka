import React from "react";

interface BangladeshFlagProps {
  className?: string;
  style?: React.CSSProperties;
  width?: number;
  height?: number;
}

/**
 * Official Bangladesh Flag Component
 * Proportions: 10:6 (viewBox="0 0 20 12")
 * Background: Bottle Green (#006A4E)
 * Circle: Red (#F42A41), radius = 20% of length (r=4), offset at 45% of length (cx=9, cy=6)
 * Replaces system emoji dependency for 100% consistent cross-platform rendering.
 */
export default function BangladeshFlag({
  className = "",
  style = {},
  width = 18,
  height = 12,
}: BangladeshFlagProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 12"
      width={width}
      height={height}
      aria-label="Bangladesh Flag"
      role="img"
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "-1px",
        borderRadius: "2px",
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(0, 0, 0, 0.08)",
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Bottle Green Field */}
      <rect width="20" height="12" fill="#006A4E" />
      {/* Official Red Circle (offset towards hoist at 9/20 length) */}
      <circle cx="9" cy="6" r="4" fill="#F42A41" />
    </svg>
  );
}
