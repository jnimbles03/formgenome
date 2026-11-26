/**
 * Runs a download action and returns the file the product built.
 * downloadViaAnchor writes the string into a Blob unchanged.
 */

async function readBlob(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') return blob.text();
  if (typeof blob.arrayBuffer === 'function') {
    return new TextDecoder().decode(await blob.arrayBuffer());
  }
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

export async function captureDownload(action: () => void): Promise<{ content: string; filename: string; type: string }> {
  if (typeof URL.revokeObjectURL !== 'function') URL.revokeObjectURL = () => {};

  const blobs: Blob[] = [];
  const originalCreate = URL.createObjectURL;
  URL.createObjectURL = ((obj: Blob | MediaSource) => {
    if (obj instanceof Blob) blobs.push(obj);
    if (typeof originalCreate === 'function') return originalCreate.call(URL, obj);
    return 'blob:formgenome-test';
  }) as typeof URL.createObjectURL;

  let filename = '';
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    filename = this.download;
  };

  try {
    action();
    if (blobs.length === 0) throw new Error('export did not build a file');
    const blob = blobs[blobs.length - 1]!;
    return { content: await readBlob(blob), filename, type: blob.type };
  } finally {
    URL.createObjectURL = originalCreate;
    HTMLAnchorElement.prototype.click = originalClick;
  }
}
