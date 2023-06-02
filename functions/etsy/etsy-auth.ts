import randomstring from "randomstring";
import base64url from "base64url";
import crypto from "crypto";
import http from "http";
import express from "express";
import axios, { AxiosError } from "axios";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { EtsyConfig } from "../../config";
import { resolve } from "path";
import { getShopId } from "./etsy-api";

const scope = ["listings_w", "listings_d", "listings_r", "shops_w", "shops_r"];

const getCodeVerifierChallenge = () => {
  const codeVerifier = randomstring.generate(128);
  const base64Digest = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64");
  const codeChallenge = base64url.fromBase64(base64Digest);
  return [codeVerifier, codeChallenge];
};

const getEtsyAuthorizationUrl = (
  credentials: EtsyCredentials,
  state: string,
  codeChallenge: string
) => {
  const params = Object.entries({
    response_type: "code",
    redirect_uri: credentials.redirect_uri,
    scope: scope.join(" "),
    client_id: credentials.client_id,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  })
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  const url = `https://www.etsy.com/oauth/connect?${params}`;
  return url;
};

export type EtsyToken = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
};

const requestToken = async (
  credentials: EtsyCredentials,
  authorizationCode: string,
  codeVerifier: string
): Promise<EtsyToken> => {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
    "x-api-key": credentials.client_id,
  };

  const params = Object.entries({
    grant_type: "authorization_code",
    client_id: credentials.client_id,
    redirect_uri: credentials.redirect_uri,
    code: authorizationCode,
    code_verifier: codeVerifier,
  })
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  const response = await axios.post(
    "https://api.etsy.com/v3/public/oauth/token?" + params,
    {
      grant_type: "authorization_code",
      client_id: credentials.client_id,
      redirect_uri: credentials.redirect_uri,
      code: authorizationCode,
      code_verifier: codeVerifier,
    },
    {
      headers,
    }
  );
  const token: EtsyToken = response.data;
  return token;
};

const refreshToken = async (
  credentials: EtsyCredentials,
  token: EtsyToken
): Promise<EtsyToken> => {
  const response = await axios.post(
    "https://api.etsy.com/v3/public/oauth/token",
    {
      grant_type: "refresh_token",
      client_id: credentials.client_id,
      refresh_token: token.refresh_token,
    },
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  const refreshed: EtsyToken = response.data;
  return refreshed;
};

const waitForTokenCallback = async (
  credentials: EtsyCredentials,
  state: string,
  codeVerifier: string
): Promise<EtsyToken> => {
  const app = express();
  const httpServer = http.createServer(app);

  app.use(express.json());

  const authLandingHtml = `
  <!DOCTYPE html>
<html>
  <body>
    <a
      href="https://www.etsy.com/oauth/connect?response_type=code&redirect_uri=http://localhost:3003/oauth/redirect&scope=email_r&client_id=1aa2bb33c44d55eeeeee6fff&state=superstring&code_challenge=DSWlW2Abh-cf8CeLL8-g3hQ2WQyYdKyiu83u_s7nRhI&code_challenge_method=S256"
    >
      Authenticate with Etsy
    </a>
  </body>
</html>
  `;

  await new Promise<void>((resolve) => httpServer.listen(3333, resolve));
  const token: EtsyToken = await new Promise((resolve, reject) => {
    app.get("/callback", async (req, res) => {
      try {
        if (req.query.state !== state)
          throw new Error("FAILED! State does not match!");
        const { code } = req.query;

        const token = await requestToken(
          credentials,
          code as string,
          codeVerifier
        );

        res.status(200).send("Authorized!");
        resolve(token);
      } catch (err) {
        reject(err);
      }
    });
  });

  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  return token;
};

const authorize = async (credentials: EtsyCredentials): Promise<EtsyToken> => {
  const [codeVerifier, codeChallenge] = getCodeVerifierChallenge();
  const state = randomstring.generate(16);

  const url = getEtsyAuthorizationUrl(credentials, state, codeChallenge);
  console.log(`Please auhtorize app to Etsy API: ${url}`);

  const token = await waitForTokenCallback(credentials, state, codeVerifier);

  console.log(`Auhtorized`);
  return token;
};

const getStoredToken = async (
  credentials: EtsyCredentials,
  tokenFile: string
): Promise<EtsyToken | undefined> => {
  try {
    if (!existsSync(tokenFile)) return;
    const stored: EtsyToken = JSON.parse(readFileSync(tokenFile, "utf-8"));
    return await refreshToken(credentials, stored);
  } catch (err) {
    console.log(err);
    return;
  }
};

const getToken = async (
  credentials: EtsyCredentials,
  tokenFile: string
): Promise<EtsyToken> => {
  const stored = await getStoredToken(credentials, tokenFile);
  if (stored) return stored;
  return authorize(credentials);
};

export type EtsyCredentials = {
  shop_name: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
};

export class EtsySession {
  private credentials: EtsyCredentials;
  private tokenFile: string;
  private token: EtsyToken | undefined;
  private shopId: number | undefined;
  constructor({ etsyCredentialsFile, etsyTokenFile }: EtsyConfig) {
    this.credentials = JSON.parse(readFileSync(etsyCredentialsFile, "utf-8"));
    this.tokenFile = etsyTokenFile;
  }

  private getShopId = async (): Promise<number> => {
    if (this.shopId != null) return this.shopId;
    const shopId = await getShopId(this.credentials);
    this.shopId = shopId;
    return this.shopId;
  };

  private authenticate = async (): Promise<EtsyToken> => {
    if (this.token) return this.token;
    const token = await getToken(this.credentials, this.tokenFile);
    writeFileSync(this.tokenFile, JSON.stringify(token));
    this.token = token;
    return this.token;
  };

  private init = async (): Promise<[EtsyToken, number]> => {
    return [await this.authenticate(), await this.getShopId()];
  };

  request = async <T>(
    callback: (params: {
      credentials: EtsyCredentials;
      token: EtsyToken;
      shopId: number;
    }) => Promise<T>
  ): Promise<T> => {
    const [token, shopId] = await this.init();
    try {
      const result = await callback({
        credentials: this.credentials,
        token,
        shopId,
      });
      return result;
    } catch (err) {
      console.log((err as AxiosError).response);
      throw err;
    }
  };
}
