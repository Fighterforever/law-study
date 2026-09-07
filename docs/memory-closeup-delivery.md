# 记忆宫殿近景学习交付记录

30 个主题已经接入近景学习流程。执行范围见[整体改造计划](memory-closeup-plan.md)，逐主题分镜、中文动作与原生生成提示词见[美术记录](memory-closeup-art.md)。

## 已完成的内容

- 183 个原站点各有一帧独立近景；每主题有一帧易混变式，共 213 个学习镜头。
- 30 张旧总览保留。一般保证书房和三个案件背景也保留，既有结构图、案件任务与客观题继续使用。
- 每帧均按实际像素边界登记，处理了不等高分镜；网页每次只显示当前完整镜头。对照切换保持画框高度，避免页面跳动。
- 站点默认近景，总览用于定位。人物在做什么、在哪里核对文书与该站法律条件相邻呈现。
- 路线说明及来源按需展开；小屏幕切到下一站时返回场景位置。键盘在总览中可逐站选择。
- 遮讲解时收起动作、规则、答案性标题和悬停标签。闭卷只在主动使用提示后显示场景。
- 对照切换后收起理由，先作判断再核对；看图与对照不增加掌握分。
- 基础复述自评保留为本轮草稿，完成口头变式后才记正式成绩。变式前返回讲解也记为使用提示；本轮结果与薄弱点保留这一记录。
- 原考点、站点、题目 ID 和备份格式不变，已有进度可直接续用。

## 图片核对

30 张新图集均已查看，对照其逐站分镜和中文题意检查。制作中修正了市场经营者人数、保险待缴凭证、引渡独立审查文书、WTO 表决标记、仲裁对照构图和宪法程序卷。公款归属对照也已修正，画清封套收入本人文件夹与由他人接手的区别。

部分法律条件无法仅凭文书外观判断，例如人员职务、交费年限或审查事由。页面直接写明这些事实，再让学习者判断法律后果。图片保持地点和动作线索，完整规则仍在本站讲解及关联考点中。

## 素材清单

每个文件包含本站近景与一帧变式，放在 `public/memory-stations/`；帧坐标和站点映射以 `station-art.json` 为准。当前 30 张 WebP 合计约 9.74 MiB，学习时按当前主题加载。

| 主题图集 | 站点近景 | 变式 |
| --- | ---: | ---: |
| [company-corridor.webp](../public/memory-stations/company-corridor.webp) | 6 | 1 |
| [market.webp](../public/memory-stations/market.webp) | 8 | 1 |
| [insurance-house.webp](../public/memory-stations/insurance-house.webp) | 5 | 1 |
| [labor-station.webp](../public/memory-stations/labor-station.webp) | 5 | 1 |
| [ip-gallery.webp](../public/memory-stations/ip-gallery.webp) | 6 | 1 |
| [blocking-tower.webp](../public/memory-stations/blocking-tower.webp) | 4 | 1 |
| [extradition-airfield.webp](../public/memory-stations/extradition-airfield.webp) | 4 | 1 |
| [embassy-garden.webp](../public/memory-stations/embassy-garden.webp) | 8 | 1 |
| [industrial-checkpoints.webp](../public/memory-stations/industrial-checkpoints.webp) | 6 | 1 |
| [overseas-power.webp](../public/memory-stations/overseas-power.webp) | 4 | 1 |
| [trade-assembly.webp](../public/memory-stations/trade-assembly.webp) | 5 | 1 |
| [marriage-registry.webp](../public/memory-stations/marriage-registry.webp) | 5 | 1 |
| [foreign-terminal.webp](../public/memory-stations/foreign-terminal.webp) | 6 | 1 |
| [arbitration-observatory.webp](../public/memory-stations/arbitration-observatory.webp) | 6 | 1 |
| [execution-courtyard.webp](../public/memory-stations/execution-courtyard.webp) | 5 | 1 |
| [theory-law-foundry.webp](../public/memory-stations/theory-law-foundry.webp) | 7 | 1 |
| [theory-reasoning-observatory.webp](../public/memory-stations/theory-reasoning-observatory.webp) | 7 | 1 |
| [theory-constitutional-islands.webp](../public/memory-stations/theory-constitutional-islands.webp) | 6 | 1 |
| [theory-rights-water-town.webp](../public/memory-stations/theory-rights-water-town.webp) | 6 | 1 |
| [theory-state-airship.webp](../public/memory-stations/theory-state-airship.webp) | 6 | 1 |
| [theory-planning-beacon.webp](../public/memory-stations/theory-planning-beacon.webp) | 6 | 1 |
| [theory-judicial-academy.webp](../public/memory-stations/theory-judicial-academy.webp) | 7 | 1 |
| [theory-lawyer-atelier.webp](../public/memory-stations/theory-lawyer-atelier.webp) | 6 | 1 |
| [theory-aid-harbor.webp](../public/memory-stations/theory-aid-harbor.webp) | 7 | 1 |
| [theory-dynasty-river.webp](../public/memory-stations/theory-dynasty-river.webp) | 7 | 1 |
| [theory-civic-library.webp](../public/memory-stations/theory-civic-library.webp) | 7 | 1 |
| [criminal-rain-rescue.webp](../public/memory-stations/criminal-rain-rescue.webp) | 7 | 1 |
| [criminal-moon-market.webp](../public/memory-stations/criminal-moon-market.webp) | 7 | 1 |
| [criminal-trial-airship.webp](../public/memory-stations/criminal-trial-airship.webp) | 7 | 1 |
| [criminal-jade-treasury.webp](../public/memory-stations/criminal-jade-treasury.webp) | 7 | 1 |

## 检查与发布

- 2026-09-07：79 条必要单元测试全部通过，包含站点覆盖、图片及帧范围、变式关联、备份、评分和复测队列。
- 生产构建通过。既有主数据包仍有体积提示；本轮记忆页面保持独立加载，图集按当前主题请求。
- 应用版本由 `package.json` 管理，当前功能更新为 1.13.0。
- GitHub Pages 使用既有 main 分支发布工作流：[查看发布结果](https://github.com/Fighterforever/law-study/actions/workflows/pages.yml)。线上入口：[考前聚焦记忆宫殿](https://fighterforever.github.io/law-study/#/focus/memory)。
- 按项目要求，未进行冒烟测试或浏览器验收。

## 复习顺序

先看本站动作，核对条件；遮住讲解，自己说一遍。易混对照只改一个事实，先判断再展开理由。随后关图复述并做口头变式，最后回到对应客观题。隔日从薄弱站点撤掉提示再测，保留原有的考前排课与复测预算。
