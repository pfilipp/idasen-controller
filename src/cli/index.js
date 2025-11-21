#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BluetoothAdapter } from '../bt-adapter/bluetooth-adapter.js';
import { DeskManager } from '../desk/desk-manager.js';
import { store } from '../store.js';
import { storeKeys } from '../store-keys.js';

// Initialize store with default values
const setDefaultValues = () => {
  store.add(storeKeys.DEFAULT_HEIGHT_TOLERANCE_THRESHOLD, 0.005);
  store.add(storeKeys.DESK_OFFSET_HEIGHT, 6200);
  store.add(storeKeys.MOVE_TIME_DURATION, 500);
  store.add(storeKeys.PREFLIGHT_TIME_DURATION, 200);
  store.add(storeKeys.RAW_MAX_HEIGHT, 12700);
  store.add(storeKeys.RAW_MIN_HEIGHT, 6200);
};

setDefaultValues();

const CONFIG_DIR = path.join(os.homedir(), '.idasen');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

// Configuration management
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadConfig() {
  ensureConfigDir();
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (error) {
      console.error(chalk.red('Error reading config file:'), error.message);
      return {};
    }
  }
  return {};
}

function saveConfig(config) {
  ensureConfigDir();
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(chalk.red('Error saving config:'), error.message);
  }
}

// Initialize Bluetooth and Desk Manager
let bluetoothAdapter;
let deskManager;
let isInitialized = false;

async function initBluetooth() {
  if (isInitialized) return;

  try {
    bluetoothAdapter = new BluetoothAdapter();
    await bluetoothAdapter.getAdapterReadyAsync();
    deskManager = new DeskManager(bluetoothAdapter);
    isInitialized = true;
  } catch (error) {
    console.error(chalk.red('Failed to initialize Bluetooth:'), error.message);
    process.exit(1);
  }
}

async function connectToDesk(identifier) {
  const config = loadConfig();
  const deskId = identifier || config.deskId;

  if (!deskId) {
    console.error(chalk.red('No desk ID specified. Run "idasen scan" then "idasen connect <ID>" first.'));
    process.exit(1);
  }

  console.log(chalk.blue(`Connecting to desk ${deskId}...`));

  try {
    const result = await deskManager.connectAsync(deskId);
    if (result === 'success') {
      console.log(chalk.green('✓ Connected successfully'));

      // Save ID if not already saved
      if (!config.deskId) {
        config.deskId = deskId;
        saveConfig(config);
        console.log(chalk.dim(`Saved desk ID to ${CONFIG_FILE}`));
      }

      return deskManager;
    } else {
      throw new Error('Connection failed');
    }
  } catch (error) {
    console.error(chalk.red('Failed to connect to desk:'), error.message);
    process.exit(1);
  }
}

// CLI Commands
const program = new Command();

program
  .name('idasen')
  .description('CLI tool to control Idasen IKEA standing desk')
  .version('1.4.0');

// Scan command
program
  .command('scan')
  .description('Scan for available Idasen desks')
  .option('-a, --all', 'Show all Bluetooth devices (not just desks)')
  .action(async (options) => {
    await initBluetooth();
    console.log(chalk.blue('Scanning for desks...'));

    try {
      const allDevices = await deskManager.getAvailableDevices();

      // Filter to only desk-like devices unless --all flag is used
      let devices = allDevices;
      if (!options.all) {
        devices = allDevices.filter(device => {
          const name = device?.advertisement?.localName || device?.name || '';
          return name.toLowerCase().includes('desk') ||
                 name.toLowerCase().includes('idasen');
        });

        if (devices.length === 0 && allDevices.length > 0) {
          console.log(chalk.yellow(`\nFound ${allDevices.length} Bluetooth device(s), but none appear to be Idasen desks.`));
          console.log(chalk.dim('Run with --all flag to see all devices: ') + chalk.cyan('idasen scan --all\n'));
          process.exit(0);
        }
      }

      if (devices.length === 0) {
        console.log(chalk.yellow('No devices found. Make sure your desk is powered on and Bluetooth is enabled.'));
      } else {
        const deviceType = options.all ? 'Bluetooth device(s)' : 'Idasen desk(s)';
        console.log(chalk.green(`\nFound ${devices.length} ${deviceType}:\n`));

        devices.forEach((device, index) => {
          const name = device?.advertisement?.localName || device?.name || 'Unnamed Device';
          // On macOS, use UUID/ID; on Linux/Windows use address
          const identifier = device?.id || device?.uuid || device?.address || 'Unknown';
          const rssi = device?.rssi || 'Unknown';

          console.log(`${index + 1}. ${chalk.bold(name)}`);
          console.log(`   ID: ${chalk.cyan(identifier)}`);
          if (device?.address && device.address !== identifier) {
            console.log(`   Address: ${chalk.dim(device.address)}`);
          }
          console.log(`   RSSI: ${rssi} dBm\n`);
        });

        if (options.all) {
          console.log(chalk.dim('💡 Tip: Look for a device with "Desk" or "Idasen" in the name.'));
        }
      }
    } catch (error) {
      console.error(chalk.red('Scan failed:'), error.message);
      process.exit(1);
    }

    process.exit(0);
  });

