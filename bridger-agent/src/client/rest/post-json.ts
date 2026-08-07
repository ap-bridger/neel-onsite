const readErrorMessage = (payload: unknown, status: number) => {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof (payload as { error: unknown }).error === "string"
  ) {
    return (payload as { error: string }).error;
  }
  return `Request failed with status ${status}`;
};

export const postJson = async <T>(url: string, body: unknown = {}): Promise<T> => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, response.status));
  }

  return payload as T;
};
