# Decap CMS Setup for GitHub Pages (delphimarkets.com)

Writers edit articles at **https://delphimarkets.com/admin** using Decap CMS. No GitHub accounts required—invite them by email.

## Prerequisites

- Site deployed to GitHub Pages and accessible at https://delphimarkets.com
- GitHub repo: `Delphi-Terminal/delphi-website`

## Setup (one-time)

### 1. Create a GitHub token

DecapBridge needs a token to read/write the repo on behalf of CMS users.

1. Go to [GitHub → Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Create a **fine-grained token** (or classic token with `repo` scope)
3. Grant **Contents: Read and write** for `Delphi-Terminal/delphi-website`
4. If using Editorial Workflow later: also grant **Pull requests: Read and write**
5. Copy the token (you’ll paste it into DecapBridge)

### 2. Sign up at DecapBridge

1. Go to [decapbridge.com](https://decapbridge.com/auth/signup) and create an account
2. In the dashboard, click **Add a site**
3. Fill in:
   - **Git provider:** GitHub
   - **Git repository:** `Delphi-Terminal/delphi-website`
   - **Git access token:** paste the token from step 1
   - **Your Decap CMS login URL:** `https://delphimarkets.com/admin/index.html`
   - **Auth type:** PKCE (for Google/Microsoft login) or Classic (password only)
4. Click **Create site**

### 3. Update admin/config.yml

DecapBridge will show a generated `config.yml`. Copy **only the `backend` section** from it and replace the `backend` section in `admin/config.yml` in this repo. Keep the rest (media_folder, site_url, collections) as-is.

The backend should look roughly like:

```yaml
backend:
  name: git-gateway
  auth_type: pkce
  base_url: https://auth.decapbridge.com
  app_id: YOUR_ACTUAL_APP_ID_FROM_DECAPBRIDGE
  gateway_url: https://gateway.decapbridge.com/git-gateway/github/
  status_endpoint: https://gateway.decapbridge.com/api/v2/components.json
  branch: main
```

Replace `YOUR_ACTUAL_APP_ID_FROM_DECAPBRIDGE` with the `app_id` from DecapBridge’s generated config.

### 4. Commit and push

Commit the updated `admin/config.yml` and push to the branch that deploys to GitHub Pages. The CMS will be live at https://delphimarkets.com/admin.

### 5. Invite collaborators

In the DecapBridge dashboard, open your site → **Manage collaborators** → enter email addresses and send invites. Writers receive an email, set up their account (Google, Microsoft, or password), and can then log in at https://delphimarkets.com/admin.

## After editing

When writers save in the CMS, DecapBridge commits to GitHub. The **Build Articles** GitHub Action runs on push to `content/articles/` and regenerates HTML + `articles.json`.

## Troubleshooting

- **Login fails:** Ensure `app_id` in config matches the value from DecapBridge
- **Repo not found:** Check the GitHub token has Contents read/write for the repo
- **CMS loads but can’t save:** Verify the token hasn’t expired; create a new one if needed
