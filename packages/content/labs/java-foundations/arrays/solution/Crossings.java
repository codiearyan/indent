// Ossian's log of the day's crossings, in an array. Run it with: java Crossings.java
//
// 1. Read the last crossing
// 2. Add up the day
// 3. Find the busiest crossing
// 4. Make the departures

public class Crossings {
    public static void main(String[] args) {
        // main is yours: try your methods here. Today's log has one number per crossing: the
        // passengers it carried, in the order the crossings left.
        int[] passengers = {12, 30, 8, 41, 26};
        System.out.println("Crossings today: " + passengers.length);
        System.out.println(lastCrossing(passengers));
        System.out.println(total(passengers));
        System.out.println(busiest(passengers));
        int[] hours = departures(7, 5);
        System.out.println(hours[0] + " to " + hours[hours.length - 1]);
    }

    // Task 1: Read the last crossing
    // Write a method called lastCrossing. It takes an int[] of passengers, one per crossing,
    // and gives back an int: the passengers of the last crossing. The log always has at least
    // one crossing, and it can be of any length.
    static int lastCrossing(int[] passengers) {
        return passengers[passengers.length - 1];
    }

    // Task 2: Add up the day
    // Write a method called total. It takes an int[] of passengers and gives back an int: all
    // of them added up. A day with no crossings has a total of 0.
    static int total(int[] passengers) {
        int sum = 0;
        for (int i = 0; i < passengers.length; i++) {
            sum = sum + passengers[i];
        }
        return sum;
    }

    // Task 3: Find the busiest crossing
    // Write a method called busiest. It takes an int[] of passengers, with at least one
    // crossing, and gives back the position of the crossing that carried the most. If two
    // carried the same most, give back the earlier one.
    static int busiest(int[] passengers) {
        int best = 0;
        for (int i = 1; i < passengers.length; i++) {
            if (passengers[i] > passengers[best]) {
                best = i;
            }
        }
        return best;
    }

    // Task 4: Make the departures
    // Write a method called departures. It takes two ints, firstHour and crossings, and gives
    // back a new int[] with one hour for each crossing: firstHour, the hour after, and so on.
    // For 7 and 3 that is 7, 8 and 9.
    static int[] departures(int firstHour, int crossings) {
        int[] hours = new int[crossings];
        for (int i = 0; i < hours.length; i++) {
            hours[i] = firstHour + i;
        }
        return hours;
    }
}
