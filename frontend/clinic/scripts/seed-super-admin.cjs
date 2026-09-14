// Uses the same safe, repeatable bootstrap; never resets existing accounts.
require('./bootstrap.cjs').main().catch(error => { console.error(error.message); process.exitCode = 1; });
