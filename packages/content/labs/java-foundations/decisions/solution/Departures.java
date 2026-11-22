// The departures board at the ticket hut. Run it in the terminal with: java Departures.java
//
// 1. Is the boat full?
// 2. Can the boat sail?
// 3. Set the board
// 4. Charge the right fare

public class Departures {
    public static void main(String[] args) {
        // The next crossing, from the clipboard. Check tries other values on these lines, so
        // build on the names, not on the values themselves.
        int passengers = 41;
        int seats = 48;
        int windKnots = 18;
        boolean fog = false;
        int singleFarePence = 320;
        int age = 12;

        // Task 1: Is the boat full?
        // Make a boolean called full: true when passengers is equal to seats or more, false
        // otherwise.
        boolean full = passengers >= seats;

        // Task 2: Can the boat sail?
        // Ossian sails when the wind is below 30 knots and there is no fog. Make a boolean called
        // canSail: true when both are so, false otherwise.
        boolean canSail = windKnots < 30 && !fog;

        // Task 3: Set the board
        // Make a String called status for the departures board: Cancelled when the boat cannot
        // sail, otherwise Full when the boat is full, otherwise Boarding. canSail and full from
        // Tasks 1 and 2 already say both.
        String status;
        if (!canSail) {
            status = "Cancelled";
        } else if (full) {
            status = "Full";
        } else {
            status = "Boarding";
        }

        // Task 4: Charge the right fare
        // Make an int called farePence for one passenger of this age: children under 5 travel
        // free, children under 16 pay half the single fare, everyone else pays the single fare.
        int farePence;
        if (age < 5) {
            farePence = 0;
        } else if (age < 16) {
            farePence = singleFarePence / 2;
        } else {
            farePence = singleFarePence;
        }
    }
}
