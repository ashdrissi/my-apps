import { SALEOR_API_URL_HEADER, SALEOR_AUTHORIZATION_BEARER_HEADER } from "@saleor/app-sdk/headers";
import { httpBatchLink } from "@trpc/client";
import { createTRPCNext } from "@trpc/next";

import { createLogger } from "../../logger";
import { appBridgeInstance } from "../../pages/_app";
import { AppBridgeDebugger } from "../debug/app-bridge-debugger";
import type { AppRouter } from "./trpc-app-router";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return `http://localhost:${process.env.PORT ?? 3000}`;
}

const logger = createLogger("trpc-client");

export const trpcClient = createTRPCNext<AppRouter>({
  config({ ctx }) {
    return {
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            const state = appBridgeInstance?.getState() || {};
            const { token, saleorApiUrl } = state as { token: string | undefined; saleorApiUrl: string | undefined };

            if (!token || !saleorApiUrl) {
              logger.warn(
                "AppBridge not ready - missing token or saleorApiUrl",
                { 
                  hasToken: !!token, 
                  hasSaleorApiUrl: !!saleorApiUrl,
                  state: state 
                }
              );
              
              // Log detailed debugging information
              AppBridgeDebugger.logConnectionFailure(appBridgeInstance, "TRPC client headers");
              
              // Instead of throwing, return empty headers and let the server handle the missing auth
              // This allows the request to reach the server where we can provide better error messages
              return {};
            }

            logger.debug("AppBridge headers ready", {
              hasToken: !!token,
              saleorApiUrl,
              tokenPreview: token ? `${token.substring(0, 10)}...` : undefined
            });

            return {
              /**
               * Attach headers from app to client requests, so tRPC can add them to context
               */
              [SALEOR_AUTHORIZATION_BEARER_HEADER]: token,
              [SALEOR_API_URL_HEADER]: saleorApiUrl,
            };
          },
        }),
      ],
      queryClientConfig: { defaultOptions: { queries: { refetchOnWindowFocus: false } } },
    };
  },
  ssr: false,
});
