/**
 * Triggers a browser download from a presigned URL.
 *
 * The URL is self-authenticating and points at S3 (or /uploads in dev), so this
 * is a plain navigation — no HttpClient, no Authorization header, no blob.
 */
export function downloadFromUrl(url: string, filename?: string): void {
  const a = document.createElement('a');
  a.href = url;
  if (filename) a.download = filename;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
