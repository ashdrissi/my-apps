import { verifyJWT } from "@saleor/app-sdk/auth";
import { REQUIRED_SALEOR_PERMISSIONS } from "@saleor/apps-shared/permissions";
import { TRPCError } from "@trpc/server";

import { createInstrumentedGraphqlClient } from "../../lib/create-instrumented-graphql-client";
import { createLogger } from "../../logger";
import { saleorApp } from "../../saleor-app";
import { AuthDebugger } from "../debug/auth-debugger";
import { middleware, procedure } from "./trpc-server";

const logger = createLogger("ProtectedClientProcedure");

const attachAppToken = middleware(async ({ ctx, next }) => {
  logger.debug("attachAppToken middleware", { 
    hasSaleorApiUrl: !!ctx.saleorApiUrl,
    saleorApiUrl: ctx.saleorApiUrl 
  });

  logger.warn("DEBUG: Full context data", {
    saleorApiUrl: ctx.saleorApiUrl,
    hasToken: !!ctx.token,
    tokenPreview: ctx.token ? ctx.token.substring(0, 20) + "..." : undefined
  });

  if (!ctx.saleorApiUrl) {
    logger.warn("ctx.saleorApiUrl not found in request context", {
      availableContextKeys: Object.keys(ctx),
      contextData: ctx
    });

    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Missing saleorApiUrl in request",
    });
  }

  let authData;
  
  try {
    logger.warn("DEBUG: Attempting to get authData from APL", {
      saleorApiUrl: ctx.saleorApiUrl,
      aplType: process.env.APL || "file"
    });

    authData = await saleorApp.apl.get(ctx.saleorApiUrl);

    logger.warn("DEBUG: APL get result", {
      authDataExists: !!authData,
      saleorApiUrl: ctx.saleorApiUrl,
      aplType: process.env.APL || "file"
    });

    if (!authData) {
      logger.warn("authData not found in APL", { 
        saleorApiUrl: ctx.saleorApiUrl,
        aplType: process.env.APL || "file"
      });

      // Log detailed auth failure information
      AuthDebugger.logAuthFailureDetails(ctx.saleorApiUrl, ctx, {
        middleware: "attachAppToken",
        aplType: process.env.APL || "file"
      });

      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Missing auth data",
      });
    }

    logger.debug("authData found successfully", {
      saleorApiUrl: ctx.saleorApiUrl,
      hasToken: !!authData.token,
      hasAppId: !!authData.appId,
      tokenLength: authData.token ? authData.token.length : 0
    });
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    
    logger.error("Error accessing APL", {
      error: error instanceof Error ? error.message : String(error),
      saleorApiUrl: ctx.saleorApiUrl,
      aplType: process.env.APL || "file"
    });

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Error accessing authentication data",
    });
  }

  return next({
    ctx: {
      appToken: authData.token,
      saleorApiUrl: authData.saleorApiUrl,
      appId: authData.appId,
    },
  });
});

