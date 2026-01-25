export const DEBUG_MODE = new URLSearchParams(window.location.search).has("debug");

export const SIMULATED_DATA = {
  status: {
    connected: false,
    port: "Simulated Radio (Demo)",
    baudrate: 57600,
    connected_at: null,
  },
  info: {
    firmware: ["SiK 2.2 on HM-TRP", "Built: Jan 15 2026", "Bootloader: 1.1"],
    hardware: ["HopeRF HM-TRP", "Si1000 Rev B", "8051 Core @ 24MHz"],
    registers: [
      "S0:FORMAT=25",
      "S1:SERIAL_SPEED=64",
      "S2:AIR_SPEED=64",
      "S3:NETID=25",
    ],
    board_frequencies: [
      "Min Freq: 915000",
      "Max Freq: 928000",
      "Num Channels: 50",
    ],
  },
  parameters: [
    {
      code: "S0",
      value: "25",
      raw: "FORMAT=25",
      human_readable: "AT Command Mode",
      definition: {
        name: "FORMAT",
        description: "Serial protocol format (fixed AT command interface)",
        value_type: "int",
        min: 0,
        max: 255,
      },
    },
    {
      code: "S1",
      value: "57600",
      raw: "SERIAL_SPEED=64",
      human_readable: "57600 bps",
      definition: {
        name: "SERIAL_SPEED",
        description: "Serial port baud rate encoding",
        value_type: "enum",
        choices: [
          { value: "1200", label: "1200" },
          { value: "2400", label: "2400" },
          { value: "4800", label: "4800" },
          { value: "9600", label: "9600" },
          { value: "19200", label: "19200" },
          { value: "38400", label: "38400" },
          { value: "57600", label: "57600" },
          { value: "115200", label: "115200" },
          { value: "230400", label: "230400" },
        ],
      },
    },
    {
      code: "S2",
      value: "64",
      raw: "AIR_SPEED=64",
      human_readable: "64 kbps",
      definition: {
        name: "AIR_SPEED",
        description: "Over-the-air data rate in kbps",
        value_type: "enum",
        choices: [
          { value: "2", label: "2 kbps" },
          { value: "4", label: "4 kbps" },
          { value: "8", label: "8 kbps" },
          { value: "16", label: "16 kbps" },
          { value: "19", label: "19 kbps" },
          { value: "24", label: "24 kbps" },
          { value: "32", label: "32 kbps" },
          { value: "48", label: "48 kbps" },
          { value: "64", label: "64 kbps" },
          { value: "96", label: "96 kbps" },
          { value: "128", label: "128 kbps" },
          { value: "192", label: "192 kbps" },
          { value: "250", label: "250 kbps" },
        ],
      },
    },
    {
      code: "S3",
      value: "25",
      raw: "NETID=25",
      human_readable: "Network 25",
      definition: {
        name: "NETID",
        description: "Network ID (must match on both radios)",
        value_type: "int",
        min: 0,
        max: 499,
      },
    },
    {
      code: "S4",
      value: "20",
      raw: "TXPOWER=20",
      human_readable: "20 dBm",
      definition: {
        name: "TXPOWER",
        description: "Transmit power in dBm (0-30)",
        value_type: "int",
        min: 0,
        max: 30,
        unit: "dBm",
      },
    },
    {
      code: "S5",
      value: "1",
      raw: "ECC=1",
      human_readable: "Enabled",
      definition: {
        name: "ECC",
        description: "Enable error correcting code for improved reliability",
        value_type: "bool",
      },
    },
    {
      code: "S6",
      value: "1",
      raw: "MAVLINK=1",
      human_readable: "Enabled",
      definition: {
        name: "MAVLINK",
        description: "Enable MAVLink framing mode for optimized telemetry",
        value_type: "bool",
      },
    },
    {
      code: "S7",
      value: "0",
      raw: "OPPRESEND=0",
      human_readable: "Disabled",
      definition: {
        name: "OPPRESEND",
        description: "Opportunistic resend of missed packets",
        value_type: "bool",
      },
    },
    {
      code: "S8",
      value: "915000",
      raw: "MIN_FREQ=915000",
      human_readable: "915.000 MHz",
      definition: {
        name: "MIN_FREQ",
        description: "Minimum frequency in kHz",
        value_type: "int",
        min: 895000,
        max: 935000,
        unit: "kHz",
      },
    },
    {
      code: "S9",
      value: "928000",
      raw: "MAX_FREQ=928000",
      human_readable: "928.000 MHz",
      definition: {
        name: "MAX_FREQ",
        description: "Maximum frequency in kHz",
        value_type: "int",
        min: 895000,
        max: 935000,
        unit: "kHz",
      },
    },
    {
      code: "S10",
      value: "50",
      raw: "NUM_CHANNELS=50",
      human_readable: "50 channels",
      definition: {
        name: "NUM_CHANNELS",
        description: "Number of frequency hopping channels",
        value_type: "int",
        min: 1,
        max: 50,
      },
    },
    {
      code: "S11",
      value: "100",
      raw: "DUTY_CYCLE=100",
      human_readable: "100%",
      definition: {
        name: "DUTY_CYCLE",
        description: "Transmit duty cycle percentage",
        value_type: "int",
        min: 10,
        max: 100,
        unit: "%",
      },
    },
    {
      code: "S12",
      value: "0",
      raw: "LBT_RSSI=0",
      human_readable: "Disabled",
      definition: {
        name: "LBT_RSSI",
        description: "Listen-before-talk RSSI threshold (0=disabled)",
        value_type: "int",
        min: 0,
        max: 255,
      },
    },
    {
      code: "S13",
      value: "0",
      raw: "MANCHESTER=0",
      human_readable: "Disabled",
      definition: {
        name: "MANCHESTER",
        description: "Enable Manchester encoding",
        value_type: "bool",
      },
    },
    {
      code: "S14",
      value: "1",
      raw: "RTSCTS=1",
      human_readable: "Enabled",
      definition: {
        name: "RTSCTS",
        description: "Enable hardware flow control (RTS/CTS)",
        value_type: "bool",
      },
    },
    {
      code: "S15",
      value: "131",
      raw: "MAX_WINDOW=131",
      human_readable: "131 ms",
      definition: {
        name: "MAX_WINDOW",
        description: "Maximum transmit window in milliseconds",
        value_type: "int",
        min: 20,
        max: 400,
        unit: "ms",
      },
    },
  ],
  rawCommands: {
    ATI: ["SiK 2.2 on HM-TRP", "OK"],
    ATI2: ["HopeRF HM-TRP", "Si1000 Rev B", "OK"],
    ATI3: ["S0:FORMAT", "S1:SERIAL_SPEED", "S2:AIR_SPEED", "S3:NETID", "S4:TXPOWER", "OK"],
    ATI4: ["915000 to 928000 kHz", "Num channels: 50", "OK"],
    ATI5: [
      "S0:FORMAT=25",
      "S1:SERIAL_SPEED=64",
      "S2:AIR_SPEED=64",
      "S3:NETID=25",
      "S4:TXPOWER=20",
      "S5:ECC=1",
      "OK",
    ],
    ATI6: ["Vcc: 3.3V", "Temp: 28C", "OK"],
    ATI7: ["EEPROM: 0x1234ABCD", "Flash: 0xDEADBEEF", "OK"],
    ATI9: ["Bootloader: 1.1", "OK"],
    "AT&V": ["SERIAL_SPEED=57600", "AIR_SPEED=64", "NETID=25", "TXPOWER=20", "ECC=1", "OK"],
    "AT&W": ["OK"],
    ATZ: ["OK"],
    ATO: ["OK"],
  },
};

