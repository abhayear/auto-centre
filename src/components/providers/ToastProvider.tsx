"use client";

import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast";

export function ToastProvider() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "#1e293b",
          color: "#f1f5f9",
          border: "1px solid #334155",
        },
        success: {
          iconTheme: { primary: "#dc2626", secondary: "#fff" },
        },
      }}
    />
  );
}
