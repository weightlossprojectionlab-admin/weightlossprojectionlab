#!/bin/bash
set -e

# Fix useRealtimeShoppingList.ts - requestedBy type issue (lines 109-112)
# Replace the entire case block
awk 'BEGIN {found=0}
/case .added.:/ {
  found=1
  print "        case '\''added'\'':';"
  print "          // New item added to shopping list"
  print "          const requestedBy = Array.isArray(item.requestedBy) ? item.requestedBy[0] : item.requestedBy"
  print "          if (requestedBy && requestedBy !== currentUser) {"
  print "            if (shouldShowNotification('\''shopping'\'', '\''addedToList'\'')) {"
  print "              toast("
  print "                `${getMemberName(requestedBy)} added ${item.productName} to shopping list`,"
  print "                {"
  print "                  icon: '\''📝'\'',"
  print "                  duration: 3000"
  print "                }"
  print "              )"
  print "            }"
  print "          }"
  print "          break"
  next
}
found && /break/ {
  found=0
  next
}
found { next }
{print}' hooks/useRealtimeShoppingList.ts > hooks/useRealtimeShoppingList.ts.tmp && mv hooks/useRealtimeShoppingList.ts.tmp hooks/useRealtimeShoppingList.ts

# Fix useGooglePlaces.ts - duplicate global declarations
# Remove lines 308-318 (the duplicate declaration)
sed -i '308,318d' hooks/useGooglePlaces.ts

echo "Remaining hook errors fixed"
