// commands/generate/saveRenderedReadme.js
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

export async function saveRenderedReadme(context) {
  const { cli, renderedReadme } = context;

  if (!renderedReadme) {
    throw new Error("❌ 当前没有可保存的 README 内容，请先执行渲染步骤");
  }

  const outDir = path.resolve(process.cwd(), cli.dir || "dist");
  const outPath = path.join(outDir, "README.md");

  // 确保输出目录存在
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outPath, renderedReadme, "utf-8");

  if (cli.verbose) {
    console.log(`[saveRenderedReadme] 已保存至 ${chalk.green(outPath)}`);
  }

  return context;
}
