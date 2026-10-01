# Hosting PayTrace

PayTrace can run locally for a recorded demo without a hosting account. A public customer link requires an HTTPS host with a persistent disk and one Node 24 process. A static-site host or ephemeral filesystem is unsuitable for the SQLite ledger.

## Before deploying

1. Create a hosting account you control. Any payment details and service terms must be handled by the account owner.
2. Create a service from this repository's Dockerfile. Do not make it publicly usable until credentials are configured.
3. Attach a persistent disk at `/data`, writable by container UID 1000. Use one replica.
4. Obtain the service's HTTPS hostname.
5. From the repository, generate credentials with:

```sh
node scripts/setup-hosting.mjs https://your-service.example.com
```

This creates two private files, both excluded from Git: `.env.hosting` with server configuration and `.env.hosting-password` with the workspace password. The command refuses to overwrite existing credentials. Do not record these files in the demo video.

6. Copy values from `.env.hosting` into the host's private environment settings. Set the public origin to the exact HTTPS origin without a trailing slash. The session secret must remain server-only.
7. Deploy. The container refuses to start without required authentication and database settings. The reverse proxy must preserve the actual public Host header and terminate HTTPS.
8. Open `/login`, sign in and save the receiving wallet. Test the checkout in a separate signed-out browser: it should work with its unguessable link while `/api/ledger` remains unauthorized.

This is one operator workspace, not a multi-user SaaS. Add external edge throttling and monitoring for wider public usage; the built-in budgets are per process. A password rotation also needs a new session secret to revoke existing signed sessions. Sessions otherwise expire in eight hours.

## Database and backups

Default local database: `.data/paytrace.sqlite`. Hosted path: `/data/paytrace.sqlite`.

Create a consistent backup while the process is running:

```sh
PAYTRACE_DB_PATH=/data/paytrace.sqlite node scripts/backup.mjs /data/paytrace-backup-2026-10-01.sqlite
```

The command refuses to overwrite a backup. Copy the result to private storage outside the service's disk. A complete backup contains customer references, internal notes and payment link tokens, so treat it as private.

To restore, stop the service, preserve its existing database and WAL sidecars, then point `PAYTRACE_DB_PATH` at the verified backup file and restart. Do not overwrite a live database. Re-test sign-in and checkout status after restoration.

Local data is not automatically copied to hosting. To migrate, back up the local database and upload that backup privately to the persistent volume while the hosted service is stopped.

## Release checks

- Hosted `/api/ledger` returns 401 without a valid session.
- Cross-origin write requests return 403.
- Checkout still works for a signed-out customer with the correct link.
- A fresh testnet transfer completes the actual wallet → checkout → merchant flow.
- State persists through a host restart.
- A backup can be restored into a separate test process.

No public deployment or Docker image execution has been claimed as tested until these checks are performed on the chosen host.
