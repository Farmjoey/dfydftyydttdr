#pragma once
// Custom dashboard layouts ("widgets"). Binary format produced by app/widgetlib.js.
// The parser re-checks every rule, so a bad or hostile upload can never be stored or drawn.
// Pure C++11 (host-tested). See docs/WIDGETS.md.
#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include "Telemetry.h"

namespace wl {

static const int kMaxItems = 16, kMaxStr = 8, kStrLen = 12, kTop = 30;
static const size_t kMaxBytes = 8 + kMaxStr * kStrLen + kMaxItems * 16;  // 360

enum Type { T_TEXT = 1, T_NUM = 2, T_BAR = 3, T_RING = 4, T_MODEBAR = 5, T_RECT = 6 };
enum Src { S_NONE = 0, S_SPEED, S_POWER, S_BATT, S_VOLT, S_CURRENT, S_TEMP, S_MTEMP, S_TRIP, S_TOTAL, S_MODE, S_FAULT };

struct Item {
  uint8_t type, src, color, font, align, dp, str;
  uint16_t maxv;
  int16_t x, y;
  uint16_t w, h;
};

struct Layout {
  bool valid;
  uint8_t count, strCount;
  char str[kMaxStr][kStrLen];
  Item items[kMaxItems];
  Layout() : valid(false), count(0), strCount(0) { memset(str, 0, sizeof(str)); memset(items, 0, sizeof(items)); }
};

inline int16_t rd16s(const uint8_t* p) { return (int16_t)(uint16_t)(p[0] | (p[1] << 8)); }
inline uint16_t rd16(const uint8_t* p) { return (uint16_t)(p[0] | (p[1] << 8)); }

// Returns true only for a completely valid layout.
inline bool parse(const uint8_t* d, size_t n, Layout& out) {
  out = Layout();
  if (!d || n < 8 || n > kMaxBytes) return false;
  if (d[0] != 0x4E || d[1] != 0x57 || d[2] != 1) return false;
  const int count = d[3], sc = d[4];
  if (count < 1 || count > kMaxItems || sc > kMaxStr) return false;
  const size_t total = 8 + (size_t)sc * kStrLen + (size_t)count * 16;
  if (rd16(d + 6) != total || n != total) return false;
  for (int i = 0; i < sc; ++i) {
    const uint8_t* s = d + 8 + i * kStrLen;
    bool ended = false;
    for (int k = 0; k < kStrLen; ++k) {
      if (s[k] == 0) ended = true;
      else if (ended || s[k] < 0x20 || s[k] > 0x7E) return false;   // printable ASCII, NUL padded
    }
    if (!ended) return false;
    memcpy(out.str[i], s, kStrLen);
  }
  const uint8_t* p = d + 8 + sc * kStrLen;
  for (int i = 0; i < count; ++i, p += 16) {
    Item& it = out.items[i];
    it.type = p[0]; it.src = p[1]; it.color = p[2]; it.font = p[3];
    it.align = p[4] & 0x0F; it.dp = (uint8_t)(p[4] >> 4); it.str = p[5];
    it.maxv = rd16(p + 6); it.x = rd16s(p + 8); it.y = rd16s(p + 10); it.w = rd16(p + 12); it.h = rd16(p + 14);
    if (it.type < T_TEXT || it.type > T_RECT) return false;
    if (it.src > S_FAULT || it.color > 6 || it.font > 4 || it.align > 2 || it.dp > 2) return false;
    if (it.str != 255 && it.str >= sc) return false;
    const bool numeric = it.src >= S_SPEED && it.src <= S_TOTAL;
    switch (it.type) {
      case T_TEXT:
        if (it.src != S_NONE || it.font > 1 || it.str == 255 || it.y < kTop) return false;
        break;
      case T_NUM:
        if (it.src == S_NONE || it.y < kTop) return false;
        if (it.src == S_MODE && it.font > 1) return false;
        break;
      case T_BAR:
        if (!numeric || it.maxv < 1 || it.w < 8 || it.w > 320 || it.h < 3 || it.h > 40 || it.y < kTop) return false;
        break;
      case T_RING:
        if (!numeric || it.maxv < 1 || it.w < 20 || it.w > 100 || it.h < 4 || it.h > 30 || it.h >= it.w) return false;
        if (it.y - (int)it.w < kTop || it.x - (int)it.w < 0 || it.x + (int)it.w > 320 || it.y + (int)it.w > 240) return false;
        break;
      case T_MODEBAR:
        break;
      case T_RECT:
        if (it.w < 4 || it.w > 320 || it.h < 4 || it.h > 210 || it.y < kTop) return false;
        break;
    }
    if (it.type != T_RING && it.type != T_MODEBAR && (it.x < 0 || it.x > 319 || it.y > 239)) return false;
  }
  out.count = (uint8_t)count;
  out.strCount = (uint8_t)sc;
  out.valid = true;
  return true;
}

// Numeric value of a source, only when the reading is valid (never invented).
inline bool valueFor(uint8_t src, const Telemetry& t, float& v) {
  switch (src) {
    case S_SPEED: if (!t.speedValid) return false; v = t.speedKmh; return true;
    case S_POWER: if (!t.powerValid) return false; v = (float)t.powerW; return true;
    case S_BATT: if (!t.battPctValid) return false; v = (float)t.battPct; return true;
    case S_VOLT: if (!t.voltValid) return false; v = t.volts; return true;
    case S_CURRENT: if (!t.currentValid) return false; v = t.currentA; return true;
    case S_TEMP: if (!t.tempValid) return false; v = t.tempC; return true;
    case S_MTEMP: if (!t.motorTempValid) return false; v = t.motorTempC; return true;
    case S_TRIP: if (!t.tripValid) return false; v = t.tripKm; return true;
    case S_TOTAL: if (!t.totalValid) return false; v = t.totalKm; return true;
    case S_FAULT: if (!t.faultValid) return false; v = (float)t.faultCode; return true;
    default: return false;
  }
}

// Fraction 0..1 for bars and rings (negative values, e.g. regeneration, use their magnitude).
inline float fraction(float v, uint16_t maxv) {
  if (maxv == 0) return 0.0f;
  if (v < 0) v = -v;
  const float f = v / (float)maxv;
  return f > 1.0f ? 1.0f : f;
}

}  // namespace wl
