// Ossian's log of the day. Compile it with: javac Logbook.java
// Then run it with: java Logbook
//
// 1. Fix the name the compiler cannot find
// 2. Fix the type that does not fit
// 3. Give the notice a value every time
// 4. Stop the crash on a day without crossings

public class Logbook {
    public static void main(String[] args) {
        // Today's numbers. Check tries other values on these lines, so build on the names, not
        // on the values themselves.
        int seats = 48;
        int boarded = 31;
        String destination = "Corran";
        int windKnots = 34;
        int passengersToday = 0;
        int crossingsToday = 0;

        // Task 1: Fix the name the compiler cannot find
        // seatsLeft is the seats with the passengers who boarded taken away.
        int seatsLeft = seats - boarded;
        System.out.println("Seats left: " + seatsLeft);

        // Task 2: Fix the type that does not fit
        // code is the luggage tag: the first three letters of the destination, in capitals.
        String code = destination.substring(0, 3).toUpperCase();
        System.out.println("Tag: " + code);

        // Task 3: Give the notice a value every time
        // When the wind is 30 knots or more the notice says No crossings today. Otherwise it
        // says Boats running.
        String notice;
        if (windKnots >= 30) {
            notice = "No crossings today";
        } else {
            notice = "Boats running";
        }
        System.out.println(notice);

        // Task 4: Stop the crash on a day without crossings
        // averageLoad is the passengers today divided by the crossings today, in whole
        // passengers. On a day without crossings it is 0, and the log carries on.
        int averageLoad;
        if (crossingsToday == 0) {
            averageLoad = 0;
        } else {
            averageLoad = passengersToday / crossingsToday;
        }
        System.out.println("Average load: " + averageLoad);

        System.out.println("Log written");
    }
}
