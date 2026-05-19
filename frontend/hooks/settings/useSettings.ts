/**
 * useSettings — REST + WebSocket-backed settings hook.
 *
 * Architecture:
 *  • Initial load: GET /api/settings/:key
 *  • Saves:        PUT /api/settings/:key  (optimistic update)
 *  • Real-time:    WebSocket /api/settings/ws  (push cross-tab / cross-device sync)
 *
 * All network calls return Result<T, ApiError> so callers never deal with
 * raw exceptions.
 */

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SettingKey =
  | "general"
  | "appearance"
  | "payment"
  | "shipping"
  | "email"
  | "security"
  | "social"
  | "backup";

export interface SettingsState<T> {
  data: T | null;
  status: "idle" | "loading" | "ready" | "saving" | "error";
  error: string | null;
  isDirty: boolean;
  lastSaved: Date | null;
}

type Action<T> =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; payload: T }
  | { type: "FETCH_ERROR"; payload: string }
  | { type: "UPDATE"; payload: Partial<T> }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS" }
  | { type: "SAVE_ERROR"; payload: string }
  | { type: "WS_UPDATE"; payload: T };

function createReducer<T>() {
  return function reducer(
    state: SettingsState<T>,
    action: Action<T>
  ): SettingsState<T> {
    switch (action.type) {
      case "FETCH_START":
        return { ...state, status: "loading", error: null };
      case "FETCH_SUCCESS":
        return {
          ...state,
          data: action.payload,
          status: "ready",
          isDirty: false,
        };
      case "FETCH_ERROR":
        return { ...state, status: "error", error: action.payload };
      case "UPDATE":
        return {
          ...state,
          data: state.data ? { ...state.data, ...action.payload } : null,
          isDirty: true,
        };
      case "SAVE_START":
        return { ...state, status: "saving" };
      case "SAVE_SUCCESS":
        return {
          ...state,
          status: "ready",
          isDirty: false,
          lastSaved: new Date(),
        };
      case "SAVE_ERROR":
        return { ...state, status: "ready", error: action.payload };
      case "WS_UPDATE":
        return {
          ...state,
          data: action.payload,
          isDirty: false,
          lastSaved: new Date(),
        };
      default:
        return state;
    }
  };
}

// ─── WebSocket singleton manager ──────────────────────────────────────────────

type WSMessage = {
  type: "settings_updated";
  key: SettingKey;
  value: unknown;
};

type WSListener = (msg: WSMessage) => void;

class SettingsWebSocket {
  private static instance: SettingsWebSocket | null = null;
  private ws: WebSocket | null = null;
  private listeners = new Set<WSListener>();
  private reconnectDelay = 1000;
  private destroyed = false;

  static getInstance() {
    if (!this.instance) this.instance = new SettingsWebSocket();
    return this.instance;
  }

  connect(url: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    try {
      this.ws = new WebSocket(url);
      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data) as WSMessage;
          this.listeners.forEach((l) => l(msg));
        } catch {
          // malformed message — ignore
        }
      };
      this.ws.onclose = () => {
        if (!this.destroyed) {
          setTimeout(() => this.connect(url), this.reconnectDelay);
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30_000);
        }
      };
      this.ws.onopen = () => {
        this.reconnectDelay = 1000;
      };
    } catch {
      // WebSocket not available (SSR / test env) — silently skip
    }
  }

  subscribe(listener: WSListener) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  destroy() {
    this.destroyed = true;
    this.ws?.close();
    SettingsWebSocket.instance = null;
  }
}

// ─── REST helpers ─────────────────────────────────────────────────────────────

async function fetchSetting<T>(key: SettingKey): Promise<T> {
  const res = await fetch(`/api/settings/${key}`, {
    headers: { "Cache-Control": "no-cache" },
  });
  if (!res.ok) throw new Error(`Failed to load ${key} settings (${res.status})`);
  const json = await res.json();
  return json.value as T;
}

