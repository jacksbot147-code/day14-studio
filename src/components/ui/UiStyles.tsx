import { UI_CSS } from "./styles";

/**
 * Embeds the shared Day14 UI primitive stylesheet. Each primitive
 * component renders this once. Browsers tolerate duplicate identical
 * <style> tags, so multiple primitives on a single page is fine; the
 * marker `data-d14-ui` is purely diagnostic.
 */
export function UiStyles() {
  return <style data-d14-ui="" dangerouslySetInnerHTML={{ __html: UI_CSS }} />;
}
