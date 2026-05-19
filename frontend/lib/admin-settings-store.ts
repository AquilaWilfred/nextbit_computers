import {
  ADMIN_SETTINGS_DEFAULTS,
  type AdminSettingKey,
} from "@/lib/admin-settings-defaults";

type StoreShape = {
  [K in AdminSettingKey]: (typeof ADMIN_SETTINGS_DEFAULTS)[K];
};

declare global {
  // eslint-disable-next-line no-var
  var __nextbitAdminSettingsStore: StoreShape | undefined;
}

function cloneDefaults(): StoreShape {
  return JSON.parse(JSON.stringify(ADMIN_SETTINGS_DEFAULTS)) as StoreShape;
}

export function getAdminSettingsStore(): StoreShape {
  if (!globalThis.__nextbitAdminSettingsStore) {
    globalThis.__nextbitAdminSettingsStore = cloneDefaults();
  }

  return globalThis.__nextbitAdminSettingsStore;
}

export function readAdminSetting(key: string): unknown {
  const store = getAdminSettingsStore();
  if (key in store) {
    return store[key as AdminSettingKey];
  }

  return {};
}

export function writeAdminSetting(key: string, value: unknown): unknown {
  const store = getAdminSettingsStore();
  (store as Record<string, unknown>)[key] = value;
  return (store as Record<string, unknown>)[key];
}
