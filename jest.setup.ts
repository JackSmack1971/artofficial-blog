// Jest setup file for ARTOfficial Intelligence Academy
import '@testing-library/jest-dom'

// Polyfills or global test helpers can be added here as needed.
// Example: mock matchMedia for Next.js components relying on it
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  })
})