// The orders of the noticeboard. Run this file in the terminal with: java BoardOrders.java
//
// 1. Write the earliest-first order as a lambda
// 2. Ask which departures have room for a party
// 3. Order the board by boat, then by room

import java.util.*;

public class BoardOrders {
    public static void main(String[] args) {
        // main is yours: try your types here, and take the // off a group of lines once what
        // it uses is written.
        List<Departure> today = List.of(
            new Departure("Linnet", 13, 4),
            new Departure("Gannet", 9, 12),
            new Departure("Linnet", 9, 7),
            new Departure("Curlew", 15, 0),
            new Departure("Gannet", 11, 4));

        // List<Departure> byHour = new ArrayList<>(today);
        // byHour.sort(Orders.earliestFirst());
        // System.out.println(byHour);

        // RoomCheck forFour = Window.roomFor(4);
        // for (Departure d : today) {
        //     System.out.println(d.boat() + " at " + d.hour() + ": " + forFour.fits(d));
        // }

        // List<Departure> board = new ArrayList<>(today);
        // board.sort(Boards.byBoatThenRoom());
        // System.out.println(board);
    }
}

// One departure on the board: the boat, the hour it leaves and the seats still free. Use it as
// it is.
record Departure(String boat, int hour, int seatsFree) {
}

// Task 1: Write the earliest-first order as a lambda
// Write a class Orders with a method static Comparator<Departure> earliestFirst(). It gives
// back a comparator, written as a lambda, that puts the departure with the earlier hour first.
// Two departures at the same hour compare as 0, whatever their boats.

// Task 2: Ask which departures have room for a party
// Write a functional interface RoomCheck whose one method is boolean fits(Departure d). Then
// write a class Window with a method static RoomCheck roomFor(int party). It gives back a
// RoomCheck, written as a lambda, that says yes for a departure with at least party seats free.

// Task 3: Order the board by boat, then by room
// Write a class Boards with a method static Comparator<Departure> byBoatThenRoom(). It gives
// back a comparator that puts the departures in alphabetical order of their boats, and the
// departures of the same boat with most seats free first. Two departures of the same boat with
// the same seats free compare as 0.
