const providerEnv = {
  google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
  'microsoft-entra-id': ['MICROSOFT_ENTRA_ID_ID', 'MICROSOFT_ENTRA_ID_SECRET', 'MICROSOFT_ENTRA_ID_TENANT_ID'],
};

export function getEnabledSsoProviders() {
  return Object.entries(providerEnv)
    .filter(([, envNames]) => envNames.every((name) => Boolean(process.env[name])))
    .map(([provider]) => provider);
}
