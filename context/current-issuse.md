# Canvas UI/UX Enhancements & Fixes

Below are the problems that need to be fixed.

1. The `canvas-control-bar.tsx` is now updating in real time when swatch/edge color, arrow position or stroke is changed.

2. Set these color options as default:
- text inside swatch default color should be `text-primary` from `global.css`
- by default edges should not have arrow heads in any direction.

3. Text is getting overflow from shape when increase size or get a long text. It should get stacked and if stack not fit then it should get overflow hidden.

4. In `canvas-control-bas.tsx` when text size is increase/decrease the number does'nt get incresase/decrease. Fix that also, it should get changed to correct size of the text.

5. Change the cylinder shape SVG to Database shaped stacked cylinder shape.