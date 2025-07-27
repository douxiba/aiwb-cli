// commands/generate/renderGlobalTemplate.js
import path from "path";
import chalk from "chalk";

export async function renderGlobalTemplate(context) {
  const { cli, config } = context;

  const relTemplatePath = config.config.refs.template;
  const absTemplatePath = path.resolve(process.cwd(), relTemplatePath);

  const rendered = await context.module$base_renderTemplate(absTemplatePath);

  context.renderedReadme = rendered;

  if (cli.verbose) {
    console.log(
      chalk.greenBright("[renderGlobalTemplate] README 模板渲染完成"),
    );
    console.log(context.renderedReadme);
  }

  return context;
}
