import React from "react";
import officialLogoHorizontal from "../assets/branding/official-logo-horizontal.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  onlyIcon?: boolean; 
}

export default function Logo({
  className = "",
  size = "md",
  onlyIcon = false,
}: LogoProps) {
  const sizeClasses = {
    sm: "h-[40px] md:h-[48px] xl:h-[58px] shrink-0",
    md: "h-[48px] shrink-0",
    lg: "h-[120px] shrink-0",
    xl: "h-[160px] shrink-0",
  };

  const containerPadding = size === "sm" ? "pl-[16px] xl:pl-[24px]" : "";

  return (
    <div className={`flex items-center justify-center shrink-0 ${containerPadding} ${className}`}>
      <img 
        src={officialLogoHorizontal} 
        alt="NexCivic Logo" 
        className={`${sizeClasses[size]} w-auto bg-transparent brightness-110 contrast-105`}
        draggable="false"
      />
    </div>
  );
}
