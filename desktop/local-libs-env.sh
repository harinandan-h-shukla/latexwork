#!/usr/bin/env bash
# Spike-A-only workaround: this dev machine's sudo requires an interactive
# password not available to the agent session that built this spike, so the
# Tauri v2 Linux build prerequisites (libwebkit2gtk-4.1-dev and its closure —
# 116 packages, see pkglist.txt) were downloaded with `apt-get download`
# (root not required) and extracted with `dpkg-deb -x` into a local root
# instead of being installed system-wide with `apt-get install`.
#
# THIS IS NOT HOW A REAL MACHINE SHOULD BE SET UP. On a normal machine with
# sudo access, just run:
#   sudo apt-get install libwebkit2gtk-4.1-dev build-essential curl wget \
#     file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
#     pkg-config
# and skip this file entirely.
#
# Source this before any cargo/tauri command in this spike's environment:
#   source desktop/local-libs-env.sh
#
# The extracted local root itself lives in the session scratchpad (not
# committed to the repo — it's 64MB+ of downloaded .deb contents), so this
# script only works in the environment that built it. Path below must match
# wherever local-root/ was extracted.

LOCAL_ROOT="${INKWELL_LOCAL_LIBS_ROOT:-/tmp/claude-1000/-home-harinandan/42f16551-438c-40a7-9b27-be3fdd1c2760/scratchpad/local-root}"

if [ ! -d "$LOCAL_ROOT/usr/lib/x86_64-linux-gnu" ]; then
  echo "local-libs-env.sh: LOCAL_ROOT ($LOCAL_ROOT) not found or incomplete." >&2
  echo "Re-run the apt-get download + dpkg-deb -x extraction, or install system libs via sudo apt-get instead." >&2
  return 1 2>/dev/null || exit 1
fi

export PKG_CONFIG_SYSROOT_DIR="$LOCAL_ROOT"
export PKG_CONFIG_PATH="$LOCAL_ROOT/usr/lib/x86_64-linux-gnu/pkgconfig:$LOCAL_ROOT/usr/share/pkgconfig"
# Force pkg-config to always emit explicit -L flags: it normally elides
# -L/usr/lib/x86_64-linux-gnu as a "default" linker search dir, which would
# be correct on a real system but is WRONG here since the real
# /usr/lib/x86_64-linux-gnu does not contain these libraries at all.
export PKG_CONFIG_SYSTEM_LIBRARY_PATH="/nonexistent-force-explicit-L"
export PATH="$LOCAL_ROOT/usr/bin:$PATH"
export LD_LIBRARY_PATH="$LOCAL_ROOT/usr/lib/x86_64-linux-gnu:$LOCAL_ROOT/usr/lib:${LD_LIBRARY_PATH:-}"
export LIBRARY_PATH="$LOCAL_ROOT/usr/lib/x86_64-linux-gnu:$LOCAL_ROOT/usr/lib:${LIBRARY_PATH:-}"
# Two -L paths, deliberately: LOCAL_ROOT has the *-dev packages' unversioned
# symlinks (e.g. libgtk-3.so -> libgtk-3.so.0.2404.29) that this system
# never had installed, but those symlinks' *targets* (the actual versioned
# runtime .so, e.g. libgtk-3.so.0.2404.29) are already present on the real
# system at /usr/lib/x86_64-linux-gnu (GTK/pango/atk/etc. are core desktop
# packages here already) — apt's real dependency resolver correctly saw
# those as already satisfied and never included them in the download set.
# A dangling symlink in LOCAL_ROOT alone makes the linker report "unable to
# find library -lgtk-3" even though the file conceptually "exists" as a
# symlink; the real system path resolves it.
export RUSTFLAGS="-L $LOCAL_ROOT/usr/lib/x86_64-linux-gnu -L /usr/lib/x86_64-linux-gnu -C link-args=-Wl,-rpath,$LOCAL_ROOT/usr/lib/x86_64-linux-gnu ${RUSTFLAGS:-}"
export C_INCLUDE_PATH="$LOCAL_ROOT/usr/include:$LOCAL_ROOT/usr/include/x86_64-linux-gnu:${C_INCLUDE_PATH:-}"

echo "local-libs-env.sh: sourced. LOCAL_ROOT=$LOCAL_ROOT"
