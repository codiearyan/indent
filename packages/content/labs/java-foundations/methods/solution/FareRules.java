// Bridie's fare rules, as methods. Run it in the terminal with: java FareRules.java
//
// 1. Write childFare
// 2. Write printTicket
// 3. Write partyFare
// 4. Make seatsAfter give back the seats

public class FareRules {
    public static void main(String[] args) {
        // main is yours: try your methods here. Take the // off a line once its method is
        // written, and change the values to see what comes back.
        System.out.println(childFare(320));
        printTicket("Corran", 320);
        System.out.println(partyFare(2, 3, 320));

        int seatsLeft = 48;
        seatsLeft = seatsAfter(seatsLeft, 5);
        System.out.println("Seats left: " + seatsLeft);
    }

    // Task 1: Write childFare
    // Write a method called childFare. It takes one int, the single fare in pence, and gives
    // back an int: half of it, in whole pence. Write all of it, from static to its closing brace.
    static int childFare(int singleFarePence) {
        return singleFarePence / 2;
    }

    // Task 2: Write printTicket
    // Write a void method called printTicket. It takes a String, the destination, then an int,
    // the fare in pence, and prints one line like this: Ticket to Corran, 320 pence
    static void printTicket(String destination, int farePence) {
        System.out.println("Ticket to " + destination + ", " + farePence + " pence");
    }

    // Task 3: Write partyFare
    // Write a method called partyFare. It takes three ints: the adults, the children and the
    // single fare in pence. It gives back what the whole party pays: each adult pays the single
    // fare, and each child pays the child fare. Call childFare for a child's fare.
    static int partyFare(int adults, int children, int singleFarePence) {
        return adults * singleFarePence + children * childFare(singleFarePence);
    }

    // Task 4: Make seatsAfter give back the seats
    // Ossian's method below should take the passengers who board off the seats left, but in
    // main seatsLeft never changes. Make it give back, as an int, the seats left after the
    // passengers board, and never less than 0.
    static int seatsAfter(int seatsLeft, int boarding) {
        if (boarding > seatsLeft) {
            return 0;
        }
        return seatsLeft - boarding;
    }
}
