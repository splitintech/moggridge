> Historical record. See [final implementation status](implementation-status.md) and final verification logs for the current source.

# Browser verification after reconstruction

The initial reconstructed-tree run passed all five Chromium checks. Firefox failed to launch within 30 seconds; the first two WebKit attempts also timed out at launch. Later WebKit media focus failed while several native bundlers and large checks were contending for host resources.

After terminating only redundant owned verification processes and bounding Metro worker counts, a fresh serial Firefox/WebKit run passed eight behavior tests, with two expected skips for screenshots captured only in Chromium. No production behavior or existing assertion was weakened to obtain these results. A separate WebKit probe confirmed that Shift+Tab from the route close control reaches the actual persistent video element, and the unchanged media test passed on the fresh run.

The new 100-cycle test exercises the full-screen morph through real browser input with reduced motion enabled. After one warmup cycle it performs 100 open/close cycles and verifies the same global listener identity set, unchanged Radix focus-guard count, focus restored to the source, no remaining dialog, and no running DOM animations. This is automated desktop lifecycle coverage. It does not measure retained native memory, physical-device frame pacing, installed PWAs, or 120 Hz performance.

Logs for these runs are `/private/tmp/motion-recovered-browser-retry.log` and `/private/tmp/motion-recovered-cycles.log`.

Current cycle result: all three browsers passed (Chromium, Firefox, WebKit), exit 0 in 1.4 minutes. This covers 300 measured open/close cycles plus one warmup per browser. Across the initial Chromium, clean Firefox/WebKit retry, and new cycle run: 16 passed checks and two intentional screenshot skips.
