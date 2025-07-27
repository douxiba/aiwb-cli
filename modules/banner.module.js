import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";
import chalk from "chalk";

export const moduleInfo = {
  name: "banner",
  description: "渲染项目横幅（banner 图）",
  capabilities: ["renderer-markdown"],
};

export async function render(context, project, props = {}) {
  const { vals = {}, refs = [] } = props;
  const { index = 0 } = vals;

  const banners = project.metadata?.banners || [];
  const selected = banners[index];

  if (!selected) {
    return {
      isOk: false,
      rendered: `<!-- ⚠️ 未找到 index=${index} 对应的 banner -->`,
    };
  }

  const isRemote = /^https?:\/\//i.test(selected);
  let finalUrl = selected;
  let valid = true;

  if (!isRemote) {
    try {
      const fileStats = await fs.stat(finalUrl);
      if (!fileStats.isFile()) throw new Error("不是文件");
      finalUrl = path.relative(process.cwd(), finalUrl).replace(/\\/g, "/");
    } catch {
      valid = false;
    }
  } else {
    try {
      const res = await fetch(selected, { method: "HEAD" });
      if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) {
        valid = false;
      }
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    return {
      isOk: false,
      rendered: `<!-- ⚠️ 无法加载 banner：${selected} -->`,
    };
  }

  const markdown = `![banner](${finalUrl})`;

  if (context.cli.verbose) {
    console.log(
      `[banner] 选择 banner: ${chalk.cyan(selected)} → ${chalk.green(finalUrl)}`,
    );
  }

  return {
    contentType: "markdown",
    isRendered: true,
    rendered: markdown,
  };
}
