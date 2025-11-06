// Utility to wrap configured terms in anchor tags within an HTML string, without touching existing tags.
// It parses the HTML, walks text nodes, and replaces exact term matches with <a href target>term</a>.

export type LinkSpec = { href: string; target?: string; rel?: string, name: string };

const EXCLUDED_TAGS = new Set(['A', 'SCRIPT', 'STYLE', 'CODE', 'PRE']);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function replaceInTextNode(node: Text, term: string, spec: LinkSpec, caseSensitive = true) {
  const text = node.nodeValue || '';
  console.log('Node text before replacement:', text);
  if (!text) return;
  const src = caseSensitive ? text : text.toLowerCase();
  const needleTerm = caseSensitive ? term : term.toLowerCase();
  const needle = '${' + needleTerm + '}';
  let from = 0;
  let idx = src.indexOf(needle, from);
  console.log(`Searching for term "${term}" (needle "${needle}") in text node:`, text, 'Found at index:', idx);
  if (idx === -1) return;

  const parent = node.parentNode as HTMLElement | null;
  if (!parent) return;

  // We'll build a DocumentFragment with alternating text and anchors
  const frag = document.createDocumentFragment();

  const makeAnchor = (label: string) => {
    const a = document.createElement('a');
    a.textContent = label;
    a.href = spec.href;
    a.target = spec.target || '_blank';
    // Security best-practice for target=_blank
    a.rel = spec.rel || 'noopener noreferrer';
  a.classList.add('auto-link');
    return a;
  };

  while (idx !== -1) {
    // Push preceding text
    const before = text.slice(from, idx);
    if (before) frag.appendChild(document.createTextNode(before));
    // Push anchor
    // Remove the ${ and } wrapper in the label
    const label = text.slice(idx + 2, idx + 2 + term.length);
    frag.appendChild(makeAnchor(label));
    from = idx + (term.length + 3); // '${'.length (2) + term.length + '}'.length (1)
    idx = src.indexOf(needle, from);
  }
  // Remainder
  const after = text.slice(from);
  if (after) frag.appendChild(document.createTextNode(after));

  parent.replaceChild(frag, node);
}

function walkAndLinkify(root: HTMLElement, linkMap: LinkSpec[], caseSensitive = true) {
  const terms = linkMap.map(link => link.name).filter(Boolean).sort((a, b) => b.length - a.length); // longer first
  console.log('Linkify terms:', terms);
  if (terms.length === 0) return;

  const visit = (el: Node) => {
    let child: ChildNode | null = el.firstChild as ChildNode | null;
    while (child) {
      const next = child.nextSibling;
      if (child.nodeType === Node.TEXT_NODE) {
        for (const term of terms) {
          let f = linkMap.find(link => link.name === term);
          if (f) {
            console.log(`Linkifying term "${term}" with href "${f.href}"`);
            replaceInTextNode(child as Text, term, f, caseSensitive);
          }
        }
      } else if (
        child.nodeType === Node.ELEMENT_NODE &&
        !EXCLUDED_TAGS.has((child as Element).tagName)
      ) {
        visit(child);
      }
      child = next;
    }
  };
  visit(root);
}

export function linkifyHtml(html: string, linkMap: LinkSpec[], caseSensitive = true): string {
  if (!html || !linkMap || linkMap.length === 0) return html;

  const container = document.createElement('div');
  container.innerHTML = html;
  walkAndLinkify(container, linkMap, caseSensitive);
  return container.innerHTML;
}

// Convenience for plain text: escape first, then linkify
export function linkifyText(text: string, linkMap: LinkSpec[], caseSensitive = true): string {
  const escaped = escapeHtml(text || '');
  return linkifyHtml(escaped, linkMap, caseSensitive);
}
