type UploadEntry = {
  body: Uint8Array;
  contentType: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __nextbitUploadStore: Map<string, UploadEntry> | undefined;
}

export function getUploadStore(): Map<string, UploadEntry> {
  if (!globalThis.__nextbitUploadStore) {
    globalThis.__nextbitUploadStore = new Map<string, UploadEntry>();
  }

  return globalThis.__nextbitUploadStore;
}

export function putUpload(
  key: string,
  body: Uint8Array,
  contentType: string
): void {
  getUploadStore().set(key, { body, contentType });
}

export function getUpload(key: string): UploadEntry | undefined {
  return getUploadStore().get(key);
}
