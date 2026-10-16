import sanitizeHtml from "sanitize-html";

/**
 * Cleans HTML produced by the rich text editor before it is stored. Allows the
 * formatting the editor can produce (headings, lists, bold/italic/underline,
 * colors, font sizes, links, images from our own file route) and strips
 * everything else, including scripts and inline event handlers.
 */
export function cleanHtml(dirty: string): string {
  return sanitizeHtml(dirty, {
    allowedTags: [
      "h1", "h2", "h3", "h4", "p", "br", "strong", "b", "em", "i", "u", "s", "sub", "sup",
      "ul", "ol", "li", "blockquote", "pre", "code", "a", "img", "span", "div", "hr",
      "table", "thead", "tbody", "tr", "th", "td",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height"],
      span: ["style", "class"],
      p: ["style", "class"],
      div: ["style", "class"],
      h1: ["style", "class"], h2: ["style", "class"], h3: ["style", "class"], h4: ["style", "class"],
      li: ["class", "data-list"],
      ol: ["class"], ul: ["class"],
      td: ["colspan", "rowspan"], th: ["colspan", "rowspan"],
    },
    allowedStyles: {
      "*": {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/],
        "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/],
        "font-size": [/^\d+(\.\d+)?(px|em|rem|%)$/],
        "font-family": [/^[\w\s,'"-]+$/],
        "text-align": [/^(left|right|center|justify)$/],
        "padding-left": [/^\d+(px|em)$/],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowedClasses: {
      "*": [/^ql-/],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
    exclusiveFilter: (frame) => frame.tag === "img" && !/^(\/api\/files\/|https?:\/\/)/.test(frame.attribs.src ?? ""),
  });
}

/** True if a stored body is HTML (from the editor) rather than legacy Markdown. */
export function looksLikeHtml(s: string | null | undefined) {
  return !!s && /^\s*<(p|h\d|ul|ol|div|blockquote|table|pre)[\s>]/i.test(s);
}
