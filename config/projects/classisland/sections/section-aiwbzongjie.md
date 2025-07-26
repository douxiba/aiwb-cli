---
isBoldSoftwareName: true
referenceLinks:
  - name: "Avalonia"
    url: "https://avaloniaui.net/"
  - name: "X11"
    url: "https://zh.wikipedia.org/zh-tw/X%E8%A6%96%E7%AA%97%E7%B3%BB%E7%B5%B1"
  - name: "Skia"
    url: "https://skia.org/"
  - name: "WPF"
    url: "https://zh.wikipedia.org/wiki/Windows_Presentation_Foundation"
  - name: "DirectX"
    url: "https://zh.wikipedia.org/zh-tw/DirectX"
  - name: "Material Design 2"
    url: "https://m2.material.io/"
  - name: "MaterialDesignInXamlToolkit"
    url: "https://github.com/MaterialDesignInXAML/MaterialDesignInXamlToolkit"
  - name: "EdgeTTS"
    url: "https://github.com/rany2/edge-tts"
  - name: "CSES"
    url: "https://github.com/SmartTeachCN/CSES"
---

ClassIsland 是一款专为教室或班级多媒体屏幕设计的课表信息显示工具，它借鉴了 iOS 灵动岛的设计理念，在 Windows 系统上（2025/07/20 修订：目前 ClassIsland 正在基于跨平台 UI 框架 Avalonia 开发跨平台版本，支持 Windows 和 Linux X11 平台，换成 Avalonia 的最大好处就是用上了 Skia 渲染，摆脱了 WPF 古老的 DirectX 9，提升了渲染性能，动画也变得更好看了）实现了动态美观的课表展示。软件整体使用 Material Design 2 设计（使用的是 WPF 的 MaterialDesignInXamlToolkit UI 库来实现的），支持显示今日课表、上下课提醒（含音效、语音、动画特效等，语音可以使用系统自带 TTS，或者是 EdgeTTS，甚至可以用 GPT-Sovits），并可灵活设置课程表界面的隐藏方式以不干扰正常教学授课。同时内置高效易用的课表编辑器，支持从 Excel、CSES 等多种来源导入导出（CSES 是通用课表交换格式），并允许临时换课、轮换周表等复杂管理。用户可以通过添加组件（如时间、天气、倒计日）和插件进行个性化定制，还能自定义主题界面。软件还提供天气预报、自动化操作、权限保护、动画过渡、系统色适配（支持提取壁纸主色）、自动更新等辅助功能，适合在班级一体机上高效的显示课表。
