// The day's timetable at the ticket hut. Run it in the terminal with: java Timetable.java
// The countdown in Task 1 never stops. When it runs away, press Ctrl+C in the terminal.
//
// 1. Stop the countdown that never ends
// 2. Print the day's departures
// 3. Add up the day's passengers
// 4. Count the years to the new fare
// 5. Find where the boat's name ends

public class Timetable {
    public static void main(String[] args) {
        // Today's numbers. Check tries other values on these lines, so build on the names, not
        // on the values themselves.
        int minutesToDeparture = 5;
        int firstHour = 7;
        int lastHour = 19;
        int rushEndsAt = 10;
        int rushPassengers = 40;
        int quietPassengers = 15;
        int farePence = 320;
        int targetPence = 500;
        String ticket = "Linnet 07:30 Corran";

        // Task 1: Stop the countdown that never ends
        // Ossian's countdown should print one line a minute, from minutesToDeparture down to 1,
        // then Boarding closed. It never stops. Fix it without changing what it prints.
        int minutes = minutesToDeparture;
        while (minutes > 0) {
            System.out.println("Boarding closes in " + minutes + " min");
            minutes = minutes - 1;
        }
        System.out.println("Boarding closed");

        // Task 2: Print the day's departures
        // A boat leaves every hour, on the hour, from firstHour to lastHour, both included. With
        // a for loop, print one line for each, like this: Departs 7:00
        for (int hour = firstHour; hour <= lastHour; hour++) {
            System.out.println("Departs " + hour + ":00");
        }

        // Task 3: Add up the day's passengers
        // Every departure from firstHour to lastHour carries rushPassengers if it leaves before
        // rushEndsAt, and quietPassengers otherwise. With a loop, make an int called
        // passengersToday: the passengers of all the day's departures added up.
        int passengersToday = 0;
        for (int hour = firstHour; hour <= lastHour; hour++) {
            if (hour < rushEndsAt) {
                passengersToday = passengersToday + rushPassengers;
            } else {
                passengersToday = passengersToday + quietPassengers;
            }
        }

        // Task 4: Count the years to the new fare
        // Each year the fare goes up by a twentieth of itself: farePence / 20, in whole pence.
        // With a while loop, make an int called years: how many years until the fare reaches
        // targetPence or more. If it is already there, years is 0.
        int years = 0;
        int fare = farePence;
        while (fare < targetPence) {
            fare = fare + fare / 20;
            years++;
        }

        // Task 5: Find where the boat's name ends
        // The ticket starts with the boat's name, then a space. Make an int called nameEnd: the
        // position of the first space in ticket, or the length of ticket if it has no space.
        // Walk the ticket with a loop, and stop it with break at the first space.
        int nameEnd = ticket.length();
        for (int i = 0; i < ticket.length(); i++) {
            if (ticket.charAt(i) == ' ') {
                nameEnd = i;
                break;
            }
        }
    }
}
