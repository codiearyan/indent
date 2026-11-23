// The clipboard at the ticket hut. Run it in the terminal with: java Clipboard.java
//
// 1. Name the crossing
// 2. Count the seats left
// 3. Board the passengers
// 4. Write down the fare
// 5. Give a and b real names

public class Clipboard {
    public static void main(String[] args) {
        // This morning's numbers from the clipboard. Check tries other numbers on these two lines,
        // so build on the names seats and boarded, not on the numbers themselves.
        int seats = 48;
        int boarded = 15;

        // Task 1: Name the crossing
        // Make a String called crossing that holds the text Lanternquay to Corran. Then print it.
        String crossing = "Lanternquay to Corran";
        System.out.println(crossing);

        // Task 2: Count the seats left
        // Make an int called seatsLeft. It starts with the number of seats on the boat, which is
        // in seats above. Then print it.
        int seatsLeft = seats;
        System.out.println(seatsLeft);

        // Task 3: Board the passengers
        // boarded passengers just got on. Give seatsLeft a new value: the seats left after they
        // board. Then print it again.
        seatsLeft = seatsLeft - boarded;
        System.out.println(seatsLeft);

        // Task 4: Write down the fare
        // Make a double called fare that holds 3.20, the price of a single crossing in pounds.
        // Then print it.
        double fare = 3.20;
        System.out.println(fare);

        // Task 5: Give a and b real names
        // Nobody can tell what a and b hold. Rename a to skipper and b to boatName, everywhere
        // they appear.
        String skipper = "Ossian";
        String boatName = "Linnet";
        System.out.println("Skipper: " + skipper);
        System.out.println("Boat: " + boatName);
    }
}
