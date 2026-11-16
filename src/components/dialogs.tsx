"use client";

import { createContext, useCallback, useContext, useState } from "react";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type PromptOptions = ConfirmOptions & {
  placeholder?: string;
  initial?: string;
  submitLabel?: string;
};

type DialogState =
  | {
      kind: "confirm";
      title?: string;
      message: string;
      confirmLabel: string;
      cancelLabel: string;
      danger: boolean;
      resolve: (v: boolean) => void;
    }
  | {
      kind: "prompt";
      title?: string;
      message: string;
      submitLabel: string;
      cancelLabel: string;
      danger: boolean;
      placeholder?: string;
      resolve: (v: string | null) => void;
    };

type DialogApi = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogApi | null>(null);

export function useDialogs(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialogs must be used inside DialogProvider");
  return ctx;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [value, setValue] = useState("");

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        kind: "confirm",
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? "Confirm",
        cancelLabel: opts.cancelLabel ?? "Cancel",
        danger: opts.danger ?? false,
        resolve,
      });
    });
  }, []);

  const prompt = useCallback((opts: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setValue(opts.initial ?? "");
      setState({
        kind: "prompt",
        title: opts.title,
        message: opts.message,
        submitLabel: opts.submitLabel ?? "Save",
        cancelLabel: opts.cancelLabel ?? "Cancel",
        danger: opts.danger ?? false,
        placeholder: opts.placeholder,
        resolve,
      });
    });
  }, []);

  function close(result: boolean | string | null) {
    if (!state) return;
    state.resolve(result as never);
    setState(null);
  }

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onMouseDown={(e) => e.target === e.currentTarget && close(state.kind === "confirm" ? false : null)}
        >
          <div
            className="card w-full max-w-md p-6 anim-fade-in"
            onKeyDown={(e) => {
              if (e.key === "Escape") close(state.kind === "confirm" ? false : null);
            }}
          >
            {state.title && <h3 className="mb-3 text-lg font-semibold">{state.title}</h3>}
            <p className="mb-4 text-sm text-[#aaaaaa]">{state.message}</p>
            {state.kind === "prompt" && (
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={state.placeholder}
                autoFocus
                maxLength={100}
                className="input mb-4"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && value.trim()) close(value.trim());
                }}
              />
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => close(state.kind === "confirm" ? false : null)} className="btn">
                {state.cancelLabel}
              </button>
              <button
                onClick={() => close(state.kind === "confirm" ? true : value.trim() || null)}
                disabled={state.kind === "prompt" && !value.trim()}
                className={state.danger ? "btn !bg-[#cc0000] !text-white hover:!bg-[#e60000]" : "btn-primary"}
              >
                {state.kind === "confirm" ? state.confirmLabel : state.submitLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
