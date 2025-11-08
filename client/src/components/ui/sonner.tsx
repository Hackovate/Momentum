"use client";

import { useTheme } from "next-themes@0.4.6";
import { Toaster as Sonner, ToasterProps } from "sonner@2.0.3";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isDark = theme === "dark";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border-violet-200 dark:border-violet-800 text-gray-900 dark:text-gray-100 shadow-lg",
          success: "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800 text-green-900 dark:text-green-100",
          error: "bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100",
          warning: "bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950 dark:to-amber-950 border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100",
          info: "bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950 dark:to-purple-950 border-violet-200 dark:border-violet-800 text-violet-900 dark:text-violet-100",
        },
      }}
      style={
        {
          "--normal-bg": isDark ? "rgb(59, 7, 100)" : "rgb(250, 245, 255)",
          "--normal-text": isDark ? "rgb(243, 232, 255)" : "rgb(55, 65, 81)",
          "--normal-border": isDark ? "rgb(76, 29, 149)" : "rgb(196, 181, 253)",
          "--success-bg": isDark ? "rgb(5, 46, 22)" : "rgb(240, 253, 244)",
          "--success-text": isDark ? "rgb(187, 247, 208)" : "rgb(20, 83, 45)",
          "--success-border": isDark ? "rgb(22, 101, 52)" : "rgb(187, 247, 208)",
          "--error-bg": isDark ? "rgb(76, 5, 25)" : "rgb(255, 241, 242)",
          "--error-text": isDark ? "rgb(254, 205, 211)" : "rgb(153, 27, 27)",
          "--error-border": isDark ? "rgb(153, 27, 27)" : "rgb(254, 205, 211)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
