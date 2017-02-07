# cz-customizable-ghooks

Integrate [cz-customizable](https://github.com/leonardoanalista/cz-customizable) config with [ghooks](https://github.com/gtramontina/ghooks) or [husky](https://github.com/typicode/husky) to use a single configuration for commit message generation AND commit message validation.

[![Build Status](https://travis-ci.org/uglow/cz-customizable-ghooks.svg?branch=master)](https://travis-ci.org/uglow/cz-customizable-ghooks)
<!--[RM_BADGES]-->
[![NPM Version](https://img.shields.io/npm/v/cz-customizable-ghooks.svg?style=flat-square)](http://npm.im/cz-customizable-ghooks)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Coverage Status](https://coveralls.io/repos/github/uglow/cz-customizable-ghooks/badge.svg?branch=master)](https://coveralls.io/github/uglow/cz-customizable-ghooks?branch=master)
[![Dependencies status](https://david-dm.org/uglow/cz-customizable-ghooks/status.svg?theme=shields.io)](https://david-dm.org/uglow/cz-customizable-ghooks#info=dependencies)
[![Dev-dependencies status](https://david-dm.org/uglow/cz-customizable-ghooks/dev-status.svg?theme=shields.io)](https://david-dm.org/uglow/cz-customizable-ghooks#info=devDependencies)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)


<!--[]-->
## Purpose

This package validates that a git commit message matches the rules defined in your `cz-customizable` config file (see [cz-customizable](https://github.com/leonardoanalista/cz-customizable)).
[Example commit message rules](test/fixtures/fullCommitMessageConfig.js).

## Prerequisites

- git
- Node >= 4.x
- [commitizen](https://github.com/commitizen/cz-cli)
- [cz-customizable](https://github.com/leonardoanalista/cz-customizable)
- [ghooks](https://github.com/gtramontina/ghooks) or [husky](https://github.com/typicode/husky)

Make sure you have a git repository (`git init`) BEFORE installing ghooks, otherwise you have to take extra steps if you install ghooks before running `git init`.

## Installation

This package is designed to be used in conjunction with `commitizen`, `cz-customizable` and either `ghooks` or `husky`.


1. Install pre-requisites (if not already installed):
  ```
  npm i commitizen -g
  npm i cz-customizable cz-customizable-ghooks
  ```
  
2. Configure cz-customizable in `package.json`:
  ```
  "config": {
    "cz-customizable": {
      "config": "path/to/your/cz-customizable-rules.js"
    }
  }
  ```


3. Install ONE of these git hook packages:

<details>
<summary>ghooks</summary>

1. Install ghooks:
  ```
  npm i ghooks
  ```
  
2. Configure `package.json`:
  ```
  "config": {
    ...
    "ghooks": {
      "commit-msg": "cz-customizable-ghooks $2"
    }
  }
  ```
  
</details>
  

<details>
<summary>husky</summary>

1. Install husky:
```
npm i husky
```
2. Configure `package.json`:
```
  "scripts": {
    "commitmsg": "cz-customizable-ghooks"
  }
```
</details>


## Usage

Commit your changes to git as normal. If the commit message entered is invalid, the commit will be rejected with an error message (according to the rules specified in your cz-customizable config).
Works with git command-line and visual Git tools (such as SourceTree).
