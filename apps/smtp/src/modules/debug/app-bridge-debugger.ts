import { createLogger } from "../../logger";

const logger = createLogger("AppBridgeDebugger");

export interface AppBridgeDebugInfo {
  isInitialized: boolean;
  state: {
    token?: string;
    saleorApiUrl?: string;
    ready?: boolean;
  };
  windowInfo: {
    isClient: boolean;
    hasPostMessage: boolean;
    hasParent: boolean;
    origin: string;
  };
  environment: {
    isDev: boolean;
    isLocalhost: boolean;
  };
}

export class AppBridgeDebugger {
  static debugAppBridgeState(appBridgeInstance?: any): AppBridgeDebugInfo {
    const isClient = typeof window !== "undefined";
    
    const debugInfo: AppBridgeDebugInfo = {
      isInitialized: !!appBridgeInstance,
      state: {},
      windowInfo: {
        isClient,
        hasPostMessage: isClient && typeof window.postMessage === "function",
        hasParent: isClient && window.parent !== window,
        origin: isClient ? window.location.origin : "server-side"
      },
      environment: {
        isDev: process.env.NODE_ENV === "development",
        isLocalhost: isClient ? window.location.hostname === "localhost" : false
      }
    };

    if (appBridgeInstance) {
      try {
        const state = appBridgeInstance.getState();
        debugInfo.state = {
          token: state?.token ? `${state.token.substring(0, 10)}...` : undefined,
          saleorApiUrl: state?.saleorApiUrl,
          ready: state?.ready
        };
      } catch (error) {
        logger.warn("Error getting AppBridge state", { error });
        debugInfo.state = { ready: false };
      }
    }

    logger.debug("AppBridge debug info", debugInfo);
    return debugInfo;
  }

  static async waitForAppBridgeReady(
    appBridgeInstance: any,
    timeoutMs: number = 5000
  ): Promise<boolean> {
    if (!appBridgeInstance) {
      logger.warn("No AppBridge instance provided");
      return false;
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        logger.warn("AppBridge ready timeout");
        resolve(false);
      }, timeoutMs);

      const checkReady = () => {
        const state = appBridgeInstance.getState();
        if (state?.token && state?.saleorApiUrl) {
          clearTimeout(timeout);
          logger.debug("AppBridge ready", {
            hasToken: !!state.token,
            saleorApiUrl: state.saleorApiUrl
          });
          resolve(true);
        } else {
          setTimeout(checkReady, 100);
        }
      };

      checkReady();
    });
  }

  static logConnectionFailure(appBridgeInstance?: any, context?: string): void {
    const debugInfo = this.debugAppBridgeState(appBridgeInstance);
    
    logger.error("AppBridge connection failure", {
      context,
      debugInfo,
      troubleshooting: {
        "Check 1": "Is the app running inside Saleor Dashboard iframe?",
        "Check 2": "Are CORS headers properly configured?",
        "Check 3": "Is the app properly installed in Saleor?",
        "Check 4": "Are you accessing the app directly instead of through Dashboard?",
        "Solution": "Try accessing the app through Saleor Dashboard -> Apps -> Your App"
      }
    });
  }
}