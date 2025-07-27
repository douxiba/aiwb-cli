import * as projectsModule from "../modules/projects.module.js";

// 模拟 context 对象（根据你项目结构可能需要修改）
const context = {
  cli: {
    verbose: true,
    configPath: "./config/aiwb.config.yaml", // 你的主配置文件路径
  },
  config: {
    config: {
      data: {
        projects: "./config/aiwb.projects.yaml", // 这里是实际的项目列表路径
      },
    },
  },
};

export default async function () {
  console.log("✅ 测试 getAllProjects...");
  const allProjects = await projectsModule.getAllProjects(context);
  console.log(`共加载项目数: ${allProjects.length}`);

  console.log("\n✅ 测试 getProjectBySlug...");
  const slug = allProjects[0]?.slug;
  if (slug) {
    const proj = await projectsModule.getProjectBySlug(context, slug);
    console.log(`找到 slug 为 "${slug}" 的项目:`, proj?.projectDir);
  }

  console.log("\n✅ 测试 getProjects 过滤功能（slug 包含 'demo'）...");
  const filtered = await projectsModule.getProjects(context, (p) =>
    p.slug.includes("demo"),
  );
  console.log(`过滤后项目数: ${filtered.length}`);
  filtered.forEach((p) => console.log(`- ${p.slug}`));

  console.log("\n✅ 测试 getProject (基于路径)...");
  const someProject = allProjects[0];
  if (someProject) {
    const byPath = await projectsModule.getProject(
      context,
      someProject.projectDir,
    );
    console.log("根据路径查找成功:", byPath?.slug);
  }
}
