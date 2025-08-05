# JWT Authentication Issues - Solution Guide

## Common JWT Authentication Problems

### 1. Token Expired
**Error**: "JWT token has expired"
**Cause**: The browser has cached an old/expired JWT token

### 2. App ID Mismatch  
**Error**: "JWT app ID mismatch" or "Token's app property is different than app ID"
**Cause**: The stored app ID doesn't match the token's app ID

### 3. Missing Permissions
**Error**: "Insufficient permissions. You need MANAGE_APPS permission"
**Cause**: User account lacks required MANAGE_APPS permission

### 4. Signature Verification Failed
**Error**: "JWT signature verification failed"
**Cause**: JWKS mismatch or invalid signature

## Solution Steps

### Step 1: Refresh the Browser
1. **Hard refresh the page** in your browser:
   - **Chrome/Edge**: Press `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
   - **Firefox**: Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - **Safari**: Press `Cmd+Option+R` (Mac)

2. **Clear browser cache** for the app:
   - Open Developer Tools (F12)
   - Right-click on the refresh button
   - Select "Empty Cache and Hard Reload"

### Step 2: Check App Installation
1. Go to your **Saleor Dashboard**
2. Navigate to **Apps** section
3. Find the **SMTP App** 
4. Check if the app is properly installed and active

### Step 3: Check User Permissions
If you get "Insufficient permissions" error:
1. **Check user account** in Saleor Dashboard
2. **Ensure user has MANAGE_APPS permission**
3. **Contact admin** to grant proper permissions

### Step 4: Reinstall the App (if needed)
If refreshing doesn't work:
1. **Uninstall the app** from Saleor Dashboard
2. **Reinstall the app** by following the installation process
3. **Configure SMTP settings** again

### Step 5: Verify the Fix
1. Access the app from Saleor Dashboard
2. Try to create/edit SMTP configurations
3. Test webhook functionality

## Technical Details (for developers)
- The JWT token expires periodically for security reasons
- The browser should automatically refresh the token, but sometimes needs manual intervention
- The enhanced error handling now provides clearer error messages for different JWT failure scenarios

## Current Status
✅ **Enhanced JWT error handling implemented**
✅ **Detailed logging for JWT verification failures**
✅ **Specific error messages for token expiration**
✅ **Clear user guidance for resolution**

The JWT verification failure is now properly handled with user-friendly error messages.