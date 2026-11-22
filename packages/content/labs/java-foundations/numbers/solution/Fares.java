// The fares and counts on the clipboard. Run it in the terminal with: java Fares.java
//
// 1. Price the return ticket
// 2. Count the full trips
// 3. Work out the average crossing
// 4. Number the ticket

public class Fares {
    public static void main(String[] args) {
        // Today's numbers from the clipboard. Check tries other numbers on these lines, so build
        // on the names, not on the numbers themselves.
        int singleFarePence = 320;
        int queue = 100;
        int seats = 48;
        int passengersToday = 57;
        int crossingsToday = 12;
        int dateCode = 20261123;
        int ticketOfDay = 57;

        // Task 1: Price the return ticket
        // A return ticket costs two single fares, less 40 pence for buying both at once. Make an
        // int called returnFarePence that holds it, in pence.
        int returnFarePence = singleFarePence * 2 - 40;

        // Task 2: Count the full trips
        // queue people wait on the quay, and the boat takes seats people a trip. Make an int called
        // fullTrips: how many full boatloads the queue fills. Then make an int called leftOver:
        // how many people are left on the quay after those full trips.
        int fullTrips = queue / seats;
        int leftOver = queue % seats;

        // Task 3: Work out the average crossing
        // Make a double called averagePerCrossing: the passengers today divided by the crossings
        // today, keeping the part after the point.
        double averagePerCrossing = (double) passengersToday / crossingsToday;

        // Task 4: Number the ticket
        // A ticket's number is the date code followed by five digits for the ticket of the day:
        // ticket 57 on 20261123 is 2026112300057. Make a long called ticketNumber that holds it:
        // the date code times 100000, plus the ticket of the day.
        long ticketNumber = dateCode * 100000L + ticketOfDay;
    }
}
