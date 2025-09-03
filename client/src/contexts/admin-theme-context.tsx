import React, { createContext, useContext, useState, useEffect } from "react";

interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // Get saved theme from localStorage or default to dark
    const savedTheme = localStorage.getItem("adminTheme");
    return (savedTheme as "light" | "dark") || "dark";
  });

  useEffect(() => {
    // Apply theme to document root
    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("admin-light");
      root.classList.remove("admin-dark");
    } else {
      root.classList.add("admin-dark");
      root.classList.remove("admin-light");
    }
    
    // Save theme preference
    localStorage.setItem("adminTheme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useAdminTheme must be used within a AdminThemeProvider");
  }
  return context;
}