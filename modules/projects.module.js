import fs from "fs/promises";
import path from "path";
import yaml from "yaml";
import chalk from "chalk";

export const moduleInfo = {
  name: "projects",
  description: "负责加载和处理项目数据",
  capabilities: ["renderer-markdown"],
  hasInit: true, // ✅ 表示需要自动调用 init(context)
  renderIsAsync: true,
  contextRegisteredFunctions: [
    "init",
    "getAllProjects",
    "getProject",
    "getProjectBySlug",
    "getProjects",
  ],
};

let cachedProjects = null;
let cachedTotal = 0;
let cachedTotalWithHidden = 0;

/**
 * 初始化函数，在模块加载时自动调用
 * 会预加载所有项目并设置统计数据
 */
export async function init(context) {
  await getAllProjects(context);

  context["module$projects_total"] = cachedTotal;
  context["module$projects_totalWithHidden"] = cachedTotalWithHidden;

  if (context.cli?.verbose) {
    console.log(
      `[projects] 统计：共 ${cachedTotalWithHidden} 个项目，其中可用 ${cachedTotal} 个`,
    );
  }
}

/**
 * 获取所有有效项目（隐藏项目将被过滤）
 */
export async function getAllProjects(context) {
  if (cachedProjects) return cachedProjects;

  const { config, cli } = context;
  const relProjectsPath =
    config.config?.data?.projects || "./aiwb.projects.yaml";
  const projectsFile = path.resolve(
    path.dirname(cli.configPath),
    relProjectsPath,
  );

  let rawProjectsYaml;
  try {
    rawProjectsYaml = await fs.readFile(projectsFile, "utf-8");
  } catch {
    throw new Error(`❌ 无法读取项目列表文件：${projectsFile}`);
  }

  let parsed;
  try {
    parsed = yaml.parse(rawProjectsYaml);
  } catch {
    throw new Error(`❌ YAML 格式错误：${projectsFile}`);
  }

  const projectDirs = parsed.projects || [];
  const results = [];
  const hidden = [];

  cachedTotal = 0;
  cachedTotalWithHidden = 0;

  for (const relPath of projectDirs) {
    const absPath = path.resolve(process.cwd(), relPath);
    const slug = path.basename(absPath);
    const projectYamlPath = path.join(absPath, "project.yaml");
    const readmeConfigPath = path.join(absPath, "readme.config.yaml");

    let projectData = {};
    try {
      const raw = await fs.readFile(projectYamlPath, "utf-8");
      projectData = yaml.parse(raw);
    } catch {
      throw new Error(
        `❌ 无法加载 ${slug} 的 project.yaml：${projectYamlPath}`,
      );
    }

    let readmeConfig = {};
    try {
      const raw = await fs.readFile(readmeConfigPath, "utf-8");
      readmeConfig = yaml.parse(raw);
    } catch {
      if (cli.verbose) {
        console.warn(`⚠️ ${slug} 项目没有 readme.config.yaml，跳过配置读取`);
      }
    }

    const project = {
      slug,
      projectDir: absPath,
      projectYamlPath,
      readmeConfigPath,
      projectData,
      readmeConfig,
    };

    cachedTotalWithHidden++;

    if (projectData.project?.isHidden) {
      hidden.push(slug);
      continue;
    }

    cachedTotal++;

    applyPathReplacements(project, cli);
    results.push(project);
  }

  if (cli.verbose) {
    if (hidden.length > 0) {
      console.log(`[projects] 已隐藏以下项目：`);
      hidden.forEach((p) => console.log(`- ${p}`));
    }
    console.log(`[projects] 成功加载 ${results.length} 个项目`);
    results.forEach((p) => console.log(`- ${p.slug} @ ${p.projectDir}`));
  }

  cachedProjects = results;
  return results;
}

/**
 * 根据路径名查找项目
 */
export async function getProject(context, pathname) {
  const projects = await getAllProjects(context);
  return (
    projects.find(
      (p) => path.resolve(p.projectDir) === path.resolve(pathname),
    ) || null
  );
}

/**
 * 根据 slug 查找项目
 */
export async function getProjectBySlug(context, slug) {
  const projects = await getAllProjects(context);
  return projects.find((p) => p.slug === slug) || null;
}

/**
 * 使用自定义过滤器筛选项目
 */
