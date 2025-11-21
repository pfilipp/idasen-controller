# Testing Guide for Idasen Controller v1.4.0

## Pre-Testing Setup

1. **Ensure Bluetooth is enabled** on your computer
2. **Make sure your Idasen desk is powered on** and nearby
3. **On Linux**, you may need to run commands with `sudo`

## Testing Checklist

### ✅ Phase 1: Basic CLI Functionality

#### 1. Help Command
```bash
./bin/idasen --help
```
**Expected**: List of all available commands

#### 2. Scan for Desk
```bash
./bin/idasen scan
```
**Expected**:
- Shows "Scanning for desks..."
- Lists your desk with MAC address, name, and RSSI
- If no desk found, check that desk is powered on and Bluetooth is enabled

#### 3. Connect to Desk
```bash
./bin/idasen connect <MAC_ADDRESS>
```
Replace `<MAC_ADDRESS>` with the address from the scan command.

**Expected**:
- "Connecting to desk at [address]..."
- "✓ Connected successfully"
- "Saved desk address to ~/.idasen/config.json"

### ✅ Phase 2: Movement Testing

⚠️ **SAFETY**: Be ready to press Ctrl+C or run `./bin/idasen stop` if something goes wrong!

#### 4. Check Current Status
```bash
./bin/idasen status
```
**Expected**:
- Current height in cm and meters
- Current speed (should be 0 if desk is stopped)

#### 5. Move to Specific Height
```bash
# Move to sitting position (75cm)
./bin/idasen move 75
```
**Expected**:
- Desk moves to exactly 75cm
- Stops automatically when reached
- No overshooting or undershooting

**Test Cases**:
- [ ] Move from low to high (e.g., 70cm → 120cm)
- [ ] Move from high to low (e.g., 120cm → 70cm)
- [ ] Small movements (e.g., 75cm → 77cm)
- [ ] Verify desk stops at exact target

#### 6. Test Height Validation
```bash
# Try invalid height (should fail)
./bin/idasen move 50   # Too low
./bin/idasen move 150  # Too high
```
**Expected**: Error message about height being outside safe range (0.62m - 1.27m)

#### 7. Directional Movement
```bash
# Start moving up
./bin/idasen up

# Let it move for 2-3 seconds, then stop
./bin/idasen stop
```

**Test Cases**:
- [ ] `up` command makes desk move upward
- [ ] `down` command makes desk move downward
- [ ] `stop` command stops immediately
- [ ] Desk stops reliably (both stop commands working)

#### 8. Concurrent Movement Protection
```bash
# Open two terminals
# Terminal 1:
./bin/idasen move 120

# Terminal 2 (immediately after):
./bin/idasen move 75
```
**Expected**: Second command should fail with "already moving" error

### ✅ Phase 3: Advanced Features

#### 9. Real-Time Monitoring
```bash
./bin/idasen monitor
```
**Expected**:
- Shows current height
- Updates in real-time as desk moves
- Shows speed when moving (with arrow ↑ or ↓)
- Press Ctrl+C to stop

**Test**: While monitoring, use physical buttons on desk to move it. Height should update.

#### 10. Position Presets
```bash
# Save presets
./bin/idasen preset add sitting 75
./bin/idasen preset add standing 120

# List presets
./bin/idasen preset list

# Move to preset
./bin/idasen preset goto sitting
./bin/idasen preset goto standing

# Remove preset
./bin/idasen preset remove sitting
```

**Test Cases**:
- [ ] Presets are saved correctly
- [ ] `goto` moves to saved height
- [ ] Presets persist after CLI restart

### ✅ Phase 4: Bug Fix Verification

#### 11. Movement Direction Fix
**Old Bug**: Desk would move in wrong direction or stop prematurely.

**Test**:
1. Note current height (e.g., 70cm)
2. Command desk to move higher (e.g., 100cm)
3. Verify it moves UP (not down)
4. Verify it stops at exactly 100cm (not before, not after)

**Test Cases**:
- [ ] Moving UP works correctly
- [ ] Moving DOWN works correctly
- [ ] Desk doesn't stop prematurely
- [ ] Desk doesn't overshoot target

#### 12. Stop Condition Fix
**Old Bug**: Desk would stop before reaching target when moving up.

**Test**:
1. Move desk to 70cm
2. Command move to 100cm
3. Verify desk reaches exactly 100cm (not 99.5cm or similar)

**Test Cases**:
- [ ] Reaches target when moving up
- [ ] Reaches target when moving down
- [ ] Within tolerance threshold (±0.5cm)

