# Your first program

## What you will be able to do

Lanternquay Ferries runs one small boat, the Linnet, across the river to the Corran side. Bridie sells the tickets from a hut on the quay, and everything the company knows sits on her clipboard: the timetable, the fares, the passengers. Ossian skippers the boat. They want the clipboard on a computer, and they asked you, although you have never written a program. This issue starts at the very first step. By the end of it you will be able to:

- run a Java program in the terminal
- make it print lines of text, on one line or several
- read what the compiler says when it refuses a line
- turn a line off with a comment, without deleting it

## The request from Bridie

> **Bridie:** Before we move the clipboard, show me the computer can do something useful. The notice on the hut is a mess of sticky tape. Can your program print it instead? The welcome, the crossing times, our hours. And take off the line about free bicycles on Sundays. Ossian stopped that, but keep it somewhere, he changes his mind.

Everything here happens in one file, `Notice.java`.

## A program is a list of instructions

A Java program is plain text in a file whose name ends in `.java`. Inside it are instructions, called statements, and the computer carries them out one after another, from top to bottom. You run the program by typing a command in the terminal, the panel below the editor:

```
java Notice.java
```

Behind that one command are two steps. First the compiler reads the whole file and checks that every line is Java it understands. Only if every line passes does the program run. A later issue does the two steps one at a time; for now `java` with the file's name does both. Run it as often as you like.

## The frame around your code

Open `Notice.java` and you will find a few lines around the statements:

```java
public class Notice {
    public static void main(String[] args) {
        System.out.println("Good morning from the ticket hut");
    }
}
```

Every Java program has this frame. For now, treat its words as words to copy; later issues explain each one. In short, `class Notice` names the program, and the name after `class` must be the file's name without `.java`, capital letters included. `main` is where the program starts: Java runs the statements between its braces `{` and `}`. Each `{` has a `}` that closes it, which is why the file ends with two.

The name rule is strict. If the class is called `Notise` in `Notice.java`, the compiler says `class Notise is public, should be declared in a file named Notise.java`. `java Notice.java` lets it slip, but Check does not, and the compiler you meet later does not either.

## Printing with println and print

To make the program show something in the terminal, you print it:

```java
System.out.println("The kettle is on");
```

`System.out.println` means "print this, then end the line". Text sits inside double quotes, so Java knows where it starts and ends, and it is printed exactly as written. The statement ends with a semicolon `;`, the full stop of Java.

`System.out.print` prints without ending the line, so whatever prints next carries on right after it:

```java
System.out.print("Tea ");
System.out.println("is served");
```

That prints one line, `Tea is served`. Note the space inside the first text: nothing is added between the two parts. Capital letters count everywhere in Java: `System` with a capital S, `println` all in small letters.

## When the compiler says no

Sooner or later the compiler will refuse a line. Nothing runs, and it prints an error instead:

```
Notice.java:3: error: ';' expected
        System.out.println("The kettle is on")
                                              ^
1 error
```

Read it from the left: the file, the line number, and what it expected. The line is shown again with a `^` under the spot. Here the `^` sits just after the last thing on the line that is missing its semicolon.

A misspelt name gives `cannot find symbol`, followed by the name it did not know: write `Println` and it says `symbol: method Println(String)`. Write `system` with a small s and it says `package system does not exist`. Text in single quotes gives `unclosed character literal`: single quotes hold one character only.

Fix the line the first error points at, then run again. The compiler sometimes stops at the first problem it finds, so a second error may appear once the first is gone.

## Comments are notes for people

A comment is text the compiler skips. It starts with two slashes, and everything after them on that line is ignored:

```java
// The opening hours, for the sign on the door
System.out.println("Open from nine");
```

Comments leave notes for the next reader, and they switch a line off: put `//` in front of a statement and it no longer runs, but it stays in the file.

## Your work in this issue

Open `Notice.java`. The comment at the top lists four tasks, and each has its own `// Task` part inside `main`. Run `java Notice.java` first to see what it prints today. Then work through the tasks in order, running the program after each change. When it looks right, press Check: it compiles and runs each task's lines on their own and reads what they print.
