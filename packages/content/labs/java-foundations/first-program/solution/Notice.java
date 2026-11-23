// The notice on the ticket hut. Run it in the terminal with: java Notice.java
//
// 1. Print the welcome
// 2. Print the crossing times
// 3. Print the hours on one line
// 4. Switch off the old notice

public class Notice {
    public static void main(String[] args) {
        System.out.println("Good morning from the ticket hut");

        // Task 1: Print the welcome
        // Print this line, exactly as it is written here: Welcome to Lanternquay Ferries
        System.out.println("Welcome to Lanternquay Ferries");

        // Task 2: Print the crossing times
        // Print these two lines, one after the other, in this order:
        //   Boats cross every half hour
        //   Last boat back at half past seven
        System.out.println("Boats cross every half hour");
        System.out.println("Last boat back at half past seven");

        // Task 3: Print the hours on one line
        // The two lines below print the hut's hours on two lines. Change how the first one
        // prints, so both parts come out on one line: Hut open from 6:30 to 20:00
        System.out.print("Hut open from 6:30 ");
        System.out.println("to 20:00");

        // Task 4: Switch off the old notice
        // The line below prints a notice the hut no longer runs. Turn that line into a comment,
        // so it stays in the file but does not run.
        // System.out.println("Bicycles cross free on Sundays");
    }
}