export async function getProjects(context, filterFn) {
  const projects = await getAllProjects(context);
  return projects.filter(filterFn);
}

/**
 * 替换路径字段中的 "{project}" 占位符
 */
function applyPathReplacements(project, cli) {
  const { slug, projectDir, projectData, readmeConfig } = project;

  const projectPathFields = [
    "projectData.project.metadata.icon",
    "projectData.project.metadata.banners",
  ];

  const modulePathFields = {
    banner: ["img.path"],
  };

  const replacements = [];

  const apply = (obj, pathStr, labelPrefix = "") => {
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
      const resolved = path.resolve(projectDir, val.replace("{project}", "."));
      target[key] = resolved;
      replacements.push({
        field: `${labelPrefix}${pathStr}`,
        from: val,
        to: resolved,
      });
    }
  };

  for (const field of projectPathFields) {
    apply(project, field, "");
  }

  if (readmeConfig?.readme?.imports) {
    readmeConfig.readme.imports.forEach((mod, idx) => {
      apply(mod, "ref", `readmeConfig.readme.imports[${idx}].`);
      apply(mod, "refs", `readmeConfig.readme.imports[${idx}].`);
      const extra = modulePathFields[mod.module];
      if (extra) {
        extra.forEach((f) =>
          apply(mod, f, `readmeConfig.readme.imports[${idx}].`),
        );
      }
    });
  }

  if (cli.verbose && replacements.length > 0) {
    console.log(
      `[projects] 替换路径变量 "{project}" in ${chalk.yellow.bold(slug)}:`,
    );
    for (const r of replacements) {
      console.log(
        `- ${chalk.yellow.bold(slug)}.${chalk.blue(r.field)}\n  ${chalk.red(
          r.from,
        )} ${chalk.gray("→")} ${chalk.green(r.to)}`,
      );
    }
  }
}

export async function render(context) {
  const { config, cli } = context;

  // 1. 从配置中获取 projects.yaml 路径并读取 basepath
  const relProjectsPath =
    config.config?.refs?.projects || "./config/aiwb.projects.yaml";
  const projectsFile = path.resolve(process.cwd(), relProjectsPath);

  let rawProjectsYaml;
  try {
    rawProjectsYaml = await fs.readFile(projectsFile, "utf-8");
  } catch {
    throw new Error(`❌ 无法读取项目列表文件：${projectsFile}`);
  }

  let parsed;
  try {
    parsed = yaml.parse(rawProjectsYaml);
  } catch {
    throw new Error(`❌ YAML 格式错误：${projectsFile}`);
  }

  const basepath = parsed.basepath;
  if (!basepath) {
    throw new Error(`❌ 项目配置文件中缺少 basepath 字段`);
  }

  const absBase = path.resolve(process.cwd(), basepath);
  const globalTemplatePath = path.join(absBase, "template.md");

  let globalTemplate = null;
  try {
    globalTemplate = await fs.readFile(globalTemplatePath, "utf-8");
    if (cli.verbose) {
      console.log(
        `[projects.render] 使用全局模板: ${chalk.gray(globalTemplatePath)}`,
      );
    }
  } catch {
    if (cli.verbose) {
      console.warn(
        `[projects.render] basepath 中未找到 template.md，继续使用项目私有模板`,
      );
    }
  }

  const projects = await getAllProjects(context);
  const renderedList = [];

  for (const project of projects) {
    const slug = project.slug;
    const projectTemplatePath = path.join(project.projectDir, "template.md");

    let templateContent = globalTemplate;
    try {
      const content = await fs.readFile(projectTemplatePath, "utf-8");
      templateContent = content;
      if (cli.verbose) {
        console.log(`[projects.render] 使用项目 ${slug} 的自定义模板`);
      }
    } catch {
      if (!globalTemplate) {
        throw new Error(
          `❌ 项目 ${slug} 未定义 template.md，且没有可用的全局模板`,
        );
      }
      if (cli.verbose) {
        console.log(`[projects.render] 项目 ${slug} 使用全局模板`);
      }
    }

    const rendered = await context.module$base_renderTemplateByString(
      templateContent,
      {
        [`modules$project_project`]: project,
        [`modules$project_name`]: project?.projectData?.project?.name || slug,
      },
    );

    renderedList.push(rendered);
  }

  return renderedList.join("\\n");
}
