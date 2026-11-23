// What a day of crossings costs. Run this file in the terminal with: java Takings.java
//
// 1. Write Vessel, which no boat is just by itself
// 2. Write Ferry and WaterTaxi, each with its own fare
// 3. Add up a day of trips on any kind of vessel

import java.util.ArrayList;

public class Takings {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written.
        Vessel linnet = new Ferry("Linnet");
        Vessel eider = new WaterTaxi("Eider");
        System.out.println(linnet.fareLine(9));
        System.out.println(eider.fareLine(40));

        ArrayList<Vessel> trips = new ArrayList<>();
        trips.add(linnet);
        trips.add(eider);
        System.out.println("Struan's day costs " + DayTrips.cost(trips, 40) + "p");
    }
}

// Task 1: Write Vessel, which no boat is just by itself
// Write an abstract class Vessel with a private String name, a constructor Vessel(String name),
// a method String getName(), an abstract method int fareFor(int age) that every kind of vessel
// writes, and a method String fareLine(int age) that gives back the name and that vessel's fare
// for the age, as in Linnet: 160p.
abstract class Vessel {
    private String name;

    Vessel(String name) {
        this.name = name;
    }

    String getName() {
        return name;
    }

    abstract int fareFor(int age);

    String fareLine(int age) {
        return name + ": " + fareFor(age) + "p";
    }
}

// Task 2: Write Ferry and WaterTaxi, each with its own fare
// Write a class Ferry and a class WaterTaxi, each extending Vessel, each with a constructor
// that takes the name. On a ferry under 16 pay 160 and everyone else 320. The water taxi
// charges 600 whatever the age.
class Ferry extends Vessel {
    Ferry(String name) {
        super(name);
    }

    @Override
    int fareFor(int age) {
        if (age < 16) {
            return 160;
        }
        return 320;
    }
}

class WaterTaxi extends Vessel {
    WaterTaxi(String name) {
        super(name);
    }

    @Override
    int fareFor(int age) {
        return 600;
    }
}

// Task 3: Add up a day of trips on any kind of vessel
// Write a class DayTrips with a method static int cost(ArrayList<Vessel> trips, int age): what
// one passenger of that age pays for all the trips in the list, each at its own vessel's fare.
class DayTrips {
    static int cost(ArrayList<Vessel> trips, int age) {
        int total = 0;
        for (Vessel trip : trips) {
            total += trip.fareFor(age);
        }
        return total;
    }
}
