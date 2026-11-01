# WeStride supporter runner.
# Build from the repository root so the shared protocol package is in context:
#   docker build -f apps/runner/Dockerfile -t ghcr.io/originalpioneers/westride-runner:latest .
#
# The container runs as an unprivileged user, holds no GitHub credentials, and
# only ever clones public repositories into /work. State (the device token)
# lives in the /state volume.

FROM oven/bun:1-debian AS base

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# Muse Code CLI, pinned to the image build rather than fetched per job.
ENV MUSE_INSTALL_DIR=/opt/muse/bin
RUN mkdir -p "$MUSE_INSTALL_DIR" \
 && curl -fsSL https://dev.meta.ai/install.sh | MUSE_INSTALL_DIR="$MUSE_INSTALL_DIR" MUSE_NO_MODIFY_PATH=1 sh \
 && "$MUSE_INSTALL_DIR/muse" --version

WORKDIR /app
COPY package.json bun.lock* ./
COPY packages/runner-protocol/package.json packages/runner-protocol/
COPY apps/runner/package.json apps/runner/
RUN bun install --frozen-lockfile --filter @westride/runner --filter @westride/runner-protocol --production || bun install --production
COPY packages/runner-protocol packages/runner-protocol
COPY apps/runner apps/runner

RUN useradd --create-home --uid 10001 runner \
 && mkdir -p /work /state \
 && chown -R runner:runner /work /state /app
USER runner

ENV PATH="/opt/muse/bin:${PATH}" \
    WESTRIDE_STATE_DIR=/state \
    WESTRIDE_WORK_DIR=/work \
    OLLAMA_URL=http://host.docker.internal:11434 \
    GIT_TERMINAL_PROMPT=0 \
    HOME=/home/runner

VOLUME ["/state"]
WORKDIR /app/apps/runner
CMD ["bun", "run", "src/index.ts"]
