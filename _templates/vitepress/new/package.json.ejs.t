---
to: docs/<%= name %>/package.json
---
{
  "name": "<%= name %>",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vitepress dev .",
    "build": "vitepress build .",
    "preview": "vitepress preview ."
  },
  "devDependencies": {
    "vitepress": "catalog:",
    "vue": "catalog:"
  }
}
