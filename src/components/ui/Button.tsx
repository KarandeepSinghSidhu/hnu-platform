"use client";

import Link from "next/link";
import { useState } from "react";

type ColorVariant = "dark" | "standard" | "light";

const blueColors: Record<ColorVariant, string> = {
  dark: "#0c0c48",
  standard: "#0a4379",
  light: "#1a6ab1",
};

interface ButtonProps {
  href?: string;
  onClick?: () => void;
  variant?: "blue" | "white";
  children: React.ReactNode;
  className?: string;
  type?: "button" | "submit" | "reset";
  color?: ColorVariant;
}

export default function Button({
  href,
  onClick,
  variant = "blue",
  children,
  className = "",
  type = "button",
  color = "dark",
}: ButtonProps) {
  const [hovered, setHovered] = useState(false);

  const base =
    "inline-flex items-center justify-center text-center font-semibold rounded-full transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 w-fit max-w-full break-words text-[13px] sm:text-[16px]";

  const blueStyle = {
    backgroundColor: blueColors[color],
    color: "white",
    padding: "0.75em 2em",
    textDecoration: hovered ? "underline" : "none",
  };

  const blueStyleDesktop = `sm:py-[1em] sm:px-[3em]`;

  const whiteStyle = {
    backgroundColor: hovered ? "transparent" : "white",
    color: hovered ? "white" : "#0c0c48",
    padding: "0.75em 2em",
    border: `1px solid white`,
  };

  const style = variant === "blue" ? blueStyle : whiteStyle;

  const props = {
    className: `${base} ${variant === "blue" ? blueStyleDesktop : "sm:py-[1em] sm:px-[3em]"} ${className}`,
    style,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };

  if (href) {
    return (
      <Link href={href} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} {...props}>
      {children}
    </button>
  );
}