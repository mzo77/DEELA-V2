# DEELA AI Command Center — Owner 0.9.10

This implementation adds an owner-only **PentAGI** command center to the existing DEELA 0.9.10 Android app and the currently deployed DEELA Control Center website. It intentionally does **not** replace or publish the subscriber APK.

## What is live
- Supabase Edge Function `deela-owner-agent` exists and requires an authenticated owner JWT.
- Supabase `deela-control` owner page has a new **مركز الذكاء 🤖** tab.
- The Android owner interface adds the matching tab, an Arabic command field, an optional folder-reference field, scope consent, connectivity check, and PentAGI flow list.
- The old **القوة الغاشمة ⚡** toolkit, file scanners, 16 commands, voice input, and Arabic OpenCode agent remain untouched and accessible.
- GitHub Actions debug verification workflow: `.github/workflows/deela-pentagi-review.yml`.

## Runtime not yet connected
**PentAGI itself does not run on Supabase Edge Functions**. A separate PentAGI instance with Docker Compose and a configured language-model provider must be running. Until then, the web and Android Execute buttons correctly show disabled/unconfigured, and no work is silently queued.

Use the upstream setup guide: <https://pentagi.com/docs/getting-started/quickstart/>.
The upstream minimum is Docker Engine 20+ with Compose, 2 vCPU, 4 GB RAM and 25 GB disk. Strong local Ollama models require more resources. Self-hosting with Ollama does not require an OpenAI API subscription, but the machine, network and power are the owner's responsibility.

## Set up without putting credentials in APK
1. Install PentAGI through the official installer on a machine you control and configure a supported Ollama model. Validate basic operation in PentAGI itself before connecting DEELA.
2. Place the PentAGI API behind trusted HTTPS authentication and a correctly configured reverse proxy/VPN gateway. Do not put its credentials in browser or Android source.
3. Create a PentAGI API bearer token in its Settings → API Tokens screen.
4. Set **Supabase Edge Function Secrets** for the `rxlynynjetajtsqlhkrq` project:
   - `DEELA_PENTAGI_URL`: trusted HTTPS origin of your PentAGI instance (no trailing slash)
   - `DEELA_PENTAGI_TOKEN`: the restricted PentAGI API bearer token
   - `DEELA_PENTAGI_SCOPE_URL`: your own explicitly authorized HTTPS test target
   - `DEELA_PENTAGI_PROVIDER` (optional): configured PentAGI model provider name, defaults to `ollama`
5. In the owner's page or APK, open **مركز الذكاء 🤖** and select **فحص الاتصال**. The button is enabled only after connection and explicit user confirmation.
6. The `/pentagi/execute` endpoint creates a PentAGI flow using the documented GraphQL `createFlow` mutation; it does not claim analysis is complete. The `/pentagi/flows` endpoint lists results.

## Owner API
With `Authorization: Bearer <owner-access-token>`:
- `GET /functions/v1/deela-owner-agent`: free Arabic GitHub coding agent/manual fallback status
- `POST /functions/v1/deela-owner-agent`: manual fallback to preexisting owner-authorized GitHub Actions workflow; does not pretend execution succeeded
- `GET /functions/v1/deela-owner-agent/pentagi/status`: PentAGI config and scope status
- `POST /functions/v1/deela-owner-agent/pentagi/execute`: authorized flow request `{prompt,folder,confirm_scope:true}`
- `GET /functions/v1/deela-owner-agent/pentagi/flows`: PentAGI task list

Folders entered in the UI are **labels only**; the client never grants remote filesystem access or uploads the folder. Analysis of local APK/ZIP/game files remains inside the original DEELA toolkit. External targets and active testing must be explicitly authorized.

## Build / install integrity
The new code is a draft PR based on `feature/admin-source-updates-and-signup-requests` at version 0.9.10. The debug test artifact, if the workflow succeeds, is **not signed with the production owner certificate**, so it is not a drop-in update for a previously signed DEELA install. Never uninstall a working release just to test this change. Review and compile, then use the existing owner-only signed workflow with the original keystore before an in-place update.

References:
- <https://github.com/vxcontrol/pentagi>
- <https://pentagi.com/docs/api/overview/>
- <https://pentagi.com/docs/configuration/llm-providers/>
