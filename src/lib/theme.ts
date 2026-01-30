/**
 * Theme utility functions for handling dark/light mode
 */

/**
 * Initialize theme based on saved preference or system preference
 */
export function initializeTheme() {
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

/**
 * Set theme to dark mode
 */
export function setDarkTheme() {
  document.documentElement.classList.add("dark");
  localStorage.setItem("theme", "dark");
}

/**
 * Set theme to light mode
 */
export function setLightTheme() {
  document.documentElement.classList.remove("dark");
  localStorage.setItem("theme", "light");
}

/**
 * Toggle between dark and light theme
 */
export function toggleTheme() {
  const isCurrentlyDark = document.documentElement.classList.contains("dark");
  
  if (isCurrentlyDark) {
    setLightTheme();
  } else {
    setDarkTheme();
  }
}

/**
 * Get current theme
 */
export function getCurrentTheme(): "dark" | "light" {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}