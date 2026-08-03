# Olórin Pre-Commit Checklist

Before committing code changes, verify:

## 1. No Duplicate Functions / Code Blocks
- [ ] Search file for `function functionName` — should appear only once per function
- [ ] No duplicate `L.map()`, `L.tileLayer()`, or Leaflet init calls
- [ ] No duplicate event listeners (`.addEventListener` for same element/ID)
- [ ] No duplicate CSS blocks (same selector defined twice)

## 2. Read Back Before Commit
- [ ] After any Edit, immediately Read the modified section to confirm it looks right
- [ ] Check line count — did it increase suspiciously?

## 3. Test Locally (if possible)
- [ ] Load the page, check console for JS errors
- [ ] Verify map renders, pins load, buttons work

## Common Pitfalls
- **Edit tool replacing partial matches** → Always use generous surrounding context in `old_string`
- **Appending instead of replacing** → Verify the replacement fully removes the old block
- **Nested/mixed quote issues** → Check `"` vs `'` consistency after edits