// Connect command
program
  .command('connect <id>')
  .description('Connect to a desk and save its ID (use ID from scan command)')
  .action(async (id) => {
    await initBluetooth();
    await connectToDesk(id);
    console.log(chalk.green('Connection saved. You can now use other commands without specifying an ID.'));
    process.exit(0);
  });

// Status command
program
  .command('status')
  .description('Get current desk height and speed')
  .option('-d, --id <id>', 'Desk ID (if not using saved connection)')
  .action(async (options) => {
    await initBluetooth();
    await connectToDesk(options.id);

    try {
      const { height, speed } = await deskManager.deskController.desk.getCurrentHeightAndSpeedAsync();
      console.log(chalk.green('\nDesk Status:'));
      console.log(`Height: ${chalk.bold(height.toFixed(2))} cm`);
      console.log(`Speed: ${chalk.bold((speed * 100).toFixed(4))} cm/s`);

      const meters = height / 100;
      console.log(chalk.dim(`(${meters.toFixed(3)} m)`));
    } catch (error) {
      console.error(chalk.red('Failed to get status:'), error.message);
      process.exit(1);
    }

    process.exit(0);
  });

// Move up command
program
  .command('up')
  .description('Move desk up')
  .option('-d, --id <id>', 'Desk ID (if not using saved connection)')
  .action(async (options) => {
    await initBluetooth();
    await connectToDesk(options.id);

    console.log(chalk.blue('Moving desk up...'));
    console.log(chalk.dim('Press Ctrl+C to stop'));

    try {
      await deskManager.deskController.moveUpAsync();
      console.log(chalk.green('Moving up. Desk will continue until you send a stop command.'));
    } catch (error) {
      console.error(chalk.red('Failed to move desk:'), error.message);
      process.exit(1);
    }

    process.exit(0);
  });

// Move down command
program
  .command('down')
  .description('Move desk down')
  .option('-d, --id <id>', 'Desk ID (if not using saved connection)')
  .action(async (options) => {
    await initBluetooth();
    await connectToDesk(options.id);

    console.log(chalk.blue('Moving desk down...'));
    console.log(chalk.dim('Press Ctrl+C to stop'));

    try {
      await deskManager.deskController.moveDownAsync();
      console.log(chalk.green('Moving down. Desk will continue until you send a stop command.'));
    } catch (error) {
      console.error(chalk.red('Failed to move desk:'), error.message);
      process.exit(1);
    }

    process.exit(0);
  });

// Move to height command
program
  .command('move <height>')
  .description('Move desk to specific height (in cm or m)')
  .option('-d, --id <id>', 'Desk ID (if not using saved connection)')
  .action(async (heightStr, options) => {
    await initBluetooth();
    await connectToDesk(options.id);

    let height = parseFloat(heightStr);

    // Auto-detect if input is in meters or centimeters
    if (height < 10) {
      // Likely meters
      height = height * 100; // Convert to cm for internal use
      console.log(chalk.dim(`Interpreted as ${height / 100} m`));
    }

    // Convert cm to meters for the controller
    const heightInMeters = height / 100;

    console.log(chalk.blue(`Moving desk to ${height} cm (${heightInMeters.toFixed(2)} m)...`));

    try {
      await deskManager.deskController.moveToAsync(heightInMeters);
      console.log(chalk.green(`✓ Desk moved to ${height} cm`));
    } catch (error) {
      console.error(chalk.red('Failed to move desk:'), error.message);
      process.exit(1);
    }

    process.exit(0);
  });

// Stop command
program
  .command('stop')
  .description('Stop desk movement')
  .option('-d, --id <id>', 'Desk ID (if not using saved connection)')
  .action(async (options) => {
    await initBluetooth();
    await connectToDesk(options.id);

    console.log(chalk.blue('Stopping desk...'));

    try {
      await deskManager.deskController.stopAsync();
      console.log(chalk.green('✓ Desk stopped'));
    } catch (error) {
      console.error(chalk.red('Failed to stop desk:'), error.message);
      process.exit(1);
    }

    process.exit(0);
  });

