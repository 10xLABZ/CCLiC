import { FUNDBUX_ICON_URL } from "./fundConfig";

export default function FundBuxIcon({ size = 16, className = "" }) {
  return (
    <img
      src={FUNDBUX_ICON_URL}
      alt="FundBux"
      className={`inline-block object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}