#### 13. Reliable Stop Fix
**Old Bug**: Desk might not stop reliably.

**Test**:
1. Start moving up: `./bin/idasen up`
2. Let it move for 2 seconds
3. Stop: `./bin/idasen stop`
4. Verify desk stops immediately (within 0.5 seconds)

**Test Cases**:
- [ ] Stops when moving up
- [ ] Stops when moving down
- [ ] Stops during auto-movement (move command)
- [ ] No "coasting" or delayed stopping

#### 14. Speed Monitoring
**New Feature**: Uses speed to detect when desk has stopped.

**Test**:
1. Run monitor: `./bin/idasen monitor`
2. Press physical button to move desk
3. Release button
4. Verify speed shows during movement and returns to 0 when stopped

### ✅ Phase 5: Edge Cases

#### 15. Physical Button Interrupt
**Test**:
1. Command desk to move: `./bin/idasen move 100`
2. While moving, press physical stop button on desk
3. Desk should stop
4. CLI might show error or timeout (this is okay)

#### 16. Connection Recovery
**Test**:
1. Connect to desk: `./bin/idasen connect <MAC>`
2. Turn desk off
3. Turn desk back on
4. Try a command: `./bin/idasen status`
5. May need to reconnect (this is expected behavior)

#### 17. Multiple Height Commands
**Test**:
```bash
./bin/idasen move 75
# Wait for completion
./bin/idasen move 100
# Wait for completion
./bin/idasen move 85
```
**Expected**: Each movement completes successfully

### ✅ Phase 6: Library API Testing

If you're using the library in code:

```javascript
import { deskManager } from 'idasen-controller';

// Test new methods
const speed = await deskManager.deskController.desk.getCurrentSpeedAsync();
const { height, speed } = await deskManager.deskController.desk.getCurrentHeightAndSpeedAsync();
await deskManager.deskController.desk.wakeupAsync();

// Test error handling
try {
  await deskManager.deskController.moveToAsync(1.5); // Should throw
} catch (error) {
  console.log('Correctly rejected invalid height');
}

try {
  await deskManager.deskController.moveToAsync(0.8);
  await deskManager.deskController.moveToAsync(0.9); // Should throw
} catch (error) {
  console.log('Correctly prevented concurrent movement');
}
```

## Troubleshooting

### Issue: "Cannot find module"
**Solution**: Make sure all imports have `.js` extensions. Run `npm install` again.

### Issue: Bluetooth scanning fails
**Solution**:
- Check Bluetooth is enabled
- On Linux, try `sudo ./bin/idasen scan`
- Check if other apps are using Bluetooth

### Issue: Desk doesn't move
**Solution**:
- Verify desk is powered on
- Check connection: `./bin/idasen status`
- Try reconnecting: `./bin/idasen connect <MAC>`
- Check if height is within valid range

### Issue: Movement is jerky or stops prematurely
**Solution**:
- This might indicate the speed monitoring needs adjustment
- Check your desk model and controller type
- Report the issue with desk model information

### Issue: "Already moving" error when not moving
**Solution**:
- Run stop command: `./bin/idasen stop`
- Restart the desk (power cycle)
- Reconnect

## Success Criteria

All tests pass if:
- ✅ Desk moves reliably to target positions
- ✅ Stops at correct heights
- ✅ Stop command works immediately
- ✅ Height validation prevents dangerous movements
- ✅ Concurrent movements are blocked
- ✅ Speed monitoring shows accurate values
- ✅ CLI commands work as documented
- ✅ Presets save and recall correctly

## Reporting Issues

If you find bugs, please report with:
1. Your desk model (e.g., "Idasen 160x80")
2. Controller version (check under desk)
3. OS and Node.js version
4. Exact command that failed
5. Error message
6. What you expected to happen

## Performance Benchmarks

Expected performance:
- **Scan duration**: 4 seconds
- **Connection time**: 2-5 seconds
- **Movement start**: < 500ms after command
- **Stop response**: < 500ms
- **Target accuracy**: ± 0.5cm
- **Monitor update rate**: 2 times per second

## Next Steps After Testing

Once testing is complete:
1. Run unit tests: `npm test`
2. If all tests pass, consider:
   - Installing globally: `npm install -g .`
   - Creating a git commit
   - Publishing to npm (if desired)
   - Updating version number

## Notes

- The CLI creates config at `~/.idasen/config.json`
- You can manually edit this file to change settings
- Backup your config before major changes
- The desk height limits (0.62m - 1.27m) are standard for Idasen desks
  - If your desk has different limits, they can be adjusted in the code
