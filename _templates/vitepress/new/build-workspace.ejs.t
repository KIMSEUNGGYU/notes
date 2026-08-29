---
to: .scripts/build.mjs
inject: true
before: "// hygen:workspaces"
---
  { name: '<%= name %>', outputDir: '<%= name %>' },
