// Ambient module declaration to satisfy Next.js 15 + React 19 type reference
// This keeps strict typing elsewhere while unblocking builds.
// Do not export any values; just the module type to 'any'.
declare module 'react/compiler-runtime' {
  const ReactCompilerRuntime: any
  export default ReactCompilerRuntime
}