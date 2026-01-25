export function createState() {
  return {
    connected: false,
    parameters: [],
    radioParameters: {},
    stagedParameters: {},
    cachedConfigs: [],
    overlayClaims: 0,
    selectedConfigId: null,
    parametersLoaded: false,
    loadingParameters: false,
    theme: null,
    activeParameterCode: null,
    activityLog: [],
    logCollapsed: false,
    statusInitialized: false,
    usingWebSerial: false,
    availablePorts: [],
    selectedPort: null,
  };
}
