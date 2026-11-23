// What the booking desk refuses. Run this file in the terminal with: java BookingDesk.java
//
// 1. Refuse an age that cannot be
// 2. Refuse a booking before it changes anything
// 3. Say a crossing is cancelled, and say it on the notice

public class BookingDesk {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a line once what it uses
        // is written. The last line is refused on purpose, so its exception ends the run.
        // System.out.println(Fares.fareFor(40));

        // Sailing linnet = new Sailing(12);
        // System.out.println(linnet.book(5) + ", " + linnet.free() + " free");
        // System.out.println(linnet.book(20) + ", " + linnet.free() + " free");

        // System.out.println(Crossings.notice(14, false));
        // System.out.println(Crossings.notice(16, true));

        // System.out.println(Fares.fareFor(-4));
    }
}

// A crossing called off by the weather. Use it as it is: it is a checked exception.
class CancelledException extends Exception {
    CancelledException(String message) {
        super(message);
    }
}

// Task 1: Refuse an age that cannot be
// Write a class Fares with a method static int fareFor(int age). It gives back 160 for an age
// under 16 and 320 for 16 and over. An age below 0 is refused: it throws an
// IllegalArgumentException whose message names the age.

// Task 2: Refuse a booking before it changes anything
// Write a class Sailing with a constructor Sailing(int seats), a method int free() that gives
// back the seats still free, and a method boolean book(int places). Fewer than 1 place is
// refused: book throws an IllegalArgumentException whose message names the places, and
// changes nothing. More places than are free is an answer, not a mistake: book gives back
// false and changes nothing. Otherwise it books the places and gives back true.

// Task 3: Say a crossing is cancelled, and say it on the notice
// Write a class Crossings with two methods. static String board(int hour, boolean gale) gives
// back Boarding the 14:00 crossing, with its hour. An hour below 0 or above 23 is refused with
// an IllegalArgumentException whose message names the hour, whatever the weather. In a gale it
// throws a CancelledException whose message names the crossing, as in 14:00. static String
// notice(int hour, boolean gale) gives back what board gives back, or, when the crossing is
// cancelled, Cancelled: and the exception's message. A caller of notice needs no try.
