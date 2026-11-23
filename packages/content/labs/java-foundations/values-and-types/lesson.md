# Values, types and names

## What you will be able to do

The notice is printed and pinned on the hut, and Bridie is pleased. Now it is the first crossing of the morning, and the clipboard has numbers on it that change all day: the seats on the Linnet, the passengers who board, the fare. A program has to remember those numbers and change them, and that is what variables are for. By the end of this issue you will be able to:

- tell apart the main types of value: whole numbers, decimals, text and true or false
- keep a value under a name with its type in front
- give a variable a new value as things change
- read the compiler when a value does not fit its type, and choose names that say what a variable holds

## The request from Bridie

> **Bridie:** Every morning I write the seats on the clipboard, then cross them out each time people board, and by noon nobody can read it. Can the program keep the count instead? And Ossian left some lines where things are called a and b. I have no idea what they are.

All five tasks are in `Clipboard.java`.

## Every value has a type

Everything a program works with is a value, and in Java every value has a type that says what kind of thing it is. Four types will carry you a long way:

- `int` for whole numbers: `12`, `0`, `-3`
- `double` for numbers with a point: `1.5`, `0.25`
- `String` for text, in double quotes: `"Market"`, `"Open"`
- `boolean` for true or false: `true`, `false`

Note the capital S on `String`; the others are all small letters. `"12"` in quotes is a `String` that happens to look like a number, and Java will not do sums with it. One more type is `char`, a single character in single quotes, like `'A'`. That is why text in single quotes is refused: single quotes hold one character only.

## A variable keeps a value under a name

A variable is a name that holds a value. You make it with its type, its name, `=` and the value:

```java
int apples = 12;
System.out.println(apples);
```

Read the first line as "make an int called apples and put 12 in it". The `=` does not mean equals as in maths; it means "store the value on the right under the name on the left". When you write the name later, Java uses the value it holds, so the second line prints `12`. A variable can also start with the value of another one: `int applesToday = apples;`.

To print text and a value on one line, join them with `+`:

```java
double price = 1.50;
System.out.println("Price: " + price);
```

That prints `Price: 1.5`. A `double` prints without zeros it does not need, so `1.50` shows as `1.5`; the value is the same.

## Changing a value

To give a variable a new value, write its name, `=` and the new value, with no type in front:

```java
apples = apples - 5;
```

Read it as "take the value apples has now, take 5 away, and store the result back in apples". A variable is made once. Writing `int apples = ...` a second time gets the error `variable apples is already defined in method main(String[])`.

Sometimes a value must never change, like the number of seats a boat is built with. Then put `final` in front: `final int maxApples = 40;`. If a later line tries to change it, the compiler refuses it.

## When a value does not fit

The compiler checks every value against its type before anything runs. Put text into an `int` and it says:

```
Stall.java:3: error: incompatible types: String cannot be converted to int
        int apples = "twelve";
                     ^
```

Put a decimal into an `int` and it says `incompatible types: possible lossy conversion from double to int`: an `int` cannot hold the part after the point, so Java will not quietly throw it away.

Three more you will meet:

- `cannot find symbol` with `symbol: variable aples` means a name is misspelt, or used before the line that makes it. With `symbol: class string`, a type name has a small letter where a capital belongs.
- `variable plums might not have been initialized` means a variable was made without a value, as in `int plums;`, and used before it got one.
- A comma in a number, like `3,20`, is not a decimal point in Java. The compiler will not read it.

## Good names

Names have a few rules: no spaces, no starting with a digit, and capital letters count, so `seatsLeft` and `seatsleft` are two different variables. When a name has several words, Java joins them and starts each new word with a capital: `seatsLeft`, `firstCrossing`. A good name says what the variable holds. `a` tells the next reader nothing; `skipper` tells them everything. When you rename a variable, rename it everywhere, or the compiler reports `cannot find symbol` for the old name.

## Your work in this issue

Open `Clipboard.java`. Near the top of `main`, under "This morning's numbers", are two variables the clipboard gives you: the seats on the boat and the passengers who boarded. Check runs your lines with other numbers in their place, so build on those names rather than on the numbers. Do the tasks in order under their `// Task` comments, and run `java Clipboard.java` after each one to see the count change.