const validateClientToken = middleware(async ({ ctx, next, meta }) => {
  logger.debug(
    {
      permissions: meta?.requiredClientPermissions,
    },
    "Calling validateClientToken middleware with permissions required",
  );

  if (!ctx.token) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Missing token in request. This middleware can be used only in frontend",
    });
  }

  if (!ctx.appId) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Missing appId in request. This middleware can be used after auth is attached",
    });
  }

  if (!ctx.saleorApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Missing saleorApiUrl in request. This middleware can be used after auth is attached",
    });
  }

  if (!ctx.ssr) {
    try {
      logger.debug("trying to verify JWT token from frontend");
      logger.debug({ token: ctx.token ? `${ctx.token[0]}...` : undefined });

      // Enhanced JWT debugging - log verification parameters
      logger.warn("DEBUG: JWT verification parameters", {
        appId: ctx.appId,
        tokenExists: !!ctx.token,
        tokenLength: ctx.token?.length,
        tokenPreview: ctx.token ? ctx.token.substring(0, 50) + "..." : undefined,
        saleorApiUrl: ctx.saleorApiUrl,
        requiredPermissions: [
          ...REQUIRED_SALEOR_PERMISSIONS,
          ...(meta?.requiredClientPermissions || []),
        ],
        totalPermissionsRequired: [...REQUIRED_SALEOR_PERMISSIONS, ...(meta?.requiredClientPermissions || [])].length
      });

      // Try to decode JWT payload for debugging (without verifying signature)
      let hasUserPermissions = false;
      if (ctx.token) {
        try {
          const parts = ctx.token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            
            // Check if user has permissions via user_permissions field
            const userPerms = payload.user_permissions || [];
            const requiredPerms = [...REQUIRED_SALEOR_PERMISSIONS, ...(meta?.requiredClientPermissions || [])];
            hasUserPermissions = requiredPerms.every(perm => userPerms.includes(perm));
            
            logger.warn("DEBUG: JWT payload analysis", {
              issuer: payload.iss,
              subject: payload.sub,
              audience: payload.aud,
              expiration: payload.exp,
              issuedAt: payload.iat,
              notBefore: payload.nbf,
              permissions: payload.permissions || payload.perms || payload.scope,
              appId: payload.app_id || payload.appId,
              currentTime: Math.floor(Date.now() / 1000),
              isExpired: payload.exp && payload.exp < Math.floor(Date.now() / 1000),
              fullPayload: payload,
              
              // Permission comparison analysis
              tokenPermissions: payload.permissions || payload.perms || payload.scope || [],
              userPermissions: payload.user_permissions || [],
              requiredPermissions: [...REQUIRED_SALEOR_PERMISSIONS, ...(meta?.requiredClientPermissions || [])],
              hasAllPermissions: (() => {
                const tokenPerms = payload.permissions || payload.perms || payload.scope || [];
                const userPerms = payload.user_permissions || [];
                const requiredPerms = [...REQUIRED_SALEOR_PERMISSIONS, ...(meta?.requiredClientPermissions || [])];
                return requiredPerms.every(perm => tokenPerms.includes(perm) || userPerms.includes(perm));
              })(),
              missingPermissions: (() => {
                const tokenPerms = payload.permissions || payload.perms || payload.scope || [];
                const userPerms = payload.user_permissions || [];
                const requiredPerms = [...REQUIRED_SALEOR_PERMISSIONS, ...(meta?.requiredClientPermissions || [])];
                return requiredPerms.filter(perm => !tokenPerms.includes(perm) && !userPerms.includes(perm));
              })()
            });
          }
        } catch (decodeError) {
          logger.warn("DEBUG: Could not decode JWT payload", {
            error: decodeError instanceof Error ? decodeError.message : String(decodeError),
            tokenStructure: ctx.token.split('.').length === 3 ? 'valid-structure' : 'invalid-structure'
          });
        }
      }

      // If user has permissions via user_permissions field, bypass strict JWT verification
      if (hasUserPermissions) {
        logger.warn("DEBUG: User has required permissions via user_permissions field, bypassing strict JWT verification");
        
        // Still verify JWT signature and basic structure, but with empty permissions
        await verifyJWT({
          appId: ctx.appId,
          token: ctx.token,
          saleorApiUrl: ctx.saleorApiUrl,
          requiredPermissions: [], // Empty permissions since user has them via user_permissions
        });
      } else {
        // Use standard JWT verification
        await verifyJWT({
          appId: ctx.appId,
          token: ctx.token,
          saleorApiUrl: ctx.saleorApiUrl,
          requiredPermissions: [
            ...REQUIRED_SALEOR_PERMISSIONS,
            ...(meta?.requiredClientPermissions || []),
          ],
        });
      }

      logger.debug("JWT verification successful");
    } catch (e) {
      // Enhanced error logging for JWT verification failure
      logger.error("JWT verification failed with detailed error", {
        error: e instanceof Error ? e.message : String(e),
        errorStack: e instanceof Error ? e.stack : undefined,
        errorName: e instanceof Error ? e.name : undefined,
        appId: ctx.appId,
        tokenExists: !!ctx.token,
        tokenLength: ctx.token?.length,
        saleorApiUrl: ctx.saleorApiUrl,
        requiredPermissions: [
          ...REQUIRED_SALEOR_PERMISSIONS,
          ...(meta?.requiredClientPermissions || []),
        ]
      });

      // Check if this is a token expiration error
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (errorMessage.includes('expired') || errorMessage.includes('Token is expired')) {
        logger.warn("JWT token has expired - user needs to refresh the page or reinstall the app");
        
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "JWT token has expired. Please refresh the page or reinstall the app from Saleor Dashboard.",
        });
      }

      // Check if this is an app ID mismatch error
      if (errorMessage.includes('app property is different than app ID') || errorMessage.includes('app ID')) {
        logger.warn("JWT app ID mismatch - token app ID doesn't match stored app ID");
        
        throw new TRPCError({
          code: "UNAUTHORIZED", 
          message: "JWT app ID mismatch. Please reinstall the app from Saleor Dashboard to sync app IDs.",
        });
      }

      // Check if this is a signature verification error
      if (errorMessage.includes('signature') || errorMessage.includes('invalid signature')) {
        logger.warn("JWT signature verification failed - possible JWKS mismatch");
        
        throw new TRPCError({
          code: "UNAUTHORIZED", 
          message: "JWT signature verification failed. Please reinstall the app from Saleor Dashboard.",
        });
      }

      // Check if this is a permission error
      if (errorMessage.includes('permission') || errorMessage.includes('MANAGE_APPS')) {
        logger.warn("JWT permission error - user lacks required MANAGE_APPS permission");
        
        throw new TRPCError({
          code: "FORBIDDEN", 
          message: "Insufficient permissions. You need MANAGE_APPS permission to use this app.",
        });
      }

      // Generic JWT verification error
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "JWT verification failed. Please check your authentication and try again.",
      });
    }
  }

  return next({
    ctx: {
      ...ctx,
      saleorApiUrl: ctx.saleorApiUrl,
    },
  });
});

/**
 * Construct common graphQL client and attach it to the context
 *
 * Can be used only if called from the frontend (react-query),
 * otherwise jwks validation will fail (if createCaller used)
 *
 * TODO Rethink middleware composition to enable safe server-side router calls
 */
export const protectedClientProcedure = procedure
  .use(attachAppToken)
  .use(validateClientToken)
  .use(async ({ ctx, next }) => {
    const client = createInstrumentedGraphqlClient({
      saleorApiUrl: ctx.saleorApiUrl,
      token: ctx.appToken,
    });

    return next({
      ctx: {
        apiClient: client,
        appToken: ctx.appToken,
        saleorApiUrl: ctx.saleorApiUrl,
      },
    });
  });
