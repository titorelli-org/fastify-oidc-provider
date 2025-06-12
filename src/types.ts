import type { Logger } from "pino";
import type { JwksStore } from "@titorelli-org/jwks-store";

export type OidcProviderPluginOptions = {
  origin: string;
  jwksStore: JwksStore;
  logger: Logger;
};
