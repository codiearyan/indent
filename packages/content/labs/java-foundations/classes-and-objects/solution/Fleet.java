// Lanternquay has two boats now. Run this file in the terminal with: java Fleet.java
//
// 1. Write the Boat class
// 2. Write the Ticket class, with a copy for the next passenger
// 3. Write the Crossing class, which may have no boat yet

public class Fleet {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a group of lines once its
        // class is written.
        Boat linnet = new Boat();
        linnet.name = "Linnet";
        linnet.seats = 12;
        linnet.aboard = 7;
        Boat gannet = new Boat();
        gannet.name = "Gannet";
        gannet.seats = 30;
        System.out.println(linnet.name + ": " + linnet.seatsFree() + " seats free");
        System.out.println(gannet.name + ": " + gannet.seatsFree() + " seats free");

        Ticket first = new Ticket();
        first.passenger = "Morag";
        first.pence = 320;
        Ticket second = first.copyFor("Lachie");
        System.out.println(first.passenger + " and " + second.passenger);

        Crossing early = new Crossing();
        early.hour = 7;
        System.out.println(early.boatName());
    }
}

// Task 1: Write the Boat class
// Write a class called Boat with three fields: a String name, an int seats and an int aboard,
// the people on board now. Give it a method int seatsFree() that gives back how many seats
// are free on this boat.
class Boat {
    String name;
    int seats;
    int aboard;

    int seatsFree() {
        return seats - aboard;
    }
}

// Task 2: Write the Ticket class, with a copy for the next passenger
// Write a class called Ticket with two fields, a String passenger and an int pence, and a
// method Ticket copyFor(String who). It gives back a new ticket for who at the same fare, and
// leaves this ticket as it was.
class Ticket {
    String passenger;
    int pence;

    Ticket copyFor(String who) {
        Ticket copy = new Ticket();
        copy.passenger = who;
        copy.pence = pence;
        return copy;
    }
}

// Task 3: Write the Crossing class, which may have no boat yet
// Write a class called Crossing with two fields, an int hour and a Boat boat, and a method
// String boatName(). It gives back the name of the crossing's boat, or No boat when the
// crossing has not been given a boat.
class Crossing {
    int hour;
    Boat boat;

    String boatName() {
        if (boat == null) {
            return "No boat";
        }
        return boat.name;
    }
}
