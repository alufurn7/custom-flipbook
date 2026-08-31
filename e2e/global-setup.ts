import { createServer } from "vite";

export default async function globalSetup() {
  const server = await createServer({
    configFile: false,
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    server: {
      host: "127.0.0.1",
      port: 4174,
      strictPort: true
    }
  });

  await server.listen();
  return async () => {
    await server.close();
  };
}
