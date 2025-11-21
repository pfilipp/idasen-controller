# Changelog

All notable changes to this project will be documented in this file.

## [1.4.0] - 2025-01-21

### 🔴 Critical Bug Fixes

#### Fixed Movement Direction Logic
- **Issue**: The desk incorrectly identified movement direction (inverted logic)
- **Impact**: Desk would move in wrong direction or stop prematurely
- **Fix**: Corrected logic in `getShouldStopMoving` - when current height < requested, desk is moving UP
- **Location**: `src/desk/desk-controller.js:93-101`

#### Fixed Stop Conditions
- **Issue**: `shouldStopMovingUp` stopped too early (when current < requested instead of >=)
- **Impact**: Desk would stop before reaching target height when moving up
- **Fix**: Corrected condition to `current >= requested` for moving up, `current <= requested` for moving down
- **Location**: `src/desk/desk-controller.js:103-113`

#### Fixed Incomplete Stop Command
- **Issue**: Only sent one stop command (to move characteristic), missing reference input stop
- **Impact**: Desk might not stop reliably in all cases
- **Fix**: Now sends both stop commands concurrently (`FF00` to move, `0180` to moveTo characteristic)
- **Location**: `src/desk/desk-controller.js:87-86`

### 🛡️ Safety Improvements

#### Height Validation
- **Added**: Validation of target heights against safe range (0.62m - 1.27m)
- **Benefit**: Prevents commanding desk to dangerous positions
- **Error**: Throws clear error message when height is outside safe range
- **Location**: `src/desk/desk-controller.js:41-44`

#### Movement State Lock
- **Added**: Boolean flag `_isMoving` to prevent concurrent movement operations
- **Benefit**: Prevents conflicts from multiple simultaneous movement commands
- **Error**: Throws error if movement attempted while already moving
- **Location**: `src/desk/desk-controller.js:16, 47-57`

### ✨ New Features

#### Speed Monitoring
- **Added**: Methods to read desk movement speed from Bluetooth characteristic
- **Methods**:
  - `getCurrentSpeedAsync()` - Get current speed in m/s
  - `getCurrentHeightAndSpeedAsync()` - Get both height and speed efficiently
- **Benefit**: More reliable target detection - desk stops when speed = 0
- **Location**: `src/desk/desk.js:62-86`

#### Wakeup Command
- **Added**: Wakeup command sent on desk connection
- **Benefit**: Ensures compatibility with DPG1C controller variant
- **Command**: Sends `FE00` to move characteristic
- **Auto-called**: Automatically invoked in `connectAsync`
- **Location**: `src/desk/desk.js:88-92`, `src/desk/desk-manager.js:33`

#### CLI Tool
- **Added**: Full-featured command-line interface
- **Commands**:
  - `idasen scan` - Discover nearby desks
  - `idasen connect <address>` - Connect and save desk address
  - `idasen status` - Show current height and speed
  - `idasen move <height>` - Move to specific height
  - `idasen up/down` - Move up or down
  - `idasen stop` - Emergency stop
  - `idasen monitor` - Real-time height monitoring
  - `idasen preset add/remove/goto/list` - Manage position presets
- **Config**: Stores settings in `~/.idasen/config.json`
- **Location**: `src/cli/index.js`, `bin/idasen`

#### Position Presets
- **Added**: Save and recall favorite desk positions via CLI
- **Storage**: JSON config file with preset names and heights
- **Usage**: `idasen preset add sitting 75`

### 📦 Dependencies

#### Added
- `commander@^12.0.0` - CLI framework
- `chalk@^5.3.0` - Terminal colors and formatting

#### Updated
- Added `"type": "module"` to package.json for ES modules support
- Added `bin` entry for CLI tool

### 🧪 Testing

#### New Tests
- **Added**: Comprehensive test suite for desk-controller fixes
- **Coverage**: Movement direction, stop conditions, height validation, state lock, stop command
- **Location**: `src/desk/desk-controller.test.js`

### 📝 Documentation

- Updated README with bug fix details
- Added complete CLI usage documentation
- Added new API method documentation (speed, wakeup)
- Removed outdated disclaimer

## Migration Guide from v1.3.0 to v1.4.0

### Breaking Changes

**None** - This release is fully backward compatible.

### Recommended Actions

1. **Update your installation**:
   ```bash
   npm update idasen-controller
   ```

2. **Review your code** for any workarounds you may have implemented for the movement bugs. These can now be removed:
   - Custom logic to compensate for inverted movement direction
   - Manual stop command sequences
   - Height validation logic (now built-in)

3. **Consider using new features**:
   - Speed monitoring for more accurate feedback
   - CLI tool for manual desk control
   - Position presets for frequently-used heights

4. **Test with your desk**:
   - Verify movement works correctly with the fixes
   - Test the new CLI commands
   - Ensure height validation doesn't interfere with your use case

### API Additions (Fully Backward Compatible)

#### New Methods
```javascript
// Speed monitoring
const speed = await desk.getCurrentSpeedAsync();
const { height, speed } = await desk.getCurrentHeightAndSpeedAsync();

// Wakeup (automatically called on connect)
await desk.wakeupAsync();
```

#### Error Handling
```javascript
// Now throws errors for invalid heights
try {
  await deskController.moveToAsync(1.5); // Above maximum
} catch (error) {
  console.error('Invalid height:', error.message);
}

// Now throws errors for concurrent movements
try {
  await deskController.moveToAsync(0.8);
  await deskController.moveToAsync(0.9); // Will throw
} catch (error) {
  console.error('Already moving:', error.message);
}
```

### Behavior Changes

#### More Reliable Movement
- Desk now stops precisely at target height (fixed stop conditions)
- Movement direction is correctly identified (fixed inverted logic)
- Stops more reliably (sends both stop commands)

#### Enhanced Safety
- Automatically validates height range (0.62m - 1.27m)
- Prevents concurrent movement commands
- Better error messages

#### Improved Target Detection
- Uses speed monitoring in addition to height checking
- Stops when speed = 0 (desk has actually stopped)
- More accurate positioning

## Known Issues

### Dependencies
- Several dev dependencies have deprecation warnings (rollup, jest, eslint)
- Main dependency `@abandonware/noble` is legacy but functional
- These do not affect runtime functionality
- Consider updating in future versions

### Bluetooth
- Requires Bluetooth LE support
- May need `sudo` on Linux systems
- Scanning duration fixed at 4 seconds

### Testing
- Tests require mocking due to Bluetooth hardware dependency
- No integration tests with actual desk hardware
- Manual testing recommended after installation

## Testing Checklist

Before deploying v1.4.0, test the following:

- [ ] Scan discovers your desk
- [ ] Connection succeeds
- [ ] Movement up works correctly
- [ ] Movement down works correctly
- [ ] Move to specific height reaches target accurately
- [ ] Stop command stops movement immediately
- [ ] Height validation rejects invalid heights
- [ ] Concurrent movement protection works
- [ ] CLI commands work (scan, connect, status, move, etc.)
- [ ] Position presets save and recall correctly
- [ ] Monitor shows real-time height updates
- [ ] Wakeup command doesn't cause issues

## Acknowledgments

Critical bugs identified through comparison with Python reference implementation at [idasen](https://github.com/rhyst/idasen-controller).

## License

[MIT](https://choosealicense.com/licenses/mit/)
