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
  args: string[],
  /** Directory the sandboxed process actually starts in — defaults to
   * `workDir`, but a build whose main file lives in a subdirectory (e.g. a
   * zip upload with one top-level wrapping folder) needs the process
   * running from THAT subdirectory so the main file's own bare, relative
   * \input{}/\usepackage{} calls resolve, while `workDir` (the whole build
   * dir, not just this subdirectory) still needs to stay the writable bind
   * mount so latexmk's -outdir (a sibling of the subdirectory) is writable. */
  cwd: string = workDir
): SandboxedCommand {
  const prlimitArgs = [
    `--as=${config.buildMemoryBytes}`,
    `--cpu=${config.buildCpuSeconds}`,
    "--nproc=256",
    "--",
  ];

  const bwrapArgs = [
    "--ro-bind", "/", "/",
    "--dev", "/dev",
    "--proc", "/proc",
    // Real bug, found via a direct repro on the deployed machine: bwrap
    // applies mount operations in argument order, and a later mount at a
    // path wins over ("shadows") an earlier one at a path nested inside it.
    // workDir is always under the OS temp dir (see config.ts's default,
    // os.tmpdir() + "inkwell-cloud-compiler-work") — i.e. nested under
    // /tmp. With --tmpfs /tmp listed AFTER --bind workDir workDir (the
    // order this used to be in), the fresh empty /tmp mount silently wiped
    // out the just-bound work directory, so every single compile failed
    // immediately with "bwrap: Can't chdir to <workDir>: No such file or
    // directory" — before pdflatex ever ran. --tmpfs /tmp must come first
    // so the more specific --bind workDir workDir underneath it applies on
    // top, giving the sandboxed process a fresh empty /tmp everywhere
    // except the one real, populated subdirectory it actually needs.
    "--tmpfs", "/tmp",
    "--bind", workDir, workDir,
    "--unshare-net",
    "--unshare-pid",
    "--die-with-parent",
    "--new-session",
    "--chdir", cwd,
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
