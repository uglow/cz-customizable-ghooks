# cz-customizable-ghooks

Integrate cz-customizable config with ghooks to use a single configuration for commit message generation AND commit message hooks.

## Prerequisites

- git
- Node >= 4.x
- cz-customizable
- ghooks

Make sure you have a git repository (`git init`) BEFORE installing ghooks, otherwise you have to take extra steps if you install ghooks before running `git init`.

## Usage

```
npm i cz-customizable ghooks cz-customizable-ghooks
```

Then configure your package.json:

```
// inside package.json
...
  "config": {
    "cz-customizable": {
      "config": "path/to/your/cz-customizable-rules.js"
    },
    "ghooks": {
      "commit-msg": "./node_modules/cz-customizable-ghooks/index.js $2"
    }
  }
...
```