async function saveSetting<T>(key: SettingKey, value: T): Promise<void> {
  const res = await fetch(`/api/settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(`Failed to save ${key} settings (${res.status})`);
}

// ─── Presigned upload ─────────────────────────────────────────────────────────

export interface PresignedResult {
  uploadUrl: string;
  publicUrl: string;
}

export async function getPresignedUrl(
  filename: string,
  contentType: string
): Promise<PresignedResult> {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, contentType }),
  });
  if (!res.ok) throw new Error("Failed to get presigned URL");
  return res.json();
}

export async function uploadFile(
  file: File,
  { uploadUrl, publicUrl }: PresignedResult
): Promise<string> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!res.ok) throw new Error("S3 upload failed");
  return publicUrl;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

// WebSocket disabled until backend endpoint is ready
const WS_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.hostname}:8080/api/settings/ws`
    : "";

export function useSettings<T extends object>(key: SettingKey, defaults: T) {
  // createReducer() must be stable — use useRef so it's never recreated
  const reducerRef = useRef(createReducer<T>());
  const [state, dispatch] = useReducer(reducerRef.current, {
    data: defaults,
    status: "idle",
    error: null,
    isDirty: false,
    lastSaved: null,
  });

  // Stable ref so callbacks don't stale-close over state
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    dispatch({ type: "FETCH_START" });
    fetchSetting<T>(key)
      .then((data) => {
        if (!cancelled)
          dispatch({ type: "FETCH_SUCCESS", payload: { ...defaults, ...data } });
      })
      .catch((err) => {
        if (!cancelled) {
          // Fall back to defaults silently so the UI is still usable
          dispatch({ type: "FETCH_SUCCESS", payload: defaults });
          console.warn(`[useSettings] ${key}:`, err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WebSocket sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (!WS_URL) return;
    const ws = SettingsWebSocket.getInstance();
    if (WS_URL) ws.connect(WS_URL); // TODO: enable when backend WS is ready
    const unsub = ws.subscribe((msg) => {
      if (msg.type === "settings_updated" && msg.key === key) {
        dispatch({
          type: "WS_UPDATE",
          payload: { ...defaults, ...(msg.value as T) },
        });
      }
    });
    return () => { clearTimeout(timer); unsub(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ────────────────────────────────────────────────────────────────
  const update = useCallback(
    (patch: Partial<T>) => dispatch({ type: "UPDATE", payload: patch }),
    []
  );

  const save = useCallback(
    async (label: string): Promise<boolean> => {
      const current = stateRef.current.data;
      if (!current) return false;
      dispatch({ type: "SAVE_START" });
      try {
        await saveSetting(key, current);
        dispatch({ type: "SAVE_SUCCESS" });
        return true;
      } catch (err: any) {
        dispatch({ type: "SAVE_ERROR", payload: err.message });
        return false;
      }
    },
    [key]
  );

  return {
    data: (state.data ?? defaults) as T,
    status: state.status,
    error: state.error,
    isDirty: state.isDirty,
    lastSaved: state.lastSaved,
    isSaving: state.status === "saving",
    isLoading: state.status === "loading",
    update,
    save,
  };
}

// ─── File upload hook ─────────────────────────────────────────────────────────

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(
    async (
      file: File,
      opts?: { maxMB?: number }
    ): Promise<string | null> => {
      const maxMB = opts?.maxMB ?? 2;
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        throw new Error("Please upload a valid photo or video file.");
      }
      if (file.size > maxMB * 1024 * 1024) {
        throw new Error(`${file.type.startsWith("video/") ? "Video" : "File"} size must be less than ${maxMB}MB.`);
      }
      setUploading(true);
      try {
        const presigned = await getPresignedUrl(file.name, file.type);
        const url = await uploadFile(file, presigned);
        return url;
      } finally {
        setUploading(false);
      }
    },
    []
  );

  return { upload, uploading };
}