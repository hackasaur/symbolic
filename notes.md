    wrapLines is cheap bookkeeping. The cost is wrapLine, which it calls once per logical line. A line that actually overflows is remeasured from scratch for every word peeled off the end, so a resize or a keystroke in a long paragraph does thousands of canvas.measureText calls.
    
    Where the time goes
    
    wrapLines (around line 1295) groups rich-text spans by line, then calls wrapLine. Callers are textbox creation, updateWrap (unwrap the whole box, then wrap every line — the resize path), and add / remove (rewrap only the logical line you edited).
    
    wrapLine measures the whole remaining string, and while it is wider than maxWidth it cuts the last word (or the last character) and measures again:
    
        // #subOptimal: the width of each word can be calculated just once
        // and wrapped accordingly in 1 go
        let lineWidth = calculateLineWidthRltv(
          line,
          richTextInfos,
          prevRichTextInfo
        )
        // ...
        while (lineWidth > maxWidth && line.length > 1) {
          lineWidth = calculateLineWidthRltv(line, richTextInfos, prevRichTextInfo)
          let lastWordIndex: number = findIndexOfLastWord(line)
          // peel one word, or one character, then loop
    
    Each of those calls ends in gl.measureText, which rebuilds ctx.font and shapes the whole string (src/utils/gl.ts around line 330).
    
    For one logical line of M words that wraps into L visual lines, the number of peels is about M·L/2. A 400-word paragraph that wraps to 20 lines is about 3,800 full-string measures, and the strings are still hundreds of characters long for most of them. A token with no spaces (a URL, a long identifier) peels one character at a time, so a 2,000-character token that fits 80 characters per line is about 24,000 measures. The same line is wrapped again on every keystroke and on every resize.
    
    Two string costs sit on top of that. Every peel copies the tail with substring, then prepends it onto nextLineWrap, which copies the whole overflow again. findIndexOfLastWord is also still called after the function has already switched to character wrapping.
    
    What to change
    
    Measure each word once, in one forward pass. That is the change the comment at line 1174 is pointing at, and it is the one that matters.
    
    Scan the line left to right. Break only on U+0020, same as today. Measure each word together with the space that follows it, split further where a rich-text span changes font, size, bold, or italic. Add those widths until the next word would pass maxWidth, emit one slice, and continue. A logical line then costs one measureText per word (or per word × format run), however many visual lines it becomes. The 400-word example drops from ~3,800 long measures to 400 short ones.
    
    When you commit a visual line, shift the rich-text spans in that same pass. Today each emitted line scans every span on the original line again.
    
    Confirm the chosen prefix when the sum is close to maxWidth. Summing separate measureText results misses kerning across the cut. Cursor placement and hit testing measure real substrings (widthFromLineNoPosition), and fillText uses the same metrics, so a sum that is a pixel over will draw past the box. One confirming measure of the candidate prefix, only when the running sum is within about a pixel of the limit, keeps the break pixel-exact. Lines that are obviously short or obviously long need no second measure.
    
    Binary-search the cut for a token that contains no space. The current fallback chops one character per iteration and, once isLastWord is set, still calls findIndexOfLastWord on every character. Search the longest prefix with width ≤ maxWidth: about log₂(N) measures per visual line. Keep the current stop rules: a single character may stick out, and a two-character piece that ends in a space is left as-is (line.length <= 1, and the line.length === 2 branch).
    
    Cache advances for a repeated format. Key the cache by font, size, bold, and italic. Color does not affect width. A textbox that stays in one format can then wrap later keystrokes and resizes with arithmetic. Use the confirming measure above so the cache cannot push a line past the box. setCtxFont should also skip work when the font string is already on ctx_tmp; every measure currently assigns it.
    
    Semantics a rewrite has to keep
    
    There are no wrap tests in the repo, and the break rules are easy to "clean up" into a different wrap.
    
    • The break is the last U+0020 that is not the final character. The space stays on the left piece (return index + 1, then substring(0, lastWordIndex)).
    • A single trailing space is skipped and sticks to the last word. Two trailing spaces are a real break: the last space moves to the next visual line (findIndexOfLastWord returns that index without adding 1).
    • Character wrapping peels two characters on the first cut when the token ends in a space, then one character at a time.
    • A span whose positionInLine equals the cut stays on the left line (> , not >=). Spans that move are shifted by line.length only. Nothing inserts a replacement space.
    • wrapInfo is true only for the first visual line of each logical line.
    • wrapLines then adds wrappedLines.length - i to every span line number from that logical line, because earlier lines may have grown.
    
    Tabs, non-breaking spaces, and CJK are not break opportunities today. Adding Unicode line breaking would change layout, so treat that as a separate behavior change.
    
    Smaller waste in wrapLines itself
    
    These are real, and they are not the hitch.
    
    • The width is measured once before the inner loop and again on the first iteration (lines 1178 and 1194).
    • calculateLineWidthRltv still walks every original span after the line has been shortened, and it measures empty slices when a span sits at 0 or past the current end. Skip any slice whose start is past line.length, and skip measureText("").
    • richTextInfosByLineNo is filled twice (lines 1312–1317): once per line, then again lines.length + 1 times.
    • For every line after the first, lastRichTextInfo scans the full span list from the start and clones the result. A running index into the already-grouped spans does the same job.
    • wrapLine clones every span before it knows whether the line overflows. Lines that already fit only need their line numbers shifted.
    • let str1 = str in findIndexOfLastWord is unused, and the double instanceof Error check in calculateLineWidthRltv (around line 400) does nothing.
    
    I would leave updateWrap's full unwrap-and-rewrap alone until wrapLine is linear. After that, a resize is one pass over the unwrapped text, which is the right shape for a textbox of any length.
    - Grok
