export async function renderDocxPreview(
  data: ArrayBuffer,
  container: HTMLElement,
  zoomPercent: number,
): Promise<number> {
  const { renderAsync } = await import('docx-preview');
  container.replaceChildren();

  const frame = document.createElement('iframe');
  frame.title = 'Word document preview';
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.referrerPolicy = 'no-referrer';
  frame.style.display = 'block';
  frame.style.width = '100%';
  frame.style.height = '100%';
  frame.style.border = '0';
  frame.style.background = 'transparent';
  container.appendChild(frame);

  const frameDocument = frame.contentDocument;
  if (!frameDocument) throw new Error('Unable to create the isolated Word preview.');
  frameDocument.open();
  frameDocument.write(
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body></body></html>',
  );
  frameDocument.close();

  await renderAsync(data, frameDocument.body, undefined, {
    className: 'word-preview-page',
    inWrapper: true,
    breakPages: true,
    ignoreWidth: false,
    ignoreHeight: false,
    ignoreFonts: false,
    ignoreLastRenderedPageBreak: false,
    experimental: true,
    renderHeaders: true,
    renderFooters: true,
    renderFootnotes: true,
    renderEndnotes: true,
    renderAltChunks: false,
    useBase64URL: true,
  });

  const isolationStyles = frameDocument.createElement('style');
  isolationStyles.textContent = `
    html, body { margin: 0; min-height: 100%; background: transparent; }
    body { overflow: auto; color-scheme: light; }
  `;
  frameDocument.head.appendChild(isolationStyles);

  const wrapper = frameDocument.querySelector<HTMLElement>('.word-preview-page-wrapper');
  if (wrapper) {
    wrapper.style.background = 'transparent';
    wrapper.style.padding = '0';
    wrapper.style.paddingBottom = '0';
    wrapper.style.display = 'flex';
    wrapper.style.flexFlow = 'row wrap';
    wrapper.style.alignItems = 'flex-start';
    wrapper.style.justifyContent = 'safe center';
    wrapper.style.gap = '16px';
  }

  const pages = frameDocument.querySelectorAll<HTMLElement>('section.word-preview-page');
  pages.forEach((page) => {
    page.style.margin = '0';
    page.style.flex = '0 0 auto';
    page.style.borderRadius = '2px';
    page.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.18)';
  });
  applyDocxPreviewZoom(container, zoomPercent);

  return pages.length;
}

export function applyDocxPreviewZoom(container: HTMLElement, zoomPercent: number): void {
  const zoom = Math.max(0.1, zoomPercent / 100);
  const frameDocument = container.querySelector('iframe')?.contentDocument;
  frameDocument?.querySelectorAll<HTMLElement>('section.word-preview-page').forEach((page) => {
    page.style.setProperty('zoom', `${zoom}`);
  });
}
