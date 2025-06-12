import path from "node:path";
import { equal } from "node:assert";
import fastify from "fastify";
import pino from "pino";
import { parse } from "yaml";
import { JwksStore } from "@titorelli-org/jwks-store";
import { oidcProvider, timeout } from "../src";
import { readFileSync, writeFileSync } from "node:fs";

const main = async () => {
  const logger = pino();
  const app = fastify();

  await app.register(oidcProvider, {
    origin: "http://localhost:3000",
    jwksStore: new JwksStore(path.join(process.cwd(), "./data/jwks.json")),
    logger,
  });

  await app.listen({ port: 3000, host: "0.0.0.0" }, () => {
    console.info("Server listening on ", app.server.address());
  });

  await timeout(1000);

  try {
    const resp = await fetch(
      "http://localhost:3000/.well-known/openid-configuration",
    );

    equal(resp.status, 200);
  } catch (error) {
    console.error(error);
  }

  let resp: Response;
  let clientId = "";
  let clientSecret = "";

  try {
    const clientMetadata = parse(
      readFileSync(path.join(__dirname, "oidc-test-client.yml"), "utf-8"),
    );

    resp = await fetch("http://localhost:3000/reg", {
      method: "POST",
      body: JSON.stringify(clientMetadata),
      headers: {
        "Content-Type": "application/json",
      },
    });

    equal(resp.status, 201);

    const data = await resp.json();

    Object.assign(clientMetadata, data);

    clientId = data.client_id;
    clientSecret = data.client_secret;
  } catch (error) {
    console.error(error);
    console.log(await resp.text());
  }

  try {
    resp = await fetch("http://localhost:3000/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "client_credentials",
        resource: "https://text.api.next.titorelli.ru",
        scope: "text:read",
      }),
      headers: {
        Authorization: `Basic ${btoa(clientId + ":" + clientSecret)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    equal(resp.status, 200);
  } catch (error) {
    console.error(error);
    console.log(await resp.text());
  }

  await app.close();
};

main();
