export function getConfig() {
  return {
    port: process.env.PORT ?? "3000",
    appName: process.env.APP_NAME ?? "Code Discovery Agent",
    maxModelLoop: 15,
  } as const;
}
