# Objects with their own functions

## What you will be able to do

The candle cards of the catalogue were objects, and functions such as `sell(card, 3)` were handed a card to work on. There is another way to arrange the same code: the object carries its own functions, and you write `card.sell(3)`. JavaScript has a tool for making many objects like that, the class. By the end of this issue you will be able to:

- give an object a method that works on it through `this`
- write a class with a constructor and methods, and make objects from it with `new`
- build one class on another with `extends` and `super`
- keep `this` when a method is handed to other code, and say when a plain object is the better choice

## The request from Ines

> **Ines:** I am pouring a limited edition for winter, only twenty candles ever, and its label should say so. And Theo hooked up the new till, which is supposed to take the candles off the stock once a customer has paid. It stops with an error about undefined every time.

All four tasks are in `src/candles.js`.

## Methods and this

A function kept on an object is a method, and you wrote some in the issue on helpers that remember. A method can work on the object it belongs to through `this`:

```js
const kettle = {
  litres: 0,
  fill(amount) {
    this.litres = this.litres + amount
  }
}

kettle.fill(2) // kettle.litres is now 2
```

`this` is the object before the dot of the call: in `kettle.fill(2)`, it is `kettle`. The method works on whatever object it is called on, so the same method serves every kettle.

An arrow function has no `this` of its own. Written as `fill: (amount) => { ... }`, the method stops with `TypeError: Cannot read properties of undefined (reading 'litres')`, because `this` is `undefined` inside it. Write methods the short way above: the name, the parameters, then the body.

## A class

When there are many objects of the same shape with the same methods, a class describes them once, and `new` makes each one:

```js
class Kettle {
  constructor(name) {
    this.name = name
    this.litres = 0
  }

  fill(amount) {
    this.litres = this.litres + amount
  }

  label() {
    return `${this.name}: ${this.litres} litres`
  }
}

const big = new Kettle('Big kettle')
big.fill(2)
big.label() // 'Big kettle: 2 litres'
```

`new Kettle('Big kettle')` makes a new object and runs the `constructor` on it, with `this` being that new object. Give every property its first value there, so an object is complete the moment it is made. The methods follow, with no commas between them and no word `function`. Each kettle keeps its own properties and shares the methods. A class name starts with a capital letter, and it is exported like a function: `export` in front of the word `class`.

Forget `new` and the class refuses: `TypeError: Class constructor Kettle cannot be invoked without 'new'`.

## One class built on another

A travel kettle is a kettle with a limit. `extends` builds it on `Kettle`, so it has every method of `Kettle` and adds only what is different:

```js
class TravelKettle extends Kettle {
  constructor(name, most) {
    super(name)
    this.most = most
  }

  label() {
    return `${super.label()}, holds ${this.most}`
  }
}
```

`super(name)` runs the constructor of `Kettle`, which sets `name` and `litres`. It must come before any use of `this`. Without it, Node stops with `ReferenceError: Must call super constructor in derived class before accessing 'this' or returning from derived constructor`. `super.label()` calls the label of `Kettle`, so the new label builds on the old one instead of copying it. `fill` comes from `Kettle` without being written again. One class built on another is usually enough; long chains get hard to follow.

## Passing a method

In the issue on passing functions, you handed functions to other functions. Handing over a method needs care:

```js
function twice(action) {
  action(1)
  action(1)
}

twice(big.fill) // TypeError: Cannot read properties of undefined (reading 'litres')
```

`big.fill` without brackets is the method on its own. When `twice` calls it as `action(1)`, there is nothing before the dot, so `this` is `undefined`. Hand over a small function that calls the method on its object instead:

```js
twice((amount) => big.fill(amount))
```

Here the arrow is just right: it calls `fill` with `big` before the dot.

## Plain object or class?

A class pays off when many objects share the same behaviour and each keeps its own state, which changes over time: a candle with its stock and the methods that change it. A plain object and functions are the better choice for data that is saved, sent or loaded: `JSON.stringify(big)` gives `{"name":"Big kettle","litres":4}`, without the methods or the class, and `JSON.parse` gives back a plain object. They are better too for data that only holds values, and for a job one function can do. Most of this repo did well without a class, and that was the right choice.

## Your work in this issue

Open `src/candles.js`. Task 1 gives a card its own `sell`. Task 2 writes the class `Candle`, and Task 3 builds `LimitedCandle` on it. Task 4 hands the till a way to sell once a payment comes in. Run `node src/candles.js` after each task: each line at the bottom tries one task. Check makes candles of its own, and for Task 4 it uses a candle of its own, so that task does not depend on your class.
