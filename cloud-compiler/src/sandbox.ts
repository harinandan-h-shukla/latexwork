/**
 * Wraps a compile command so it never runs as a bare host process the way
 * local-agent's does — local-agent's trust model is "the user is compiling
 * their own document on their own machine," which is not true here: this
 * service compiles arbitrary users' LaTeX, and `-shell-escape` (when a
 * project enables it) lets a compiled document run arbitrary shell commands.
 *
 * Fly.io Machines don't give an app container access to a Docker daemon (no
 * docker-in-docker, no mounted host socket), so a nested-container-per-build
 * design isn't available here. Instead this uses two standard Linux tools
 * that work inside a single container without any special privileges:
 *
 *  - `bwrap` (bubblewrap): a new mount namespace where the entire filesystem
 *    is bind-mounted READ-ONLY except the one per-build work directory, plus
 *    a fresh empty /tmp, a separate PID namespace, and `--unshare-net` (no
 *    network at all — blocks shell-escape from exfiltrating data or
 *    fetching anything external).
 *  - `prlimit` (util-linux): hard caps on address space (memory), CPU
 *    seconds, and process count, enforced by the kernel — a bound the
 *    compile timeout alone doesn't give you (a timeout stops a *hung*
 *    process; it does nothing about one that's merely consuming excessive
 *    memory quickly).
 *
 * Neither requires elevated container privileges (`--privileged`, extra
 * capabilities) — both work in an ordinary Fly Machine.
 */
import type { ServiceConfig } from "./config";

export interface SandboxedCommand {
  command: string;
  args: string[];
}

export function sandboxCommand(
  config: ServiceConfig,
  workDir: string,
  command: string,
  args: string[]
): SandboxedCommand {
  const prlimitArgs = [
    `--as=${config.buildMemoryBytes}`,
    `--cpu=${config.buildCpuSeconds}`,
    "--nproc=256",
    "--",
  ];

  const bwrapArgs = [
    "--ro-bind", "/", "/",
    "--bind", workDir, workDir,
    "--dev", "/dev",
    "--proc", "/proc",
    "--tmpfs", "/tmp",
    "--unshare-net",
    "--unshare-pid",
    "--die-with-parent",
    "--new-session",
    "--chdir", workDir,
    "--setenv", "HOME", workDir,
    "--",
    command,
    ...args,
  ];

  return {
    command: "prlimit",
    args: [...prlimitArgs, "bwrap", ...bwrapArgs],
  };
}
