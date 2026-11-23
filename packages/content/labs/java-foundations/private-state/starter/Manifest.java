// Who is on board each boat. Run this file in the terminal with: java Manifest.java
//
// 1. Keep the boat's fields private
// 2. Board and land passengers, never more than the seats
// 3. Hand out a copy of the passenger list
// 4. Say what a boat is when it is printed

import java.util.ArrayList;

public class Manifest {
    public static void main(String[] args) {
        // main is yours: try your boat here, and take the // off a line once what it uses is
        // written.
        // Boat gannet = new Boat("Gannet", 3);
        // System.out.println(gannet.getName() + " has " + gannet.getSeats() + " seats");
        // gannet.board("Ishbel");
        // gannet.board("Rab");
        // gannet.board("Morag");
        // System.out.println("Room for one more? " + gannet.board("Wen"));
        // gannet.land("Rab");
        // ArrayList<String> list = gannet.passengers();
        // list.clear();
        // System.out.println(gannet.countAboard() + " aboard");
        // System.out.println(gannet);
    }
}

class Boat {
    // Task 1: Keep the boat's fields private
    // Boat has three private fields: a String name, an int seats and an ArrayList<String>
    // aboard, the names of the people on board. Write them, a constructor Boat(String name,
    // int seats) that starts with nobody aboard, and three methods: String getName(),
    // int getSeats() and int countAboard().

    // Task 2: Board and land passengers, never more than the seats
    // Write boolean board(String passenger): while a seat is free it adds the passenger and
    // gives back true; on a full boat it changes nothing and gives back false. Write
    // boolean land(String passenger): it takes that passenger off and gives back true, or gives
    // back false when nobody of that name is aboard. It builds on Task 1.

    // Task 3: Hand out a copy of the passenger list
    // Write ArrayList<String> passengers(). It gives back a new list of the names aboard, in
    // the order they boarded, so that changing that list never changes who is aboard. It
    // builds on Tasks 1 and 2.

    // Task 4: Say what a boat is when it is printed
    // Write public String toString(). It gives back the boat's name, how many are aboard and
    // how many seats are free, in the form Linnet: 4 aboard, 8 free. It builds on Tasks 1
    // and 2.
}
