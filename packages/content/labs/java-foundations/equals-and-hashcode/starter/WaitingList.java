// The waiting list for the Gannet's Saturday crossings. Run this file in the terminal with:
// java WaitingList.java
//
// 1. Say when two bookings are the same booking
// 2. Give equal bookings the same hash code
// 3. Take cancelled bookings off the waiting list

import java.util.ArrayList;
import java.util.Objects;

public class WaitingList {
    public static void main(String[] args) {
        // main is yours: try your methods here, and take the // off a line once what it uses
        // is written.
        ArrayList<Booking> saturday = new ArrayList<>();
        saturday.add(new Booking("Morag", 9, 2));
        saturday.add(new Booking("Lachie", 9, 1));
        saturday.add(new Booking("Ishbel", 14, 4));

        // Morag rings to cancel. Her booking is read in again from what she says on the phone.
        Booking call = new Booking("Morag", 9, 3);
        System.out.println("Is Morag waiting? " + saturday.contains(call));
        // System.out.println("Same hash code? " + (call.hashCode() == saturday.get(0).hashCode()));

        // ArrayList<Booking> cancelled = new ArrayList<>();
        // cancelled.add(call);
        // System.out.println(Booking.cancel(saturday, cancelled) + " taken off: " + saturday);
    }
}

// One booking on the waiting list. It is the same booking when the passenger and the hour are
// the same, even when the number of seats has changed since.
class Booking {
    private String passenger;
    private int hour;
    private int seats;

    Booking(String passenger, int hour, int seats) {
        this.passenger = passenger;
        this.hour = hour;
        this.seats = seats;
    }

    int getSeats() {
        return seats;
    }

    void setSeats(int seats) {
        this.seats = seats;
    }

    public String toString() {
        return passenger + " at " + hour + ":00, seats " + seats;
    }

    // Task 1: Say when two bookings are the same booking
    // Write public boolean equals(Object other). It gives back true when other is a Booking
    // with the same passenger and the same hour, whatever the seats, and false for anything
    // else, null included.

    // Task 2: Give equal bookings the same hash code
    // Write public int hashCode(), built from the same fields equals compares, so that equal
    // bookings always have the same hash code.

    // Task 3: Take cancelled bookings off the waiting list
    // Write static int cancel(ArrayList<Booking> waiting, ArrayList<Booking> cancelled). For each
    // booking in cancelled, it takes the booking equal to it off waiting, if there is one, and
    // gives back how many it took off. It builds on Task 1.
}
