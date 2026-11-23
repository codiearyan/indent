// The waiting list at the ticket hut. Run it in the terminal with: java WaitingList.java
//
// 1. Make the waiting list
// 2. Find the last name on the list
// 3. Keep the loads of the crossings that sailed
// 4. Cancel every booking under a name

import java.util.ArrayList;

public class WaitingList {
    public static void main(String[] args) {
        // main is yours: try your methods here, and take the // off a line once its method is
        // written.
        String[] queue = {"Morag", "Lachie", "Ishbel", "Torquil", "Mhairi"};
        // ArrayList<String> waiting = waitingList(queue, 3);
        // System.out.println(waiting);
        // System.out.println(lastOnList(waiting));
        // System.out.println(sailedLoads(new int[] {12, 0, 30, 8}));

        ArrayList<String> bookings = new ArrayList<>();
        bookings.add("Seonag");
        bookings.add("Rab");
        bookings.add("Seonag");
        // cancel(bookings, "Seonag");
        System.out.println("Bookings: " + bookings);
    }

    // Task 1: Make the waiting list
    // Write a method called waitingList. It takes a String[] of the people in the queue, in
    // order, and an int, the seats on the boat. The first ones in the queue take the seats; it
    // gives back a new ArrayList<String> of everyone after them, in queue order.

    // Task 2: Find the last name on the list
    // Write a method called lastOnList. It takes an ArrayList<String> and gives back a String:
    // the last name on it, or Nobody when the list is empty. It leaves the list as it is.

    // Task 3: Keep the loads of the crossings that sailed
    // Write a method called sailedLoads. It takes an int[] of passengers, one per crossing, and
    // gives back a new ArrayList<Integer> of the counts above 0, in order. Walk the array with a
    // for-each loop.

    // Task 4: Cancel every booking under a name
    // Write a void method called cancel. It takes an ArrayList<String> of bookings and a String,
    // a name, and removes every booking under that name from the list it was given. The other
    // bookings stay, in their order.
}
