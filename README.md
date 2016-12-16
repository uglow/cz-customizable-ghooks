# cz-customizable-ghooks

Integrate [cz-customizable](https://github.com/leonardoanalista/cz-customizable) config with [ghooks](https://github.com/gtramontina/ghooks) to use a single configuration for commit message generation AND commit message hooks.

[![Build Status](https://travis-ci.org/uglow/cz-customizable-ghooks.svg?branch=master)](https://travis-ci.org/uglow/cz-customizable-ghooks)
<!--[RM_BADGES]-->
[![NPM Version](https://img.shields.io/npm/v/cz-customizable-ghooks.svg?style=flat-square)](http://npm.im/cz-customizable-ghooks)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Coverage Status](https://coveralls.io/repos/github/uglow/cz-customizable-ghooks/badge.svg?branch=master)](https://coveralls.io/github/uglow/cz-customizable-ghooks?branch=master)
[![Dependencies status](https://david-dm.org/uglow/cz-customizable-ghooks/status.svg?theme=shields.io)](https://david-dm.org/uglow/cz-customizable-ghooks#info=dependencies)
[![Dev-dependencies status](https://david-dm.org/uglow/cz-customizable-ghooks/dev-status.svg?theme=shields.io)](https://david-dm.org/uglow/cz-customizable-ghooks#info=devDependencies)


<!--[]-->


## Prerequisites

- git
- Node >= 4.x
- [cz-customizable](https://github.com/leonardoanalista/cz-customizable)
- [ghooks](https://github.com/gtramontina/ghooks)

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
      "commit-msg": "./node_modules/cz-customizable-ghooks/lib/index.js $2"
    }
  }
...
```
