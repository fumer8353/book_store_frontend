const apiBaseUrl = import.meta.env.VITE_API_URL;

if (!apiBaseUrl) {
  throw new Error(
    "VITE_API_URL is required. Set it in frontend/.env for local development or in Azure Static Web Apps environment variables for production."
  );
}

export { apiBaseUrl };
