# Modules and package.json

## What you will be able to do

The society now has a handful of scripts, and each one reads the plot list its own way. This last issue of the part is about how a Node project fits together: your own modules, the modules Node brings, and the file that describes the whole folder. By the end of it you will be able to:

- move shared code into a module of your own, and read the errors when an import is wrong
- use another of Node's built-in modules, `node:util`, to read options like `--row B`
- say what `package.json` is for and what its `type` field changes
- read `package.json` from a script, in two ways

## The request from Imran

> **Imran:** Last month I fixed the Windows line endings in one of the scripts, and another one still trips over them, because it has its own copy of the reading. Could the plot list be read in one place? And when I sit down at the laptop, I never know which version of the tools it has.

## Your own modules

Every `.js` file in your workspace is a **module**. What it exports, other files can import. Put the reading of the plot list in one module, and every script that needs it imports the same function, so a fix in one place fixes them all:

```js
// crops.js
export function sowingMonth(crop) {
  return crop === 'beans' ? 'March' : 'April'
}
```

```js
// sow.js
import { sowingMonth } from './crops.js'

console.log(`Sow beans in ${sowingMonth('beans')}.`)
```

Two rules catch everyone once. A file of your own is imported by its path, starting with `./` or `../`, and in a module the `.js` is not optional:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/srv/garden/crops' imported from /srv/garden/sow.js
Did you mean to import "./crops.js"?
```

And the names in curly braces must match a named export exactly:

```
SyntaxError: The requested module './crops.js' does not provide an export named 'sowingmonth'
```

`export default` is a different kind of export, imported without braces. This repo uses named exports. A module's code runs once, the first time something imports it, so a module that only shares functions should not print anything: the script that imports it decides what to say.

## Node's built-in modules

You have used `node:fs/promises` and `node:path`. Node brings many more, all imported the same way: `node:os` for facts about the computer, `node:readline` for reading line by line, `node:events`, `node:http` for servers and `node:child_process` for running other programs. You meet most of them in the next parts. `node:util` holds small helpers, and one of them reads options.

## Reading options with parseArgs

Many programs take **options**: named arguments that start with `--`, like `--crop beans`. Reading them by hand from `process.argv` is fiddly. `parseArgs` does it, and refuses what it was not told about:

```js
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { crop: { type: 'string' } } })
console.log(values.crop)
```

`type: 'string'` means the option takes a value. With `--crop beans`, `values.crop` is `'beans'`; with no `--crop`, it is `undefined`. For an option it does not know, like `--colour`, `parseArgs` throws an error whose message is `Unknown option '--colour'`; for `--crop` with nothing after it, `Option '--crop <value>' argument missing`. Those messages are written for a person, so catch the error and print its `message` as your one plain line.

## package.json

`package.json` sits at the top of a Node project and describes it, as JSON. Yours is short:

```json
{
  "name": "marrowfield-tools",
  "version": "0.1.0",
  "private": true,
  "type": "module"
}
```

`name` and `version` say what the project is and which release. `private: true` keeps it from being published by mistake. `type` changes how Node reads every `.js` file in the folder: `"module"` means they are modules with `import` and `export`, the kind this repo uses. Without it, Node takes them for the older kind, CommonJS, which uses `require()`; when it then finds an `import`, it reads the file again as a module and prints a warning that tells you to add `"type": "module"`. A file ending in `.mjs` is always a module and one ending in `.cjs` is always CommonJS, whatever `type` says. In bigger projects `package.json` also lists the packages the project depends on, which `npm install` downloads into `node_modules`. The scripts in this repo need none.

A script can read `package.json` like any JSON file: read its text and turn it into an object with `JSON.parse`. A module can also import it, if it says the file is JSON:

```js
import settings from './settings.json' with { type: 'json' }
```

Without the `with { type: 'json' }`, Node refuses: `needs an import attribute of "type: json"`.

## Your work in this issue

Write `plots.js` first, then `free-plots.js`, which uses it, then `version.js`. Task 4 adds the `--row` option to `free-plots.js`. Run `node free-plots.js --row B` and `node try.js free-plots.js --colour red` to see both sides of it.
