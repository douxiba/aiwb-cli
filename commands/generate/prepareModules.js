// commands/generate/prepareModules.js
export async function prepareModules(context) {
  for (const [moduleName, moduleInfo] of Object.entries(context.modules)) {
    const capabilities = moduleInfo.capabilities || [];

    if (capabilities.includes("renderer-markdown")) {
      const renderFnKey = `module$${moduleName}.render`;
      const rawRender = context[renderFnKey];

      if (typeof rawRender !== "function") {
        throw new Error(
          `❌ 模块 ${moduleName} 声明了 renderer-markdown 但未导出 render() 函数`,
        );
      }

      context.modules[moduleName].render = (vals = {}) =>
        rawRender({
          props: { vals },
        });

      if (context.cli.verbose) {
        console.log(
          `\n[prepareModules] 模块 modules.${moduleName} 包装函数:\n  ${moduleName}.render → ${renderFnKey}`,
        );
        console.log(context.modules[moduleName]);
      }
    }

    // 你后续如果加 html renderer/generator/etc，可以照这个结构往下写
  }

  return context;
}
