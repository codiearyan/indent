// The hut's own exceptions. Run this file in the terminal with: java HutRules.java
//
// 1. Write NoRoomException, which says how many seats are free
// 2. Throw it when a boat is full, and catch it by its name
// 3. Wrap a bad ledger line, and keep the cause

public class HutRules {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        try {
            throw new NoRoomException("Linnet", 2);
        } catch (NoRoomException e) {
            System.out.println(e.getMessage() + " (" + e.seatsFree() + ")");
        }

        System.out.println(Booking.answer("Gannet", 6, 4));
        System.out.println(Booking.answer("Gannet", 6, 9));

        try {
            System.out.println(Lines.seatsOn("09:00,Linnet,9"));
            System.out.println(Lines.seatsOn("11:00,Gannet,nine"));
        } catch (BadLineException e) {
            System.out.println(e.getMessage() + ", because of " + e.getCause());
        }
    }
}

// Task 1: Write NoRoomException, which says how many seats are free
// Write a class NoRoomException, a checked exception, with a constructor
// NoRoomException(String boat, int seatsFree). Its message names the boat and the seats free,
// as in No room on Linnet: 2 seats free, and a method int seatsFree() gives back the seats free.
class NoRoomException extends Exception {
    private final int seatsFree;

    NoRoomException(String boat, int seatsFree) {
        super("No room on " + boat + ": " + seatsFree + " seats free");
        this.seatsFree = seatsFree;
    }

    int seatsFree() {
        return seatsFree;
    }
}

// Task 2: Throw it when a boat is full, and catch it by its name
// Write a class Booking with two methods. static String reserve(String boat, int free,
// int wanted) gives back Booked 3 on Linnet, with the places wanted and the boat. Fewer than 1
// place wanted is refused with an IllegalArgumentException whose message names the places.
// More places than are free throws a NoRoomException for that boat with the seats free.
// static String answer(String boat, int free, int wanted) gives back what reserve gives back,
// or, when there is no room, Only 2 left on Linnet, with the seats free that the exception
// holds. A caller of answer needs no try, and fewer than 1 place still reaches the caller.
class Booking {
    static String reserve(String boat, int free, int wanted) throws NoRoomException {
        if (wanted < 1) {
            throw new IllegalArgumentException("A booking needs at least 1 place, not " + wanted);
        }
        if (wanted > free) {
            throw new NoRoomException(boat, free);
        }
        return "Booked " + wanted + " on " + boat;
    }

    static String answer(String boat, int free, int wanted) {
        try {
            return reserve(boat, free, wanted);
        } catch (NoRoomException e) {
            return "Only " + e.seatsFree() + " left on " + boat;
        }
    }
}

// Task 3: Wrap a bad ledger line, and keep the cause
// Write a class BadLineException, a checked exception, with a constructor
// BadLineException(String line, Throwable cause): its message names the line, and it keeps the
// cause. Then write a class Lines with a method static int seatsOn(String line), for ledger
// lines such as 09:00,Linnet,9. It gives back the seats, the third part. When the line has no
// third part, or it is not a whole number, it throws a BadLineException for the line, with the
// exception Java threw as its cause. A null line is a mistake in the calling code: its
// exception must reach the caller as it is.
class BadLineException extends Exception {
    BadLineException(String line, Throwable cause) {
        super("Bad ledger line: " + line, cause);
    }
}

class Lines {
    static int seatsOn(String line) throws BadLineException {
        String[] parts = line.split(",");
        try {
            return Integer.parseInt(parts[2]);
        } catch (NumberFormatException e) {
            throw new BadLineException(line, e);
        } catch (ArrayIndexOutOfBoundsException e) {
            throw new BadLineException(line, e);
        }
    }
}
