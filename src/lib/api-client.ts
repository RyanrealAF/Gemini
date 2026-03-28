/**
 * @fileOverview Forensic Content Engine API Client.
 * High-performance fetch wrapper for the Loadbearingman frontend.
 */

const BWB_PROXY = "https://bwb-edge-proxy.buildwhilebleeding.workers.dev";

export async function queryForensicAI(prompt: string, julesKey: string) {
  const response = await fetch(BWB_PROXY, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${julesKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [{ text: `Analyze this forensic data point: ${prompt}` }]
      }]
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(`Edge Error: ${errorBody.message || response.statusText}`);
  }

  const data = await response.json();
  // Handling both raw Gemini format and proxy-wrapped format
  if (data.candidates && data.candidates[0]) {
    return data.candidates[0].content.parts[0].text;
  }
  return data.text || "No forensic data returned.";
}
