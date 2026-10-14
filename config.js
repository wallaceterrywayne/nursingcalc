// Site settings for a hosted copy. Leave `endpoint` empty to collect nothing (the default).
// See HOSTING.md for setting up a Google Sheet to receive usage data.
window.PC_CONFIG = {
  telemetry: {
    endpoint: "",          // e.g. "https://script.google.com/macros/s/XXXX/exec"
    study: "pilot",        // a label stored with every event, to tell cohorts or versions apart
  },
};
