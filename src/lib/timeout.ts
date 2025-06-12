export const timeout = (ms: number, result?: unknown) =>
  new Promise((resolve) => setTimeout(resolve, ms, result));
