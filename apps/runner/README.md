# WeStride supporter runner

A small Docker container that lets a supporter lend their computer to the ideas they have pledged compute to. It picks up agent code jobs from WeStride, runs Muse Code on a fresh clone of the idea's public repository, and sends the changed files back. WeStride commits them and opens the pull request.

## What it does and does not do

- Only takes jobs for ideas you have an active **compute pledge** on, and only when the idea's team turned on "Run code jobs on supporters' computers" for that agent.
- Only clones **public** repositories, anonymously. The runner never receives GitHub credentials and never pushes.
- Runs Muse Code inside the container with no access to your files. The work directory is wiped after every job.
- Uses a local **Ollama** model when the team allows one, so jobs can cost nothing. If you set `META_API_KEY`, that key stays on your computer; WeStride never sees it.
- Checks in every minute. Unlink the computer from **Supporting** in WeStride and it stops getting work.

## Install

From WeStride → **Supporting** → **Link a computer**, copy the command shown (it includes a one-time pairing code).

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
| `WESTRIDE_URL` | `https://www.westride.org` | The WeStride server. A redirect to another host (such as `westride.org` → `www.westride.org`) is followed and remembered. |
| `WESTRIDE_PAIRING_CODE` | – | One-time code from Supporting. Only read when no token is stored in `/state`. |
| `WESTRIDE_DEVICE_NAME` | `My computer` | Shown on your Supporting page. |
| `META_API_KEY` | – | Optional. Lets jobs that need a Meta key run here. Never sent to WeStride. |
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Where Ollama is listening on the host. |

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
