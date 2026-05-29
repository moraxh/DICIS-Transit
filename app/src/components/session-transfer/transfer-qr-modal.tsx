"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const EXPIRY_SECONDS = 5 * 60;

interface Props {
  onClose: () => void;
}

type Status = "idle" | "loading" | "ready" | "error";

export function TransferQRModal({ onClose }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
  const [errorMsg, setErrorMsg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function generate() {
    setStatus("loading");
    setErrorMsg("");
    setSecondsLeft(EXPIRY_SECONDS);

    const res = await fetch("/api/auth/transfer/create", { method: "POST" });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setErrorMsg(err.error ?? "Error al generar el codigo.");
      setStatus("error");
      return;
    }

    const { token } = await res.json();
    const url = `${window.location.origin}/transfer?token=${token}`;
    setQrUrl(url);
    setStatus("ready");

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setStatus("error");
          setErrorMsg("El codigo expiro. Genera uno nuevo.");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => {
    generate();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeLabel = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border bg-zinc-950 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h3
              id="transfer-modal-title"
              className="text-sm font-semibold text-white"
            >
              Transferir sesion
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Escanea desde el otro dispositivo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-zinc-800 transition-colors"
            aria-label="Cerrar"
          >
            <X size={16} className="text-zinc-400" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          {status === "loading" && (
            <div className="flex h-48 w-48 items-center justify-center">
              <span className="animate-spin inline-block w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full" />
            </div>
          )}

          {status === "ready" && qrUrl && (
            <>
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG value={qrUrl} size={192} />
              </div>
              <p className="text-xs text-zinc-500">
                Expira en{" "}
                <span
                  className={
                    secondsLeft < 60 ? "text-amber-400 font-semibold" : "text-zinc-300"
                  }
                >
                  {timeLabel}
                </span>
              </p>
              <p className="text-[11px] text-zinc-600 text-center leading-relaxed px-2">
                Tu sesion actual se cerrara en este dispositivo al ser transferida.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex h-48 w-48 items-center justify-center text-red-400 text-sm text-center px-4">
                {errorMsg}
              </div>
              <button
                type="button"
                onClick={generate}
                className="text-xs text-zinc-400 underline"
              >
                Generar nuevo codigo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
