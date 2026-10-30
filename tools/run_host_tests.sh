#!/bin/sh
# Compiles and runs the pure-logic unit tests on the host (C++11, same as the ESP32 core).
# Widget layouts are compiled by the app's JavaScript first, so firmware and app are tested against each other.
set -e
cd "$(dirname "$0")/.."
if command -v node >/dev/null 2>&1; then
  rm -rf /tmp/wbin
  node tools/widget_cli.js check app/widgets/starter/classic-ring.json app/widgets/starter/big-speed.json app/widgets/starter/power-focus.json app/widgets/starter/minimal.json
  node tools/widget_cli.js bin /tmp/wbin app/widgets/starter/classic-ring.json app/widgets/starter/big-speed.json app/widgets/starter/power-focus.json app/widgets/starter/minimal.json
else
  echo "node not found: widget cross-test skipped"; exit 1
fi
g++ -std=c++11 -Wall -Wextra -Werror -O1 test/host/test_logic.cpp -o /tmp/nova_host_tests
/tmp/nova_host_tests
