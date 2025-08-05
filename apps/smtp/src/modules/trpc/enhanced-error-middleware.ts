import { TRPCError } from "@trpc/server";
import { createLogger } from "../../logger";
import { AuthDebugger } from "../debug/auth-debugger";
import { middleware } from "./trpc-server";

const logger = createLogger("EnhancedErrorMiddleware");

export const enhancedErrorHandling = middleware(async ({ ctx, next, path, type }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof TRPCError && error.code === "UNAUTHORIZED") {
      // Enhanced error handling for auth failures
      const debugInfo = await AuthDebugger.debugAuthState(ctx.saleorApiUrl, {
        'authorization-bearer': ctx.token,
        'saleor-api-url': ctx.saleorApiUrl
      });

      logger.error("Enhanced auth error analysis", {
        path,
        type,
        originalError: error.message,
        debugInfo,
        context: {
          hasSaleorApiUrl: !!ctx.saleorApiUrl,
          hasToken: !!ctx.token,
          hasAppId: !!ctx.appId
        }
      });

      // Provide more helpful error messages based on the situation
      let enhancedMessage = "Authentication failed";
      const data: any = { 
        originalError: error.message,
        troubleshooting: []
      };

      if (!ctx.saleorApiUrl) {
        enhancedMessage = "Missing Saleor API URL in request headers";
        data.troubleshooting.push("Ensure you're accessing the app through Saleor Dashboard");
        data.troubleshooting.push("Check that the AppBridge is properly initialized");
      } else if (!debugInfo.authDataExists) {
        enhancedMessage = `No authentication data found for ${ctx.saleorApiUrl}`;
        data.troubleshooting.push("Install the app through Saleor Dashboard -> Apps");
        data.troubleshooting.push("Verify the Saleor API URL matches your instance");
        data.troubleshooting.push("Check if the APL file exists and is readable");
        
        if (debugInfo.aplStats.totalEntries > 0) {
          data.availableDomains = debugInfo.aplStats.entries.map(e => e.domain);
          data.troubleshooting.push(`Found auth data for: ${data.availableDomains.join(', ')}`);
        }
      } else if (!ctx.token) {
        enhancedMessage = "Missing authorization token in request headers";
        data.troubleshooting.push("Ensure you're accessing the app through Saleor Dashboard");
        data.troubleshooting.push("Check that the AppBridge connection is established");
        data.troubleshooting.push("Try refreshing the page or logging out/in to Saleor");
      }

      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: enhancedMessage,
        cause: error,
        data
      });
    }

    // Re-throw other errors as-is
    throw error;
  }
});