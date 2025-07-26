import fs from "fs/promises";
import path from "path";
import yaml from "yaml";
import prompts from "prompts";
import os from "os";

export async function loadCliContext(cliOptions) {
  const {
    dir,
    cache = false,
    config = "./config/aiwb.config.yaml",
    verbose = false,
    silent = false,
  } = cliOptions;

  const outputDir = path.resolve(process.cwd(), dir);
  const configPath = path.resolve(process.cwd(), config);

  // === 1. 检查配置文件是否存在 ===
  try {
    await fs.access(configPath);
  } catch {
    throw new Error(`❌ 无法读取配置文件：${configPath}`);
  }

  // === 2. 加载并解析配置文件 ===
  let rawConfig = "";
  try {
    rawConfig = await fs.readFile(configPath, "utf-8");
  } catch (err) {
    if (err.code === "EACCES") {
      throw new Error(`❌ 无权限读取配置文件：${configPath}`);
    }
    throw err;
  }

  let parsedConfig;
  try {
    parsedConfig = yaml.parse(rawConfig);
  } catch (err) {
    throw new Error(`❌ YAML 配置格式错误，请检查：${configPath}`);
  }

  // === 3. 拦截敏感输出路径 ===
  const homeDir = os.homedir();
  const blockedPaths = ["/", "/root", "/home", homeDir];
  if (blockedPaths.includes(outputDir)) {
    throw new Error(`❌ 拒绝操作敏感目录：${outputDir}`);
  }

  // === 4. 检查输出目录状态 ===
  let dirExisted = true;
  let readmeExisted = false;
  let readmeSize = 0;
  let fileList = [];

  try {
    fileList = await fs.readdir(outputDir);
  } catch (err) {
    if (err.code === "ENOENT") {
      dirExisted = false;
      fileList = [];
    } else {
      throw new Error(
        `❌ 无法读取输出目录：${outputDir}，错误信息：${err.message}`,
      );
    }
  }

  const readmePath = path.join(outputDir, "README.md");
  if (fileList.includes("README.md")) {
    try {
      const stat = await fs.stat(readmePath);
      if (stat.size > 0) {
        readmeExisted = true;
        readmeSize = stat.size;
      }
    } catch {
      // 忽略 stat 错误
    }
  }

  // === 5. 处理清空或覆盖提示 ===
  if (fileList.length > 0) {
    if (fileList.length === 1 && fileList[0] === "README.md" && readmeExisted) {
      // 仅存在非空 README.md
      if (!silent) {
        const { confirm } = await prompts({
          type: "confirm",
          name: "confirm",
          message: `⚠️ 输出目录中已有 README.md（${readmeSize} 字节），是否覆盖？`,
          initial: false,
        });
        if (!confirm) throw new Error("用户取消了覆盖操作，任务终止");
      }
    } else {
      // 目录非空或有其他文件
      if (!silent) {
        const { confirm } = await prompts({
          type: "confirm",
          name: "confirm",
          message: `⚠️ 输出目录 "${outputDir}" 中已有内容，是否全部删除？`,
          initial: false,
        });
        if (!confirm) throw new Error("用户取消了清理操作，任务终止");
      }

      // 执行目录清空
      try {
        await fs.rm(outputDir, { recursive: true, force: true });
      } catch (err) {
        throw new Error(
          `❌ 清空输出目录失败：${outputDir}，错误信息：${err.message}`,
        );
      }

      dirExisted = false;
    }
  }

  // === 6. 创建输出目录（保证存在） ===
  if (!dirExisted) {
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (err) {
      throw new Error(
        `❌ 创建输出目录失败：${outputDir}，错误信息：${err.message}`,
      );
    }
  }

  // === 7. 返回上下文 ===
  const context = {
    cli: {
      outputDir,
      useCache: cache,
      configPath,
      verbose,
      silent,
    },
    config: parsedConfig,
  };

  if (verbose) {
    console.log("[loadCliContext] CLI 参数:", cliOptions);
    console.log("[loadCliContext] 配置路径:", configPath);
    console.log("[loadCliContext] 输出目录:", outputDir);
    if (readmeExisted && fileList.length === 1) {
      console.log("[loadCliContext] 检测到非空 README.md，将覆盖");
    } else if (fileList.length > 1) {
      console.log("[loadCliContext] 输出目录原有内容已清空");
    }
    console.log("[loadCliContext] 配置解析:", parsedConfig);
  }

  return context;
}
