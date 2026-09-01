export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export async function fetchStatus() {
  const res = await fetch(`${API_BASE_URL}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json();
}

export async function fetchTasks() {
  const res = await fetch(`${API_BASE_URL}/tasks`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export async function fetchRuns() {
  const res = await fetch(`${API_BASE_URL}/runs`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch runs");
  return res.json();
}

export async function fetchProfiles() {
  const res = await fetch(`${API_BASE_URL}/profiles`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch profiles");
  return res.json();
}

export async function fetchTaskById(id: string) {
  const res = await fetch(`${API_BASE_URL}/tasks/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch task");
  return res.json();
}

export async function fetchRunById(id: string) {
  const res = await fetch(`${API_BASE_URL}/runs/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch run");
  return res.json();
}

export async function fetchReplay(id: string) {
  const res = await fetch(`${API_BASE_URL}/runs/${id}/replay`, { cache: 'no-store' });
  if (!res.ok) throw new Error("Failed to fetch replay");
  return res.json();
}
