# Fix Game/Capture Buttons Pinch Gesture Issue

## Plan Summary
- Enhance getHoveredTab() hit-detection tolerance in App.jsx
- Add debug logging for pinch/tab hovers
- Improve pinch reliability if needed
- Test tab switching

## Steps
- [x] Step 1: Improve getHoveredTab/tool with +/-15px tolerance + define getHoveredTool + PINCH_DOWN console.log
- [x] Step 2: Add MOVE hover logging (via safe calls)
- [ ] Step 3: Add visual hovered tab highlight
- [ ] Step 4: Test & verify
- [ ] Step 5: Cleanup debug
- [x] Step 6: Updated

Current progress: Core fixes deployed. Dev server running. Pinch test Game/Capture buttons, check console logs for hover detection & tab switch. If working, ready for cleanup. If not, provide console output.


