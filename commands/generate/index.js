import { loadCliContext } from "./loadCliContext.js";
import { loadProjects } from "./loadProjects.js";
import { prepareProjects } from "./prepareProjects.js";
import { loadModules } from "./loadModules.js";
import { prepareModules } from "./prepareModules.js";

export async function generateCommand(options) {
  let context = await loadCliContext(options);
  context = await loadProjects(context);
  context = await prepareProjects(context);
  context = await loadModules(context);
  context = await prepareModules(context);

  // 下一步：执行模块渲染逻辑
}
