import path from "path";
import chalk from "chalk";

export async function prepareProjects(context) {
  const { projects, cli } = context;

  const projectPathFields = [
    "projectData.project.metadata.icon",
    "projectData.project.metadata.banners", // string[]
  ];

  const modulePathFields = {
    banner: ["img.path"],
  };

  const remaining = [];
  const hidden = [];

  for (const project of projects) {
    const { slug, projectDir, projectData, readmeConfig } = project;

    if (projectData.project.isHidden) {
      hidden.push(slug);
      continue;
    }

    const replacements = [];

    // 🛠 关键改进：支持嵌套路径字符串（如 img.path）
    const applyReplacements = (obj, pathStr, labelPrefix = "") => {
      const segments = pathStr.split(".");
      const key = segments.pop();
      let target = obj;

      for (const seg of segments) {
        if (target && typeof target === "object") {
          target = target[seg];
        } else {
          return;
        }
      }

      if (!target || typeof target !== "object" || !(key in target)) return;

      const val = target[key];
      if (Array.isArray(val)) {
        target[key] = val.map((v, i) => {
          if (typeof v === "string" && v.includes("{project}")) {
            const resolved = path.resolve(
              projectDir,
              v.replace("{project}", "."),
            );
            replacements.push({
              field: `${labelPrefix}${pathStr}[${i}]`,
              from: v,
              to: resolved,
            });
            return resolved;
          }
          return v;
        });
      } else if (typeof val === "string" && val.includes("{project}")) {
        const resolved = path.resolve(
          projectDir,
          val.replace("{project}", "."),
        );
        target[key] = resolved;
        replacements.push({
          field: `${labelPrefix}${pathStr}`,
          from: val,
          to: resolved,
        });
      }
    };

    // project.metadata.*
    for (const field of projectPathFields) {
      applyReplacements(project, field, "");
    }

    // readmeConfig.imports[]
    if (readmeConfig?.readme?.imports) {
      readmeConfig.readme.imports.forEach((mod, idx) => {
        applyReplacements(mod, "ref", `readmeConfig.readme.imports[${idx}].`);
        applyReplacements(mod, "refs", `readmeConfig.readme.imports[${idx}].`);
        const extraPaths = modulePathFields[mod.module];
        if (extraPaths) {
          extraPaths.forEach((f) =>
            applyReplacements(mod, f, `readmeConfig.readme.imports[${idx}].`),
          );
        }
      });
    }

    if (cli.verbose && replacements.length > 0) {
      console.log(
        `[prepareProjects] 替换路径变量 "{project}" in ${chalk.yellow.bold(slug)}:`,
      );
      for (const r of replacements) {
        console.log(
          `- ${chalk.yellow.bold(slug)}.${chalk.blue(r.field)}\n  ${chalk.red(
            r.from,
          )} ${chalk.gray("→")} ${chalk.green(r.to)}`,
        );
      }
    }

    remaining.push(project);
  }

  if (cli.verbose) {
    if (hidden.length > 0) {
      console.log(`[prepareProjects] 已隐藏以下项目：`);
      hidden.forEach((p) => console.log(`- ${p}`));
    }
    console.log(`[prepareProjects] 最终保留项目数：${remaining.length}`);
  }

  context.projects = remaining;
  return context;
}