export const CONFIG_STORAGE_KEY = "sik-radio-configs";
export const THEME_STORAGE_KEY = "sik-theme";

export const BASE_RAW_COMMANDS = [
  {
    command: "ATI",
    description: "Display firmware version and build information.",
  },
  {
    command: "ATI2",
    description: "Show hardware details and board type.",
  },
  {
    command: "ATI3",
    description: "List the registered AT command handlers.",
  },
  {
    command: "ATI4",
    description: "Show supported frequency ranges.",
  },
  {
    command: "ATI5",
    description: "Dump all configuration parameters.",
  },
  {
    command: "ATI6",
    description: "Display board voltage and temperature telemetry.",
  },
  {
    command: "ATI7",
    description: "Display EEPROM and flash memory signatures.",
  },
  {
    command: "ATI9",
    description: "Show bootloader version information.",
  },
  {
    command: "AT&V",
    description: "View current configuration and channel settings.",
  },
  {
    command: "AT&W",
    description: "Persist the active settings to flash memory.",
  },
  {
    command: "ATZ",
    description: "Reboot the radio and exit command mode.",
  },
  {
    command: "AT&F",
    description: "Restore factory defaults (requires reconnect).",
  },
  {
    command: "ATO",
    description: "Exit command mode and resume data forwarding.",
  },
];

export const RAW_COMMAND_CUSTOM_VALUE = "__custom__";
export const MAX_LOG_ENTRIES = 200;
