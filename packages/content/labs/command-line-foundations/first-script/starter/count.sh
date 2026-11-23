#!/bin/sh
# Counts the orders of the day. Sol, 2025.
wc -l < orders/today.csv
echo "Counted."
