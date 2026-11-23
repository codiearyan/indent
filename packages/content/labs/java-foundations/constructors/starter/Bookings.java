// Bookings for the Gannet's first week. Run this file in the terminal with: java Bookings.java
//
// 1. Give Booking a constructor
// 2. Add a constructor for one seat
// 3. Count how often a booking moves

public class Bookings {
    public static void main(String[] args) {
        // main is yours: try your constructors here, and take the // off a line once what it
        // uses is written.
        // Booking family = new Booking("Ishbel", 4, 9);
        // System.out.println(family.passenger + ": " + family.seats + " seats at " + family.hour);
        // Booking single = new Booking("Torquil", 14);
        // System.out.println(single.passenger + ": " + single.seats + " seat at " + single.hour);
        // single.moveTo(16);
        // System.out.println(single.passenger + " moved " + single.moves + " time, to " + single.hour);
    }
}

class Booking {
    // Task 1: Give Booking a constructor
    // Booking has three fields: a String passenger, an int seats and an int hour. Write them,
    // and a constructor Booking(String passenger, int seats, int hour) that gives each field
    // the value of the parameter with its name.

    // Task 2: Add a constructor for one seat
    // Write a second constructor, Booking(String passenger, int hour), for a booking of one
    // seat. It builds on Task 1.

    // Task 3: Count how often a booking moves
    // Add a field int moves, which no constructor sets, and a method void moveTo(int hour) that
    // gives the booking the new hour and adds one to moves. It builds on Task 1.
}
