# Money: pounds and pence that add up

## What you will be able to do

Until now every fare in this repo was a whole number of pence in an `int`. This part gives the hut real money, real dates and real files, and it starts with the money. By the end of this issue you will be able to:

- say why `0.1 + 0.2` is not `0.3` in a `double`, and why that matters at a till
- make a `BigDecimal` from text, add, subtract and multiply with it, and compare two amounts
- round to the penny with `setScale` and a `RoundingMode`, and divide with a number of decimal places
- write an amount out the same way on every computer, and read one back from text

## The request from Bridie

> **Bridie:** The council sent the new fares in pounds and pence, and the till we borrowed adds them up wrong. Ten pence and twenty pence came to 0.30000000000000004. Groups get 15 percent off now, the harbour office splits its bill between the boats, and the tickets need the amount printed properly.

All three tasks are in `TillRoll.java`.

## Why a double drifts

A `double` stores a number in binary, in a fixed number of bits. Most amounts with pence have no exact binary form, the way a third has no exact decimal form, so a `double` keeps the nearest number it can:

```java
System.out.println(0.1 + 0.2);    // 0.30000000000000004
```

The error is tiny and never goes away. Add a few hundred fares and it shows in the pence; round an amount that should end in exactly half a penny and the `double` may sit just under the half, and round down. A till cannot be nearly right.

## BigDecimal: an amount made from text

`BigDecimal`, in `java.math`, holds a decimal number exactly: its digits, and how many of them come after the point, called its scale. Make one from text, and it holds exactly what the text says:

```java
BigDecimal jar = new BigDecimal("2.35");    // 2.35, scale 2
```

Never make one from a `double`. `new BigDecimal(0.1)` faithfully keeps the `double`'s error: `0.1000000000000000055511151231257827021181583404541015625`. A text that is not an amount stops the program: `new BigDecimal("£2.35")` throws `java.lang.NumberFormatException: Character £ is neither a decimal digit number, decimal point, nor "e" notation exponential mark.`

A `BigDecimal` is an object, so `+` does not work on it. `jar + bag` is refused with `bad operand types for binary operator '+'`, and the lines under it name both types as `BigDecimal`. It has methods instead: `add`, `subtract` and `multiply`. Like a `String`, a `BigDecimal` never changes: each method gives back a new one.

```java
BigDecimal three = jar.multiply(new BigDecimal("3"));    // 7.05
jar.add(new BigDecimal("0.40"));                          // does nothing you can see
```

`BigDecimal.valueOf(3)` makes one from a whole number, and `BigDecimal.ZERO` is 0.

## Comparing amounts

`equals` compares the digits and the scale, so `new BigDecimal("2.0").equals(new BigDecimal("2.00"))` is `false`: to `equals`, those are different numbers. For money that is rarely what you mean. `compareTo` looks at the amount alone, as it did for things with an order in part 6: it gives back a number below 0, 0, or above 0, and `a.compareTo(b) == 0` says the two are the same amount. `<` and `>` do not work on a `BigDecimal`, and `==` asks whether two variables hold the very same object.

## Rounding to the penny

`setScale(2, mode)` gives back the amount with two decimal places, rounded the way `mode` says. `RoundingMode.HALF_UP` sends half a penny up and anything less down, the way most people round. `HALF_EVEN` sends a half to the even penny, so `2.345` becomes `2.34` while `2.355` becomes `2.36`; `UP` sends any part of a penny up, `DOWN` drops it. Without a mode, `setScale(2)` on `2.345` throws `java.lang.ArithmeticException: Rounding necessary`.

Round once, at the end. Take 10 percent off three jars at 2.35: rounding one jar's price first and then multiplying adds up the pennies each rounding moved, while rounding the whole 6.345 moves the total by less than a penny.

## Dividing

`divide` with nothing more wants an exact answer. Share 10.00 between 3, and there is none:

```
Exception in thread "main" java.lang.ArithmeticException: Non-terminating decimal expansion; no exact representable decimal result.
	at java.base/java.math.BigDecimal.divide(BigDecimal.java:1783)
	at Stall.main(Stall.java:5)
```

`sum.divide(BigDecimal.valueOf(3), 2, RoundingMode.HALF_UP)` keeps two decimal places and rounds: 3.33. Hand `divide` only a `RoundingMode` and it keeps the scale of `sum`, so a sum written as `10` gives back `3`.

## Writing an amount out

An amount prints as its digits and scale: `1.7` prints as `1.7`, so set the scale before printing it. `toPlainString()` writes it with a point, never with an exponent, on any computer. `String.format("%.2f", amount)` follows the language of the computer it runs on: on one set to German it writes `4,50`. Give it the language to use, as in `String.format(Locale.UK, "%.2f", amount)`, and it writes `4.50` everywhere.

## Your work in this issue

Open `TillRoll.java`. `main` is yours: take the `//` off a group of lines once what it uses is written, and run the file with `java TillRoll.java`. Write each class under its own `// Task` comment. Check hands every method amounts of its own, chosen so that a `double` on the way or a rounding at the wrong moment shows, and runs with numbers written the German way.
