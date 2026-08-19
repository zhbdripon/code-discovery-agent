export function getConfig() {
  return {
    port: process.env.PORT ?? '3000',
    appName: process.env.APP_NAME ?? 'ts-standalone-project'
  } as const;
}
