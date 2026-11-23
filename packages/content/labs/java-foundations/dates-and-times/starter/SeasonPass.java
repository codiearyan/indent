// Season passes and the timetable's days. Run this file in the terminal with: java SeasonPass.java
//
// 1. Make dates and times
// 2. Count to a date
// 3. Print the day for the timetable

import java.time.*;
import java.time.format.*;
import java.time.temporal.*;
import java.util.*;

public class SeasonPass {
    public static void main(String[] args) {
        // main is yours: try your classes here, and take the // off a group of lines once what
        // it uses is written. The methods are handed today's date: here main asks the clock.
        LocalDate today = LocalDate.now();
        System.out.println("Today is " + today);

        // System.out.println(Dates.departure("2031-03-04", "14:05"));
        // System.out.println(Dates.onClipboard(4, 3, 2031));

        // LocalDate bought = LocalDate.of(2031, 1, 31);
        // System.out.println("Bought " + bought + ", runs out " + Passes.expires(bought, 1));
        // System.out.println(Passes.daysLeft(today, Passes.expires(bought, 1)) + " days left");
        // System.out.println(Passes.crossingMinutes(Dates.departure("2031-03-04", "23:40"), Dates.departure("2031-03-05", "00:25")) + " minutes");

        // System.out.println(Timetable.heading(today) + ": " + (Timetable.runs(today) ? "boats run" : "no boats"));
    }
}

// Task 1: Make dates and times
// Write a class Dates with two methods. static LocalDateTime departure(String day, String time)
// gives back the date and time a day such as "2031-03-04" and a time such as "14:05" say; a
// text that is not one lets its exception reach the caller. static LocalDate onClipboard(int
// day, int month, int year) gives back that date; a date that does not exist lets its
// exception reach the caller.

// Task 2: Count to a date
// Write a class Passes with three methods. static LocalDate expires(LocalDate bought, int
// months) gives back the day a pass bought on bought for that many months runs out: the same
// day of the month, months later, or the last day of a shorter month. static long
// daysLeft(LocalDate today, LocalDate expires) gives back the days from today to expires, 0 on
// the day itself and below 0 once it has run out. static long crossingMinutes(LocalDateTime
// leaves, LocalDateTime arrives) gives back the minutes from leaves to arrives.

// Task 3: Print the day for the timetable
// Write a class Timetable with two methods. static String heading(LocalDate day) gives back the
// day as the timetable heads it, in English whatever the computer's language: the day of the
// week, the day of the month, the month's name and the year, as in Tuesday 4 March 2031.
// static boolean runs(LocalDate day) says whether boats run that day: every day but Sunday.
