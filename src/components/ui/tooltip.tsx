import React from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  // Simple tooltip usando title (puedes mejorar con librería si quieres)
  return (
    <span title={content} style={{ cursor: "help", display: "inline-block" }}>
      {children}
    </span>
  );
};
