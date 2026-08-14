const ALLOWED_TAGS = new Set([
  "A", "B", "BLOCKQUOTE", "BR", "CODE", "DIV", "EM", "FIGCAPTION", "FIGURE",
  "FONT", "H1", "H2", "H3", "HR", "I", "IMG", "LI", "OL", "P", "PRE",
  "S", "SPAN", "STRONG", "TABLE", "TBODY", "TD", "TH", "THEAD", "TR", "U", "UL",
]);

const DROP_WITH_CONTENT = new Set([
  "BASE", "BUTTON", "EMBED", "FORM", "IFRAME", "INPUT", "LINK", "MATH", "META",
  "OBJECT", "SCRIPT", "SELECT", "STYLE", "SVG", "TEXTAREA", "VIDEO", "AUDIO",
]);
const SAFE_CLASSES = new Set(["eyebrow", "lead", "editor-image", "visual-export"]);

const SAFE_STYLE_PROPERTIES = new Set([
  "background-color", "border", "border-color", "border-radius", "border-style", "border-width",
  "color", "display", "font-family", "font-size", "font-style", "font-weight", "height",
  "line-height", "margin", "margin-bottom", "margin-left", "margin-right", "margin-top",
  "max-width", "padding", "text-align", "text-decoration", "white-space", "width",
]);

const SAFE_IMAGE_URL = /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i;

function safeUrl(value: string) {
  const trimmed = value.trim();
  if (/^(?:https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (/^(?:#|\/)(?!\/)/.test(trimmed)) return trimmed;
  return "";
}

function safeStyle(value: string) {
  return value.split(";").map((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator < 1) return "";
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const cssValue = declaration.slice(separator + 1).trim().slice(0, 160);
    if (!SAFE_STYLE_PROPERTIES.has(property) || !cssValue) return "";
    if (/url\s*\(|expression\s*\(|@import|javascript:|vbscript:|behavior\s*:|-moz-binding/i.test(cssValue)) return "";
    return `${property}:${cssValue}`;
  }).filter(Boolean).join(";");
}

function unwrap(element: Element) {
  element.replaceWith(...Array.from(element.childNodes));
}

export function sanitizeHtml(input: string) {
  if (!input) return "";
  if (typeof document === "undefined") return input.replace(/<(script|style|iframe|object|embed|form|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "").replace(/\son\w+\s*=\s*(["']).*?\1/gi, "");

  const template = document.createElement("template");
  template.innerHTML = input;
  const elements = Array.from(template.content.querySelectorAll("*"));

  for (const element of elements) {
    if (!element.isConnected && !template.content.contains(element)) continue;
    if (DROP_WITH_CONTENT.has(element.tagName)) { element.remove(); continue; }
    if (!ALLOWED_TAGS.has(element.tagName)) { unwrap(element); continue; }

    const originalAttributes = Array.from(element.attributes);
    for (const attribute of originalAttributes) element.removeAttribute(attribute.name);

    const getOriginal = (name: string) => originalAttributes.find((attribute) => attribute.name.toLowerCase() === name)?.value ?? "";
    const className = getOriginal("class").split(/\s+/).filter((name) => SAFE_CLASSES.has(name)).join(" ");
    if (className) element.setAttribute("class", className);
    const title = getOriginal("title").slice(0, 240);
    if (title) element.setAttribute("title", title);
    const style = safeStyle(getOriginal("style"));
    if (style) element.setAttribute("style", style);

    if (element.tagName === "A") {
      const href = safeUrl(getOriginal("href"));
      if (href) element.setAttribute("href", href);
      element.setAttribute("rel", "noopener noreferrer");
    }
    if (element.tagName === "IMG") {
      const src = getOriginal("src");
      if (!SAFE_IMAGE_URL.test(src)) { element.remove(); continue; }
      element.setAttribute("src", src.replace(/\s+/g, ""));
      element.setAttribute("alt", getOriginal("alt").slice(0, 300) || "Imagen");
      element.setAttribute("loading", "lazy");
      element.setAttribute("decoding", "async");
    }
    if (element.tagName === "FIGURE" && getOriginal("contenteditable") === "false") element.setAttribute("contenteditable", "false");
    if (element.tagName === "FONT") {
      const face = getOriginal("face");
      if (/^[a-z0-9 ,'-]{1,80}$/i.test(face)) element.setAttribute("face", face);
      const size = getOriginal("size");
      if (/^[1-7]$/.test(size)) element.setAttribute("size", size);
      const color = getOriginal("color");
      if (/^(?:#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(color)) element.setAttribute("color", color);
    }
    if (element.tagName === "TD" || element.tagName === "TH") {
      for (const name of ["colspan", "rowspan"]) {
        const value = getOriginal(name);
        if (/^[1-9]\d?$/.test(value)) element.setAttribute(name, value);
      }
    }
  }

  for (const comment of Array.from(template.content.childNodes).filter((node) => node.nodeType === Node.COMMENT_NODE)) comment.remove();
  return template.innerHTML;
}

export function isSafeRasterDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.length <= 16_000_000 && SAFE_IMAGE_URL.test(value);
}

export function sanitizeLinkUrl(value: string) {
  return safeUrl(value);
}
