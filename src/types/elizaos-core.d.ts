/* eslint-disable no-var, @typescript-eslint/no-explicit-any */
// Declares the ElizaOS core SDK module for TypeScript

declare module '@elizaos/core' {
  export type Plugin = any;
}

declare module 'process' {
  var process: any;
  export default process;
} 