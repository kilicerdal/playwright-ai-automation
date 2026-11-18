export function mutationExecutionPolicy(env: Record<string, string | undefined>) {
  if (env.CI && env.ALLOW_OFFLINE_CI_MUTATIONS !== '1')
    throw new Error('Hosted mutation execution requires explicit offline-CI authorization.');
  return env.CI
    ? {
        mode: 'offline-ci' as const,
        description:
          'Offline CI runner: loopback HTTP and disposable PostgreSQL; no live model or AWS operations. Evidence may be retained as GitHub Actions artifacts.',
      }
    : {
        mode: 'local' as const,
        description:
          'Local loopback HTTP and PostgreSQL only; no model calls, service uploads or hosted execution.',
      };
}
