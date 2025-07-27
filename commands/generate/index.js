import { loadCliContext } from "./loadCliContext.js";
import { initModules } from "./initModules.js";
import { renderGlobalTemplate } from "./renderGlobalTemplate.js";
import { saveRenderedReadme } from "./saveRenderedReadme.js";

export async function generateCommand(options) {
  let context = await loadCliContext(options);
  context = await initModules(context);
  context = await renderGlobalTemplate(context);
  context = await saveRenderedReadme(context);
  // 下一步：执行模块渲染逻辑
}
