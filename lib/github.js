const REPO_OWNER = "motstothart";
const REPO_NAME = "eggbeater-dashboard";

function repoBranch() {
  return process.env.GITHUB_BRANCH || "main";
}

function token() {
  const t = process.env.GITHUB_TOKEN;
  if (!t) {
    throw new Error(
      "GITHUB_TOKEN is not set. The dashboard needs a fine-grained PAT with Contents: Read and Write on this repo. See README for setup."
    );
  }
  return t;
}

function headers() {
  return {
    Authorization: `Bearer ${token()}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

export async function readJsonFile(path) {
  const branch = repoBranch();
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: headers(), cache: "no-store" });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub read ${path} failed: ${res.status} ${body}`);
  }
  const data = await res.json();
  const content = Buffer.from(data.content, "base64").toString("utf-8");
  return { json: JSON.parse(content), sha: data.sha };
}

export async function writeJsonFile(path, json, sha, message) {
  const branch = repoBranch();
  const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${encodeURIComponent(path)}`;
  const content = Buffer.from(JSON.stringify(json, null, 2) + "\n").toString("base64");
  const res = await fetch(url, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ message, content, sha, branch }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub write ${path} failed: ${res.status} ${body}`);
  }
  return res.json();
}

export async function mutateJsonFile(path, mutate, message) {
  const { json, sha } = await readJsonFile(path);
  const next = await mutate(json);
  await writeJsonFile(path, next ?? json, sha, message);
}

export function isWriteEnabled() {
  return Boolean(process.env.GITHUB_TOKEN);
}
