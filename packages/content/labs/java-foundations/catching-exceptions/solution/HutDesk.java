// What Bridie types at the hut desk. Run this file in the terminal with: java HutDesk.java
//
// 1. Read a count of seats, or 0
// 2. Add up the day, past the smudges
// 3. Say who sits in a seat
//
// Nothing that Bridie types should stop the program. A mistake in the code that calls your
// methods should: let its exception reach the caller.

public class HutDesk {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a line once what it uses
        // is written.
        System.out.println(Counts.seats(" 12 "));
        System.out.println(Counts.seats("twelve"));
        System.out.println(Day.summary(new String[] { "4", "five", " 2 " }));
        String[] gannet = { "Ossian", "Bridie", "Murdo" };
        System.out.println(Seats.holder(gannet, "2"));
        System.out.println(Seats.holder(gannet, "9"));
    }
}

// Task 1: Read a count of seats, or 0
// Write a class Counts with a method static int seats(String typed). It gives back the whole
// number in typed, with any spaces around it left out, and 0 when typed is not a whole number.
// It prints nothing. A null typed is a mistake in the calling code: its exception must reach
// the caller.
class Counts {
    static int seats(String typed) {
        String trimmed = typed.trim();
        try {
            return Integer.parseInt(trimmed);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}

// Task 2: Add up the day, past the smudges
// Write a class Day with a method static String summary(String[] typed). It adds up the whole
// numbers in typed, each with any spaces around it left out, and counts the ones it could not
// read, as in 6 seats, 1 not read. One that cannot be read never stops the others being
// added. A null in typed is a mistake in the calling code: its exception must reach the
// caller.
class Day {
    static String summary(String[] typed) {
        int seats = 0;
        int notRead = 0;
        for (String entry : typed) {
            String trimmed = entry.trim();
            try {
                seats += Integer.parseInt(trimmed);
            } catch (NumberFormatException e) {
                notRead++;
            }
        }
        return seats + " seats, " + notRead + " not read";
    }
}

// Task 3: Say who sits in a seat
// Write a class Seats with a method static String holder(String[] seats, String typed). seats
// holds a name for each seat, seat 1 first, and typed is a seat number as Bridie typed it. It
// gives back the name in that seat. When typed is not a whole number it gives back
// Not a seat number: and what was typed, and when the boat has no such seat it gives back
// No such seat: and the message of the exception Java threw. A null seats is a mistake in the
// calling code: its exception must reach the caller.
class Seats {
    static String holder(String[] seats, String typed) {
        int number;
        try {
            number = Integer.parseInt(typed);
        } catch (NumberFormatException e) {
            return "Not a seat number: " + typed;
        }
        try {
            return seats[number - 1];
        } catch (ArrayIndexOutOfBoundsException e) {
            return "No such seat: " + e.getMessage();
        }
    }
}
