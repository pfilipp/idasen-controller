[![NPM](https://nodei.co/npm/idasen-controller.png)](https://npmjs.org/package/idasen-controller) 
[![js-standard-style](https://cdn.rawgit.com/standard/standard/master/badge.svg)](http://standardjs.com)

# idasen-controller

Wrapper exposing simple API to control IKEA Idasen desk with a powerful CLI tool.

## ⚡ Version 1.4.0 - Critical Fixes & New Features

This updated version includes **critical bug fixes** and new features:

### 🐛 Critical Bug Fixes
- **Fixed movement direction logic** - Desk now correctly identifies whether it's moving up or down
- **Fixed stop conditions** - Desk now stops at the correct target height
- **Fixed stop command** - Now sends both stop signals for reliable stopping
- **Added height validation** - Prevents dangerous movements outside safe range (0.62m - 1.27m)
- **Added movement state lock** - Prevents concurrent movement operations that could conflict

### ✨ New Features
- **Speed monitoring** - Reads desk movement speed for more reliable target detection
- **Wakeup command** - Automatically wakes desk controller on connect (DPG1C compatibility)
- **CLI tool** - Full-featured command-line interface for manual desk control
- **Position presets** - Save and recall favorite desk positions
- **Real-time monitoring** - Watch desk height changes in real-time

These fixes make the controller **significantly more reliable** and safer to use.

The main idea was to create something as simple as possible to serve as nice entry point for some other projects.
Therefore you won't find here any timer functions or local storage for settings etc.

If you want some more advanced stuff you can check my [other project](https://github.com/pfilipp/idasen-rest-api) - very under development. It aims at creating simple REST Api to send commands to desk.

## Installation

### As a Library

Use the package manager [npm](https://www.npmjs.com)

```bash
npm install idasen-controller
```

or [yarn](https://yarnpkg.com)

```bash
yarn add idasen-controller
```

### As a CLI Tool

Install globally to use the `idasen` command:

```bash
npm install -g idasen-controller
```

Or use without installing:

```bash
npx idasen-controller <command>
```

## CLI Usage


The package now includes a powerful CLI tool for controlling your desk directly from the terminal.

### Quick Start

1. **Scan for your desk:**
```bash
idasen scan
```

2. **Connect and save your desk address:**
```bash
idasen connect <MAC_ADDRESS>
```

3. **Control your desk:**
```bash
# Get current status
idasen status

# Move to specific height (in cm)
idasen move 75

# Move up/down
idasen up
idasen down

# Stop movement
idasen stop

# Monitor height in real-time
idasen monitor
```

### CLI Commands

#### `idasen scan`
Scan for available Idasen desks nearby.

#### `idasen connect <address>`
Connect to a desk and save its MAC address for future use.

#### `idasen status [-a <address>]`
Display current desk height and movement speed.

#### `idasen move <height> [-a <address>]`
Move desk to a specific height. Accepts values in centimeters (e.g., `75`) or meters (e.g., `0.75`).

#### `idasen up [-a <address>]`
Start moving desk upward (continues until stopped).

#### `idasen down [-a <address>]`
Start moving desk downward (continues until stopped).

#### `idasen stop [-a <address>]`
Stop desk movement immediately.

#### `idasen monitor [-a <address>] [-i <interval>]`
Monitor desk height in real-time. Press Ctrl+C to stop.
- `-i, --interval`: Update interval in milliseconds (default: 500)

#### Position Presets

Save and recall your favorite desk positions:

```bash
# Save a preset
idasen preset add sitting 75
idasen preset add standing 120

# List all presets
idasen preset list

# Move to a preset
idasen preset goto sitting

# Remove a preset
idasen preset remove sitting
```

### Configuration

The CLI stores your desk's MAC address and presets in `~/.idasen/config.json`. After the first connection, you don't need to specify the address again.

## Library Usage
Once you import idasenController you will find `deskManager` within.

```javascript
import idasenController from 'idasen-controller';

const { deskManager } = idasenController;

const devices = await deskManager.scanAsync();
const deskDevice = devices.find((device) => device.name.includes('Desk');

await deskManager.connectAsync(deskDevice.address);
await deskManager.desk.moveToAsync(80);
await deskManager.desk.moveToAsync(75);

await deskManager.disconnectAsync(deskManager.desk);
```

## API

### Scanning
Scanning returns an array of discovered devices in simplified form containing 
```javascript
{
  name: string,
  uuid: string,
  address: string,
}
```

```javascript
const devices = deskManager.scanAsync();
```

### Connecting
Once we have dicovered devices we need to find the one that represents our Desk. Usually it will have 'Desk' in name.

```javascript
const deskDevice = devices.find((device) => device.name.includes('Desk')

await deskManager.connectAsync(deskDevice.address);
```

Once connected we can start communication with desk and send move commands as well as request for current height.

### Moving
#### Moving one step up/down

```javascript
await deskManager.desk.moveUpAsync();
```

```javascript
await deskManager.desk.moveDownAsync();
```

#### Moving to particular height
The function accepts regular decimal value in centimeters and will move until particular height is reached or stop command is executed.

```javascript
await deskManager.desk.moveToAsync(100);
```

#### Stop moving

```javascript
await deskManager.desk.stopAsync();
```

### Get height
Return current height in centimeters

```javascript
const currentHeight = await deskManager.desk.getCurrentHeightAsync();
```

### Get speed
Return current movement speed in meters per second

```javascript
const speed = await deskManager.desk.getCurrentSpeedAsync();
```

### Get height and speed together
Return both height and speed in a single call (more efficient)

```javascript
const { height, speed } = await deskManager.desk.getCurrentHeightAndSpeedAsync();
console.log(`Height: ${height} cm, Speed: ${speed * 100} cm/s`);
```

### Wakeup command
Wake up the desk controller (automatically called on connect)

```javascript
await deskManager.desk.wakeupAsync();
```

### Disconnect
Ow and remember to disconnect ;)

```javascript
await deskManager.disconnectAsync();
```

### *EXPERIMENTAL* Custom preflight duration
As described below in implementation details there is a preflight request send before sending actual request to move desk. This request takes some time to be processed by the desk and won't accept move request till then. 
By default I set it to wait for 200ms but your case may differ so you can increase (or decrease) this duration.

```javascript
const customPreflightDuration = 500 // 0.5 second

await deskManager.desk.setCustomPreflight(customPreflightDuration);
```

## Compatibility
This solution was developed and tested on Mac Mini 2018 running macOS Catalina (10.15.6).

## Implementation
In comparison with some other implementations out there this one uses different bluetooth `Characteristic` to communicate with Desk.
The characteristic that most solutions use is `99FA0002-338A-1024-8A49-009C0215F78A` which, once written to, moves desk up (code `4700`) or down (code `4600`). Let's call it "step" `Characteristic`.
The one mostly used in this project is `99FA0031-338A-1024-8A49-009C0215F78A` which, once written with correct value, moves desk one step towards that value. Let's call it "precise" `Characteristic`.

Value needs to be provided as stringified absolute height in milimeters converted to hexadecimal with bit pairs reversed.

For example to move desk to 127 cm - which is max height in my case
The relative decimal input value would be `6500` which is maximum height of the desk
After converting to hexadecimal we would get `1964`
After reversing bit pairs we would get `6419` which is the value expected by the `Characteristic`.

The main benefit is that it gives more precise control over the desk as it sends command to move desk to particular position. 
As with other `Characteristic` here we also need to send command continiously in order to keep desk moving. 
Single `write` moves desk for about 1 second or shorter if we are very close. 
For example if we want the desk to move to 75cm but we are already at 74.5 it will move for less than a second to just reach 75cm.

Unfortunately there is one "gotcha" as the desk won't accept any command send to "precise" `Characteristic` unless we first write to "step" `Characteristic`. 
We can write basically anything as desk handles incorrect input pretty well. Therefore I implemented so called `preflight` request which sends code consisting of `0000`.

## [TODO](https://github.com/pfilipp/idasen-controller/projects/1)


## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)

Special thanks to [anetczuk](https://github.com/anetczuk) for pointing me in correct direction allowing this project to become usable.

Projects I peeked while working:
- [LinakDeskApp](https://github.com/anetczuk/LinakDeskApp)
- [idasen-control](https://github.com/mitsuhiko/idasen-control)
- [idasen-controller](https://github.com/rhyst/idasen-controller)
- [idasen-desk-controller](https://github.com/nconrad/idasen-desk-controller)
