# B2B SSO Configuration Guide

This guide explains how to configure Single Sign-On (SSO) for your organization's tenant on the LMS platform.

## Overview

SSO allows your team members to sign in using your organization's identity provider (IdP), eliminating the need for separate passwords and enabling centralized access control.

### Supported Identity Providers

- **Google Workspace** - For organizations using Google as their primary identity provider
- **Microsoft Azure AD** - For Microsoft 365 / Azure organizations
- **Generic OIDC** - Okta, Auth0, Keycloak, OneLogin, Ping Identity, and any OIDC-compliant provider

## Prerequisites

Before configuring SSO, ensure you have:

1. **Admin access** to your identity provider (IdP)
2. **Tenant Admin role** on the LMS platform
3. The **redirect URI** for OAuth callbacks: `https://your-lms-domain.com/api/v1/auth/sso/callback`

---

## Google Workspace Setup

### Step 1: Create OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select or create a project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. Select **Web application** as the application type
6. Add a name (e.g., "LMS Platform SSO")

### Step 2: Configure Authorized Redirect URIs

Add the following redirect URI:
```
https://your-lms-domain.com/api/v1/auth/sso/callback
```

### Step 3: Copy Credentials

After creating the OAuth client, copy:
- **Client ID** (ends with `.apps.googleusercontent.com`)
- **Client Secret**

### Step 4: Configure in LMS

1. Go to **Admin** > **SSO Configuration**
2. Select **Google Workspace** as the provider
3. Enter the Client ID and Client Secret
4. Click **Test Configuration** to verify
5. Click **Save & Enable SSO**

### Restricting to Your Domain

To ensure only users from your Google Workspace domain can sign in:

1. In Google Admin Console, go to **Security** > **API Controls**
2. Under **App Access Control**, find your OAuth app
3. Set it to **Limited** or **Internal only**

---

## Microsoft Azure AD Setup

### Step 1: Register an Application

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Enter a name (e.g., "LMS Platform SSO")
5. Select the appropriate **Supported account types**:
   - **Single tenant** - Only users in your organization
   - **Multitenant** - Users from any Azure AD organization

### Step 2: Configure Redirect URI

1. Under **Redirect URIs**, add:
   ```
   https://your-lms-domain.com/api/v1/auth/sso/callback
   ```
2. Select **Web** as the platform

### Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and select an expiration
4. **Copy the secret value immediately** (it won't be shown again)

### Step 4: Copy Application Details

From the **Overview** page, copy:
- **Application (client) ID**
- **Directory (tenant) ID**

### Step 5: Configure in LMS

1. Go to **Admin** > **SSO Configuration**
2. Select **Microsoft Azure AD** as the provider
3. Enter:
   - Client ID (Application ID)
   - Client Secret
   - Tenant ID (Directory ID)
4. Click **Test Configuration** to verify
5. Click **Save & Enable SSO**

### API Permissions (Optional)

For basic SSO, no additional permissions are needed. Azure AD provides user info through the ID token by default.

---

## Okta Setup

### Step 1: Create an OIDC Application

1. Log in to your Okta Admin Console
2. Go to **Applications** > **Applications**
3. Click **Create App Integration**
4. Select:
   - Sign-in method: **OIDC - OpenID Connect**
   - Application type: **Web Application**
5. Click **Next**

### Step 2: Configure Settings

1. App integration name: "LMS Platform"
2. Grant type: **Authorization Code**
3. Sign-in redirect URIs:
   ```
   https://your-lms-domain.com/api/v1/auth/sso/callback
   ```
4. Controlled access: Select who can access (Everyone, specific groups, etc.)

### Step 3: Copy Credentials

After creating the application:
- **Client ID**
- **Client Secret** (click to reveal)
- **Okta Domain** (e.g., `https://your-org.okta.com`)

### Step 4: Configure in LMS

1. Go to **Admin** > **SSO Configuration**
2. Select **OIDC Provider** as the provider
3. Enter:
   - Client ID
   - Client Secret
   - Issuer URL: `https://your-org.okta.com` (without trailing slash)
4. Click **Test Configuration** to verify
5. Click **Save & Enable SSO**

---

## Auth0 Setup

### Step 1: Create an Application

1. Log in to your Auth0 Dashboard
2. Go to **Applications** > **Applications**
3. Click **Create Application**
4. Choose **Regular Web Applications**
5. Click **Create**

### Step 2: Configure Settings

In the application settings:

1. **Allowed Callback URLs**:
   ```
   https://your-lms-domain.com/api/v1/auth/sso/callback
   ```

2. **Allowed Web Origins** (optional):
   ```
   https://your-lms-domain.com
   ```

3. Save changes

### Step 3: Copy Credentials

From the **Settings** tab:
- **Domain** (e.g., `your-tenant.auth0.com`)
- **Client ID**
- **Client Secret**

### Step 4: Configure in LMS

1. Go to **Admin** > **SSO Configuration**
2. Select **OIDC Provider** as the provider
3. Enter:
   - Client ID
   - Client Secret
   - Issuer URL: `https://your-tenant.auth0.com` (your Auth0 domain)
4. Click **Test Configuration** to verify
5. Click **Save & Enable SSO**

---

## Keycloak Setup

### Step 1: Create a Client

1. Log in to your Keycloak Admin Console
2. Select your realm (or create one)
3. Go to **Clients** > **Create**
4. Enter:
   - Client ID: `lms-platform`
   - Client Protocol: `openid-connect`
   - Root URL: `https://your-lms-domain.com`

### Step 2: Configure Client Settings

1. Access Type: **confidential**
2. Valid Redirect URIs:
   ```
   https://your-lms-domain.com/api/v1/auth/sso/callback
   ```
3. Web Origins: `+` (or your specific domain)
4. Save

### Step 3: Get Credentials

1. Go to the **Credentials** tab
2. Copy the **Secret**

### Step 4: Configure in LMS

1. Go to **Admin** > **SSO Configuration**
2. Select **OIDC Provider** as the provider
3. Enter:
   - Client ID: `lms-platform`
   - Client Secret: (from Credentials tab)
   - Issuer URL: `https://your-keycloak-domain.com/realms/your-realm`
4. Click **Test Configuration** to verify
5. Click **Save & Enable SSO**

---

## Testing Your Configuration

Before rolling out SSO to your team:

1. **Test Configuration** - Use the test button to verify OIDC discovery works
2. **Test Login** - Open the tenant login URL in an incognito window
3. **Verify User Creation** - Confirm users are created with correct details
4. **Check Seat Allocation** - Ensure seats are properly allocated

### Tenant Login URL

After enabling SSO, share this URL with your team:
```
https://your-lms-domain.com/login?tenant=your-tenant-slug
```

---

## Troubleshooting

### "OIDC Discovery Failed"

- Verify the Issuer URL is correct and accessible
- Ensure the URL doesn't have a trailing slash
- Check if your IdP requires specific network access

### "Invalid Client Credentials"

- Double-check the Client ID and Client Secret
- For Azure AD, ensure you copied the secret value (not the ID)
- Regenerate the secret if needed

### "Redirect URI Mismatch"

- Ensure the redirect URI in your IdP exactly matches:
  ```
  https://your-lms-domain.com/api/v1/auth/sso/callback
  ```
- Check for trailing slashes or protocol mismatches (http vs https)

### "No Email in Token"

- Ensure your IdP is configured to include the email claim
- For Okta/Auth0, verify the `email` scope is requested
- For Azure AD, check API permissions

### "User Already Exists"

This is expected behavior! If a user previously registered with the same email, their account will be linked to SSO automatically.

---

## Security Considerations

### Recommendations

1. **Use HTTPS** - Always use HTTPS for your LMS domain
2. **Restrict Access** - Configure your IdP to only allow authorized users
3. **Monitor Logins** - Review SSO login activity regularly
4. **Rotate Secrets** - Periodically rotate client secrets

### Data Flow

1. User clicks "Sign in with SSO"
2. User is redirected to your IdP
3. User authenticates with your IdP
4. IdP redirects back with an authorization code
5. LMS exchanges the code for tokens
6. LMS creates/links the user account
7. User is signed in

No passwords are ever stored or transmitted to the LMS platform.

---

## FAQ

**Q: Can users still sign in with email/password?**
A: When accessing through the tenant SSO URL (`/login?tenant=slug`), only SSO is available. Users can still access the regular login page if needed.

**Q: What happens when a user leaves the organization?**
A: Disable them in your IdP. They won't be able to sign in via SSO. Optionally, suspend their account in the LMS admin panel.

**Q: Can I use multiple IdPs?**
A: Currently, each tenant can configure one IdP. Contact support for multi-IdP requirements.

**Q: Is SCIM provisioning supported?**
A: Not currently. Users are provisioned on first login (JIT provisioning).

---

## Support

If you encounter issues not covered in this guide:

1. Check the **Test Configuration** results for specific errors
2. Review your IdP's OAuth/OIDC logs
3. Contact support with:
   - Your tenant slug
   - The IdP type you're configuring
   - Any error messages received
