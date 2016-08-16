# cz-customizable-ghooks

Integrate cz-customizable config with ghooks to use a single configuration for commit message generation AND commit message hooks.

[![NPM](https://nodei.co/npm/cz-customizable-ghooks.png?downloads=true)](https://npmjs.org/package/cz-customizable-ghooks)

[![NPM Version](https://img.shields.io/npm/v/cz-customizable-ghooks.svg?style=flat-square)](http://npm.im/cz-customizable-ghooks)
[![Build Status](https://travis-ci.org/uglow/cz-customizable-ghooks.svg?branch=master)](https://travis-ci.org/uglow/cz-customizable-ghooks)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Dependencies status](https://david-dm.org/uglow/cz-customizable-ghooks/status.svg?theme=shields.io)](https://david-dm.org/uglow/cz-customizable-ghooks#info=dependencies)
[![Dev Dependencies status](https://david-dm.org/uglow/cz-customizable-ghooks/dev-status.svg?theme=shields.io)](https://david-dm.org/uglow/cz-customizable-ghooks#info=devDependencies)


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
      "commit-msg": "./node_modules/cz-customizable-ghooks/lib/index.js $2"
    }
  }
...
```
