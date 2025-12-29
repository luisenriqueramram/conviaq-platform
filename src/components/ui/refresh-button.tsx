"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    
    // Feedback visual por 500ms
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 
        border border-white/20 hover:border-white/30 transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Refrescar"
    >
      <RefreshCw 
        size={16} 
        className={`transition-transform duration-500 ${isRefreshing ? "animate-spin" : ""}`}
      />
      <span className="text-sm font-medium">Refrescar</span>
    </button>
  );
}
