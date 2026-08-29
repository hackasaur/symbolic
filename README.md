# Symbolic
A rich text editor designed for extensibility and performance

# features
- rich text format
- word wrapping
- copy/pasting
- events based
- context menu
- latex (TODO)
- command palatte (TODO)

# Philosophy
- make sure that the code is HTML canvas independent
- code should be easy to understand and organised
- design for collaboration, mouse, and touch devices
- minimalistic, consistent
- attention to detail
- everything is a vector
- everything should be animatable
- invention of dreams!

## TODO
- [x] height of textBox should be expandable (while creating/modifying). text should move to the center
- [ ] underline
- [ ] highlight
- [ ] toolbar for font selection
- [ ] modifer key shortcuts:
  - [x] ctrl + a,
  - [x] ctrl + arrow,
  - [x] shift + (ctrl) + arrow,
  - [x] copy/paste/cut (ctrl + c/v/x)
  - [x] ctrl + b,
  - [x] ctrl + i,
  - [ ] ctrl + u
  - [ ] ctrl + z/r
- [ ] tab indentation
- [x] text alignment
- [x] typing mode
- [x] text selection with pointer/keyboard.
- [x] delete
- [x] backspace, new line, arrow up, down, left, right
- [x] rich text
- [x] type text
- [x] word wrap 
- [x] word breaking
- [x] the order of RichTextInfos must be checked
- [ ] text cursor height should be equal to the line height for that text format 
- [ ] urls should be in blue font in textbox
- [ ] animations for text like 3b1b #text #feature
- [ ] format painter
- [ ] IME support

# bugs
- [ ] text menu is not open when typing in a borderless textbox #text  
- [ ] height of the textbox changes slightly when font color is changed 
  - updateTextboxShape() is called when ever there is a change in font 
- [ ] order of embedded text snippet does not match the shape it is embedded in
- [ ] cursor style changes to default instead of pointer sometimes in file menu #menu #cursor
  - added a deep=true argument in pnl.setVisible() which sets the visibility of all the sub elements
- [ ] drawing a Z like stroke is incorrectly detected as an arrow #autodetect #stroke
  - not facing this issue anymore
- [ ] toolbox and the frame monitor do not scale correctly on different resolution screens #html
- [ ] copy-pasting from one textbox to another does not carry over the rich text format
  - textbox.richTextInfoClipboard is contained within a textbox itself. Making it a global within the app could fix this but it will not work when some text is pasted from outside the app
- [ ] pressing tab does not work in textbox #text
  - will need to prevent default behaviour
- [ ] button hover animation does not finish even when the container panel is closed #menu
- [ ] double clicking to select a word also selects special characters, need to treat special char as whitespaces #text
- [ ] double clicking a word sometimes takes you out of the typing mode #text
- [ ] double clicking doesn't create a borderless textbox anymore #text
- [ ] context menu is not hidden when selecting arrow instead it is still shown on the side of the previous rectangle #contextMenu
- [ ] copied text from textbox has extra spaces where the text was wrapped #text
- [ ] highlighting text is shifted upwards slightly than expected when wordWrap is off #text
- [ ] resizing window stretches the canvas #html #DPR
  - this issue is caused by css property canvas { width: 100%, height: 100% }. If we remove it resizing is fixed but then the DPR scaling breaks and canvas becomes blurry
- [ ] bounding box of transformer for strokes does not fit correctly when stroke is rotated. #stroke
- [ ] a single emoji behaves like 2 characters instead of 1 #text
- [ ] group.getBoundingBox() returns 0 height/width for vertically/horizontally aligned arrows and for rectangles/ellipses of 0 width/height
- [ ] arrow does not switch to modify mode if anchoring with 0 width/height shape
  - divided the square size and radius by view.zoom
- [ ] if mouse is moved out of the canvas area while pressed, drawing continues when mouse is moved in though mouse is not pressed #canvas
    - use window.addEventListener?

# bugs
- [ ] height of the textbox changes slightly when font color is changed 
  - updateTextboxShape() is called when ever there is a change in font 
- [ ] copy-pasting from one textbox to another does not carry over the rich text format
  - textbox.richTextInfoClipboard is contained within a textbox itself. Making it a global within the app could fix this but it will not work when some text is pasted from outside the app
- [ ] pressing tab does not work in textbox #text
  - will need to prevent default behaviour
- [ ] button hover animation does not finish even when the container panel is closed #menu
- [ ] double clicking to select a word also selects special characters, need to treat special char as whitespaces #text
- [ ] double clicking a word sometimes takes you out of the typing mode #text
- [ ] copied text from textbox has extra spaces where the text was wrapped #text
- [ ] highlighting text is shifted upwards slightly than expected when wordWrap is off #text
- [ ] resizing window stretches the canvas #html #DPR
  - this issue is caused by css property canvas { width: 100%, height: 100% }. If we remove it resizing is fixed but then the DPR scaling breaks and canvas becomes blurry
- [ ] a single emoji behaves like 2 characters instead of 1 #text
