# Ghooks integration test repo

> This repo demonstrates ghooks integration with cz-customizable.

## Installation

1. Clone this folder to your machine.
1. Run `git init` to create a new git repo in this folder.
1. Run `npm i` to install ghooks and cz-customizable-ghooks.

### If contributing to `cz-customizable-ghooks`

1. In the `cz-customizable-ghooks` folder, run `npm link` to link the package.
1. In the `examples/ghooks` folder, run `npm link cz-customizable-ghooks`

## Usage

Make changes to `text.txt` and then try to commit the changes using different commit messages.

```
# Make a change to text.txt

# Example of an incorrect message
git add text.txt && git commit -m "hello: this should not work"

# Example of a correct message
git add text.txt && git commit -m "feat(exampleScope): did something amazing"

```
