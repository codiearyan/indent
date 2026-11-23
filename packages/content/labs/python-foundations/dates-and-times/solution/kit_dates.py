# Kit dates. Run this file with: python3 kit_dates.py
#
# Task 1: When it went out
# Task 2: Days since the last check
# Task 3: When the next check is due
# Task 4: A line for the report

# The sign-out book writes when a piece of kit went out as day/month/year hours:minutes. The
# kit sheet writes the date of each item's last check as year-month-day. Check calls your
# functions with dates of its own, far from today, and hands today in as a value.
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

signed_out = "14/03/2026 22:40"
last_check = "2026-01-09"

print("Stretcher signed out:", signed_out)
print("Stretcher last checked:", last_check)

# Task 1: When it went out
# Write the line that imports what this file needs from the datetime module. Then write a
# function called out_time that takes a time from the sign-out book, as text, and gives back
# a datetime. Print what it gives back for signed_out.
from datetime import date, datetime, timedelta


def out_time(text):
    return datetime.strptime(text, "%d/%m/%Y %H:%M")


print(out_time(signed_out))

# Task 2: Days since the last check
# Write a function called days_since that takes the date of a last check, as text written
# year-month-day, and today, a date, and gives back how many days have passed since the check,
# a whole number. Print what it gives back for last_check and date(2026, 3, 14).
def days_since(checked, today):
    return (today - date.fromisoformat(checked)).days


print(days_since(last_check, date(2026, 3, 14)))

# Task 3: When the next check is due
# Write a function called next_check that takes the year, the month and the day of a check,
# three whole numbers, and how many days until the next one, and gives back the date of the
# next check, a date. Print what it gives back for 2026, 1, 9 and 90.
def next_check(year, month, day, every):
    return date(year, month, day) + timedelta(days=every)


print(next_check(2026, 1, 9, 90))

# Task 4: A line for the report
# Write a function called report_line that takes a datetime and gives back a text such as
# "Saturday 14 March 2026, 22:40": the day of the week from DAYS, the day of the month with no
# 0 in front, the month from MONTHS, the year, a comma, and the time as hours:minutes. Print
# what it gives back for out_time(signed_out).
def report_line(when):
    day = DAYS[when.weekday()]
    month = MONTHS[when.month - 1]
    return f"{day} {when.day} {month} {when.year}, {when:%H:%M}"


print(report_line(out_time(signed_out)))
