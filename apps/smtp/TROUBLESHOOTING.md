# SMTP App Authentication Troubleshooting Guide

## Common Authentication Error: "Missing auth data"

### Understanding the Error

The "Missing auth data" error (TRPC error code -32001, HTTP 401) occurs when the SMTP app cannot find valid authentication data for the provided Saleor API URL. This typically happens during the initial setup or when there's a mismatch between the expected and actual Saleor instance URL.

### Quick Diagnosis

Run the included diagnostic scripts:

```bash
# Check overall setup
node setup-verification.js

# Check authentication details  
node debug-auth.js

# Test debug endpoint (when app is running)
curl -H "Saleor-Api-Url: http://localhost:8000/graphql/" http://localhost:3000/api/debug/auth
```

### Common Causes and Solutions

#### 1. App Not Installed
**Symptoms:** APL file (.saleor-app-auth.json) doesn't exist
**Solution:** Install the app through Saleor Dashboard
1. Go to Saleor Dashboard → Apps → Install External App
2. Enter your app URL (e.g., `http://localhost:3000`)
3. Follow the installation flow

#### 2. URL Mismatch
**Symptoms:** APL file exists but contains different saleorApiUrl
**Current APL URL:** `http://localhost:8000/graphql/`
**Solution:** Ensure your Saleor instance URL matches exactly
- Check Saleor is running on correct port (8000)
- Verify the URL in browser matches APL file
- Use exact URL format including trailing slash

#### 3. AppBridge Connection Issues
**Symptoms:** Missing headers in TRPC requests
**Solution:** Access app through Saleor Dashboard, not directly
- ❌ Direct access: `http://localhost:3000`
- ✅ Through Dashboard: Saleor Dashboard → Apps → SMTP App

#### 4. Development Environment Issues
**Symptoms:** Localhost connectivity problems
**Solutions:**
- Ensure both Saleor and app are running
- Check ports: Saleor (8000), App (3000)
- Verify Docker containers are up (if using Docker)
- Check firewall/security software

### Debugging Steps

1. **Check Environment**
   ```bash
   node setup-verification.js
   ```

2. **Verify APL Data**
   ```bash
   node debug-auth.js
   ```

3. **Test Authentication Endpoint**
   ```bash
   # Replace URL with your actual Saleor URL
   curl -H "Saleor-Api-Url: http://localhost:8000/graphql/" \
        http://localhost:3000/api/debug/auth
   ```

4. **Check Browser Console**
   - Open Saleor Dashboard
   - Navigate to Apps → SMTP App
   - Check browser dev tools for AppBridge errors

5. **Review Server Logs**
   - Enable debug logging: `APP_LOG_LEVEL=debug` in .env
   - Restart the app
   - Check console output for detailed authentication logs

### Advanced Debugging

#### Enable Detailed Logging
Add to `.env`:
```
APP_LOG_LEVEL=debug
```

#### Check APL Health
The app now includes APL health checks that verify:
- Read/write permissions
- Data integrity
- Connection status

#### AppBridge State
Monitor AppBridge connection state in browser console:
```javascript
// In browser dev tools
window.appBridge?.getState()
```

### Prevention

1. **Consistent URLs**: Always use the same Saleor URL format
2. **Proper Installation**: Install through Dashboard, not manually
3. **Environment Checks**: Run verification script before development
4. **Regular Health Checks**: Use `/api/debug/auth` endpoint

### Getting Help

If you're still experiencing issues:

1. Run all diagnostic scripts and collect output
2. Check browser console for errors
3. Review server logs with debug level enabled
4. Verify Saleor and app versions compatibility

### Files Modified for Better Debugging

- `src/modules/trpc/protected-client-procedure.ts` - Enhanced error logging
- `src/modules/trpc/trpc-client.ts` - Improved AppBridge error handling
- `src/modules/debug/auth-debugger.ts` - Authentication debugging utilities
- `src/modules/debug/app-bridge-debugger.ts` - AppBridge state debugging
- `src/pages/api/debug/auth.ts` - Debug endpoint for authentication state