// test/banner.js
import { render } from "../modules/banner.module.js";

export default async () => {
  const context = { cli: { verbose: true } };
  const project = {
    metadata: {
      banners: [
        "https://img.shields.io/badge/banner-demo-blue",
        "./config/projects/classisland/assets/banner.png",
      ],
    },
  };

  const result = await render(context, project, {
    vals: { index: 1 },
  });

  console.log("是否成功：", result.isOk);
  console.log("生成内容：\n", result.rendered);
};
