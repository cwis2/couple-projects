import type { AppProps } from "../apps";

const placeholderImage = new URL("../../images/placeholder.png", import.meta.url).href;

export function PlaceholderApp(_props: AppProps) {
  return (
    <div className="app-placeholder">
      <img src={placeholderImage} alt="" />
    </div>
  );
}
