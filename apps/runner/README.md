# WeStride supporter runner

A small Docker container that lets a supporter lend their computer to the ideas they have pledged compute to, and lets a member run their own Project Factory tickets on their own machine. It picks up work from WeStride, runs Muse Code on a fresh clone of the repository, and sends the changed files back. WeStride commits them and opens the pull request.

It takes two kinds of work:

- **Agent Studio code jobs** for ideas you have pledged compute to, when the team allows supporters' computers.
- **Project Factory ticket runs** where the member chose **Local** (their own linked computer) or **Sponsors** (a supporter's computer pledged to the project's idea) in the run dialog.

## What it does and does not do

- Only takes supporters' jobs for ideas you have an active **compute pledge** on, and only when the idea's team turned on "Run code jobs on supporters' computers" for that agent or chose Sponsors for a ticket run. Your own **Local** ticket runs come only from you.
- Clones supporters' work from **public** repositories only, anonymously. For your own Local runs on a private repository, WeStride includes a short-lived read-only token for just that repository in the clone URL. The runner never receives write credentials and never pushes.
- Runs Muse Code inside the container with no access to your files. The work directory is wiped after every job.
- Runs Muse Code on a local **Ollama** model with no API key at all, or with the `META_API_KEY` you give the runner; that key stays on your computer and WeStride never sees it. Ollama models are offered only when Ollama says they support **tools**, since Muse Code works through tool calls. Pick a model that actually calls tools well: `qwen3:8b` (fits a 12 GB GPU) and `qwen3-coder:30b` do; `qwen2.5-coder:14b` declares tool support but writes the calls out as text, so Muse makes no changes with it.
- Checks in every minute. Unlink the computer from **WePledge™** in WeStride and it stops getting work.

## Install

From WeStride → **WePledge™** → **Link a computer**, copy the command shown (it includes a one-time pairing code).

macOS / Linux:

```sh
curl -fsSL https://www.westride.org/install.sh | sh -s -- --code XXXX-XXXX --url https://www.westride.org
```

Windows (PowerShell):

```powershell
& ([scriptblock]::Create((irm https://www.westride.org/install.ps1))) -Code XXXX-XXXX -Url https://www.westride.org
```

The script needs Docker running. It asks for a name, optionally a Meta API key, pairs the computer, and starts the container with `--restart unless-stopped` so it comes back after a reboot. If the image is already present locally (for example built from this directory), the script uses it even when the registry cannot be reached.

Manual equivalent:

```sh
docker volume create westride-runner-state
docker run -d --name westride-runner --restart unless-stopped \
  --cap-drop ALL --security-opt no-new-privileges --pids-limit 512 \
  --memory 6g --cpus 4 \
  --add-host host.docker.internal:host-gateway \
  -v westride-runner-state:/state \
  -e WESTRIDE_URL=https://www.westride.org \
  -e WESTRIDE_PAIRING_CODE=XXXX-XXXX \
  -e WESTRIDE_DEVICE_NAME="My laptop" \
  ghcr.io/westrideorg/westride-runner:latest
```

Logs: `docker logs -f westride-runner`. Stop: `docker rm -f westride-runner`.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `WESTRIDE_URL` | `https://www.westride.org` | The WeStride server. A redirect to another host (such as `westride.org` → `www.westride.org`) is followed and remembered. Inside Docker, `localhost` is rewritten to `host.docker.internal` so pairing against a dev server on the same machine works. |
| `WESTRIDE_PAIRING_CODE` | – | One-time code from WePledge™. Only read when no token is stored in `/state`. |
| `WESTRIDE_DEVICE_NAME` | `My computer` | Shown on your WePledge™ page. |
| `META_API_KEY` | – | Optional. Lets jobs that need a Meta key run here. Never sent to WeStride. |
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Where Ollama is listening on the host. |
| `WESTRIDE_OFFER_OLLAMA_MODELS` | `1` | Set to `0` to keep Ollama's models off WeStride and only take jobs that use the Meta key. |

## How Ollama runs are wired

Muse Code's network provider is `meta`, and it refuses to start without a model catalog from that provider. For a job on an Ollama model the runner writes a settings file into a config root used only for that job (`$WESTRIDE_WORK_DIR/<job>.config/muse/settings.json`) and hands it to Muse through `XDG_CONFIG_HOME`. The file sets `endpoint_transport` to `${OLLAMA_URL}/v1` with `auth: none` and a one-row `model_catalog` for the chosen model, whose `context_limit` comes from Ollama's `/api/show`. This is the same arrangement `ollama launch muse` uses, and it leaves any Muse settings on the host alone. Jobs with a Muse model keep using `META_API_KEY`.

## Development

```sh
bun install
cd apps/runner
WESTRIDE_URL=http://localhost:3000 WESTRIDE_STATE_DIR=/tmp/wr-state WESTRIDE_WORK_DIR=/tmp/wr-work \
  MUSE_INSTALL_DIR=$HOME/.muse/bin WESTRIDE_PAIRING_CODE=XXXX-XXXX bun run dev
```

Build the image from the repository root:

```sh
docker build -f apps/runner/Dockerfile -t westride-runner .
```

The web app's `proxy.ts` must allow the runner's paths and the install scripts through its user-agent filter; see `SIGNED_WEBHOOKS` and `INSTALL_SCRIPTS` there. The server needs `BUILD_RUNNER_CALLBACK_URL` and the GitHub App configured for supporter devices to be offered.

## Publishing

`.github/workflows/runner-image.yml` builds the image for `linux/amd64` and `linux/arm64` and pushes `ghcr.io/westrideorg/westride-runner:latest` (plus a `sha-<commit>` tag) on every push to `dev` that touches the runner, the protocol package, or the lockfile. Pull requests only build. The package has to be made public once, by hand, under the organisation's package settings, or anonymous `docker pull` is denied.
