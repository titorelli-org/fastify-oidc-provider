import path from "node:path";
import { fastifyPlugin } from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import fastifyMiddie from "@fastify/middie";
import * as uuid from "uuid";
import type { OidcProviderPluginOptions } from "./types";
import {
  KnexDatabase,
  RepositoryFactory,
} from "@titorelli-org/oidc-knex-adapter";

const oidcProvider$: FastifyPluginAsync<OidcProviderPluginOptions> = async (
  fastify,
  { origin, jwksStore, logger },
) => {
  const { Provider } = await import("oidc-provider");
  const issuer = new URL("/oidc", origin).toString();
  const issuerNamespace = uuid.v5(
    issuer,
    "5ec17d33-2d73-4a1c-9bac-88a4e527f273",
  );

  await fastify.register(fastifyMiddie);

  const oidcDatabase = new KnexDatabase({
    dbFilename: path.join(process.cwd(), "data/oidc.sqlite3"),
    logger,
  });
  const oidcRepositoryFactory = new RepositoryFactory(oidcDatabase, logger);

  const provider = new Provider(issuer, {
    adapter: (name) => oidcRepositoryFactory.create(name as any),
    features: {
      devInteractions: { enabled: false },
      clientCredentials: { enabled: true },
      introspection: { enabled: true },
      jwtIntrospection: { enabled: true },
      registration: {
        enabled: true,
        initialAccessToken: false,
        idFactory(ctx) {
          const { client_name } = ctx.oidc.body as { client_name: string };

          if (!client_name) throw new Error("client_name is required");

          return `${client_name}-${uuid.v5(client_name, issuerNamespace)}`;
        },
      },
      registrationManagement: { enabled: true },
      resourceIndicators: {
        enabled: true,
        getResourceServerInfo(_ctx, resourceIndicator, client) {
          return {
            audience: resourceIndicator,
            scope: "text:read",
            accessTokenFormat: "jwt",
          };
        },
      },
    },
    jwks: await jwksStore.get(),
  });

  fastify.use("/oidc", provider.callback());
};

export const oidcProvider = fastifyPlugin(oidcProvider$, {
  name: "oidc-provider",
});

export * from "./lib";
