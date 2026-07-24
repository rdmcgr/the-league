# RoryMcGrath.com Root Site

This project is a clean scaffold for the root website at `rorymcgrath.com`.

## Deployment target

GitHub Actions deploys this project to:

- `public_html/`

That target is intentionally different from The League project, which deploys to:

- `public_html/hosted/the-league/`

## Files

- `index.html` - starter homepage
- `styles.css` - visual system for the scaffold
- `app.js` - lightweight JS entry point
- `.github/workflows/deploy.yml` - Bluehost deployment workflow

## Before first deployment

1. Create a separate GitHub repository for this folder.
2. Add the `BLUEHOST_SSH_KEY` secret in GitHub.
3. Verify the root site should deploy to `public_html/`.
