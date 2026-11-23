// Everything the hut can book. Run this file in the terminal with: java Reservations.java
//
// 1. Write Bookable, and a bike shed that is bookable
// 2. Write TourBus, which is bookable and departing
// 3. Book a whole trip, or none of it

import java.util.ArrayList;

public class Reservations {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        // Bookable shed = new BikeShed(6);
        // System.out.println(shed.label() + ": " + shed.placesFree() + " free");

        // TourBus bus = new TourBus(20, 14);
        // System.out.println(bus.label() + " leaves at " + bus.departsAt());

        // ArrayList<Bookable> trip = new ArrayList<>();
        // trip.add(shed);
        // trip.add(bus);
        // System.out.println("Room for Peigi's four? " + Trip.bookAll(trip, 4));
        // System.out.println(shed.label() + ": " + shed.placesFree() + " free");
    }
}

// Things that leave at a set hour. Use it as it is.
interface Departing {
    int departsAt();
}

// Task 1: Write Bookable, and a bike shed that is bookable
// Write an interface Bookable with three methods: String label(), int placesFree() and
// boolean book(int places). Then write a class BikeShed that implements Bookable, with a
// constructor BikeShed(int bikes). Its label is Bike shed. book takes the places and gives
// back true while there are enough free; otherwise it changes nothing and gives back false.

// Task 2: Write TourBus, which is bookable and departing
// Write a class TourBus that implements both Bookable and Departing, with a constructor
// TourBus(int seats, int hour). Its label is Tour bus, book works as the bike shed's does,
// and departsAt gives back the hour.

// Task 3: Book a whole trip, or none of it
// Write a class Trip with a method static boolean bookAll(ArrayList<Bookable> parts,
// int places). When every part has that many places free it books them on each part and
// gives back true. When any part is short it books nothing at all and gives back false.
