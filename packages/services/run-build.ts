import {
  CodeBuildClient,
  StartBuildCommand,
  BatchGetBuildsCommand,
} from "@aws-sdk/client-codebuild";

const client = new CodeBuildClient({});

/** Kick off a CodeBuild project and wait until it finishes. */
export async function runBuild(
  opts: { projectName?: string; stage?: string } = {},
): Promise<void> {
  // 1️⃣  Resolve config (env → param → default)
  const projectName =
    opts.projectName ?? process.env.CODEBUILD_PROJECT;
  const stage =
    opts.stage ?? process.env.STAGE ?? process.env.SST_STAGE ?? "staging";

  if (!projectName) {
    throw new Error(
      "CODEBUILD_PROJECT env var is missing and no projectName parameter was supplied",
    );
  }

  // 2️⃣  Start the build
  const { build } = await client.send(
    new StartBuildCommand({
      projectName,
      environmentVariablesOverride: [
        { name: "STAGE", value: stage, type: "PLAINTEXT" },
      ],
    }),
  ); :contentReference[oaicite:1]{index=1}

  if (!build?.id) throw new Error("StartBuild returned no build ID");
  console.log("Build started →", build.id);

  // 3️⃣  Poll until completion (simple 30-s back-off)
  let status = build.buildStatus;
  while (status === "IN_PROGRESS" || status === "QUEUED") {
    await new Promise((r) => setTimeout(r, 30_000));
    const { builds } = await client.send(
      new BatchGetBuildsCommand({ ids: [build.id] }),
    );
    status = builds?.[0]?.buildStatus;
    console.log("…still", status);
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`CodeBuild failed with status ${status}`);
  }
}
