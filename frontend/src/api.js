const BASE_URL = "/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("sp_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    localStorage.removeItem("sp_token");
    window.location.href = "/login";
    return;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body.errors) {
      const err = new Error("Validation failed");
      err.validationErrors = body.errors;
      throw err;
    }
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  return res.json();
}

export const api = {
  login: (data) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/auth/me"),
  changePassword: (data) =>
    request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getInventory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/inventory${q ? "?" + q : ""}`);
  },
  getInventoryItem: (id) => request(`/inventory/${id}`),
  createInventoryItem: (data) =>
    request("/inventory", { method: "POST", body: JSON.stringify(data) }),
  updateInventoryItem: (id, data) =>
    request(`/inventory/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteInventoryItem: (id) =>
    request(`/inventory/${id}`, { method: "DELETE" }),

  getTransactions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/transactions${q ? "?" + q : ""}`);
  },
  createTransaction: (data) =>
    request("/transactions", { method: "POST", body: JSON.stringify(data) }),
  updateTransaction: (id, data) =>
    request(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteTransaction: (id) =>
    request(`/transactions/${id}`, { method: "DELETE" }),

  getDashboard: () => request("/dashboard"),
};
