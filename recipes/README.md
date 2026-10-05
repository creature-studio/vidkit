# recipes/

Short, copy-pasteable HTML pages that show how to compose vidkit modules.
Each file starts with an HTML comment front-matter block:

```
<!--
vk-recipe
id: my-recipe
title: Human title
tags: [a, b]
modules: [vk.three.terrain, vk.three.look]
styles: [ink]
cost: high
-->
```

`vk style gallery` lists them. `npm run docs` mirrors the index into `llms.txt` / `AGENTS.md`.
