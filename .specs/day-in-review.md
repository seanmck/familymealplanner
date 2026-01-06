# Day in Review PRD
## Overview

The "day in review" (DIR) page provides an easy way to capture how the day of meals went: what got eaten and what didn't, how people felt about the meals, and whether any leftovers were generated that might be usuable for future meals.

### Entry point

The DIR page is reachable from the day details (DD) page, but it is a separate page. This ensures that the DD page can stay focused on presentation, while DIR can be optimized for data entry.

### Page layout

The page should be optimized for capturing input on dinner, since that's where there will typically be the most experimentation. For each family member, it should be easy to capture (one click) the overall review (using existing recipe rating system). In addition, it should be possible to insert free-form text feedback. Multiple text feedback entries are possible - the user can choose to capture feedback for everyone ("we all thought it was too salty") or on a per-family member basis ("emma thought it was too saucy").

For the recipe as a whole, it should be easy to mark whether leftovers are available. Optionally, the user can specify how much is leftover, but optimize for making the yes/no simple and default to no. We will eventually use this information to suggest lunch options, but that is out of scope for now.

In addition, the user should be able to capture the returning state of lunch boxes so that they can capture what was eaten vs. not. By default, everything should be assumed to be consumed, but it should be simple to mark an item in the lunch as not having been consumed and optionally add a note of explanation ("Oliver doesn't like cold pasta").