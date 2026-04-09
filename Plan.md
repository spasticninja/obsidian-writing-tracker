# Plan

A rough plan for implementing this plugin.

## What the plugin can do:
1. Users can create projects and set goals for those projects
    a. Users can optionally set a time goal (30 days default) in days
    b. Users can optionally set a word count goal (50,000 words default)
    c. User can set a starting word count (for projects that are already started)
    d. User can alter current word count (allows users to write elsewhere), but maybe have users also enter start/stop time optionally for that (basically they are creating a session to update word count)
2. Users can start/stop session
    a. Ideally start/stop should happen in a side panel next to where users are writing notes
    b. Session data should include start time, end time, and calculate the length (in time) of the session. The session should also update the project word count total.
    c. Would love to explore if we can auto-stop a session due to app inactivity (for more than 30 min?)

### Technical considerations:
- May want to record the session data to a local file or sql lite db.
- May want to use Svelt for the UI
- Can we keep track of word count across all notes? Or do we need to have users define which files to watch?
- What framework should I use to write tests? vitest?

## TODO:
- Adding File or group of files shouldn't overwrite total word count necessarily. We should allow user to set the current starting word count and then subsequent sessions add to the word count goal
- Fix some styling for the dropdown in the sidebar, the active projects section should stack as it looks really squished side by side. Let's do title, helper text, CTA for these cards.
- Don't know if I like the "Automatic recount" section being there, not unless it resets the session. Hmmm ,no. Let's remove
- Project progress should also list goal(s). So add time goals if provided

