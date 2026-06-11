import { PublicSettings } from "@/types/navbar/navbar.types";
import { DEFAULT_LOGO_SETTINGS } from "@/constants/navbar/navbar.constants";

export function useLogoConfig(settings: PublicSettings | null) {
  const appearance = settings?.appearance;
  
  const logoUrl = appearance?.logoUrl;
  const logoWidth = appearance?.logoWidth;
  const logoHeight = appearance?.logoHeight;
  const logoTextSide = appearance?.logoTextSide ?? DEFAULT_LOGO_SETTINGS.textSide;
  const logoTextDisplay = appearance?.logoTextDisplay ?? DEFAULT_LOGO_SETTINGS.textDisplay;
  const logoTextSpacing = appearance?.logoTextSpacing ?? DEFAULT_LOGO_SETTINGS.textSpacing;
  const logoOpacity = appearance?.logoOpacity ?? DEFAULT_LOGO_SETTINGS.opacity;
  const logoCropMode = appearance?.logoCropMode ?? DEFAULT_LOGO_SETTINGS.cropMode;
  const logoCropAmount = appearance?.logoCropAmount ?? DEFAULT_LOGO_SETTINGS.cropAmount;
  const logoTextItems = Array.isArray(appearance?.logoTextItems)
    ? appearance!.logoTextItems!.filter((item) => item?.text?.trim())
    : [];

  const getLogoCropWrapperStyle = (): React.CSSProperties => {
    const amount = Math.min(Math.max(logoCropAmount, 0), 50);
    const style: React.CSSProperties = {
      width: logoWidth ? `${logoWidth}px` : undefined,
      height: logoHeight ? `${logoHeight}px` : undefined,
      maxWidth: "100%", maxHeight: "100%", minWidth: 0,
      overflow: "hidden", display: "inline-flex",
      alignItems: "center", justifyContent: "center",
    };
    if (logoCropMode === "crop-left") style.clipPath = `inset(0 0 0 ${amount}%)`;
    else if (logoCropMode === "crop-right") style.clipPath = `inset(0 ${amount}% 0 0)`;
    else if (logoCropMode === "crop-top") style.clipPath = `inset(${amount}% 0 0 0)`;
    else if (logoCropMode === "crop-bottom") style.clipPath = `inset(0 0 ${amount}% 0)`;
    return style;
  };

  const getLogoCropImageStyle = (): React.CSSProperties => ({
    width: "100%", height: "100%",
    opacity: logoOpacity,
    objectFit: logoCropMode === "none" ? "contain" : "cover",
    objectPosition:
      logoCropMode === "crop-left" ? "left center" :
      logoCropMode === "crop-right" ? "right center" :
      logoCropMode === "crop-top" ? "center top" :
      logoCropMode === "crop-bottom" ? "center bottom" : "center",
  });

  const logoTextHasVertical = logoTextSide === "top" || logoTextSide === "bottom";
  const logoLinkClassName = `flex shrink min-w-0 max-w-full overflow-hidden gap-2 ${
    logoTextHasVertical ? "flex-col items-center" : "items-center"
  }`;

  return {
    logoUrl,
    logoWidth,
    logoHeight,
    logoTextSide,
    logoTextDisplay,
    logoTextSpacing,
    logoOpacity,
    logoCropMode,
    logoCropAmount,
    logoTextItems,
    getLogoCropWrapperStyle,
    getLogoCropImageStyle,
    logoTextHasVertical,
    logoLinkClassName,
  };
}