/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react'

// Create the context
const ThemeContext = createContext()

// Provider component - wraps your app
export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true) // true = dark mode, false = light mode

  const toggleTheme = useCallback(() => {
    setIsDark((previous) => !previous) // flip the value
  }, [])

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Hook to use theme anywhere
export function useTheme() {
  return useContext(ThemeContext)
}