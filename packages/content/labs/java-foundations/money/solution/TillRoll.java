// The till at the hut, in pounds and pence. Run this file in the terminal with: java TillRoll.java
//
// 1. Add up the till
// 2. Price a group and share a bill
// 3. Print an amount, and read one back

import java.math.*;
import java.util.*;

public class TillRoll {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        double oldTill = 0.10 + 0.20;
        System.out.println("The old till says 0.10 + 0.20 is " + oldTill);

        List<String> morning = List.of("3.35", "1.70", "3.35", "0.10", "0.20");
        System.out.println("This morning: " + Till.total(morning));
        System.out.println("2.0 and 2.00 the same? " + Till.sameAmount(new BigDecimal("2.0"), new BigDecimal("2.00")));

        System.out.println("A party of 6 at 3.35: " + Pricing.groupFare(new BigDecimal("3.35"), 6));
        System.out.println("10.00 shared by 3: " + Pricing.share(new BigDecimal("10.00"), 3));

        System.out.println(Printer.ticketLine(new BigDecimal("1.7")));
        System.out.println(Printer.readAmount(" £3.35 "));
    }
}

// Task 1: Add up the till
// Write a class Till with two methods. static BigDecimal total(List<String> prices) gives back
// the prices added up, each price written as text such as "3.35", and 0 for no prices.
// static boolean sameAmount(BigDecimal a, BigDecimal b) says whether a and b are the same
// amount of money, so 2.0 and 2.00 are the same.
class Till {
    static BigDecimal total(List<String> prices) {
        BigDecimal sum = BigDecimal.ZERO;
        for (String price : prices) {
            sum = sum.add(new BigDecimal(price));
        }
        return sum;
    }

    static boolean sameAmount(BigDecimal a, BigDecimal b) {
        return a.compareTo(b) == 0;
    }
}

// Task 2: Price a group and share a bill
// Write a class Pricing with two methods. static BigDecimal groupFare(BigDecimal adult, int
// people) gives back the adult fare times people, less 15 percent (times 0.85), rounded once,
// at the end, to two decimal places, a half penny up. static BigDecimal share(BigDecimal total,
// int people) gives back what each of people pays of total: total divided by people, to two
// decimal places, a half penny up.
class Pricing {
    static BigDecimal groupFare(BigDecimal adult, int people) {
        BigDecimal full = adult.multiply(BigDecimal.valueOf(people));
        return full.multiply(new BigDecimal("0.85")).setScale(2, RoundingMode.HALF_UP);
    }

    static BigDecimal share(BigDecimal total, int people) {
        return total.divide(BigDecimal.valueOf(people), 2, RoundingMode.HALF_UP);
    }
}

// Task 3: Print an amount, and read one back
// Write a class Printer with two methods. static String ticketLine(BigDecimal amount) gives
// back the amount as the ticket shows it: a pound sign, then the amount with exactly two
// decimal places, a half penny up, with a point and nothing else, as in £1.70.
// static BigDecimal readAmount(String text) gives back the amount a text such as " £3.35 " says,
// spaces at either end left off, and the pound sign when there is one. When the rest is not an
// amount, it throws an IllegalArgumentException whose message names the text, with the first
// exception as its cause.
class Printer {
    static String ticketLine(BigDecimal amount) {
        return "£" + amount.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    static BigDecimal readAmount(String text) {
        String rest = text.trim();
        if (rest.startsWith("£")) {
            rest = rest.substring(1);
        }
        try {
            return new BigDecimal(rest);
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Not an amount: " + text, e);
        }
    }
}
