/**
 * Demo credentials for the optional Photon AI back-ends.
 *
 * Mirrors `examples/angular/src/environments/environment.ts`. In a real
 * application these would come from `import.meta.env` (Vite) rather than being
 * committed — the values below exist only so the example runs out of the box.
 */
export const environment = {
  groqApiKey: import.meta.env?.VITE_GROQ_API_KEY ?? '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',
  gemeniApiKey: import.meta.env?.VITE_GEMINI_API_KEY ?? 'AQ.Ab8RN6LMLsbGXP5FwL9kyQhA4B3SaOw0i821V_6PEaPguZRrKA',
};

export default environment;
