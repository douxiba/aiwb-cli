import fs from "fs/promises";
import path from "path";
import yaml from "yaml";

export async function loadProjects(context) {
  const { config, cli } = context;

  // 从 config.data.projects 中获取项目列表文件路径
  const relProjectsPath = config.data?.projects || "./aiwb.projects.yaml";
  const projectsFile = path.resolve(
    path.dirname(cli.configPath),
    relProjectsPath,
  );

  let rawProjectsYaml;
  try {
    rawProjectsYaml = await fs.readFile(projectsFile, "utf-8");
  } catch (err) {
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

  for (const relPath of projectDirs) {
    // ✅ 基于工作目录解析（不受 projects.yaml 所在位置影响）
    const absPath = path.resolve(process.cwd(), relPath);
    const slug = path.basename(absPath);

    const projectYamlPath = path.join(absPath, "project.yaml");
    const readmeConfigPath = path.join(absPath, "readme.config.yaml");

    // 加载 project.yaml
    let projectData = {};
    try {
      const raw = await fs.readFile(projectYamlPath, "utf-8");
      projectData = yaml.parse(raw);
    } catch (err) {
      throw new Error(
        `❌ 无法加载 ${slug} 的 project.yaml：${projectYamlPath}`,
      );
    }

    // 加载 readme.config.yaml（可选）
    let readmeConfig = {};
    try {
      const raw = await fs.readFile(readmeConfigPath, "utf-8");
      readmeConfig = yaml.parse(raw);
    } catch (err) {
      if (cli.verbose) {
        console.warn(`⚠️ ${slug} 项目没有 readme.config.yaml，跳过配置读取`);
      }
    }

    results.push({
      slug,
      projectDir: absPath,
      projectYamlPath,
      readmeConfigPath,
      projectData,
      readmeConfig,
    });
  }

  context.projects = results;

  if (cli.verbose) {
    console.log(`[loadProjects] 成功加载 ${results.length} 个项目`);
    for (const p of results) {
      console.log(`- ${p.slug} @ ${p.projectDir}`);
    }
  }

  return context;
}
