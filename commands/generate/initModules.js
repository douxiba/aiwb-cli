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

export async function initModules(context) {
  const modulesDir = path.resolve(process.cwd(), "modules");
  const entries = await fs.readdir(modulesDir);

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
        contextRegisteredFunctions: [],
        hasInit: false,
      };

      const capabilities = moduleInfo.capabilities || [];
      const contextFns = moduleInfo.contextRegisteredFunctions || [];

      const exports = Object.entries(mod).filter(
        ([key, val]) => typeof val === "function",
      );

      // capability 检查
      for (const cap of capabilities) {
        const required = CAPABILITY_FUNCTIONS[cap];
        if (!required) {
          if (context.cli.verbose) {
            console.warn(
              chalk.yellowBright(
                `[initModules] 模块 ${moduleName} 声明未知 capability "${cap}"，忽略`,
              ),
            );
          }
          continue;
        }
        for (const fnName of required) {
          if (typeof mod[fnName] !== "function") {
            throw new Error(
              `❌ 模块 ${moduleName} 声明 capability "${cap}" 但未导出必需函数 "${fnName}"`,
            );
          }
        }
      }

      // wrapper: renderer renderModule$xxx
      if (
        capabilities.includes("renderer-markdown") ||
        capabilities.includes("renderer-both")
      ) {
        const renderFn = mod.render;
        if (typeof renderFn !== "function") {
          throw new Error(
            `❌ 模块 ${moduleName} 缺少 renderer-markdown/both 所需的 render()`,
          );
        }

        const isAsync =
          moduleInfo.renderIsAsync === true ||
          renderFn.constructor.name === "AsyncFunction";

        context[`renderModule$${moduleName}`] = isAsync
          ? async (...vals) => await renderFn(context, ...vals)
          : (...vals) => renderFn(context, ...vals);

        if (context.cli.verbose) {
          console.log(
            `  ${chalk.cyan(`[initModules] renderModule$${moduleName}`)} → module ${moduleName} render()${isAsync ? " (async)" : ""}`,
          );
        }
      }

      // wrapper: contextRegisteredFunctions → module$xxx_func
      for (const rawFnName of contextFns) {
        const isAsync = rawFnName.startsWith("~");
        const fnName = rawFnName.replace(/^~/, "");
        const rawFn = mod[fnName];

        if (typeof rawFn === "function") {
          const key = `module$${moduleName}_${fnName}`;
          context[key] = isAsync
            ? ((fn, ctx) => {
                return async (...args) => {
                  return await fn(ctx, ...args);
                };
              })(rawFn, context)
            : ((fn, ctx) => {
                return (...args) => {
                  return fn(ctx, ...args);
                };
              })(rawFn, context);

          if (context.cli.verbose) {
            console.log(
              `  ${chalk.cyan(`[initModules] ${key}`)} → wrapped with context${isAsync ? " (async)" : ""}`,
            );
          }
        } else {
          console.warn(
            chalk.yellow(
              `⚠️ 模块 ${moduleName} 注册 contextRegisteredFunction "${fnName}" 但未导出该函数`,
            ),
          );
        }
      }

      // 普通函数导出（无 context 包装）
      for (const [exportName, fn] of exports) {
        const key = `module$${moduleName}_${exportName}`;

        if (
          exportName === "render" ||
          exportName === "renderHtml" ||
          contextFns.some((f) => f.replace(/^~/, "") === exportName) || // ✅ 跳过 contextRegisteredFunctions（支持 ~ 前缀）
          context[key] // ✅ 如果已被 context wrapper 设置，不要覆盖
        )
          continue;

        context[key] = fn;

        if (context.cli.verbose) {
          console.log(`  ${chalk.green(key)} → ${moduleName}.${exportName}`);
        }
      }

      // 初始化 init(context)
      if (moduleInfo.hasInit && typeof mod.init === "function") {
        await mod.init(context);
        if (context.cli.verbose) {
          console.log(
            `  ${chalk.blue(`[initModules] 调用 ${moduleName}.init(context)`)}`,
          );
        }
      }

      if (context.cli.verbose) {
        console.log(
          chalk.cyanBright(
            `\n[initModules] 加载模块 ${chalk.bold(moduleName)} 成功`,
          ),
        );
      }
    } catch (err) {
      throw new Error(`❌ 加载模块 ${moduleName} 失败：${err.message}`);
    }
  }

  return context;
}
