import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "url";
import chalk from "chalk";

const CAPABILITY_FUNCTIONS = {
  "renderer-markdown": ["render"],
  "renderer-html": ["renderHtml"],
  "loader-project": ["load"],
  "loader-template": ["parseTemplate"],
  "preprocessor-section": ["transform"],
  "generator-section": ["generate"],
  "renderer-both": ["render", "renderHtml"],
};

export async function loadModules(context) {
  const modulesDir = path.resolve(process.cwd(), "modules");
  const entries = await fs.readdir(modulesDir);
  const modulesLoaded = [];

  context.modules = context.modules || {};

  for (const entry of entries) {
    if (!entry.endsWith(".module.js")) continue;

    const modulePath = path.join(modulesDir, entry);
    const moduleUrl = pathToFileURL(modulePath);
    const moduleName = entry.replace(/\.module\.js$/, "");

    try {
      const mod = await import(moduleUrl.href);
      const moduleInfo = mod.moduleInfo || {
        name: moduleName,
        description: "无描述",
        capabilities: [],
      };

      const registeredFns = [];

      for (const [exportName, fn] of Object.entries(mod)) {
        if (typeof fn === "function") {
          const key = `module$${moduleName}.${exportName}`;
          context[key] = fn;
          registeredFns.push({ exportName, key });
          modulesLoaded.push(key);
        }
      }

      // capability 校验
      for (const cap of moduleInfo.capabilities || []) {
        const expectedFns = CAPABILITY_FUNCTIONS[cap];
        if (!expectedFns) {
          if (context.cli.verbose) {
            console.log(
              chalk.yellowBright(
                `[loadModules] 模块 ${moduleName} 声明了未知 capability "${cap}"，已跳过检查`,
              ),
            );
          }
          continue;
        }

        const missing = expectedFns.filter(
          (fnName) => typeof mod[fnName] !== "function",
        );
        if (missing.length > 0) {
          throw new Error(
            `❌ 模块 ${moduleName} 声明 capability "${cap}" 但缺少函数：${missing.join(", ")}`,
          );
        }
      }

      // 存储模块信息
      context.modules[moduleName] = {
        ...moduleInfo,
        path: modulePath,
        exports: registeredFns.map((f) => f.exportName),
      };

      if (context.cli.verbose) {
        console.log(
          chalk.cyanBright(
            `\n[loadModules] 加载模块: ${chalk.bold(moduleName)}`,
          ),
        );
        console.log(`路径: ${chalk.gray(modulePath)}`);
        console.log(`功能: ${chalk.magenta(moduleInfo.description)}`);
        console.log(`导出函数:`);
        for (const { exportName, key } of registeredFns) {
          console.log(
            `  ${chalk.yellow(moduleName)} ${chalk.gray("→")} ${chalk.green(key)}`,
          );
        }
      }
    } catch (err) {
      throw new Error(`❌ 加载模块 ${entry} 失败：${err.message}`);
    }
  }

  if (context.cli.verbose) {
    console.log(
      `\n[loadModules] 模块加载完成，共 ${modulesLoaded.length} 个导出函数`,
    );
  }

  return context;
}
