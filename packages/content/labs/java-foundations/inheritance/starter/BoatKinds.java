// Three new kinds of boat. Run this file in the terminal with: java BoatKinds.java
//
// 1. Write BikeFerry, a boat that carries bikes
// 2. Write NightBoat, with a fare of its own
// 3. Write CharterBoat, which says who hired it

public class BoatKinds {
    public static void main(String[] args) {
        // main is yours: try your boats here, and take the // off a group of lines once its
        // class is written.
        Boat linnet = new Boat("Linnet", 12);
        System.out.println(linnet.describe() + ", adult fare " + linnet.fareFor(40));

        // BikeFerry cormorant = new BikeFerry("Cormorant", 24, 10);
        // System.out.println(cormorant.describe() + ", " + cormorant.getBikeSpaces() + " bike spaces");

        // Boat shearwater = new NightBoat("Shearwater", 12);
        // System.out.println("At night an adult pays " + shearwater.fareFor(40));

        // Boat petrel = new CharterBoat("Petrel", 6, "Struan");
        // System.out.println(petrel.describe());
    }
}

// Every boat Lanternquay has. Use it as it is: the new kinds of boat extend it.
class Boat {
    private String name;
    private int seats;

    Boat(String name, int seats) {
        this.name = name;
        this.seats = seats;
    }

    String getName() {
        return name;
    }

    int getSeats() {
        return seats;
    }

    int fareFor(int age) {
        if (age < 16) {
            return 160;
        }
        return 320;
    }

    String describe() {
        return name + ": " + seats + " seats";
    }
}

// Task 1: Write BikeFerry, a boat that carries bikes
// Write a class BikeFerry that extends Boat. It adds an int bikeSpaces, a constructor
// BikeFerry(String name, int seats, int bikeSpaces) that hands the name and the seats to
// Boat's constructor, and a method int getBikeSpaces().

// Task 2: Write NightBoat, with a fare of its own
// Write a class NightBoat that extends Boat, with a constructor NightBoat(String name,
// int seats). It overrides fareFor, marked @Override: at night under 16 travel free and
// everyone else pays 450.

// Task 3: Write CharterBoat, which says who hired it
// Write a class CharterBoat that extends Boat. It adds a String hiredBy, a constructor
// CharterBoat(String name, int seats, String hiredBy), and overrides describe, marked
// @Override: Boat's own describe, then ", hired by " and the name, as in
// Petrel: 6 seats, hired by Struan. The first part comes from Boat's describe itself.
