# Constructors: a booking made whole

## What you will be able to do

The fleet runs on classes now, and every boat, ticket and crossing is an object. But each one is built in steps: `new`, then a line per field. Forget a line and the object goes out half filled in, and nobody notices until it matters. A constructor makes an object whole in one step, so it cannot exist without its values. By the end of this issue you will be able to:

- write a constructor that sets every field when the object is made
- use `this` to tell a field from a parameter with the same name
- give a class a second constructor with fewer parameters
- say what Java puts in a field that nobody sets, and read the errors constructors bring

## The request from Bridie

> **Bridie:** Ossian took a booking for the Gannet on Saturday and never put in the seats. It showed nought, so we let the boat go with a family of four still on the quay. Every booking needs its passenger, its seats and its hour from the start. Most people book a single seat, so make that quick. And I want to see how often a booking has been moved, people keep changing their minds.

All three tasks are in `Bookings.java`.

## A constructor runs when the object is made

A constructor looks like a method with two differences: its name is exactly the class's name, and it has no type in front, not even `void`. `new` runs it, with the values you pass:

```java
class Stall {
    String goods;
    int jars;

    Stall(String goods, int jars) {
        this.goods = goods;
        this.jars = jars;
    }
}
```

```java
Stall honey = new Stall("Honey", 40);
```

One line, and the stall has its goods and its jars. The values must fit the parameters, as with any method call. Once a class has a constructor of its own, `new Stall()` with nothing is refused: `constructor Stall in class Stall cannot be applied to given types`, followed by `required: String,int` and `found: no arguments`. Every stall now has to be made with its values.

Put `void` in front by mistake and it is no longer a constructor but a method that happens to be called `Stall`. It never runs when a stall is made, and `new Stall("Honey", 40)` is refused with the same message, `required: no arguments`.

## this: the object being made

Inside the constructor above, the parameter `goods` has the same name as the field `goods`. The nearest name wins, so `goods` alone means the parameter. `this` is the object the constructor is making, and `this.goods` is its field. So `this.goods = goods;` puts the parameter's value in the field.

Two slips are easy here. `goods = goods;` compiles, but gives the parameter its own value, and the field stays empty. `String goods = goods;` is refused: `variable goods is already defined in constructor Stall(String,int)`, because a parameter is already a variable of that name. A new variable inside the constructor, even with another parameter name, is a new variable and not the field. `this` works in any method of the class, not only in constructors.

## A second constructor

A class can have more than one constructor, as long as their parameters differ in number or type. `new` picks the one that fits:

```java
Stall(String goods) {
    this(goods, 10);
}
```

`this(...)` as the first line hands the work to the other constructor, so the rule for setting the fields is written once. It has to be the very first line, or the compiler says `call to this must be first statement in constructor`. You can also set each field again in the second constructor; then check you set every one.

## What Java gives a field nobody sets

A field always has a value, even when no line gives it one. Java starts every number field at 0, every `double` at 0.0, every `boolean` at `false`, and every field whose type is a class, `String` included, at `null`. So a field that counts something can start at 0 without a line of yours, and a field a constructor forgets keeps that quiet default instead of a value. That is how the booking on Saturday showed nought seats: nobody had set them.

Local variables are different: a variable made inside a method has no value until you give it one, and using it before is refused with `might not have been initialized`, as you saw in an earlier issue.

## Your work in this issue

Open `Bookings.java`. `main` is yours: take the `//` off its lines once what they use is written. Everything you write goes inside the class `Booking`, under the `// Task` comments. Check makes bookings with your constructors and its own values, calls `moveTo`, and reads the fields. Tasks 2 and 3 build on Task 1.
