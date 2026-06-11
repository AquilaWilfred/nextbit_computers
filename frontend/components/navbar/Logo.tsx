import Link from "next/link";
import { useLogoConfig } from "@/hooks/navbar/useLogoConfig";
import { PublicSettings } from "@/types/navbar/navbar.types";

interface LogoProps {
  settings: PublicSettings | null;
  storeName: string;
  onClick?: () => void;
}

export function Logo({ settings, storeName, onClick }: LogoProps) {
  const {
    logoUrl,
    logoTextItems,
    logoTextSide,
    logoTextDisplay,
    logoTextSpacing,
    getLogoCropWrapperStyle,
    getLogoCropImageStyle,
    logoLinkClassName,
  } = useLogoConfig(settings);

  const getLogoTextItemsForSide = (side: "left" | "right" | "top" | "bottom") =>
    logoTextItems.filter((item) =>
      item.position && item.position !== "default" ? item.position === side : logoTextSide === side
    );

  const getTextBlockMarginStyle = (side: "left" | "right" | "top" | "bottom"): React.CSSProperties => {
    const px = `${logoTextSpacing}px`;
    if (side === "left") return { marginRight: px };
    if (side === "right") return { marginLeft: px };
    if (side === "top") return { marginBottom: px };
    if (side === "bottom") return { marginTop: px };
    return {};
  };

  const renderLogoImage = () => (
    <div style={getLogoCropWrapperStyle()} className="overflow-hidden rounded-sm max-w-full min-w-0">
      <img
        src={logoUrl}
        alt={storeName}
        className="h-full w-full"
        style={getLogoCropImageStyle()}
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );

  const renderLogoTextBlock = (side: "left" | "right" | "top" | "bottom") => {
    const items = getLogoTextItemsForSide(side);
    if (items.length === 0) return null;

    const itemStyles = (item: typeof items[0]): React.CSSProperties => ({
      fontFamily: item.font ?? "Inter",
      fontWeight: item.bold ? 700 : 400,
      fontStyle: item.italic ? "italic" : "normal",
      textDecoration: item.underline ? "underline" : "none",
      color: item.color ?? "inherit",
    });

    if (logoTextDisplay === "list") {
      return (
        <ul className="list-disc pl-4 text-sm leading-tight">
          {items.map((item, i) => <li key={i} style={itemStyles(item)}>{item.text}</li>)}
        </ul>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm leading-tight max-w-full min-w-0" style={getTextBlockMarginStyle(side)}>
        {items.map((item, i) => (
          <span key={i} style={itemStyles(item)} className="max-w-full truncate overflow-hidden whitespace-nowrap">
            {item.text}
          </span>
        ))}
      </div>
    );
  };

  return (
    <Link href="/" onClick={onClick} className={logoLinkClassName} style={{ userSelect: "none" }}>
      {renderLogoTextBlock("top")}
      {renderLogoTextBlock("left")}
      {logoUrl
        ? renderLogoImage()
        : !logoTextItems.length && (
            <span className="font-display font-bold text-sm sm:text-base lg:text-lg tracking-tight truncate max-w-[100px] sm:max-w-[140px] lg:max-w-[180px]">
              {storeName}
            </span>
          )}
      {renderLogoTextBlock("right")}
      {renderLogoTextBlock("bottom")}
    </Link>
  );
}