// Monitor command
program
  .command('monitor')
  .description('Monitor desk height in real-time')
  .option('-d, --id <id>', 'Desk ID (if not using saved connection)')
  .option('-i, --interval <ms>', 'Update interval in milliseconds', '500')
  .action(async (options) => {
    await initBluetooth();
    await connectToDesk(options.id);

    const interval = parseInt(options.interval);
    console.log(chalk.blue('Monitoring desk height. Press Ctrl+C to stop.\n'));

    let lastHeight = null;

    const monitor = setInterval(async () => {
      try {
        const { height, speed } = await deskManager.deskController.desk.getCurrentHeightAndSpeedAsync();

        // Only update if height changed significantly
        if (lastHeight === null || Math.abs(height - lastHeight) > 0.01) {
          const meters = height / 100;
          const speedCmS = speed * 100;

          // Clear line and move cursor to start
          process.stdout.write('\r\x1b[K');

          let statusLine = `Height: ${chalk.bold(height.toFixed(2))} cm (${meters.toFixed(3)} m)`;

          if (Math.abs(speed) > 0.0001) {
            const arrow = speed > 0 ? '↑' : '↓';
            statusLine += ` ${arrow} ${chalk.yellow(Math.abs(speedCmS).toFixed(2) + ' cm/s')}`;
          } else {
            statusLine += ` ${chalk.dim('(stopped)')}`;
          }

          process.stdout.write(statusLine);
          lastHeight = height;
        }
      } catch (error) {
        console.error(chalk.red('\nMonitoring error:'), error.message);
        clearInterval(monitor);
        process.exit(1);
      }
    }, interval);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      clearInterval(monitor);
      console.log(chalk.blue('\n\nMonitoring stopped.'));
      process.exit(0);
    });
  });

// Preset commands
program
  .command('preset <action> [name] [height]')
  .description('Manage position presets (add, remove, list, goto)')
  .option('-d, --id <id>', 'Desk ID (if not using saved connection)')
  .action(async (action, name, height, options) => {
    const config = loadConfig();
    config.presets = config.presets || {};

    switch (action) {
      case 'list':
        console.log(chalk.blue('Saved presets:\n'));
        if (Object.keys(config.presets).length === 0) {
          console.log(chalk.dim('No presets saved.'));
        } else {
          Object.entries(config.presets).forEach(([name, height]) => {
            console.log(`  ${chalk.bold(name)}: ${height} cm`);
          });
        }
        process.exit(0);
        break;

      case 'add':
        if (!name || !height) {
          console.error(chalk.red('Usage: idasen preset add <name> <height>'));
          process.exit(1);
        }
        config.presets[name] = parseFloat(height);
        saveConfig(config);
        console.log(chalk.green(`✓ Preset "${name}" saved at ${height} cm`));
        process.exit(0);
        break;

      case 'remove':
        if (!name) {
          console.error(chalk.red('Usage: idasen preset remove <name>'));
          process.exit(1);
        }
        if (config.presets[name]) {
          delete config.presets[name];
          saveConfig(config);
          console.log(chalk.green(`✓ Preset "${name}" removed`));
        } else {
          console.error(chalk.red(`Preset "${name}" not found`));
          process.exit(1);
        }
        process.exit(0);
        break;

      case 'goto':
        if (!name) {
          console.error(chalk.red('Usage: idasen preset goto <name>'));
          process.exit(1);
        }
        if (!config.presets[name]) {
          console.error(chalk.red(`Preset "${name}" not found`));
          process.exit(1);
        }

        await initBluetooth();
        await connectToDesk(options.id);

        const presetHeight = config.presets[name];
        const heightInMeters = presetHeight / 100;

        console.log(chalk.blue(`Moving to preset "${name}" (${presetHeight} cm)...`));

        try {
          await deskManager.deskController.moveToAsync(heightInMeters);
          console.log(chalk.green(`✓ Moved to preset "${name}"`));
        } catch (error) {
          console.error(chalk.red('Failed to move desk:'), error.message);
          process.exit(1);
        }

        process.exit(0);
        break;

      default:
        console.error(chalk.red(`Unknown preset action: ${action}`));
        console.log('Valid actions: list, add, remove, goto');
        process.exit(1);
    }
  });

// Handle Ctrl+C globally
process.on('SIGINT', () => {
  console.log(chalk.blue('\n\nShutting down...'));
  process.exit(0);
});

program.parse();
