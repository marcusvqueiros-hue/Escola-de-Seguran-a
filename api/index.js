import { createRequire } from "node:module";
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
function __accessProp(key) {
  return this[key];
}
var __toESMCache_node;
var __toESMCache_esm;
var __toESM = (mod, isNodeMode, target) => {
  var canCache = mod != null && typeof mod === "object";
  if (canCache) {
    var cache = isNodeMode ? __toESMCache_node ??= new WeakMap : __toESMCache_esm ??= new WeakMap;
    var cached = cache.get(mod);
    if (cached)
      return cached;
  }
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  if (mod && typeof mod === "object" || typeof mod === "function") {
    for (let key of __getOwnPropNames(mod))
      if (!__hasOwnProp.call(to, key))
        __defProp(to, key, {
          get: __accessProp.bind(mod, key),
          enumerable: true
        });
  }
  if (canCache)
    cache.set(mod, to);
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// node_modules/postgres-array/index.js
var require_postgres_array = __commonJS(function(exports) {
  exports.parse = function(source, transform) {
    return new ArrayParser(source, transform).parse();
  };

  class ArrayParser {
    constructor(source, transform) {
      this.source = source;
      this.transform = transform || identity;
      this.position = 0;
      this.entries = [];
      this.recorded = [];
      this.dimension = 0;
    }
    isEof() {
      return this.position >= this.source.length;
    }
    nextCharacter() {
      var character = this.source[this.position++];
      if (character === "\\") {
        return {
          value: this.source[this.position++],
          escaped: true
        };
      }
      return {
        value: character,
        escaped: false
      };
    }
    record(character) {
      this.recorded.push(character);
    }
    newEntry(includeEmpty) {
      var entry;
      if (this.recorded.length > 0 || includeEmpty) {
        entry = this.recorded.join("");
        if (entry === "NULL" && !includeEmpty) {
          entry = null;
        }
        if (entry !== null)
          entry = this.transform(entry);
        this.entries.push(entry);
        this.recorded = [];
      }
    }
    consumeDimensions() {
      if (this.source[0] === "[") {
        while (!this.isEof()) {
          var char = this.nextCharacter();
          if (char.value === "=")
            break;
        }
      }
    }
    parse(nested) {
      var character, parser, quote;
      this.consumeDimensions();
      while (!this.isEof()) {
        character = this.nextCharacter();
        if (character.value === "{" && !quote) {
          this.dimension++;
          if (this.dimension > 1) {
            parser = new ArrayParser(this.source.substr(this.position - 1), this.transform);
            this.entries.push(parser.parse(true));
            this.position += parser.position - 2;
          }
        } else if (character.value === "}" && !quote) {
          this.dimension--;
          if (!this.dimension) {
            this.newEntry();
            if (nested)
              return this.entries;
          }
        } else if (character.value === '"' && !character.escaped) {
          if (quote)
            this.newEntry(true);
          quote = !quote;
        } else if (character.value === "," && !quote) {
          this.newEntry();
        } else {
          this.record(character.value);
        }
      }
      if (this.dimension !== 0) {
        throw new Error("array dimension not balanced");
      }
      return this.entries;
    }
  }
  function identity(value) {
    return value;
  }
});

// node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS(function(exports, module) {
  var array = require_postgres_array();
  module.exports = {
    create: function(source, transform) {
      return {
        parse: function() {
          return array.parse(source, transform);
        }
      };
    }
  };
});

// node_modules/postgres-date/index.js
var require_postgres_date = __commonJS(function(exports, module) {
  var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
  var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
  var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
  var INFINITY = /^-?infinity$/;
  module.exports = function parseDate(isoDate) {
    if (INFINITY.test(isoDate)) {
      return Number(isoDate.replace("i", "I"));
    }
    var matches = DATE_TIME.exec(isoDate);
    if (!matches) {
      return getDate(isoDate) || null;
    }
    var isBC = !!matches[8];
    var year = parseInt(matches[1], 10);
    if (isBC) {
      year = bcYearToNegativeYear(year);
    }
    var month = parseInt(matches[2], 10) - 1;
    var day = matches[3];
    var hour = parseInt(matches[4], 10);
    var minute = parseInt(matches[5], 10);
    var second = parseInt(matches[6], 10);
    var ms = matches[7];
    ms = ms ? 1000 * parseFloat(ms) : 0;
    var date;
    var offset = timeZoneOffset(isoDate);
    if (offset != null) {
      date = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
      if (is0To99(year)) {
        date.setUTCFullYear(year);
      }
      if (offset !== 0) {
        date.setTime(date.getTime() - offset);
      }
    } else {
      date = new Date(year, month, day, hour, minute, second, ms);
      if (is0To99(year)) {
        date.setFullYear(year);
      }
    }
    return date;
  };
  function getDate(isoDate) {
    var matches = DATE.exec(isoDate);
    if (!matches) {
      return;
    }
    var year = parseInt(matches[1], 10);
    var isBC = !!matches[4];
    if (isBC) {
      year = bcYearToNegativeYear(year);
    }
    var month = parseInt(matches[2], 10) - 1;
    var day = matches[3];
    var date = new Date(year, month, day);
    if (is0To99(year)) {
      date.setFullYear(year);
    }
    return date;
  }
  function timeZoneOffset(isoDate) {
    if (isoDate.endsWith("+00")) {
      return 0;
    }
    var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
    if (!zone)
      return;
    var type = zone[1];
    if (type === "Z") {
      return 0;
    }
    var sign = type === "-" ? -1 : 1;
    var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
    return offset * sign * 1000;
  }
  function bcYearToNegativeYear(year) {
    return -(year - 1);
  }
  function is0To99(num) {
    return num >= 0 && num < 100;
  }
});

// node_modules/xtend/mutable.js
var require_mutable = __commonJS(function(exports, module) {
  module.exports = extend;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  function extend(target) {
    for (var i = 1;i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  }
});

// node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS(function(exports, module) {
  var extend = require_mutable();
  module.exports = PostgresInterval;
  function PostgresInterval(raw) {
    if (!(this instanceof PostgresInterval)) {
      return new PostgresInterval(raw);
    }
    extend(this, parse(raw));
  }
  var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
  PostgresInterval.prototype.toPostgres = function() {
    var filtered = properties.filter(this.hasOwnProperty, this);
    if (this.milliseconds && filtered.indexOf("seconds") < 0) {
      filtered.push("seconds");
    }
    if (filtered.length === 0)
      return "0";
    return filtered.map(function(property) {
      var value = this[property] || 0;
      if (property === "seconds" && this.milliseconds) {
        value = (value + this.milliseconds / 1000).toFixed(6).replace(/\.?0+$/, "");
      }
      return value + " " + property;
    }, this).join(" ");
  };
  var propertiesISOEquivalent = {
    years: "Y",
    months: "M",
    days: "D",
    hours: "H",
    minutes: "M",
    seconds: "S"
  };
  var dateProperties = ["years", "months", "days"];
  var timeProperties = ["hours", "minutes", "seconds"];
  PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
    var datePart = dateProperties.map(buildProperty, this).join("");
    var timePart = timeProperties.map(buildProperty, this).join("");
    return "P" + datePart + "T" + timePart;
    function buildProperty(property) {
      var value = this[property] || 0;
      if (property === "seconds" && this.milliseconds) {
        value = (value + this.milliseconds / 1000).toFixed(6).replace(/0+$/, "");
      }
      return value + propertiesISOEquivalent[property];
    }
  };
  var NUMBER = "([+-]?\\d+)";
  var YEAR = NUMBER + "\\s+years?";
  var MONTH = NUMBER + "\\s+mons?";
  var DAY = NUMBER + "\\s+days?";
  var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
  var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
    return "(" + regexString + ")?";
  }).join("\\s*"));
  var positions = {
    years: 2,
    months: 4,
    days: 6,
    hours: 9,
    minutes: 10,
    seconds: 11,
    milliseconds: 12
  };
  var negatives = ["hours", "minutes", "seconds", "milliseconds"];
  function parseMilliseconds(fraction) {
    var microseconds = fraction + "000000".slice(fraction.length);
    return parseInt(microseconds, 10) / 1000;
  }
  function parse(interval) {
    if (!interval)
      return {};
    var matches = INTERVAL.exec(interval);
    var isNegative = matches[8] === "-";
    return Object.keys(positions).reduce(function(parsed, property) {
      var position = positions[property];
      var value = matches[position];
      if (!value)
        return parsed;
      value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
      if (!value)
        return parsed;
      if (isNegative && ~negatives.indexOf(property)) {
        value *= -1;
      }
      parsed[property] = value;
      return parsed;
    }, {});
  }
});

// node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS(function(exports, module) {
  var bufferFrom = Buffer.from || Buffer;
  module.exports = function parseBytea(input) {
    if (/^\\x/.test(input)) {
      return bufferFrom(input.substr(2), "hex");
    }
    var output = "";
    var i = 0;
    while (i < input.length) {
      if (input[i] !== "\\") {
        output += input[i];
        ++i;
      } else {
        if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
          output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
          i += 4;
        } else {
          var backslashes = 1;
          while (i + backslashes < input.length && input[i + backslashes] === "\\") {
            backslashes++;
          }
          for (var k = 0;k < Math.floor(backslashes / 2); ++k) {
            output += "\\";
          }
          i += Math.floor(backslashes / 2) * 2;
        }
      }
    }
    return bufferFrom(output, "binary");
  };
});

// node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS(function(exports, module) {
  var array = require_postgres_array();
  var arrayParser = require_arrayParser();
  var parseDate = require_postgres_date();
  var parseInterval = require_postgres_interval();
  var parseByteA = require_postgres_bytea();
  function allowNull(fn) {
    return function nullAllowed(value) {
      if (value === null)
        return value;
      return fn(value);
    };
  }
  function parseBool(value) {
    if (value === null)
      return value;
    return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
  }
  function parseBoolArray(value) {
    if (!value)
      return null;
    return array.parse(value, parseBool);
  }
  function parseBaseTenInt(string) {
    return parseInt(string, 10);
  }
  function parseIntegerArray(value) {
    if (!value)
      return null;
    return array.parse(value, allowNull(parseBaseTenInt));
  }
  function parseBigIntegerArray(value) {
    if (!value)
      return null;
    return array.parse(value, allowNull(function(entry) {
      return parseBigInteger(entry).trim();
    }));
  }
  var parsePointArray = function(value) {
    if (!value) {
      return null;
    }
    var p = arrayParser.create(value, function(entry) {
      if (entry !== null) {
        entry = parsePoint(entry);
      }
      return entry;
    });
    return p.parse();
  };
  var parseFloatArray = function(value) {
    if (!value) {
      return null;
    }
    var p = arrayParser.create(value, function(entry) {
      if (entry !== null) {
        entry = parseFloat(entry);
      }
      return entry;
    });
    return p.parse();
  };
  var parseStringArray = function(value) {
    if (!value) {
      return null;
    }
    var p = arrayParser.create(value);
    return p.parse();
  };
  var parseDateArray = function(value) {
    if (!value) {
      return null;
    }
    var p = arrayParser.create(value, function(entry) {
      if (entry !== null) {
        entry = parseDate(entry);
      }
      return entry;
    });
    return p.parse();
  };
  var parseIntervalArray = function(value) {
    if (!value) {
      return null;
    }
    var p = arrayParser.create(value, function(entry) {
      if (entry !== null) {
        entry = parseInterval(entry);
      }
      return entry;
    });
    return p.parse();
  };
  var parseByteAArray = function(value) {
    if (!value) {
      return null;
    }
    return array.parse(value, allowNull(parseByteA));
  };
  var parseInteger = function(value) {
    return parseInt(value, 10);
  };
  var parseBigInteger = function(value) {
    var valStr = String(value);
    if (/^\d+$/.test(valStr)) {
      return valStr;
    }
    return value;
  };
  var parseJsonArray = function(value) {
    if (!value) {
      return null;
    }
    return array.parse(value, allowNull(JSON.parse));
  };
  var parsePoint = function(value) {
    if (value[0] !== "(") {
      return null;
    }
    value = value.substring(1, value.length - 1).split(",");
    return {
      x: parseFloat(value[0]),
      y: parseFloat(value[1])
    };
  };
  var parseCircle = function(value) {
    if (value[0] !== "<" && value[1] !== "(") {
      return null;
    }
    var point = "(";
    var radius = "";
    var pointParsed = false;
    for (var i = 2;i < value.length - 1; i++) {
      if (!pointParsed) {
        point += value[i];
      }
      if (value[i] === ")") {
        pointParsed = true;
        continue;
      } else if (!pointParsed) {
        continue;
      }
      if (value[i] === ",") {
        continue;
      }
      radius += value[i];
    }
    var result = parsePoint(point);
    result.radius = parseFloat(radius);
    return result;
  };
  var init = function(register) {
    register(20, parseBigInteger);
    register(21, parseInteger);
    register(23, parseInteger);
    register(26, parseInteger);
    register(700, parseFloat);
    register(701, parseFloat);
    register(16, parseBool);
    register(1082, parseDate);
    register(1114, parseDate);
    register(1184, parseDate);
    register(600, parsePoint);
    register(651, parseStringArray);
    register(718, parseCircle);
    register(1000, parseBoolArray);
    register(1001, parseByteAArray);
    register(1005, parseIntegerArray);
    register(1007, parseIntegerArray);
    register(1028, parseIntegerArray);
    register(1016, parseBigIntegerArray);
    register(1017, parsePointArray);
    register(1021, parseFloatArray);
    register(1022, parseFloatArray);
    register(1231, parseFloatArray);
    register(1014, parseStringArray);
    register(1015, parseStringArray);
    register(1008, parseStringArray);
    register(1009, parseStringArray);
    register(1040, parseStringArray);
    register(1041, parseStringArray);
    register(1115, parseDateArray);
    register(1182, parseDateArray);
    register(1185, parseDateArray);
    register(1186, parseInterval);
    register(1187, parseIntervalArray);
    register(17, parseByteA);
    register(114, JSON.parse.bind(JSON));
    register(3802, JSON.parse.bind(JSON));
    register(199, parseJsonArray);
    register(3807, parseJsonArray);
    register(3907, parseStringArray);
    register(2951, parseStringArray);
    register(791, parseStringArray);
    register(1183, parseStringArray);
    register(1270, parseStringArray);
  };
  module.exports = {
    init
  };
});

// node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS(function(exports, module) {
  var BASE = 1e6;
  function readInt8(buffer) {
    var high = buffer.readInt32BE(0);
    var low = buffer.readUInt32BE(4);
    var sign = "";
    if (high < 0) {
      high = ~high + (low === 0);
      low = ~low + 1 >>> 0;
      sign = "-";
    }
    var result = "";
    var carry;
    var t;
    var digits;
    var pad;
    var l;
    var i;
    {
      carry = high % BASE;
      high = high / BASE >>> 0;
      t = 4294967296 * carry + low;
      low = t / BASE >>> 0;
      digits = "" + (t - BASE * low);
      if (low === 0 && high === 0) {
        return sign + digits + result;
      }
      pad = "";
      l = 6 - digits.length;
      for (i = 0;i < l; i++) {
        pad += "0";
      }
      result = pad + digits + result;
    }
    {
      carry = high % BASE;
      high = high / BASE >>> 0;
      t = 4294967296 * carry + low;
      low = t / BASE >>> 0;
      digits = "" + (t - BASE * low);
      if (low === 0 && high === 0) {
        return sign + digits + result;
      }
      pad = "";
      l = 6 - digits.length;
      for (i = 0;i < l; i++) {
        pad += "0";
      }
      result = pad + digits + result;
    }
    {
      carry = high % BASE;
      high = high / BASE >>> 0;
      t = 4294967296 * carry + low;
      low = t / BASE >>> 0;
      digits = "" + (t - BASE * low);
      if (low === 0 && high === 0) {
        return sign + digits + result;
      }
      pad = "";
      l = 6 - digits.length;
      for (i = 0;i < l; i++) {
        pad += "0";
      }
      result = pad + digits + result;
    }
    {
      carry = high % BASE;
      t = 4294967296 * carry + low;
      digits = "" + t % BASE;
      return sign + digits + result;
    }
  }
  module.exports = readInt8;
});

// node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS(function(exports, module) {
  var parseInt64 = require_pg_int8();
  var parseBits = function(data, bits, offset, invert, callback) {
    offset = offset || 0;
    invert = invert || false;
    callback = callback || function(lastValue, newValue, bits) {
      return lastValue * Math.pow(2, bits) + newValue;
    };
    var offsetBytes = offset >> 3;
    var inv = function(value) {
      if (invert) {
        return ~value & 255;
      }
      return value;
    };
    var mask = 255;
    var firstBits = 8 - offset % 8;
    if (bits < firstBits) {
      mask = 255 << 8 - bits & 255;
      firstBits = bits;
    }
    if (offset) {
      mask = mask >> offset % 8;
    }
    var result = 0;
    if (offset % 8 + bits >= 8) {
      result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
    }
    var bytes = bits + offset >> 3;
    for (var i = offsetBytes + 1;i < bytes; i++) {
      result = callback(result, inv(data[i]), 8);
    }
    var lastBits = (bits + offset) % 8;
    if (lastBits > 0) {
      result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
    }
    return result;
  };
  var parseFloatFromBits = function(data, precisionBits, exponentBits) {
    var bias = Math.pow(2, exponentBits - 1) - 1;
    var sign = parseBits(data, 1);
    var exponent = parseBits(data, exponentBits, 1);
    if (exponent === 0) {
      return 0;
    }
    var precisionBitsCounter = 1;
    var parsePrecisionBits = function(lastValue, newValue, bits) {
      if (lastValue === 0) {
        lastValue = 1;
      }
      for (var i = 1;i <= bits; i++) {
        precisionBitsCounter /= 2;
        if ((newValue & 1 << bits - i) > 0) {
          lastValue += precisionBitsCounter;
        }
      }
      return lastValue;
    };
    var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
    if (exponent == Math.pow(2, exponentBits + 1) - 1) {
      if (mantissa === 0) {
        return sign === 0 ? Infinity : -Infinity;
      }
      return NaN;
    }
    return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
  };
  var parseInt16 = function(value) {
    if (parseBits(value, 1) == 1) {
      return -1 * (parseBits(value, 15, 1, true) + 1);
    }
    return parseBits(value, 15, 1);
  };
  var parseInt32 = function(value) {
    if (parseBits(value, 1) == 1) {
      return -1 * (parseBits(value, 31, 1, true) + 1);
    }
    return parseBits(value, 31, 1);
  };
  var parseFloat32 = function(value) {
    return parseFloatFromBits(value, 23, 8);
  };
  var parseFloat64 = function(value) {
    return parseFloatFromBits(value, 52, 11);
  };
  var parseNumeric = function(value) {
    var sign = parseBits(value, 16, 32);
    if (sign == 49152) {
      return NaN;
    }
    var weight = Math.pow(1e4, parseBits(value, 16, 16));
    var result = 0;
    var digits = [];
    var ndigits = parseBits(value, 16);
    for (var i = 0;i < ndigits; i++) {
      result += parseBits(value, 16, 64 + 16 * i) * weight;
      weight /= 1e4;
    }
    var scale = Math.pow(10, parseBits(value, 16, 48));
    return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
  };
  var parseDate = function(isUTC, value) {
    var sign = parseBits(value, 1);
    var rawValue = parseBits(value, 63, 1);
    var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1000 + 946684800000);
    if (!isUTC) {
      result.setTime(result.getTime() + result.getTimezoneOffset() * 60000);
    }
    result.usec = rawValue % 1000;
    result.getMicroSeconds = function() {
      return this.usec;
    };
    result.setMicroSeconds = function(value) {
      this.usec = value;
    };
    result.getUTCMicroSeconds = function() {
      return this.usec;
    };
    return result;
  };
  var parseArray = function(value) {
    var dim = parseBits(value, 32);
    var flags = parseBits(value, 32, 32);
    var elementType = parseBits(value, 32, 64);
    var offset = 96;
    var dims = [];
    for (var i = 0;i < dim; i++) {
      dims[i] = parseBits(value, 32, offset);
      offset += 32;
      offset += 32;
    }
    var parseElement = function(elementType) {
      var length = parseBits(value, 32, offset);
      offset += 32;
      if (length == 4294967295) {
        return null;
      }
      var result;
      if (elementType == 23 || elementType == 20) {
        result = parseBits(value, length * 8, offset);
        offset += length * 8;
        return result;
      } else if (elementType == 25) {
        result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
        return result;
      } else {
        console.log("ERROR: ElementType not implemented: " + elementType);
      }
    };
    var parse = function(dimension, elementType) {
      var array = [];
      var i;
      if (dimension.length > 1) {
        var count = dimension.shift();
        for (i = 0;i < count; i++) {
          array[i] = parse(dimension, elementType);
        }
        dimension.unshift(count);
      } else {
        for (i = 0;i < dimension[0]; i++) {
          array[i] = parseElement(elementType);
        }
      }
      return array;
    };
    return parse(dims, elementType);
  };
  var parseText = function(value) {
    return value.toString("utf8");
  };
  var parseBool = function(value) {
    if (value === null)
      return null;
    return parseBits(value, 8) > 0;
  };
  var init = function(register) {
    register(20, parseInt64);
    register(21, parseInt16);
    register(23, parseInt32);
    register(26, parseInt32);
    register(1700, parseNumeric);
    register(700, parseFloat32);
    register(701, parseFloat64);
    register(16, parseBool);
    register(1114, parseDate.bind(null, false));
    register(1184, parseDate.bind(null, true));
    register(1000, parseArray);
    register(1007, parseArray);
    register(1016, parseArray);
    register(1008, parseArray);
    register(1009, parseArray);
    register(25, parseText);
  };
  module.exports = {
    init
  };
});

// node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS(function(exports, module) {
  module.exports = {
    BOOL: 16,
    BYTEA: 17,
    CHAR: 18,
    INT8: 20,
    INT2: 21,
    INT4: 23,
    REGPROC: 24,
    TEXT: 25,
    OID: 26,
    TID: 27,
    XID: 28,
    CID: 29,
    JSON: 114,
    XML: 142,
    PG_NODE_TREE: 194,
    SMGR: 210,
    PATH: 602,
    POLYGON: 604,
    CIDR: 650,
    FLOAT4: 700,
    FLOAT8: 701,
    ABSTIME: 702,
    RELTIME: 703,
    TINTERVAL: 704,
    CIRCLE: 718,
    MACADDR8: 774,
    MONEY: 790,
    MACADDR: 829,
    INET: 869,
    ACLITEM: 1033,
    BPCHAR: 1042,
    VARCHAR: 1043,
    DATE: 1082,
    TIME: 1083,
    TIMESTAMP: 1114,
    TIMESTAMPTZ: 1184,
    INTERVAL: 1186,
    TIMETZ: 1266,
    BIT: 1560,
    VARBIT: 1562,
    NUMERIC: 1700,
    REFCURSOR: 1790,
    REGPROCEDURE: 2202,
    REGOPER: 2203,
    REGOPERATOR: 2204,
    REGCLASS: 2205,
    REGTYPE: 2206,
    UUID: 2950,
    TXID_SNAPSHOT: 2970,
    PG_LSN: 3220,
    PG_NDISTINCT: 3361,
    PG_DEPENDENCIES: 3402,
    TSVECTOR: 3614,
    TSQUERY: 3615,
    GTSVECTOR: 3642,
    REGCONFIG: 3734,
    REGDICTIONARY: 3769,
    JSONB: 3802,
    REGNAMESPACE: 4089,
    REGROLE: 4096
  };
});

// node_modules/pg-types/index.js
var require_pg_types = __commonJS(function(exports) {
  var textParsers = require_textParsers();
  var binaryParsers = require_binaryParsers();
  var arrayParser = require_arrayParser();
  var builtinTypes = require_builtins();
  exports.getTypeParser = getTypeParser;
  exports.setTypeParser = setTypeParser;
  exports.arrayParser = arrayParser;
  exports.builtins = builtinTypes;
  var typeParsers = {
    text: {},
    binary: {}
  };
  function noParse(val) {
    return String(val);
  }
  function getTypeParser(oid, format) {
    format = format || "text";
    if (!typeParsers[format]) {
      return noParse;
    }
    return typeParsers[format][oid] || noParse;
  }
  function setTypeParser(oid, format, parseFn) {
    if (typeof format == "function") {
      parseFn = format;
      format = "text";
    }
    typeParsers[format][oid] = parseFn;
  }
  textParsers.init(function(oid, converter) {
    typeParsers.text[oid] = converter;
  });
  binaryParsers.init(function(oid, converter) {
    typeParsers.binary[oid] = converter;
  });
});

// node_modules/pg/lib/defaults.js
var require_defaults = __commonJS(function(exports, module) {
  var user;
  try {
    user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
  } catch {}
  module.exports = {
    host: "localhost",
    user,
    database: undefined,
    password: null,
    connectionString: undefined,
    port: 5432,
    rows: 0,
    binary: false,
    max: 10,
    idleTimeoutMillis: 30000,
    client_encoding: "",
    ssl: false,
    sslnegotiation: undefined,
    application_name: undefined,
    fallback_application_name: undefined,
    options: undefined,
    parseInputDatesAsUTC: false,
    statement_timeout: false,
    lock_timeout: false,
    idle_in_transaction_session_timeout: false,
    query_timeout: false,
    connect_timeout: 0,
    keepalives: 1,
    keepalives_idle: 0
  };
  var pgTypes = require_pg_types();
  var parseBigInteger = pgTypes.getTypeParser(20, "text");
  var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
  module.exports.__defineSetter__("parseInt8", function(val) {
    pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
    pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
  });
});

// node_modules/pg/lib/utils.js
var require_utils = __commonJS(function(exports, module) {
  var defaults = require_defaults();
  var nodeUtils = __require("util");
  var { isDate } = __require("util/types");
  var invalidDateDeprecationNotice = nodeUtils.deprecate(() => {}, "Sending an invalid date to Postgres is deprecated and will throw an error in the next major version of pg. Ensure any Date object passed as a query parameter is valid.", "PG_INVALID_DATE");
  function escapeElement(elementRepresentation) {
    const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    return '"' + escaped + '"';
  }
  function arrayString(val) {
    let result = "{";
    for (let i = 0;i < val.length; i++) {
      if (i > 0) {
        result += ",";
      }
      let item = val[i];
      if (item == null) {
        result += "NULL";
      } else if (Array.isArray(item)) {
        result += arrayString(item);
      } else if (ArrayBuffer.isView(item)) {
        if (!(item instanceof Buffer)) {
          item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
        }
        result += "\\\\x" + item.toString("hex");
      } else {
        result += escapeElement(prepareValue(item));
      }
    }
    result += "}";
    return result;
  }
  var prepareValue = function(val, seen) {
    if (val == null) {
      return null;
    }
    if (typeof val === "object") {
      if (val instanceof Buffer) {
        return val;
      }
      if (ArrayBuffer.isView(val)) {
        return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
      }
      if (isDate(val)) {
        if (isNaN(val.getTime())) {
          invalidDateDeprecationNotice();
        }
        if (defaults.parseInputDatesAsUTC) {
          return dateToStringUTC(val);
        } else {
          return dateToString(val);
        }
      }
      if (Array.isArray(val)) {
        return arrayString(val);
      }
      return prepareObject(val, seen);
    }
    return val.toString();
  };
  function prepareObject(val, seen) {
    if (val && typeof val.toPostgres === "function") {
      seen = seen || [];
      if (seen.indexOf(val) !== -1) {
        throw new Error('circular reference detected while preparing "' + val + '" for query');
      }
      seen.push(val);
      return prepareValue(val.toPostgres(prepareValue), seen);
    }
    return JSON.stringify(val);
  }
  function dateToString(date) {
    let offset = -date.getTimezoneOffset();
    let year = date.getFullYear();
    const isBCYear = year < 1;
    if (isBCYear)
      year = Math.abs(year) + 1;
    let ret = String(year).padStart(4, "0") + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T" + String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0") + ":" + String(date.getSeconds()).padStart(2, "0") + "." + String(date.getMilliseconds()).padStart(3, "0");
    if (offset < 0) {
      ret += "-";
      offset *= -1;
    } else {
      ret += "+";
    }
    ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
    if (isBCYear)
      ret += " BC";
    return ret;
  }
  function dateToStringUTC(date) {
    let year = date.getUTCFullYear();
    const isBCYear = year < 1;
    if (isBCYear)
      year = Math.abs(year) + 1;
    let ret = String(year).padStart(4, "0") + "-" + String(date.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date.getUTCDate()).padStart(2, "0") + "T" + String(date.getUTCHours()).padStart(2, "0") + ":" + String(date.getUTCMinutes()).padStart(2, "0") + ":" + String(date.getUTCSeconds()).padStart(2, "0") + "." + String(date.getUTCMilliseconds()).padStart(3, "0");
    ret += "+00:00";
    if (isBCYear)
      ret += " BC";
    return ret;
  }
  function normalizeQueryConfig(config, values, callback) {
    config = typeof config === "string" ? { text: config } : cloneQueryConfig(config);
    if (values) {
      if (typeof values === "function") {
        config.callback = values;
      } else {
        config.values = values;
      }
    }
    if (callback) {
      config.callback = callback;
    }
    return config;
  }
  function cloneQueryConfig(config) {
    if (config == null) {
      return config;
    }
    return Object.defineProperties(Object.create(Object.getPrototypeOf(config)), Object.getOwnPropertyDescriptors(config));
  }
  var escapeIdentifier = function(str) {
    return '"' + str.replace(/"/g, '""') + '"';
  };
  var escapeLiteral = function(str) {
    let hasBackslash = false;
    let escaped = "'";
    if (str == null) {
      return "''";
    }
    if (typeof str !== "string") {
      return "''";
    }
    for (let i = 0;i < str.length; i++) {
      const c = str[i];
      if (c === "'") {
        escaped += c + c;
      } else if (c === "\\") {
        escaped += c + c;
        hasBackslash = true;
      } else {
        escaped += c;
      }
    }
    escaped += "'";
    if (hasBackslash === true) {
      escaped = " E" + escaped;
    }
    return escaped;
  };
  module.exports = {
    prepareValue: function prepareValueWrapper(value) {
      return prepareValue(value);
    },
    normalizeQueryConfig,
    escapeIdentifier,
    escapeLiteral
  };
});

// node_modules/pg/lib/crypto/utils.js
var require_utils2 = __commonJS(function(exports, module) {
  var nodeCrypto = __require("crypto");
  module.exports = {
    postgresMd5PasswordHash,
    randomBytes,
    deriveKey,
    sha256,
    hashByName,
    hmacSha256,
    md5
  };
  var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
  var subtleCrypto = webCrypto.subtle;
  var textEncoder = new TextEncoder;
  function randomBytes(length) {
    return webCrypto.getRandomValues(Buffer.alloc(length));
  }
  async function md5(string) {
    try {
      return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
    } catch (e) {
      const data = typeof string === "string" ? textEncoder.encode(string) : string;
      const hash = await subtleCrypto.digest("MD5", data);
      return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  }
  async function postgresMd5PasswordHash(user, password, salt) {
    const inner = await md5(password + user);
    const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
    return "md5" + outer;
  }
  async function sha256(text) {
    return await subtleCrypto.digest("SHA-256", text);
  }
  async function hashByName(hashName, text) {
    return await subtleCrypto.digest(hashName, text);
  }
  async function hmacSha256(keyBuffer, msg) {
    const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
  }
  async function deriveKey(password, salt, iterations) {
    const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
    return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
  }
});

// node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = __commonJS(function(exports, module) {
  function x509Error(msg, cert) {
    return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
  }
  function readASN1Length(data, index) {
    let length = data[index++];
    if (length < 128)
      return { length, index };
    const lengthBytes = length & 127;
    if (lengthBytes > 4)
      throw x509Error("bad length", data);
    length = 0;
    for (let i = 0;i < lengthBytes; i++) {
      length = length << 8 | data[index++];
    }
    return { length, index };
  }
  function readASN1OID(data, index) {
    if (data[index++] !== 6)
      throw x509Error("non-OID data", data);
    const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
    index = indexAfterOIDLength;
    const lastIndex = index + OIDLength;
    const byte1 = data[index++];
    let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
    while (index < lastIndex) {
      let value = 0;
      while (index < lastIndex) {
        const nextByte = data[index++];
        value = value << 7 | nextByte & 127;
        if (nextByte < 128)
          break;
      }
      oid += "." + value;
    }
    return { oid, index };
  }
  function expectASN1Seq(data, index) {
    if (data[index++] !== 48)
      throw x509Error("non-sequence data", data);
    return readASN1Length(data, index);
  }
  function signatureAlgorithmHashFromCertificate(data, index) {
    if (index === undefined)
      index = 0;
    index = expectASN1Seq(data, index).index;
    const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
    index = indexAfterCertInfoLength + certInfoLength;
    index = expectASN1Seq(data, index).index;
    const { oid, index: indexAfterOID } = readASN1OID(data, index);
    switch (oid) {
      case "1.2.840.113549.1.1.4":
        return "MD5";
      case "1.2.840.113549.1.1.5":
        return "SHA-1";
      case "1.2.840.113549.1.1.11":
        return "SHA-256";
      case "1.2.840.113549.1.1.12":
        return "SHA-384";
      case "1.2.840.113549.1.1.13":
        return "SHA-512";
      case "1.2.840.113549.1.1.14":
        return "SHA-224";
      case "1.2.840.113549.1.1.15":
        return "SHA512-224";
      case "1.2.840.113549.1.1.16":
        return "SHA512-256";
      case "1.2.840.10045.4.1":
        return "SHA-1";
      case "1.2.840.10045.4.3.1":
        return "SHA-224";
      case "1.2.840.10045.4.3.2":
        return "SHA-256";
      case "1.2.840.10045.4.3.3":
        return "SHA-384";
      case "1.2.840.10045.4.3.4":
        return "SHA-512";
      case "1.2.840.113549.1.1.10": {
        index = indexAfterOID;
        index = expectASN1Seq(data, index).index;
        if (data[index++] !== 160)
          throw x509Error("non-tag data", data);
        index = readASN1Length(data, index).index;
        index = expectASN1Seq(data, index).index;
        const { oid: hashOID } = readASN1OID(data, index);
        switch (hashOID) {
          case "1.2.840.113549.2.5":
            return "MD5";
          case "1.3.14.3.2.26":
            return "SHA-1";
          case "2.16.840.1.101.3.4.2.1":
            return "SHA-256";
          case "2.16.840.1.101.3.4.2.2":
            return "SHA-384";
          case "2.16.840.1.101.3.4.2.3":
            return "SHA-512";
        }
        throw x509Error("unknown hash OID " + hashOID, data);
      }
      case "1.3.101.110":
      case "1.3.101.112":
        return "SHA-512";
      case "1.3.101.111":
      case "1.3.101.113":
        throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
    }
    throw x509Error("unknown OID " + oid, data);
  }
  module.exports = { signatureAlgorithmHashFromCertificate };
});

// node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS(function(exports, module) {
  var crypto = require_utils2();
  var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
  function saslprep(password) {
    const nonAsciiSpace = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;
    const mappedToNothing = /[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
    return password.replace(nonAsciiSpace, " ").replace(mappedToNothing, "").normalize("NFKC");
  }
  var DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
  function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
    const candidates = ["SCRAM-SHA-256"];
    if (stream)
      candidates.unshift("SCRAM-SHA-256-PLUS");
    const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
    if (!mechanism) {
      throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
    }
    if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
      throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
    }
    const clientNonce = crypto.randomBytes(18).toString("base64");
    const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
    return {
      mechanism,
      clientNonce,
      response: gs2Header + ",,n=*,r=" + clientNonce,
      message: "SASLInitialResponse",
      scramMaxIterations
    };
  }
  async function continueSession(session, password, serverData, stream) {
    if (session.message !== "SASLInitialResponse") {
      throw new Error("SASL: Last message was not SASLInitialResponse");
    }
    if (typeof password !== "string") {
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
    }
    if (password === "") {
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
    }
    if (typeof serverData !== "string") {
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
    }
    const sv = parseServerFirstMessage(serverData);
    if (!sv.nonce.startsWith(session.clientNonce)) {
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
    } else if (sv.nonce.length === session.clientNonce.length) {
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
    }
    const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
    if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) {
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations);
    }
    const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
    const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
    let channelBinding = stream ? "eSws" : "biws";
    if (session.mechanism === "SCRAM-SHA-256-PLUS") {
      const peerCert = stream.getPeerCertificate().raw;
      let hashName = signatureAlgorithmHashFromCertificate(peerCert);
      if (hashName === "MD5" || hashName === "SHA-1")
        hashName = "SHA-256";
      const certHash = await crypto.hashByName(hashName, peerCert);
      const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
      channelBinding = bindingData.toString("base64");
    }
    const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
    const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
    const saltBytes = Buffer.from(sv.salt, "base64");
    const saltedPassword = await crypto.deriveKey(saslprep(password), saltBytes, sv.iteration);
    const clientKey = await crypto.hmacSha256(saltedPassword, "Client Key");
    const storedKey = await crypto.sha256(clientKey);
    const clientSignature = await crypto.hmacSha256(storedKey, authMessage);
    const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
    const serverKey = await crypto.hmacSha256(saltedPassword, "Server Key");
    const serverSignatureBytes = await crypto.hmacSha256(serverKey, authMessage);
    session.message = "SASLResponse";
    session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
    session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
  }
  function finalizeSession(session, serverData) {
    if (session.message !== "SASLResponse") {
      throw new Error("SASL: Last message was not SASLResponse");
    }
    if (typeof serverData !== "string") {
      throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
    }
    const { serverSignature } = parseServerFinalMessage(serverData);
    if (serverSignature !== session.serverSignature) {
      throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
    }
  }
  function isPrintableChars(text) {
    if (typeof text !== "string") {
      throw new TypeError("SASL: text must be a string");
    }
    return text.split("").map((_, i) => text.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
  }
  function isBase64(text) {
    return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text);
  }
  function parseAttributePairs(text) {
    if (typeof text !== "string") {
      throw new TypeError("SASL: attribute pairs text must be a string");
    }
    return new Map(text.split(",").map((attrValue) => {
      if (!/^.=/.test(attrValue)) {
        throw new Error("SASL: Invalid attribute pair entry");
      }
      const name = attrValue[0];
      const value = attrValue.substring(2);
      return [name, value];
    }));
  }
  function parseServerFirstMessage(data) {
    const attrPairs = parseAttributePairs(data);
    const nonce = attrPairs.get("r");
    if (!nonce) {
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
    } else if (!isPrintableChars(nonce)) {
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
    }
    const salt = attrPairs.get("s");
    if (!salt) {
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
    } else if (!isBase64(salt)) {
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
    }
    const iterationText = attrPairs.get("i");
    if (!iterationText) {
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
    } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
      throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
    }
    const iteration = parseInt(iterationText, 10);
    return {
      nonce,
      salt,
      iteration
    };
  }
  function parseServerFinalMessage(serverData) {
    const attrPairs = parseAttributePairs(serverData);
    const error = attrPairs.get("e");
    const serverSignature = attrPairs.get("v");
    if (error) {
      throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
    }
    if (!serverSignature) {
      throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
    } else if (!isBase64(serverSignature)) {
      throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
    }
    return {
      serverSignature
    };
  }
  function xorBuffers(a, b) {
    if (!Buffer.isBuffer(a)) {
      throw new TypeError("first argument must be a Buffer");
    }
    if (!Buffer.isBuffer(b)) {
      throw new TypeError("second argument must be a Buffer");
    }
    if (a.length !== b.length) {
      throw new Error("Buffer lengths must match");
    }
    if (a.length === 0) {
      throw new Error("Buffers cannot be empty");
    }
    return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
  }
  module.exports = {
    startSession,
    continueSession,
    finalizeSession,
    DEFAULT_MAX_SCRAM_ITERATIONS
  };
});

// node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS(function(exports, module) {
  var types = require_pg_types();
  function TypeOverrides(userTypes) {
    this._types = userTypes || types;
    this.text = {};
    this.binary = {};
  }
  TypeOverrides.prototype.getOverrides = function(format) {
    switch (format) {
      case "text":
        return this.text;
      case "binary":
        return this.binary;
      default:
        return {};
    }
  };
  TypeOverrides.prototype.setTypeParser = function(oid, format, parseFn) {
    if (typeof format === "function") {
      parseFn = format;
      format = "text";
    }
    this.getOverrides(format)[oid] = parseFn;
  };
  TypeOverrides.prototype.getTypeParser = function(oid, format) {
    format = format || "text";
    return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
  };
  module.exports = TypeOverrides;
});

// node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS(function(exports, module) {
  function parse(str, options = {}) {
    if (str.charAt(0) === "/") {
      const config = str.split(" ");
      return { host: config[0], database: config[1] };
    }
    const config = Object.create(null);
    let result;
    let dummyHost = false;
    if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
      str = encodeURI(str).replace(/%25(\d\d)/g, "%$1");
    }
    try {
      try {
        result = new URL(str, "postgres://base");
      } catch (e) {
        result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
        dummyHost = true;
      }
    } catch (err) {
      err.input && (err.input = "*****REDACTED*****");
      throw err;
    }
    for (const entry of result.searchParams.entries()) {
      config[entry[0]] = entry[1];
    }
    config.user = config.user || decodeURIComponent(result.username);
    config.password = config.password || decodeURIComponent(result.password);
    if (result.protocol == "socket:") {
      config.host = decodeURI(result.pathname);
      config.database = result.searchParams.get("db");
      config.client_encoding = result.searchParams.get("encoding");
      return config;
    }
    const hostname = (dummyHost ? "" : result.hostname).replace(/^\[(.+)\]$/, "$1");
    if (!config.host) {
      config.host = decodeURIComponent(hostname);
    } else if (hostname && /^%2f/i.test(hostname)) {
      result.pathname = hostname + result.pathname;
    }
    if (!config.port) {
      config.port = result.port;
    }
    const pathname = result.pathname.slice(1) || null;
    config.database = pathname ? decodeURI(pathname) : null;
    if (config.ssl === "true" || config.ssl === "1") {
      config.ssl = true;
    }
    if (config.ssl === "0") {
      config.ssl = false;
    }
    if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
      config.ssl = {};
    }
    if (config.sslnegotiation === "direct" && config.ssl === undefined) {
      config.ssl = true;
    }
    const fs = config.sslcert || config.sslkey || config.sslrootcert ? __require("fs") : null;
    if (config.sslcert) {
      config.ssl.cert = fs.readFileSync(config.sslcert).toString();
    }
    if (config.sslkey) {
      config.ssl.key = fs.readFileSync(config.sslkey).toString();
    }
    if (config.sslrootcert) {
      config.ssl.ca = fs.readFileSync(config.sslrootcert).toString();
    }
    if (options.useLibpqCompat && config.uselibpqcompat) {
      throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
    }
    if (config.uselibpqcompat === "true" || options.useLibpqCompat) {
      switch (config.sslmode) {
        case "disable": {
          config.ssl = false;
          break;
        }
        case "prefer": {
          config.ssl.rejectUnauthorized = false;
          break;
        }
        case "require": {
          if (config.sslrootcert) {
            config.ssl.checkServerIdentity = function() {};
          } else {
            config.ssl.rejectUnauthorized = false;
          }
          break;
        }
        case "verify-ca": {
          if (!config.ssl.ca) {
            throw new Error("SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security.");
          }
          config.ssl.checkServerIdentity = function() {};
          break;
        }
        case "verify-full": {
          break;
        }
      }
    } else {
      switch (config.sslmode) {
        case "disable": {
          config.ssl = false;
          break;
        }
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full": {
          if (config.sslmode !== "verify-full") {
            deprecatedSslModeWarning(config.sslmode);
          }
          break;
        }
        case "no-verify": {
          config.ssl.rejectUnauthorized = false;
          break;
        }
      }
    }
    return config;
  }
  function toConnectionOptions(sslConfig) {
    const connectionOptions = Object.entries(sslConfig).reduce((c, [key, value]) => {
      if (value !== undefined && value !== null) {
        c[key] = value;
      }
      return c;
    }, Object.create(null));
    return connectionOptions;
  }
  function toClientConfig(config) {
    const poolConfig = Object.entries(config).reduce((c, [key, value]) => {
      if (key === "ssl") {
        const sslConfig = value;
        if (typeof sslConfig === "boolean") {
          c[key] = sslConfig;
        }
        if (typeof sslConfig === "object") {
          c[key] = toConnectionOptions(sslConfig);
        }
      } else if (value !== undefined && value !== null) {
        if (key === "port") {
          if (value !== "") {
            const v = parseInt(value, 10);
            if (isNaN(v)) {
              throw new Error(`Invalid ${key}: ${value}`);
            }
            c[key] = v;
          }
        } else {
          c[key] = value;
        }
      }
      return c;
    }, Object.create(null));
    return poolConfig;
  }
  function parseIntoClientConfig(str) {
    return toClientConfig(parse(str));
  }
  function deprecatedSslModeWarning(sslmode) {
    if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
      deprecatedSslModeWarning.warned = true;
      process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
    }
  }
  module.exports = parse;
  parse.parse = parse;
  parse.toClientConfig = toClientConfig;
  parse.parseIntoClientConfig = parseIntoClientConfig;
});

// node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS(function(exports, module) {
  var dns = __require("dns");
  var defaults = require_defaults();
  var parse = require_pg_connection_string().parse;
  var val = function(key, config, envVar) {
    if (config[key]) {
      return config[key];
    }
    if (envVar === undefined) {
      envVar = process.env["PG" + key.toUpperCase()];
    } else if (envVar === false) {} else {
      envVar = process.env[envVar];
    }
    return envVar || defaults[key];
  };
  var readSSLConfigFromEnvironment = function() {
    switch (process.env.PGSSLMODE) {
      case "disable":
        return false;
      case "prefer":
      case "require":
      case "verify-ca":
      case "verify-full":
        return true;
      case "no-verify":
        return { rejectUnauthorized: false };
    }
    return defaults.ssl;
  };
  var quoteParamValue = function(value) {
    return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
  };
  var add = function(params, config, paramName) {
    const value = config[paramName];
    if (value !== undefined && value !== null) {
      params.push(paramName + "=" + quoteParamValue(value));
    }
  };

  class ConnectionParameters {
    constructor(config) {
      config = typeof config === "string" ? parse(config) : config || {};
      if (config.connectionString) {
        config = Object.assign({}, config, parse(config.connectionString));
      }
      this.user = val("user", config);
      this.database = val("database", config);
      if (this.database === undefined) {
        this.database = this.user;
      }
      this.port = parseInt(val("port", config), 10);
      this.host = val("host", config);
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: val("password", config)
      });
      this.binary = val("binary", config);
      this.options = val("options", config);
      this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
      if (typeof this.ssl === "string") {
        if (this.ssl === "true") {
          this.ssl = true;
        }
      }
      if (this.ssl === "no-verify") {
        this.ssl = { rejectUnauthorized: false };
      }
      if (this.ssl && this.ssl.key) {
        Object.defineProperty(this.ssl, "key", {
          enumerable: false
        });
      }
      this.sslnegotiation = val("sslnegotiation", config, "PGSSLNEGOTIATION");
      if (this.sslnegotiation !== undefined && this.sslnegotiation !== "postgres" && this.sslnegotiation !== "direct") {
        throw new Error(`Invalid sslnegotiation value: "${this.sslnegotiation}". Valid values are "postgres" and "direct".`);
      }
      if (this.sslnegotiation === "direct" && !this.ssl) {
        throw new Error("sslnegotiation=direct requires SSL to be enabled");
      }
      this.client_encoding = val("client_encoding", config);
      this.replication = val("replication", config);
      this.isDomainSocket = !(this.host || "").indexOf("/");
      this.application_name = val("application_name", config, "PGAPPNAME");
      this.fallback_application_name = val("fallback_application_name", config, false);
      this.statement_timeout = val("statement_timeout", config, false);
      this.lock_timeout = val("lock_timeout", config, false);
      this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
      this.query_timeout = val("query_timeout", config, false);
      if (config.connectionTimeoutMillis === undefined) {
        this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
      } else {
        this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1000);
      }
      if (config.keepAlive === false) {
        this.keepalives = 0;
      } else if (config.keepAlive === true) {
        this.keepalives = 1;
      }
      if (typeof config.keepAliveInitialDelayMillis === "number") {
        this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1000);
      }
    }
    getLibpqConnectionString(cb) {
      const params = [];
      add(params, this, "user");
      add(params, this, "password");
      add(params, this, "port");
      add(params, this, "application_name");
      add(params, this, "fallback_application_name");
      add(params, this, "connect_timeout");
      add(params, this, "options");
      const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
      add(params, ssl, "sslmode");
      add(params, ssl, "sslca");
      add(params, ssl, "sslkey");
      add(params, ssl, "sslcert");
      add(params, ssl, "sslrootcert");
      add(params, this, "sslnegotiation");
      if (this.database) {
        params.push("dbname=" + quoteParamValue(this.database));
      }
      if (this.replication) {
        params.push("replication=" + quoteParamValue(this.replication));
      }
      if (this.host) {
        params.push("host=" + quoteParamValue(this.host));
      }
      if (this.isDomainSocket) {
        return cb(null, params.join(" "));
      }
      if (this.client_encoding) {
        params.push("client_encoding=" + quoteParamValue(this.client_encoding));
      }
      dns.lookup(this.host, function(err, address) {
        if (err)
          return cb(err, null);
        params.push("hostaddr=" + quoteParamValue(address));
        return cb(null, params.join(" "));
      });
    }
  }
  module.exports = ConnectionParameters;
});

// node_modules/pg/lib/result.js
var require_result = __commonJS(function(exports, module) {
  var types = require_pg_types();
  var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;

  class Result {
    constructor(rowMode, types) {
      this.command = null;
      this.rowCount = null;
      this.oid = null;
      this.rows = [];
      this.fields = [];
      this._parsers = undefined;
      this._types = types;
      this.RowCtor = null;
      this.rowAsArray = rowMode === "array";
      if (this.rowAsArray) {
        this.parseRow = this._parseRowAsArray;
      }
      this._prebuiltEmptyResultObject = null;
    }
    addCommandComplete(msg) {
      let match;
      if (msg.text) {
        match = matchRegexp.exec(msg.text);
      } else {
        match = matchRegexp.exec(msg.command);
      }
      if (match) {
        this.command = match[1];
        if (match[3]) {
          this.oid = parseInt(match[2], 10);
          this.rowCount = parseInt(match[3], 10);
        } else if (match[2]) {
          this.rowCount = parseInt(match[2], 10);
        }
      }
    }
    _parseRowAsArray(rowData) {
      const row = new Array(rowData.length);
      for (let i = 0, len = rowData.length;i < len; i++) {
        const rawValue = rowData[i];
        if (rawValue !== null) {
          row[i] = this._parsers[i](rawValue);
        } else {
          row[i] = null;
        }
      }
      return row;
    }
    parseRow(rowData) {
      const row = { ...this._prebuiltEmptyResultObject };
      for (let i = 0, len = rowData.length;i < len; i++) {
        const rawValue = rowData[i];
        const field = this.fields[i].name;
        if (rawValue !== null) {
          const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
          row[field] = this._parsers[i](v);
        } else {
          row[field] = null;
        }
      }
      return row;
    }
    addRow(row) {
      this.rows.push(row);
    }
    addFields(fieldDescriptions) {
      this.fields = fieldDescriptions;
      if (this.fields.length) {
        this._parsers = new Array(fieldDescriptions.length);
      }
      const row = Object.create(null);
      for (let i = 0;i < fieldDescriptions.length; i++) {
        const desc = fieldDescriptions[i];
        row[desc.name] = null;
        if (this._types) {
          this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
        } else {
          this._parsers[i] = types.getTypeParser(desc.dataTypeID, desc.format || "text");
        }
      }
      this._prebuiltEmptyResultObject = { ...row };
    }
  }
  module.exports = Result;
});

// node_modules/pg/lib/query.js
var require_query = __commonJS(function(exports, module) {
  var { EventEmitter } = __require("events");
  var Result = require_result();
  var utils = require_utils();

  class Query extends EventEmitter {
    constructor(config, values, callback) {
      super();
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.rows = config.rows;
      this.types = config.types;
      this.name = config.name;
      this.queryMode = config.queryMode;
      this.binary = config.binary;
      this.portal = config.portal || "";
      this.callback = config.callback;
      this._rowMode = config.rowMode;
      if (process.domain && config.callback) {
        this.callback = process.domain.bind(config.callback);
      }
      this._result = new Result(this._rowMode, this.types);
      this._results = this._result;
      this._canceledDueToError = false;
    }
    requiresPreparation() {
      if (this.queryMode === "extended") {
        return true;
      }
      if (this.name) {
        return true;
      }
      if (this.rows) {
        return true;
      }
      if (!this.text) {
        return false;
      }
      if (!this.values) {
        return false;
      }
      return this.values.length > 0;
    }
    _checkForMultirow() {
      if (this._result.command) {
        if (!Array.isArray(this._results)) {
          this._results = [this._result];
        }
        this._result = new Result(this._rowMode, this._result._types);
        this._results.push(this._result);
      }
    }
    handleRowDescription(msg) {
      this._checkForMultirow();
      this._result.addFields(msg.fields);
      this._accumulateRows = this.callback || !this.listeners("row").length;
    }
    handleDataRow(msg) {
      let row;
      if (this._canceledDueToError) {
        return;
      }
      try {
        row = this._result.parseRow(msg.fields);
      } catch (err) {
        this._canceledDueToError = err;
        return;
      }
      this.emit("row", row, this._result);
      if (this._accumulateRows) {
        this._result.addRow(row);
      }
    }
    handleCommandComplete(msg, connection) {
      this._checkForMultirow();
      this._result.addCommandComplete(msg);
      if (this.rows) {
        connection.sync();
      }
    }
    handleEmptyQuery(connection) {
      if (this.rows) {
        connection.sync();
      }
    }
    handleError(err, connection) {
      if (this._canceledDueToError) {
        err = this._canceledDueToError;
        this._canceledDueToError = false;
      }
      if (this.callback) {
        return this.callback(err);
      }
      this.emit("error", err);
    }
    handleReadyForQuery(con) {
      if (this._canceledDueToError) {
        return this.handleError(this._canceledDueToError, con);
      }
      if (this.callback) {
        try {
          this.callback(null, this._results);
        } catch (err) {
          process.nextTick(() => {
            throw err;
          });
        }
      }
      this.emit("end", this._results);
    }
    submit(connection) {
      if (typeof this.text !== "string" && typeof this.name !== "string") {
        return new Error("A query must have either text or a name. Supplying neither is unsupported.");
      }
      const previous = connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name];
      if (this.text && previous && this.text !== previous) {
        return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
      }
      if (this.values && !Array.isArray(this.values)) {
        return new Error("Query values must be an array");
      }
      if (this.requiresPreparation()) {
        connection.stream.cork && connection.stream.cork();
        try {
          this.prepare(connection);
        } finally {
          connection.stream.uncork && connection.stream.uncork();
        }
      } else {
        connection.query(this.text);
      }
      return null;
    }
    hasBeenParsed(connection) {
      return this.name && (connection.parsedStatements[this.name] !== undefined || connection.submittedNamedStatements[this.name] !== undefined);
    }
    handlePortalSuspended(connection) {
      this._getRows(connection, this.rows);
    }
    _getRows(connection, rows) {
      connection.execute({
        portal: this.portal,
        rows
      });
      if (!rows) {
        connection.sync();
      } else {
        connection.flush();
      }
    }
    prepare(connection) {
      if (!this.hasBeenParsed(connection)) {
        connection.parse({
          text: this.text,
          name: this.name,
          types: this.types
        });
        if (this.name) {
          connection.submittedNamedStatements[this.name] = this.text;
        }
      }
      try {
        connection.bind({
          portal: this.portal,
          statement: this.name,
          values: this.values,
          binary: this.binary,
          valueMapper: utils.prepareValue
        });
      } catch (err) {
        connection.close({ type: "S", name: this.name });
        connection.sync();
        this.handleError(err, connection);
        return;
      }
      connection.describe({
        type: "P",
        name: this.portal || ""
      });
      this._getRows(connection, this.rows);
    }
    handleCopyInResponse(connection) {
      connection.sendCopyFail("No source stream defined");
    }
    handleCopyData(msg, connection) {}
  }
  module.exports = Query;
});

// node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.NoticeMessage = exports.DataRowMessage = exports.CommandCompleteMessage = exports.ReadyForQueryMessage = exports.NotificationResponseMessage = exports.BackendKeyDataMessage = exports.AuthenticationMD5Password = exports.ParameterStatusMessage = exports.ParameterDescriptionMessage = exports.RowDescriptionMessage = exports.Field = exports.CopyResponse = exports.CopyDataMessage = exports.DatabaseError = exports.copyDone = exports.emptyQuery = exports.replicationStart = exports.portalSuspended = exports.noData = exports.closeComplete = exports.bindComplete = exports.parseComplete = undefined;
  exports.parseComplete = {
    name: "parseComplete",
    length: 5
  };
  exports.bindComplete = {
    name: "bindComplete",
    length: 5
  };
  exports.closeComplete = {
    name: "closeComplete",
    length: 5
  };
  exports.noData = {
    name: "noData",
    length: 5
  };
  exports.portalSuspended = {
    name: "portalSuspended",
    length: 5
  };
  exports.replicationStart = {
    name: "replicationStart",
    length: 4
  };
  exports.emptyQuery = {
    name: "emptyQuery",
    length: 4
  };
  exports.copyDone = {
    name: "copyDone",
    length: 4
  };

  class DatabaseError extends Error {
    constructor(message, length, name) {
      super(message);
      this.length = length;
      this.name = name;
    }
  }
  exports.DatabaseError = DatabaseError;

  class CopyDataMessage {
    constructor(length, chunk) {
      this.length = length;
      this.chunk = chunk;
      this.name = "copyData";
    }
  }
  exports.CopyDataMessage = CopyDataMessage;

  class CopyResponse {
    constructor(length, name, binary, columnCount) {
      this.length = length;
      this.name = name;
      this.binary = binary;
      this.columnTypes = new Array(columnCount);
    }
  }
  exports.CopyResponse = CopyResponse;

  class Field {
    constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
      this.name = name;
      this.tableID = tableID;
      this.columnID = columnID;
      this.dataTypeID = dataTypeID;
      this.dataTypeSize = dataTypeSize;
      this.dataTypeModifier = dataTypeModifier;
      this.format = format;
    }
  }
  exports.Field = Field;

  class RowDescriptionMessage {
    constructor(length, fieldCount) {
      this.length = length;
      this.fieldCount = fieldCount;
      this.name = "rowDescription";
      this.fields = new Array(this.fieldCount);
    }
  }
  exports.RowDescriptionMessage = RowDescriptionMessage;

  class ParameterDescriptionMessage {
    constructor(length, parameterCount) {
      this.length = length;
      this.parameterCount = parameterCount;
      this.name = "parameterDescription";
      this.dataTypeIDs = new Array(this.parameterCount);
    }
  }
  exports.ParameterDescriptionMessage = ParameterDescriptionMessage;

  class ParameterStatusMessage {
    constructor(length, parameterName, parameterValue) {
      this.length = length;
      this.parameterName = parameterName;
      this.parameterValue = parameterValue;
      this.name = "parameterStatus";
    }
  }
  exports.ParameterStatusMessage = ParameterStatusMessage;

  class AuthenticationMD5Password {
    constructor(length, salt) {
      this.length = length;
      this.salt = salt;
      this.name = "authenticationMD5Password";
    }
  }
  exports.AuthenticationMD5Password = AuthenticationMD5Password;

  class BackendKeyDataMessage {
    constructor(length, processID, secretKey) {
      this.length = length;
      this.processID = processID;
      this.secretKey = secretKey;
      this.name = "backendKeyData";
    }
  }
  exports.BackendKeyDataMessage = BackendKeyDataMessage;

  class NotificationResponseMessage {
    constructor(length, processId, channel, payload) {
      this.length = length;
      this.processId = processId;
      this.channel = channel;
      this.payload = payload;
      this.name = "notification";
    }
  }
  exports.NotificationResponseMessage = NotificationResponseMessage;

  class ReadyForQueryMessage {
    constructor(length, status) {
      this.length = length;
      this.status = status;
      this.name = "readyForQuery";
    }
  }
  exports.ReadyForQueryMessage = ReadyForQueryMessage;

  class CommandCompleteMessage {
    constructor(length, text) {
      this.length = length;
      this.text = text;
      this.name = "commandComplete";
    }
  }
  exports.CommandCompleteMessage = CommandCompleteMessage;

  class DataRowMessage {
    constructor(length, fields) {
      this.length = length;
      this.fields = fields;
      this.name = "dataRow";
      this.fieldCount = fields.length;
    }
  }
  exports.DataRowMessage = DataRowMessage;

  class NoticeMessage {
    constructor(length, message) {
      this.length = length;
      this.message = message;
      this.name = "notice";
    }
  }
  exports.NoticeMessage = NoticeMessage;
});

// node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Writer = undefined;

  class Writer {
    constructor(size = 256) {
      this.size = size;
      this.offset = 5;
      this.headerPosition = 0;
      this.buffer = Buffer.allocUnsafe(size);
    }
    ensure(size) {
      const remaining = this.buffer.length - this.offset;
      if (remaining < size) {
        const oldBuffer = this.buffer;
        const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
        this.buffer = Buffer.allocUnsafe(newSize);
        oldBuffer.copy(this.buffer, 0, 0, this.offset);
      }
    }
    addInt32(num) {
      this.ensure(4);
      this.buffer[this.offset++] = num >>> 24 & 255;
      this.buffer[this.offset++] = num >>> 16 & 255;
      this.buffer[this.offset++] = num >>> 8 & 255;
      this.buffer[this.offset++] = num >>> 0 & 255;
      return this;
    }
    addInt16(num) {
      this.ensure(2);
      this.buffer[this.offset++] = num >>> 8 & 255;
      this.buffer[this.offset++] = num >>> 0 & 255;
      return this;
    }
    addCString(string) {
      if (!string) {
        this.ensure(1);
      } else {
        const len = Buffer.byteLength(string);
        this.ensure(len + 1);
        this.buffer.write(string, this.offset, "utf-8");
        this.offset += len;
      }
      this.buffer[this.offset++] = 0;
      return this;
    }
    addString(string = "") {
      const len = Buffer.byteLength(string);
      this.ensure(len);
      this.buffer.write(string, this.offset);
      this.offset += len;
      return this;
    }
    addInt32PrefixedString(string) {
      const len = Buffer.byteLength(string);
      this.ensure(4 + len);
      const buffer = this.buffer;
      let offset = this.offset;
      buffer[offset++] = len >>> 24 & 255;
      buffer[offset++] = len >>> 16 & 255;
      buffer[offset++] = len >>> 8 & 255;
      buffer[offset++] = len >>> 0 & 255;
      buffer.write(string, offset, "utf-8");
      this.offset = offset + len;
      return this;
    }
    add(otherBuffer) {
      this.ensure(otherBuffer.length);
      otherBuffer.copy(this.buffer, this.offset);
      this.offset += otherBuffer.length;
      return this;
    }
    reserveUnsafe(size) {
      const offset = this.offset;
      this.ensure(size);
      this.offset += size;
      return offset;
    }
    join(code) {
      if (code) {
        this.buffer[this.headerPosition] = code;
        const length = this.offset - (this.headerPosition + 1);
        this.buffer.writeInt32BE(length, this.headerPosition + 1);
      }
      return this.buffer.slice(code ? 0 : 5, this.offset);
    }
    flush(code) {
      const result = this.join(code);
      this.offset = 5;
      this.headerPosition = 0;
      this.buffer = Buffer.allocUnsafe(this.size);
      return result;
    }
    clear() {
      this.offset = 5;
      this.headerPosition = 0;
    }
  }
  exports.Writer = Writer;
});

// node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.serialize = undefined;
  var buffer_writer_1 = require_buffer_writer();
  var writer = new buffer_writer_1.Writer;
  var startup = (opts) => {
    writer.addInt16(3).addInt16(0);
    for (const key of Object.keys(opts)) {
      writer.addCString(key).addCString(opts[key]);
    }
    writer.addCString("client_encoding").addCString("UTF8");
    const bodyBuffer = writer.addCString("").flush();
    const length = bodyBuffer.length + 4;
    return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
  };
  var requestSsl = () => {
    const response = Buffer.allocUnsafe(8);
    response.writeInt32BE(8, 0);
    response.writeInt32BE(80877103, 4);
    return response;
  };
  var password = (password) => {
    return writer.addCString(password).flush(112);
  };
  var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
    writer.addCString(mechanism).addInt32PrefixedString(initialResponse);
    return writer.flush(112);
  };
  var sendSCRAMClientFinalMessage = function(additionalData) {
    return writer.addString(additionalData).flush(112);
  };
  var query = (text) => {
    return writer.addCString(text).flush(81);
  };
  var emptyArray = [];
  var parse = (query) => {
    const name = query.name || "";
    if (name.length > 63) {
      console.error("Warning! Postgres only supports 63 characters for query names.");
      console.error("You supplied %s (%s)", name, name.length);
      console.error("This can cause conflicts and silent errors executing queries");
    }
    const types = query.types || emptyArray;
    const len = types.length;
    const buffer = writer.addCString(name).addCString(query.text).addInt16(len);
    for (let i = 0;i < len; i++) {
      buffer.addInt32(types[i]);
    }
    return writer.flush(80);
  };
  var writeValues = function(values, valueMapper, formatsOffset) {
    const len = values.length;
    for (let i = 0;i < len; i++) {
      const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
      let formatByte = 0;
      if (mappedVal == null) {
        writer.addInt32(-1);
      } else if (mappedVal instanceof Buffer) {
        formatByte = 1;
        writer.addInt32(mappedVal.length);
        writer.add(mappedVal);
      } else {
        writer.addInt32PrefixedString(mappedVal);
      }
      const buf = writer.buffer;
      buf[formatsOffset++] = 0;
      buf[formatsOffset++] = formatByte;
    }
  };
  var bind = (config = {}) => {
    const portal = config.portal || "";
    const statement = config.statement || "";
    const binary = config.binary || false;
    const values = config.values || emptyArray;
    const len = values.length;
    writer.addCString(portal).addCString(statement);
    writer.addInt16(len);
    const formatsOffset = writer.reserveUnsafe(len * 2);
    writer.addInt16(len);
    try {
      writeValues(values, config.valueMapper, formatsOffset);
    } catch (err) {
      writer.clear();
      throw err;
    }
    writer.addInt16(1);
    writer.addInt16(binary ? 1 : 0);
    return writer.flush(66);
  };
  var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
  var execute = (config) => {
    if (!config || !config.portal && !config.rows) {
      return emptyExecute;
    }
    const portal = config.portal || "";
    const rows = config.rows || 0;
    const portalLength = Buffer.byteLength(portal);
    const len = 4 + portalLength + 1 + 4;
    const buff = Buffer.allocUnsafe(1 + len);
    buff[0] = 69;
    buff.writeInt32BE(len, 1);
    buff.write(portal, 5, "utf-8");
    buff[portalLength + 5] = 0;
    buff.writeUInt32BE(rows, buff.length - 4);
    return buff;
  };
  var cancel = (processID, secretKey) => {
    const buffer = Buffer.allocUnsafe(16);
    buffer.writeInt32BE(16, 0);
    buffer.writeInt16BE(1234, 4);
    buffer.writeInt16BE(5678, 6);
    buffer.writeInt32BE(processID, 8);
    buffer.writeInt32BE(secretKey, 12);
    return buffer;
  };
  var cstringMessage = (code, string) => {
    const stringLen = Buffer.byteLength(string);
    const len = 4 + stringLen + 1;
    const buffer = Buffer.allocUnsafe(1 + len);
    buffer[0] = code;
    buffer.writeInt32BE(len, 1);
    buffer.write(string, 5, "utf-8");
    buffer[len] = 0;
    return buffer;
  };
  var emptyDescribePortal = writer.addCString("P").flush(68);
  var emptyDescribeStatement = writer.addCString("S").flush(68);
  var describe = (msg) => {
    return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
  };
  var close = (msg) => {
    const text = `${msg.type}${msg.name || ""}`;
    return cstringMessage(67, text);
  };
  var copyData = (chunk) => {
    return writer.add(chunk).flush(100);
  };
  var copyFail = (message) => {
    return cstringMessage(102, message);
  };
  var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
  var flushBuffer = codeOnlyBuffer(72);
  var syncBuffer = codeOnlyBuffer(83);
  var endBuffer = codeOnlyBuffer(88);
  var copyDoneBuffer = codeOnlyBuffer(99);
  var serialize = {
    startup,
    password,
    requestSsl,
    sendSASLInitialResponseMessage,
    sendSCRAMClientFinalMessage,
    query,
    parse,
    bind,
    execute,
    describe,
    close,
    flush: () => flushBuffer,
    sync: () => syncBuffer,
    end: () => endBuffer,
    copyData,
    copyDone: () => copyDoneBuffer,
    copyFail,
    cancel
  };
  exports.serialize = serialize;
});

// node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.BufferReader = undefined;

  class BufferReader {
    constructor(offset = 0) {
      this.offset = offset;
      this.buffer = Buffer.allocUnsafe(0);
      this.encoding = "utf-8";
    }
    setBuffer(offset, buffer) {
      this.offset = offset;
      this.buffer = buffer;
    }
    int16() {
      const result = this.buffer.readInt16BE(this.offset);
      this.offset += 2;
      return result;
    }
    byte() {
      const result = this.buffer[this.offset];
      this.offset++;
      return result;
    }
    int32() {
      const result = this.buffer.readInt32BE(this.offset);
      this.offset += 4;
      return result;
    }
    uint32() {
      const result = this.buffer.readUInt32BE(this.offset);
      this.offset += 4;
      return result;
    }
    string(length) {
      const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
      this.offset += length;
      return result;
    }
    cstring() {
      const start = this.offset;
      let end = start;
      while (this.buffer[end++]) {}
      this.offset = end;
      return this.buffer.toString(this.encoding, start, end - 1);
    }
    bytes(length) {
      const result = this.buffer.slice(this.offset, this.offset + length);
      this.offset += length;
      return result;
    }
  }
  exports.BufferReader = BufferReader;
});

// node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Parser = undefined;
  var messages_1 = require_messages();
  var buffer_reader_1 = require_buffer_reader();
  var CODE_LENGTH = 1;
  var LEN_LENGTH = 4;
  var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
  var LATEINIT_LENGTH = -1;
  var emptyBuffer = Buffer.allocUnsafe(0);

  class Parser {
    constructor(opts) {
      this.buffer = emptyBuffer;
      this.bufferLength = 0;
      this.bufferOffset = 0;
      this.reader = new buffer_reader_1.BufferReader;
      if ((opts === null || opts === undefined ? undefined : opts.mode) === "binary") {
        throw new Error("Binary mode not supported yet");
      }
      this.mode = (opts === null || opts === undefined ? undefined : opts.mode) || "text";
    }
    parse(buffer, callback) {
      this.mergeBuffer(buffer);
      const bufferFullLength = this.bufferOffset + this.bufferLength;
      let offset = this.bufferOffset;
      while (offset + HEADER_LENGTH <= bufferFullLength) {
        const code = this.buffer[offset];
        const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
        const fullMessageLength = CODE_LENGTH + length;
        if (fullMessageLength + offset <= bufferFullLength) {
          const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
          callback(message);
          offset += fullMessageLength;
        } else {
          break;
        }
      }
      if (offset === bufferFullLength) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
      } else {
        this.bufferLength = bufferFullLength - offset;
        this.bufferOffset = offset;
      }
    }
    mergeBuffer(buffer) {
      if (this.bufferLength > 0) {
        const newLength = this.bufferLength + buffer.byteLength;
        const newFullLength = newLength + this.bufferOffset;
        if (newFullLength > this.buffer.byteLength) {
          let newBuffer;
          if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
            newBuffer = this.buffer;
          } else {
            let newBufferLength = this.buffer.byteLength * 2;
            while (newLength >= newBufferLength) {
              newBufferLength *= 2;
            }
            newBuffer = Buffer.allocUnsafe(newBufferLength);
          }
          this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
          this.buffer = newBuffer;
          this.bufferOffset = 0;
        }
        buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
        this.bufferLength = newLength;
      } else {
        this.buffer = buffer;
        this.bufferOffset = 0;
        this.bufferLength = buffer.byteLength;
      }
    }
    handlePacket(offset, code, length, bytes) {
      const { reader } = this;
      reader.setBuffer(offset, bytes);
      let message;
      switch (code) {
        case 50:
          message = messages_1.bindComplete;
          break;
        case 49:
          message = messages_1.parseComplete;
          break;
        case 51:
          message = messages_1.closeComplete;
          break;
        case 110:
          message = messages_1.noData;
          break;
        case 115:
          message = messages_1.portalSuspended;
          break;
        case 99:
          message = messages_1.copyDone;
          break;
        case 87:
          message = messages_1.replicationStart;
          break;
        case 73:
          message = messages_1.emptyQuery;
          break;
        case 68:
          message = parseDataRowMessage(reader);
          break;
        case 67:
          message = parseCommandCompleteMessage(reader);
          break;
        case 90:
          message = parseReadyForQueryMessage(reader);
          break;
        case 65:
          message = parseNotificationMessage(reader);
          break;
        case 82:
          message = parseAuthenticationResponse(reader, length);
          break;
        case 83:
          message = parseParameterStatusMessage(reader);
          break;
        case 75:
          message = parseBackendKeyData(reader);
          break;
        case 69:
          message = parseErrorMessage(reader, "error");
          break;
        case 78:
          message = parseErrorMessage(reader, "notice");
          break;
        case 84:
          message = parseRowDescriptionMessage(reader);
          break;
        case 116:
          message = parseParameterDescriptionMessage(reader);
          break;
        case 71:
          message = parseCopyInMessage(reader);
          break;
        case 72:
          message = parseCopyOutMessage(reader);
          break;
        case 100:
          message = parseCopyData(reader, length);
          break;
        default:
          return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
      }
      reader.setBuffer(0, emptyBuffer);
      message.length = length;
      return message;
    }
  }
  exports.Parser = Parser;
  var parseReadyForQueryMessage = (reader) => {
    const status = reader.string(1);
    return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
  };
  var parseCommandCompleteMessage = (reader) => {
    const text = reader.cstring();
    return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text);
  };
  var parseCopyData = (reader, length) => {
    const chunk = reader.bytes(length - 4);
    return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
  };
  var parseCopyInMessage = (reader) => parseCopyMessage(reader, "copyInResponse");
  var parseCopyOutMessage = (reader) => parseCopyMessage(reader, "copyOutResponse");
  var parseCopyMessage = (reader, messageName) => {
    const isBinary = reader.byte() !== 0;
    const columnCount = reader.int16();
    const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
    for (let i = 0;i < columnCount; i++) {
      message.columnTypes[i] = reader.int16();
    }
    return message;
  };
  var parseNotificationMessage = (reader) => {
    const processId = reader.int32();
    const channel = reader.cstring();
    const payload = reader.cstring();
    return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
  };
  var parseRowDescriptionMessage = (reader) => {
    const fieldCount = reader.int16();
    const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
    for (let i = 0;i < fieldCount; i++) {
      message.fields[i] = parseField(reader);
    }
    return message;
  };
  var parseField = (reader) => {
    const name = reader.cstring();
    const tableID = reader.uint32();
    const columnID = reader.int16();
    const dataTypeID = reader.uint32();
    const dataTypeSize = reader.int16();
    const dataTypeModifier = reader.int32();
    const mode = reader.int16() === 0 ? "text" : "binary";
    return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
  };
  var parseParameterDescriptionMessage = (reader) => {
    const parameterCount = reader.int16();
    const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
    for (let i = 0;i < parameterCount; i++) {
      message.dataTypeIDs[i] = reader.uint32();
    }
    return message;
  };
  var parseDataRowMessage = (reader) => {
    const fieldCount = reader.int16();
    const fields = new Array(fieldCount);
    for (let i = 0;i < fieldCount; i++) {
      const len = reader.int32();
      fields[i] = len === -1 ? null : reader.string(len);
    }
    return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
  };
  var parseParameterStatusMessage = (reader) => {
    const name = reader.cstring();
    const value = reader.cstring();
    return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
  };
  var parseBackendKeyData = (reader) => {
    const processID = reader.int32();
    const secretKey = reader.int32();
    return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
  };
  var parseAuthenticationResponse = (reader, length) => {
    const code = reader.int32();
    const message = {
      name: "authenticationOk",
      length
    };
    switch (code) {
      case 0:
        break;
      case 3:
        if (message.length === 8) {
          message.name = "authenticationCleartextPassword";
        }
        break;
      case 5:
        if (message.length === 12) {
          message.name = "authenticationMD5Password";
          const salt = reader.bytes(4);
          return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
        }
        break;
      case 10:
        {
          message.name = "authenticationSASL";
          message.mechanisms = [];
          let mechanism;
          do {
            mechanism = reader.cstring();
            if (mechanism) {
              message.mechanisms.push(mechanism);
            }
          } while (mechanism);
        }
        break;
      case 11:
        message.name = "authenticationSASLContinue";
        message.data = reader.string(length - 8);
        break;
      case 12:
        message.name = "authenticationSASLFinal";
        message.data = reader.string(length - 8);
        break;
      default:
        throw new Error("Unknown authenticationOk message type " + code);
    }
    return message;
  };
  var parseErrorMessage = (reader, name) => {
    const fields = {};
    let fieldType = reader.string(1);
    while (fieldType !== "\x00") {
      fields[fieldType] = reader.cstring();
      fieldType = reader.string(1);
    }
    const messageValue = fields.M;
    const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
    message.severity = fields.S;
    message.code = fields.C;
    message.detail = fields.D;
    message.hint = fields.H;
    message.position = fields.P;
    message.internalPosition = fields.p;
    message.internalQuery = fields.q;
    message.where = fields.W;
    message.schema = fields.s;
    message.table = fields.t;
    message.column = fields.c;
    message.dataType = fields.d;
    message.constraint = fields.n;
    message.file = fields.F;
    message.line = fields.L;
    message.routine = fields.R;
    return message;
  };
});

// node_modules/pg-protocol/dist/index.js
var require_dist = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.DatabaseError = exports.serialize = undefined;
  exports.parse = parse;
  var messages_1 = require_messages();
  Object.defineProperty(exports, "DatabaseError", { enumerable: true, get: function() {
    return messages_1.DatabaseError;
  } });
  var serializer_1 = require_serializer();
  Object.defineProperty(exports, "serialize", { enumerable: true, get: function() {
    return serializer_1.serialize;
  } });
  var parser_1 = require_parser();
  function parse(stream, callback) {
    const parser = new parser_1.Parser;
    stream.on("data", (buffer) => parser.parse(buffer, callback));
    return new Promise((resolve) => stream.on("end", () => resolve()));
  }
});

// node_modules/pg-cloudflare/dist/empty.js
var require_empty = __commonJS(function(exports) {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.default = {};
});

// node_modules/pg/lib/stream.js
var require_stream = __commonJS(function(exports, module) {
  var { getStream, getSecureStream } = getStreamFuncs();
  module.exports = {
    getStream,
    getSecureStream
  };
  function getNodejsStreamFuncs() {
    function getStream(ssl) {
      const net = __require("net");
      return new net.Socket;
    }
    function getSecureStream(options) {
      const tls = __require("tls");
      return tls.connect(options);
    }
    return {
      getStream,
      getSecureStream
    };
  }
  function getCloudflareStreamFuncs() {
    function getStream(ssl) {
      const { CloudflareSocket } = require_empty();
      return new CloudflareSocket(ssl);
    }
    function getSecureStream(options) {
      options.socket.startTls(options);
      return options.socket;
    }
    return {
      getStream,
      getSecureStream
    };
  }
  function isCloudflareRuntime() {
    if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
      return navigator.userAgent === "Cloudflare-Workers";
    }
    if (typeof Response === "function") {
      const resp = new Response(null, { cf: { thing: true } });
      if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
        return true;
      }
    }
    return false;
  }
  function getStreamFuncs() {
    if (isCloudflareRuntime()) {
      return getCloudflareStreamFuncs();
    }
    return getNodejsStreamFuncs();
  }
});

// node_modules/pg/lib/connection.js
var require_connection = __commonJS(function(exports, module) {
  var EventEmitter = __require("events").EventEmitter;
  var { parse, serialize } = require_dist();
  var stream = require_stream();
  var { getStream } = stream;
  var flushBuffer = serialize.flush();
  var syncBuffer = serialize.sync();
  var endBuffer = serialize.end();

  class Connection extends EventEmitter {
    constructor(config) {
      super();
      config = config || {};
      this.stream = config.stream || getStream(config.ssl);
      if (typeof this.stream === "function") {
        this.stream = this.stream(config);
      }
      this._keepAlive = config.keepAlive;
      this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
      this.parsedStatements = {};
      this.submittedNamedStatements = {};
      this.ssl = config.ssl || false;
      this.sslNegotiation = config.sslNegotiation || "postgres";
      this._ending = false;
      this._emitMessage = false;
      const self = this;
      this.on("newListener", function(eventName) {
        if (eventName === "message") {
          self._emitMessage = true;
        }
      });
    }
    connect(port, host) {
      const self = this;
      this._connecting = true;
      this.stream.setNoDelay(true);
      this.stream.connect(port, host);
      this.stream.once("connect", function() {
        if (self._keepAlive) {
          self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
        }
        self.emit("connect");
      });
      const reportStreamError = function(error) {
        if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
          return;
        }
        self.emit("error", error);
      };
      this.stream.on("error", reportStreamError);
      this.stream.on("close", function() {
        self.emit("end");
      });
      if (!this.ssl) {
        return this.attachListeners(this.stream);
      }
      if (this.sslNegotiation === "direct") {
        return this.stream.once("connect", function() {
          self.upgradeToSSL(host, reportStreamError);
        });
      }
      this.stream.once("data", function(buffer) {
        const responseCode = buffer.toString("utf8");
        switch (responseCode) {
          case "S":
            break;
          case "N":
            self.stream.end();
            return self.emit("error", new Error("The server does not support SSL connections"));
          default:
            self.stream.end();
            return self.emit("error", new Error("There was an error establishing an SSL connection"));
        }
        self.upgradeToSSL(host, reportStreamError);
      });
    }
    upgradeToSSL(host, reportStreamError) {
      const self = this;
      const options = {
        socket: self.stream,
        host
      };
      if (self.ssl !== true) {
        Object.assign(options, self.ssl);
        if ("key" in self.ssl) {
          options.key = self.ssl.key;
        }
      }
      if (self.sslNegotiation === "direct") {
        options.ALPNProtocols = ["postgresql"];
      }
      const net = __require("net");
      if (net.isIP && net.isIP(host) === 0) {
        options.servername = host;
      }
      try {
        self.stream = stream.getSecureStream(options);
      } catch (err) {
        return self.emit("error", err);
      }
      self.attachListeners(self.stream);
      self.stream.on("error", reportStreamError);
      self.emit("sslconnect");
    }
    attachListeners(stream) {
      parse(stream, (msg) => {
        const eventName = msg.name === "error" ? "errorMessage" : msg.name;
        if (this._emitMessage) {
          this.emit("message", msg);
        }
        this.emit(eventName, msg);
      });
    }
    requestSsl() {
      this.stream.write(serialize.requestSsl());
    }
    startup(config) {
      this.stream.write(serialize.startup(config));
    }
    cancel(processID, secretKey) {
      this._send(serialize.cancel(processID, secretKey));
    }
    password(password) {
      this._send(serialize.password(password));
    }
    sendSASLInitialResponseMessage(mechanism, initialResponse) {
      this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
    }
    sendSCRAMClientFinalMessage(additionalData) {
      this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
    }
    _send(buffer) {
      if (!this.stream.writable) {
        return false;
      }
      return this.stream.write(buffer);
    }
    query(text) {
      this._send(serialize.query(text));
    }
    parse(query) {
      this._send(serialize.parse(query));
    }
    bind(config) {
      this._send(serialize.bind(config));
    }
    execute(config) {
      this._send(serialize.execute(config));
    }
    flush() {
      if (this.stream.writable) {
        this.stream.write(flushBuffer);
      }
    }
    sync() {
      this._send(syncBuffer);
    }
    ref() {
      this.stream.ref();
    }
    unref() {
      this.stream.unref();
    }
    end() {
      this._ending = true;
      if (!this._connecting || !this.stream.writable) {
        this.stream.end();
        return;
      }
      return this.stream.write(endBuffer, () => {
        this.stream.end();
      });
    }
    close(msg) {
      this._send(serialize.close(msg));
    }
    describe(msg) {
      this._send(serialize.describe(msg));
    }
    sendCopyFromChunk(chunk) {
      this._send(serialize.copyData(chunk));
    }
    endCopyFrom() {
      this._send(serialize.copyDone());
    }
    sendCopyFail(msg) {
      this._send(serialize.copyFail(msg));
    }
  }
  module.exports = Connection;
});

// node_modules/split2/index.js
var require_split2 = __commonJS(function(exports, module) {
  var { Transform } = __require("stream");
  var { StringDecoder } = __require("string_decoder");
  var kLast = Symbol("last");
  var kDecoder = Symbol("decoder");
  function transform(chunk, enc, cb) {
    let list;
    if (this.overflow) {
      const buf = this[kDecoder].write(chunk);
      list = buf.split(this.matcher);
      if (list.length === 1)
        return cb();
      list.shift();
      this.overflow = false;
    } else {
      this[kLast] += this[kDecoder].write(chunk);
      list = this[kLast].split(this.matcher);
    }
    this[kLast] = list.pop();
    for (let i = 0;i < list.length; i++) {
      try {
        push(this, this.mapper(list[i]));
      } catch (error) {
        return cb(error);
      }
    }
    this.overflow = this[kLast].length > this.maxLength;
    if (this.overflow && !this.skipOverflow) {
      cb(new Error("maximum buffer reached"));
      return;
    }
    cb();
  }
  function flush(cb) {
    this[kLast] += this[kDecoder].end();
    if (this[kLast]) {
      try {
        push(this, this.mapper(this[kLast]));
      } catch (error) {
        return cb(error);
      }
    }
    cb();
  }
  function push(self, val) {
    if (val !== undefined) {
      self.push(val);
    }
  }
  function noop(incoming) {
    return incoming;
  }
  function split(matcher, mapper, options) {
    matcher = matcher || /\r?\n/;
    mapper = mapper || noop;
    options = options || {};
    switch (arguments.length) {
      case 1:
        if (typeof matcher === "function") {
          mapper = matcher;
          matcher = /\r?\n/;
        } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
          options = matcher;
          matcher = /\r?\n/;
        }
        break;
      case 2:
        if (typeof matcher === "function") {
          options = mapper;
          mapper = matcher;
          matcher = /\r?\n/;
        } else if (typeof mapper === "object") {
          options = mapper;
          mapper = noop;
        }
    }
    options = Object.assign({}, options);
    options.autoDestroy = true;
    options.transform = transform;
    options.flush = flush;
    options.readableObjectMode = true;
    const stream = new Transform(options);
    stream[kLast] = "";
    stream[kDecoder] = new StringDecoder("utf8");
    stream.matcher = matcher;
    stream.mapper = mapper;
    stream.maxLength = options.maxLength;
    stream.skipOverflow = options.skipOverflow || false;
    stream.overflow = false;
    stream._destroy = function(err, cb) {
      this._writableState.errorEmitted = false;
      cb(err);
    };
    return stream;
  }
  module.exports = split;
});

// node_modules/pgpass/lib/helper.js
var require_helper = __commonJS(function(exports, module) {
  var path = __require("path");
  var Stream = __require("stream").Stream;
  var split = require_split2();
  var util = __require("util");
  var defaultPort = 5432;
  var isWin = process.platform === "win32";
  var warnStream = process.stderr;
  var S_IRWXG = 56;
  var S_IRWXO = 7;
  var S_IFMT = 61440;
  var S_IFREG = 32768;
  function isRegFile(mode) {
    return (mode & S_IFMT) == S_IFREG;
  }
  var fieldNames = ["host", "port", "database", "user", "password"];
  var nrOfFields = fieldNames.length;
  var passKey = fieldNames[nrOfFields - 1];
  function warn() {
    var isWritable = warnStream instanceof Stream && warnStream.writable === true;
    if (isWritable) {
      var args = Array.prototype.slice.call(arguments).concat(`
`);
      warnStream.write(util.format.apply(util, args));
    }
  }
  Object.defineProperty(exports, "isWin", {
    get: function() {
      return isWin;
    },
    set: function(val) {
      isWin = val;
    }
  });
  exports.warnTo = function(stream) {
    var old = warnStream;
    warnStream = stream;
    return old;
  };
  exports.getFileName = function(rawEnv) {
    var env = rawEnv || process.env;
    var file = env.PGPASSFILE || (isWin ? path.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path.join(env.HOME || "./", ".pgpass"));
    return file;
  };
  exports.usePgPass = function(stats, fname) {
    if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
      return false;
    }
    if (isWin) {
      return true;
    }
    fname = fname || "<unkn>";
    if (!isRegFile(stats.mode)) {
      warn('WARNING: password file "%s" is not a plain file', fname);
      return false;
    }
    if (stats.mode & (S_IRWXG | S_IRWXO)) {
      warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
      return false;
    }
    return true;
  };
  var matcher = exports.match = function(connInfo, entry) {
    return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
      if (idx == 1) {
        if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
          return prev && true;
        }
      }
      return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
    }, true);
  };
  exports.getPassword = function(connInfo, stream, cb) {
    var pass;
    var lineStream = stream.pipe(split());
    function onLine(line) {
      var entry = parseLine(line);
      if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
        pass = entry[passKey];
        lineStream.end();
      }
    }
    var onEnd = function() {
      stream.destroy();
      cb(pass);
    };
    var onErr = function(err) {
      stream.destroy();
      warn("WARNING: error on reading file: %s", err);
      cb(undefined);
    };
    stream.on("error", onErr);
    lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
  };
  var parseLine = exports.parseLine = function(line) {
    if (line.length < 11 || line.match(/^\s+#/)) {
      return null;
    }
    var curChar = "";
    var prevChar = "";
    var fieldIdx = 0;
    var startIdx = 0;
    var endIdx = 0;
    var obj = {};
    var isLastField = false;
    var addToObj = function(idx, i0, i1) {
      var field = line.substring(i0, i1);
      if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
        field = field.replace(/\\([:\\])/g, "$1");
      }
      obj[fieldNames[idx]] = field;
    };
    for (var i = 0;i < line.length - 1; i += 1) {
      curChar = line.charAt(i + 1);
      prevChar = line.charAt(i);
      isLastField = fieldIdx == nrOfFields - 1;
      if (isLastField) {
        addToObj(fieldIdx, startIdx);
        break;
      }
      if (i >= 0 && curChar == ":" && prevChar !== "\\") {
        addToObj(fieldIdx, startIdx, i + 1);
        startIdx = i + 2;
        fieldIdx += 1;
      }
    }
    obj = Object.keys(obj).length === nrOfFields ? obj : null;
    return obj;
  };
  var isValidEntry = exports.isValidEntry = function(entry) {
    var rules = {
      0: function(x) {
        return x.length > 0;
      },
      1: function(x) {
        if (x === "*") {
          return true;
        }
        x = Number(x);
        return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
      },
      2: function(x) {
        return x.length > 0;
      },
      3: function(x) {
        return x.length > 0;
      },
      4: function(x) {
        return x.length > 0;
      }
    };
    for (var idx = 0;idx < fieldNames.length; idx += 1) {
      var rule = rules[idx];
      var value = entry[fieldNames[idx]] || "";
      var res = rule(value);
      if (!res) {
        return false;
      }
    }
    return true;
  };
});

// node_modules/pgpass/lib/index.js
var require_lib = __commonJS(function(exports, module) {
  var path = __require("path");
  var fs = __require("fs");
  var helper = require_helper();
  module.exports = function(connInfo, cb) {
    var file = helper.getFileName();
    fs.stat(file, function(err, stat) {
      if (err || !helper.usePgPass(stat, file)) {
        return cb(undefined);
      }
      var st = fs.createReadStream(file);
      helper.getPassword(connInfo, st, cb);
    });
  };
  module.exports.warnTo = helper.warnTo;
});

// node_modules/pg/lib/client.js
var require_client = __commonJS(function(exports, module) {
  var EventEmitter = __require("events").EventEmitter;
  var utils = require_utils();
  var nodeUtils = __require("util");
  var sasl = require_sasl();
  var TypeOverrides = require_type_overrides();
  var ConnectionParameters = require_connection_parameters();
  var Query = require_query();
  var defaults = require_defaults();
  var Connection = require_connection();
  var crypto = require_utils2();
  var activeQueryDeprecationNotice = nodeUtils.deprecate(() => {}, "Client.activeQuery is deprecated and will be removed in pg@9.0");
  var queryQueueDeprecationNotice = nodeUtils.deprecate(() => {}, "Client.queryQueue is deprecated and will be removed in pg@9.0.");
  var pgPassDeprecationNotice = nodeUtils.deprecate(() => {}, "pgpass support is deprecated and will be removed in pg@9.0. " + "You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code.");
  var byoPromiseDeprecationNotice = nodeUtils.deprecate(() => {}, "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0.");
  var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(() => {}, "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead.");
  function coerceNumberOrDefault(value, defaultValue) {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : defaultValue;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const n = Number(value);
      return Number.isFinite(n) ? n : defaultValue;
    }
    return defaultValue;
  }

  class Client extends EventEmitter {
    constructor(config) {
      super();
      this.connectionParameters = new ConnectionParameters(config);
      this.user = this.connectionParameters.user;
      this.database = this.connectionParameters.database;
      this.port = this.connectionParameters.port;
      this.host = this.connectionParameters.host;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: this.connectionParameters.password
      });
      this.replication = this.connectionParameters.replication;
      const c = config || {};
      if (c.Promise) {
        byoPromiseDeprecationNotice();
      }
      this._Promise = c.Promise || global.Promise;
      this._types = new TypeOverrides(c.types);
      this._ending = false;
      this._ended = false;
      this._connecting = false;
      this._connected = false;
      this._connectionError = false;
      this._queryable = true;
      this._activeQuery = null;
      this._txStatus = null;
      this.enableChannelBinding = Boolean(c.enableChannelBinding);
      this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
      this.connection = c.connection || new Connection({
        stream: c.stream,
        ssl: this.connectionParameters.ssl,
        sslNegotiation: this.connectionParameters.sslnegotiation,
        keepAlive: c.keepAlive || false,
        keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
        encoding: this.connectionParameters.client_encoding || "utf8"
      });
      this._queryQueue = [];
      this._sentQueryQueue = [];
      this.pipeline = Boolean(c.pipeline);
      this.binary = c.binary || defaults.binary;
      this.processID = null;
      this.secretKey = null;
      this.ssl = this.connectionParameters.ssl || false;
      this.sslNegotiation = this.connectionParameters.sslnegotiation || "postgres";
      if (this.ssl && this.ssl.key) {
        Object.defineProperty(this.ssl, "key", {
          enumerable: false
        });
      }
      this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
    }
    get activeQuery() {
      activeQueryDeprecationNotice();
      return this._activeQuery;
    }
    set activeQuery(val) {
      activeQueryDeprecationNotice();
      this._activeQuery = val;
    }
    _getActiveQuery() {
      return this._activeQuery;
    }
    _errorAllQueries(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.handleError(err, this.connection);
        });
      };
      const activeQuery = this._getActiveQuery();
      if (activeQuery) {
        enqueueError(activeQuery);
        this._activeQuery = null;
      }
      this._sentQueryQueue.forEach(enqueueError);
      this._sentQueryQueue.length = 0;
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    }
    _connect(callback) {
      const self = this;
      const con = this.connection;
      this._connectionCallback = callback;
      if (this._connecting || this._connected) {
        const err = new Error("Client has already been connected. You cannot reuse a client.");
        process.nextTick(() => {
          callback(err);
        });
        return;
      }
      this._connecting = true;
      if (this._connectionTimeoutMillis > 0) {
        this.connectionTimeoutHandle = setTimeout(() => {
          con._ending = true;
          con.stream.destroy(new Error("timeout expired"));
        }, this._connectionTimeoutMillis);
        if (this.connectionTimeoutHandle.unref) {
          this.connectionTimeoutHandle.unref();
        }
      }
      if (this.host && this.host.indexOf("/") === 0) {
        con.connect(this.host + "/.s.PGSQL." + this.port);
      } else {
        con.connect(this.port, this.host);
      }
      con.on("connect", function() {
        if (self.ssl) {
          if (self.sslNegotiation !== "direct") {
            con.requestSsl();
          }
        } else {
          con.startup(self.getStartupConf());
        }
      });
      con.on("sslconnect", function() {
        con.startup(self.getStartupConf());
      });
      this._attachListeners(con);
      con.once("end", () => {
        const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
        clearTimeout(this.connectionTimeoutHandle);
        this._errorAllQueries(error);
        this._ended = true;
        if (!this._ending) {
          if (this._connecting && !this._connectionError) {
            if (this._connectionCallback) {
              this._connectionCallback(error);
            } else {
              this._handleErrorEvent(error);
            }
          } else if (!this._connectionError) {
            this._handleErrorEvent(error);
          }
        }
        process.nextTick(() => {
          this.emit("end");
        });
      });
    }
    connect(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve(this);
          }
        });
      });
    }
    _attachListeners(con) {
      con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
      con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
      con.on("authenticationSASL", this._handleAuthSASL.bind(this));
      con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
      con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
      con.on("backendKeyData", this._handleBackendKeyData.bind(this));
      con.on("error", this._handleErrorEvent.bind(this));
      con.on("errorMessage", this._handleErrorMessage.bind(this));
      con.on("readyForQuery", this._handleReadyForQuery.bind(this));
      con.on("notice", this._handleNotice.bind(this));
      con.on("rowDescription", this._handleRowDescription.bind(this));
      con.on("dataRow", this._handleDataRow.bind(this));
      con.on("portalSuspended", this._handlePortalSuspended.bind(this));
      con.on("emptyQuery", this._handleEmptyQuery.bind(this));
      con.on("commandComplete", this._handleCommandComplete.bind(this));
      con.on("parseComplete", this._handleParseComplete.bind(this));
      con.on("copyInResponse", this._handleCopyInResponse.bind(this));
      con.on("copyData", this._handleCopyData.bind(this));
      con.on("notification", this._handleNotification.bind(this));
    }
    _getPassword(cb) {
      const con = this.connection;
      if (typeof this.password === "function") {
        this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
          if (pass !== undefined) {
            if (typeof pass !== "string") {
              con.emit("error", new TypeError("Password must be a string"));
              return;
            }
            this.connectionParameters.password = this.password = pass;
          } else {
            this.connectionParameters.password = this.password = null;
          }
          cb();
        }).catch((err) => {
          con.emit("error", err);
        });
      } else if (this.password !== null) {
        cb();
      } else {
        try {
          const pgPass = require_lib();
          pgPass(this.connectionParameters, (pass) => {
            if (pass !== undefined) {
              pgPassDeprecationNotice();
              this.connectionParameters.password = this.password = pass;
            }
            cb();
          });
        } catch (e) {
          this.emit("error", e);
        }
      }
    }
    _handleAuthCleartextPassword(msg) {
      this._getPassword(() => {
        this.connection.password(this.password);
      });
    }
    _handleAuthMD5Password(msg) {
      this._getPassword(async () => {
        try {
          const hashedPassword = await crypto.postgresMd5PasswordHash(this.user, this.password, msg.salt);
          this.connection.password(hashedPassword);
        } catch (e) {
          this.emit("error", e);
        }
      });
    }
    _handleAuthSASL(msg) {
      this._getPassword(() => {
        try {
          this.saslSession = sasl.startSession(msg.mechanisms, this.enableChannelBinding && this.connection.stream, this.scramMaxIterations);
          this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      });
    }
    async _handleAuthSASLContinue(msg) {
      try {
        await sasl.continueSession(this.saslSession, this.password, msg.data, this.enableChannelBinding && this.connection.stream);
        this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
      } catch (err) {
        this.connection.emit("error", err);
      }
    }
    _handleAuthSASLFinal(msg) {
      try {
        sasl.finalizeSession(this.saslSession, msg.data);
        this.saslSession = null;
      } catch (err) {
        this.connection.emit("error", err);
      }
    }
    _handleBackendKeyData(msg) {
      this.processID = msg.processID;
      this.secretKey = msg.secretKey;
    }
    _handleReadyForQuery(msg) {
      if (this._connecting) {
        this._connecting = false;
        this._connected = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          this._connectionCallback(null, this);
          this._connectionCallback = null;
        }
        this.emit("connect");
      }
      const activeQuery = this._getActiveQuery();
      this._activeQuery = null;
      this._txStatus = msg?.status ?? null;
      this.readyForQuery = true;
      if (activeQuery) {
        activeQuery.handleReadyForQuery(this.connection);
      }
      this._pulseQueryQueue();
    }
    _handleErrorWhileConnecting(err) {
      if (this._connectionError) {
        return;
      }
      this._connectionError = true;
      clearTimeout(this.connectionTimeoutHandle);
      if (this._connectionCallback) {
        return this._connectionCallback(err);
      }
      this.emit("error", err);
    }
    _handleErrorEvent(err) {
      if (this._connecting) {
        return this._handleErrorWhileConnecting(err);
      }
      this._queryable = false;
      this._errorAllQueries(err);
      this.emit("error", err);
    }
    _handleErrorMessage(msg) {
      if (this._connecting) {
        return this._handleErrorWhileConnecting(msg);
      }
      const activeQuery = this._getActiveQuery();
      if (!activeQuery) {
        this._handleErrorEvent(msg);
        return;
      }
      this._activeQuery = null;
      if (activeQuery.name) {
        delete this.connection.submittedNamedStatements[activeQuery.name];
      }
      activeQuery.handleError(msg, this.connection);
    }
    _handleRowDescription(msg) {
      const activeQuery = this._getActiveQuery();
      if (activeQuery == null) {
        const error = new Error("Received unexpected rowDescription message from backend.");
        this._handleErrorEvent(error);
        return;
      }
      activeQuery.handleRowDescription(msg);
    }
    _handleDataRow(msg) {
      const activeQuery = this._getActiveQuery();
      if (activeQuery == null) {
        const error = new Error("Received unexpected dataRow message from backend.");
        this._handleErrorEvent(error);
        return;
      }
      activeQuery.handleDataRow(msg);
    }
    _handlePortalSuspended(msg) {
      const activeQuery = this._getActiveQuery();
      if (activeQuery == null) {
        const error = new Error("Received unexpected portalSuspended message from backend.");
        this._handleErrorEvent(error);
        return;
      }
      activeQuery.handlePortalSuspended(this.connection);
    }
    _handleEmptyQuery(msg) {
      const activeQuery = this._getActiveQuery();
      if (activeQuery == null) {
        const error = new Error("Received unexpected emptyQuery message from backend.");
        this._handleErrorEvent(error);
        return;
      }
      activeQuery.handleEmptyQuery(this.connection);
    }
    _handleCommandComplete(msg) {
      const activeQuery = this._getActiveQuery();
      if (activeQuery == null) {
        const error = new Error("Received unexpected commandComplete message from backend.");
        this._handleErrorEvent(error);
        return;
      }
      activeQuery.handleCommandComplete(msg, this.connection);
    }
    _handleParseComplete() {
      const activeQuery = this._getActiveQuery();
      if (activeQuery == null) {
        const error = new Error("Received unexpected parseComplete message from backend.");
        this._handleErrorEvent(error);
        return;
      }
      if (activeQuery.name) {
        this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
        delete this.connection.submittedNamedStatements[activeQuery.name];
      }
    }
    _handleCopyInResponse(msg) {
      const activeQuery = this._getActiveQuery();
      if (activeQuery == null) {
        const error = new Error("Received unexpected copyInResponse message from backend.");
        this._handleErrorEvent(error);
        return;
      }
      activeQuery.handleCopyInResponse(this.connection);
    }
    _handleCopyData(msg) {
      const activeQuery = this._getActiveQuery();
      if (activeQuery == null) {
        const error = new Error("Received unexpected copyData message from backend.");
        this._handleErrorEvent(error);
        return;
      }
      activeQuery.handleCopyData(msg, this.connection);
    }
    _handleNotification(msg) {
      this.emit("notification", msg);
    }
    _handleNotice(msg) {
      this.emit("notice", msg);
    }
    getStartupConf() {
      const params = this.connectionParameters;
      const data = {
        user: params.user,
        database: params.database
      };
      const appName = params.application_name || params.fallback_application_name;
      if (appName) {
        data.application_name = appName;
      }
      if (params.replication) {
        data.replication = "" + params.replication;
      }
      if (params.statement_timeout) {
        data.statement_timeout = String(parseInt(params.statement_timeout, 10));
      }
      if (params.lock_timeout) {
        data.lock_timeout = String(parseInt(params.lock_timeout, 10));
      }
      if (params.idle_in_transaction_session_timeout) {
        data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
      }
      if (params.options) {
        data.options = params.options;
      }
      return data;
    }
    cancel(client, query) {
      if (client.activeQuery === query) {
        const con = this.connection;
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          con.cancel(client.processID, client.secretKey);
        });
      } else if (client._queryQueue.indexOf(query) !== -1) {
        client._queryQueue.splice(client._queryQueue.indexOf(query), 1);
      } else if (client._sentQueryQueue.indexOf(query) !== -1) {
        query.callback = () => {};
      }
    }
    setTypeParser(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    }
    getTypeParser(oid, format) {
      return this._types.getTypeParser(oid, format);
    }
    escapeIdentifier(str) {
      return utils.escapeIdentifier(str);
    }
    escapeLiteral(str) {
      return utils.escapeLiteral(str);
    }
    _pulseQueryQueue() {
      if (this.pipeline) {
        this._pulsePipelinedQueryQueue();
        return;
      }
      if (this.readyForQuery === true) {
        this._activeQuery = this._queryQueue.shift();
        const activeQuery = this._getActiveQuery();
        if (activeQuery) {
          this.readyForQuery = false;
          this.hasExecuted = true;
          const queryError = activeQuery.submit(this.connection);
          if (queryError) {
            process.nextTick(() => {
              activeQuery.handleError(queryError, this.connection);
              this.readyForQuery = true;
              this._pulseQueryQueue();
            });
          }
        } else if (this.hasExecuted) {
          this._activeQuery = null;
          this.emit("drain");
        }
      }
    }
    _pulsePipelinedQueryQueue() {
      if (!this._connected || !this._queryable) {
        return;
      }
      while (this._queryQueue.length > 0) {
        const query = this._queryQueue.shift();
        this.hasExecuted = true;
        const queryError = query.submit(this.connection);
        if (queryError) {
          process.nextTick(() => {
            query.handleError(queryError, this.connection);
          });
          continue;
        }
        this._sentQueryQueue.push(query);
      }
      if (this.readyForQuery && !this._activeQuery && this._sentQueryQueue.length > 0) {
        this._activeQuery = this._sentQueryQueue.shift();
        this.readyForQuery = false;
      }
      if (!this._activeQuery && this._sentQueryQueue.length === 0 && this._queryQueue.length === 0 && this.hasExecuted) {
        this.emit("drain");
      }
    }
    query(config, values, callback) {
      let query;
      let result;
      if (config == null) {
        throw new TypeError("Client was passed a null or undefined query");
      }
      if (typeof config.submit === "function") {
        result = query = config;
        if (!query.callback) {
          if (typeof values === "function") {
            query.callback = values;
          } else if (callback) {
            query.callback = callback;
          }
        }
      } else {
        query = new Query(config, values, callback);
        if (!query.callback) {
          result = new this._Promise((resolve, reject) => {
            query.callback = (err, res) => err ? reject(err) : resolve(res);
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
        } else if (typeof query.callback !== "function") {
          throw new TypeError("callback is not a function");
        }
      }
      const readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
      if (readTimeout) {
        const queryCallback = query.callback || (() => {});
        const readTimeoutTimer = setTimeout(() => {
          const error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {};
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          } else if (this.pipeline) {
            this.connection.stream.destroy();
            return;
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (this.binary && !query.binary) {
        query.binary = true;
      }
      if (query._result && !query._result._types) {
        query._result._types = this._types;
      }
      if (this.pipeline) {
        const portalQuery = typeof config.submit === "function" && !(query instanceof Query) ? "Custom query classes such as pg-cursor and pg-query-stream are" : query.rows ? "The `rows` option is" : null;
        if (portalQuery) {
          process.nextTick(() => {
            query.handleError(new Error(`${portalQuery} not supported in pipeline mode`), this.connection);
          });
          return result;
        }
      }
      if (!this._queryable) {
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
        });
        return result;
      }
      if (this._ending) {
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"), this.connection);
        });
        return result;
      }
      if (this._queryQueue.length > 0 && !this.pipeline) {
        queryQueueLengthDeprecationNotice();
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    }
    ref() {
      this.connection.ref();
    }
    unref() {
      this.connection.unref();
    }
    getTransactionStatus() {
      return this._txStatus;
    }
    end(cb) {
      this._ending = true;
      if (!this.connection._connecting || this._ended) {
        if (cb) {
          cb();
          return;
        } else {
          return this._Promise.resolve();
        }
      }
      if (!this._queryable) {
        this.connection.stream.destroy();
      } else if (this.pipeline && (this._getActiveQuery() || this._sentQueryQueue.length > 0 || this._queryQueue.length > 0)) {
        this.once("drain", () => this.connection.end());
      } else if (this._getActiveQuery()) {
        this.connection.stream.destroy();
      } else {
        this.connection.end();
      }
      if (cb) {
        this.connection.once("end", cb);
      } else {
        return new this._Promise((resolve) => {
          this.connection.once("end", resolve);
        });
      }
    }
    get queryQueue() {
      queryQueueDeprecationNotice();
      return this._queryQueue;
    }
  }
  Client.Query = Query;
  module.exports = Client;
});

// node_modules/pg-pool/index.js
var require_pg_pool = __commonJS(function(exports, module) {
  var EventEmitter = __require("events").EventEmitter;
  var NOOP = function() {};
  var removeWhere = (list, predicate) => {
    const i = list.findIndex(predicate);
    return i === -1 ? undefined : list.splice(i, 1)[0];
  };

  class IdleItem {
    constructor(client, idleListener, timeoutId) {
      this.client = client;
      this.idleListener = idleListener;
      this.timeoutId = timeoutId;
    }
  }

  class PendingItem {
    constructor(callback) {
      this.callback = callback;
    }
  }
  function throwOnDoubleRelease() {
    throw new Error("Release called on client which has already been released to the pool.");
  }
  function promisify(Promise2, callback) {
    if (callback) {
      return { callback, result: undefined };
    }
    let rej;
    let res;
    const cb = function(err, client) {
      err ? rej(err) : res(client);
    };
    const result = new Promise2(function(resolve, reject) {
      res = resolve;
      rej = reject;
    }).catch((err) => {
      Error.captureStackTrace(err);
      throw err;
    });
    return { callback: cb, result };
  }
  function makeIdleListener(pool, client) {
    return function idleListener(err) {
      err.client = client;
      client.removeListener("error", idleListener);
      client.on("error", () => {
        pool.log("additional client error after disconnection due to error", err);
      });
      pool._remove(client);
      pool.emit("error", err, client);
    };
  }

  class Pool extends EventEmitter {
    constructor(options, Client) {
      super();
      this.options = Object.assign({}, options);
      if (options != null && "password" in options) {
        Object.defineProperty(this.options, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: options.password
        });
      }
      if (options != null && options.ssl && options.ssl.key) {
        Object.defineProperty(this.options.ssl, "key", {
          enumerable: false
        });
      }
      this.options.max = this.options.max || this.options.poolSize || 10;
      this.options.min = this.options.min || 0;
      this.options.maxUses = this.options.maxUses || Infinity;
      this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
      this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
      this.log = this.options.log || function() {};
      this.Client = this.options.Client || Client || require_lib2().Client;
      this.Promise = this.options.Promise || global.Promise;
      if (typeof this.options.idleTimeoutMillis === "undefined") {
        this.options.idleTimeoutMillis = 1e4;
      }
      this._clients = [];
      this._idle = [];
      this._expired = new WeakSet;
      this._pendingQueue = [];
      this._endCallback = undefined;
      this.ending = false;
      this.ended = false;
    }
    _promiseTry(f) {
      const Promise2 = this.Promise;
      if (typeof Promise2.try === "function") {
        return Promise2.try(f);
      }
      return new Promise2((resolve) => resolve(f()));
    }
    _isFull() {
      return this._clients.length >= this.options.max;
    }
    _isAboveMin() {
      return this._clients.length > this.options.min;
    }
    _pulseQueue() {
      this.log("pulse queue");
      if (this.ended) {
        this.log("pulse queue ended");
        return;
      }
      if (this.ending) {
        this.log("pulse queue on ending");
        if (this._idle.length) {
          this._idle.slice().map((item) => {
            this._remove(item.client);
          });
        }
        if (!this._clients.length) {
          this.ended = true;
          this._endCallback();
        }
        return;
      }
      if (!this._pendingQueue.length) {
        this.log("no queued requests");
        return;
      }
      if (!this._idle.length && this._isFull()) {
        return;
      }
      const pendingItem = this._pendingQueue.shift();
      if (this._idle.length) {
        const idleItem = this._idle.pop();
        clearTimeout(idleItem.timeoutId);
        const client = idleItem.client;
        client.ref && client.ref();
        const idleListener = idleItem.idleListener;
        return this._acquireClient(client, pendingItem, idleListener, false);
      }
      if (!this._isFull()) {
        return this.newClient(pendingItem);
      }
      throw new Error("unexpected condition");
    }
    _remove(client, callback) {
      const removed = removeWhere(this._idle, (item) => item.client === client);
      if (removed !== undefined) {
        clearTimeout(removed.timeoutId);
      }
      this._clients = this._clients.filter((c) => c !== client);
      const context = this;
      client.end(() => {
        context.emit("remove", client);
        if (typeof callback === "function") {
          callback();
        }
      });
    }
    connect(cb) {
      if (this.ending) {
        const err = new Error("Cannot use a pool after calling end on the pool");
        return cb ? cb(err) : this.Promise.reject(err);
      }
      const response = promisify(this.Promise, cb);
      const result = response.result;
      if (this._isFull() || this._idle.length) {
        if (this._idle.length) {
          process.nextTick(() => this._pulseQueue());
        }
        if (!this.options.connectionTimeoutMillis) {
          this._pendingQueue.push(new PendingItem(response.callback));
          return result;
        }
        const queueCallback = (err, res, done) => {
          clearTimeout(tid);
          response.callback(err, res, done);
        };
        const pendingItem = new PendingItem(queueCallback);
        const tid = setTimeout(() => {
          removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
          pendingItem.timedOut = true;
          response.callback(new Error("timeout exceeded when trying to connect"));
        }, this.options.connectionTimeoutMillis);
        if (tid.unref) {
          tid.unref();
        }
        this._pendingQueue.push(pendingItem);
        return result;
      }
      this.newClient(new PendingItem(response.callback));
      return result;
    }
    newClient(pendingItem) {
      const client = new this.Client(this.options);
      this._clients.push(client);
      const idleListener = makeIdleListener(this, client);
      this.log("checking client timeout");
      let tid;
      let timeoutHit = false;
      if (this.options.connectionTimeoutMillis) {
        tid = setTimeout(() => {
          if (client.connection) {
            this.log("ending client due to timeout");
            timeoutHit = true;
            client.connection.stream.destroy();
          } else if (!client.isConnected()) {
            this.log("ending client due to timeout");
            timeoutHit = true;
            client.end();
          }
        }, this.options.connectionTimeoutMillis);
      }
      this.log("connecting new client");
      client.connect((err) => {
        if (tid) {
          clearTimeout(tid);
        }
        client.on("error", idleListener);
        if (err) {
          this.log("client failed to connect", err);
          this._clients = this._clients.filter((c) => c !== client);
          if (timeoutHit) {
            err = new Error("Connection terminated due to connection timeout", { cause: err });
          }
          this._pulseQueue();
          if (!pendingItem.timedOut) {
            pendingItem.callback(err, undefined, NOOP);
          }
        } else {
          this.log("new client connected");
          if (this.options.onConnect) {
            this._promiseTry(() => this.options.onConnect(client)).then(() => {
              this._afterConnect(client, pendingItem, idleListener);
            }, (hookErr) => {
              this._clients = this._clients.filter((c) => c !== client);
              client.end(() => {
                this._pulseQueue();
                if (!pendingItem.timedOut) {
                  pendingItem.callback(hookErr, undefined, NOOP);
                }
              });
            });
            return;
          }
          return this._afterConnect(client, pendingItem, idleListener);
        }
      });
    }
    _afterConnect(client, pendingItem, idleListener) {
      if (this.options.maxLifetimeSeconds !== 0) {
        const maxLifetimeTimeout = setTimeout(() => {
          this.log("ending client due to expired lifetime");
          this._expired.add(client);
          const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
          if (idleIndex !== -1) {
            this._acquireClient(client, new PendingItem((err, client, clientRelease) => clientRelease()), idleListener, false);
          }
        }, this.options.maxLifetimeSeconds * 1000);
        maxLifetimeTimeout.unref();
        client.once("end", () => clearTimeout(maxLifetimeTimeout));
      }
      return this._acquireClient(client, pendingItem, idleListener, true);
    }
    _acquireClient(client, pendingItem, idleListener, isNew) {
      if (isNew) {
        this.emit("connect", client);
      }
      this.emit("acquire", client);
      client.release = this._releaseOnce(client, idleListener);
      client.removeListener("error", idleListener);
      if (!pendingItem.timedOut) {
        if (isNew && this.options.verify) {
          this.options.verify(client, (err) => {
            if (err) {
              client.release(err);
              return pendingItem.callback(err, undefined, NOOP);
            }
            pendingItem.callback(undefined, client, client.release);
          });
        } else {
          pendingItem.callback(undefined, client, client.release);
        }
      } else {
        if (isNew && this.options.verify) {
          this.options.verify(client, client.release);
        } else {
          client.release();
        }
      }
    }
    _releaseOnce(client, idleListener) {
      let released = false;
      return (err) => {
        if (released) {
          throwOnDoubleRelease();
        }
        released = true;
        this._release(client, idleListener, err);
      };
    }
    _release(client, idleListener, err) {
      client.on("error", idleListener);
      client._poolUseCount = (client._poolUseCount || 0) + 1;
      this.emit("release", err, client);
      if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
        if (client._poolUseCount >= this.options.maxUses) {
          this.log("remove expended client");
        }
        return this._remove(client, this._pulseQueue.bind(this));
      }
      const isExpired = this._expired.has(client);
      if (isExpired) {
        this.log("remove expired client");
        this._expired.delete(client);
        return this._remove(client, this._pulseQueue.bind(this));
      }
      let tid;
      if (this.options.idleTimeoutMillis && this._isAboveMin()) {
        tid = setTimeout(() => {
          if (this._isAboveMin()) {
            this.log("remove idle client");
            this._remove(client, this._pulseQueue.bind(this));
          }
        }, this.options.idleTimeoutMillis);
        if (this.options.allowExitOnIdle) {
          tid.unref();
        }
      }
      if (this.options.allowExitOnIdle) {
        client.unref();
      }
      this._idle.push(new IdleItem(client, idleListener, tid));
      this._pulseQueue();
    }
    query(text, values, cb) {
      if (typeof text === "function") {
        const response = promisify(this.Promise, text);
        setImmediate(function() {
          return response.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
        });
        return response.result;
      }
      if (typeof values === "function") {
        cb = values;
        values = undefined;
      }
      const response = promisify(this.Promise, cb);
      cb = response.callback;
      this.connect((err, client) => {
        if (err) {
          return cb(err);
        }
        let clientReleased = false;
        const onError = (err) => {
          if (clientReleased) {
            return;
          }
          clientReleased = true;
          client.release(err);
          cb(err);
        };
        client.once("error", onError);
        this.log("dispatching query");
        try {
          client.query(text, values, (err, res) => {
            this.log("query dispatched");
            client.removeListener("error", onError);
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err);
            if (err) {
              return cb(err);
            }
            return cb(undefined, res);
          });
        } catch (err) {
          client.release(err);
          return cb(err);
        }
      });
      return response.result;
    }
    end(cb) {
      this.log("ending");
      if (this.ending) {
        const err = new Error("Called end on pool more than once");
        return cb ? cb(err) : this.Promise.reject(err);
      }
      this.ending = true;
      const promised = promisify(this.Promise, cb);
      this._endCallback = promised.callback;
      this._pulseQueue();
      return promised.result;
    }
    get waitingCount() {
      return this._pendingQueue.length;
    }
    get idleCount() {
      return this._idle.length;
    }
    get expiredCount() {
      return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
    }
    get totalCount() {
      return this._clients.length;
    }
  }
  module.exports = Pool;
});

// node_modules/pg/lib/native/query.js
var require_query2 = __commonJS(function(exports, module) {
  var EventEmitter = __require("events").EventEmitter;
  var util = __require("util");
  var utils = require_utils();
  var NativeQuery = module.exports = function(config, values, callback) {
    EventEmitter.call(this);
    config = utils.normalizeQueryConfig(config, values, callback);
    this.text = config.text;
    this.values = config.values;
    this.name = config.name;
    this.queryMode = config.queryMode;
    this.callback = config.callback;
    this.state = "new";
    this._arrayMode = config.rowMode === "array";
    this._emitRowEvents = false;
    this.on("newListener", function(event) {
      if (event === "row")
        this._emitRowEvents = true;
    }.bind(this));
  };
  util.inherits(NativeQuery, EventEmitter);
  var errorFieldMap = {
    sqlState: "code",
    statementPosition: "position",
    messagePrimary: "message",
    messageDetail: "detail",
    messageHint: "hint",
    context: "where",
    schemaName: "schema",
    tableName: "table",
    columnName: "column",
    dataTypeName: "dataType",
    constraintName: "constraint",
    sourceFile: "file",
    sourceLine: "line",
    sourceFunction: "routine"
  };
  NativeQuery.prototype.handleError = function(err) {
    const fields = this.native && this.native.pq.resultErrorFields();
    if (fields) {
      for (const key in fields) {
        const normalizedFieldName = errorFieldMap[key] || key;
        err[normalizedFieldName] = fields[key];
      }
    }
    if (this.callback) {
      this.callback(err);
    } else {
      this.emit("error", err);
    }
    this.state = "error";
  };
  NativeQuery.prototype.then = function(onSuccess, onFailure) {
    return this._getPromise().then(onSuccess, onFailure);
  };
  NativeQuery.prototype.catch = function(callback) {
    return this._getPromise().catch(callback);
  };
  NativeQuery.prototype._getPromise = function() {
    if (this._promise)
      return this._promise;
    this._promise = new Promise(function(resolve, reject) {
      this._once("end", resolve);
      this._once("error", reject);
    }.bind(this));
    return this._promise;
  };
  NativeQuery.prototype.submit = function(client) {
    this.state = "running";
    const self = this;
    this.native = client.native;
    client.native.arrayMode = this._arrayMode;
    let after = function(err, rows, results) {
      client.native.arrayMode = false;
      setImmediate(function() {
        self.emit("_done");
      });
      if (err) {
        return self.handleError(err);
      }
      if (self._emitRowEvents) {
        if (results.length > 1) {
          rows.forEach((rowOfRows, i) => {
            rowOfRows.forEach((row) => {
              self.emit("row", row, results[i]);
            });
          });
        } else {
          rows.forEach(function(row) {
            self.emit("row", row, results);
          });
        }
      }
      self.state = "end";
      self.emit("end", results);
      if (self.callback) {
        self.callback(null, results);
      }
    };
    if (process.domain) {
      after = process.domain.bind(after);
    }
    if (this.name) {
      if (this.name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", this.name, this.name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const values = (this.values || []).map(utils.prepareValue);
      if (client.namedQueries[this.name] !== undefined) {
        if (this.text && client.namedQueries[this.name] !== this.text) {
          const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
          return after(err);
        }
        return client.native.execute(this.name, values, after);
      }
      return client.native.prepare(this.name, this.text, values.length, function(err) {
        if (err)
          return after(err);
        client.namedQueries[self.name] = self.text;
        return self.native.execute(self.name, values, after);
      });
    } else if (this.values) {
      if (!Array.isArray(this.values)) {
        const err = new Error("Query values must be an array");
        return after(err);
      }
      const vals = this.values.map(utils.prepareValue);
      client.native.query(this.text, vals, after);
    } else if (this.queryMode === "extended") {
      client.native.query(this.text, [], after);
    } else {
      client.native.query(this.text, after);
    }
  };
});

// node_modules/pg/lib/native/client.js
var require_client2 = __commonJS(function(exports, module) {
  var nodeUtils = __require("util");
  var Native;
  try {
    Native = (()=>{throw new Error("Cannot require module "+"pg-native");})();
  } catch (e) {
    throw e;
  }
  var TypeOverrides = require_type_overrides();
  var EventEmitter = __require("events").EventEmitter;
  var util = __require("util");
  var ConnectionParameters = require_connection_parameters();
  var NativeQuery = require_query2();
  var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(() => {}, "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead.");
  var Client = module.exports = function(config) {
    EventEmitter.call(this);
    config = config || {};
    this._Promise = config.Promise || global.Promise;
    this._types = new TypeOverrides(config.types);
    this.native = new Native({
      types: this._types
    });
    this._queryQueue = [];
    this._ending = false;
    this._connecting = false;
    this._connected = false;
    this._queryable = true;
    this.pipeline = Boolean(config.pipeline);
    this._pipelineInFlight = false;
    const cp = this.connectionParameters = new ConnectionParameters(config);
    if (config.nativeConnectionString)
      cp.nativeConnectionString = config.nativeConnectionString;
    this.user = cp.user;
    Object.defineProperty(this, "password", {
      configurable: true,
      enumerable: false,
      writable: true,
      value: cp.password
    });
    this.database = cp.database;
    this.host = cp.host;
    this.port = cp.port;
    this.namedQueries = {};
  };
  Client.Query = NativeQuery;
  util.inherits(Client, EventEmitter);
  Client.prototype._errorAllQueries = function(err) {
    const enqueueError = (query) => {
      process.nextTick(() => {
        query.native = this.native;
        query.handleError(err);
      });
    };
    if (this._hasActiveQuery()) {
      enqueueError(this._activeQuery);
      this._activeQuery = null;
    }
    this._queryQueue.forEach(enqueueError);
    this._queryQueue.length = 0;
  };
  Client.prototype._connect = function(cb) {
    const self = this;
    if (this._connecting) {
      process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
      return;
    }
    this._connecting = true;
    this.connectionParameters.getLibpqConnectionString(function(err, conString) {
      if (self.connectionParameters.nativeConnectionString)
        conString = self.connectionParameters.nativeConnectionString;
      if (err)
        return cb(err);
      self.native.connect(conString, function(err) {
        if (err) {
          self.native.end();
          return cb(err);
        }
        self._connected = true;
        self.native.on("error", function(err) {
          self._queryable = false;
          self._errorAllQueries(err);
          self.emit("error", err);
        });
        self.native.on("notification", function(msg) {
          self.emit("notification", {
            channel: msg.relname,
            payload: msg.extra
          });
        });
        self.emit("connect");
        self._pulseQueryQueue(true);
        cb(null, this);
      });
    });
  };
  Client.prototype.connect = function(callback) {
    if (callback) {
      this._connect(callback);
      return;
    }
    return new this._Promise((resolve, reject) => {
      this._connect((error) => {
        if (error) {
          reject(error);
        } else {
          resolve(this);
        }
      });
    });
  };
  Client.prototype.query = function(config, values, callback) {
    let query;
    let result;
    let readTimeout;
    let readTimeoutTimer;
    let queryCallback;
    if (config === null || config === undefined) {
      throw new TypeError("Client was passed a null or undefined query");
    } else if (typeof config.submit === "function") {
      readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
      result = query = config;
      if (typeof values === "function") {
        config.callback = values;
      }
    } else {
      readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
      query = new NativeQuery(config, values, callback);
      if (!query.callback) {
        let resolveOut, rejectOut;
        result = new this._Promise((resolve, reject) => {
          resolveOut = resolve;
          rejectOut = reject;
        }).catch((err) => {
          Error.captureStackTrace(err);
          throw err;
        });
        query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
      }
    }
    if (readTimeout) {
      queryCallback = query.callback || (() => {});
      readTimeoutTimer = setTimeout(() => {
        const error = new Error("Query read timeout");
        process.nextTick(() => {
          query.handleError(error, this.connection);
        });
        queryCallback(error);
        query.callback = () => {};
        const index = this._queryQueue.indexOf(query);
        if (index > -1) {
          this._queryQueue.splice(index, 1);
        }
        this._pulseQueryQueue();
      }, readTimeout);
      query.callback = (err, res) => {
        clearTimeout(readTimeoutTimer);
        queryCallback(err, res);
      };
    }
    if (!this._queryable) {
      query.native = this.native;
      process.nextTick(() => {
        query.handleError(new Error("Client has encountered a connection error and is not queryable"));
      });
      return result;
    }
    if (this._ending) {
      query.native = this.native;
      process.nextTick(() => {
        query.handleError(new Error("Client was closed and is not queryable"));
      });
      return result;
    }
    if (this._queryQueue.length > 0 && !this.pipeline) {
      queryQueueLengthDeprecationNotice();
    }
    this._queryQueue.push(query);
    this._pulseQueryQueue();
    return result;
  };
  Client.prototype.end = function(cb) {
    const self = this;
    this._ending = true;
    if (this._connecting && !this._connected) {
      this.once("connect", () => {
        this.end(() => {});
      });
    }
    let result;
    if (!cb) {
      result = new this._Promise(function(resolve, reject) {
        cb = (err) => err ? reject(err) : resolve();
      });
    }
    const doEnd = function() {
      self.native.end(function() {
        self._connected = false;
        self._errorAllQueries(new Error("Connection terminated"));
        process.nextTick(() => {
          self.emit("end");
          if (cb)
            cb();
        });
      });
    };
    if (this.pipeline && (this._pipelineInFlight || this._queryQueue.length > 0)) {
      this.once("drain", doEnd);
    } else {
      doEnd();
    }
    return result;
  };
  Client.prototype._hasActiveQuery = function() {
    return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
  };
  Client.prototype._pulseQueryQueue = function(initialConnection) {
    if (!this._connected) {
      return;
    }
    if (this.pipeline && !initialConnection) {
      return this._pulsePipelinedQueryQueue();
    }
    if (this._hasActiveQuery()) {
      return;
    }
    const query = this._queryQueue.shift();
    if (!query) {
      if (!initialConnection) {
        this.emit("drain");
      }
      return;
    }
    this._activeQuery = query;
    query.submit(this);
    const self = this;
    query.once("_done", function() {
      self._pulseQueryQueue();
    });
  };
  Client.prototype._pulsePipelinedQueryQueue = function() {
    if (!this._connected || this._pipelineInFlight) {
      return;
    }
    if (this._queryQueue.length === 0) {
      if (this.hasExecuted) {
        this.emit("drain");
      }
      return;
    }
    this._pipelineInFlight = true;
    const self = this;
    const queries = [];
    const nativeQueries = [];
    const utils = require_utils();
    while (this._queryQueue.length > 0) {
      const query = this._queryQueue.shift();
      this.hasExecuted = true;
      nativeQueries.push(query);
      const values = query.values ? query.values.map(utils.prepareValue) : null;
      const pipelineEntry = { text: query.text, name: query.name, arrayMode: query._arrayMode };
      if (values) {
        pipelineEntry.values = values;
      }
      if (query.name && this.namedQueries[query.name]) {
        pipelineEntry._alreadyPrepared = true;
      }
      queries.push(pipelineEntry);
    }
    this.native.pipeline(queries, function(err, results) {
      self._pipelineInFlight = false;
      if (err) {
        self._connected = false;
        self._queryable = false;
        for (let i = 0;i < nativeQueries.length; i++) {
          const q = nativeQueries[i];
          q.native = self.native;
          q.handleError(err);
        }
        self._errorAllQueries(err);
        self.emit("error", err);
        self.emit("end");
        return;
      }
      for (let i = 0;i < nativeQueries.length; i++) {
        const q = nativeQueries[i];
        const r = results[i];
        q.native = self.native;
        if (r.err) {
          q.handleError(r.err);
        } else {
          if (q.name) {
            self.namedQueries[q.name] = q.text;
          }
          q.state = "end";
          q.emit("end", r.result);
          if (q.callback) {
            q.callback(null, r.result);
          }
        }
        setImmediate(function() {
          q.emit("_done");
        });
      }
      self._pulsePipelinedQueryQueue();
    });
  };
  Client.prototype.cancel = function(query) {
    if (this._activeQuery === query) {
      this.native.cancel(function() {});
    } else if (this._queryQueue.indexOf(query) !== -1) {
      this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
    }
  };
  Client.prototype.ref = function() {};
  Client.prototype.unref = function() {};
  Client.prototype.setTypeParser = function(oid, format, parseFn) {
    return this._types.setTypeParser(oid, format, parseFn);
  };
  Client.prototype.getTypeParser = function(oid, format) {
    return this._types.getTypeParser(oid, format);
  };
  Client.prototype.isConnected = function() {
    return this._connected;
  };
  Client.prototype.getTransactionStatus = function() {
    return this.native.getTransactionStatus();
  };
});

// node_modules/pg/lib/index.js
var require_lib2 = __commonJS(function(exports, module) {
  var Client = require_client();
  var defaults = require_defaults();
  var Connection = require_connection();
  var Result = require_result();
  var utils = require_utils();
  var Pool = require_pg_pool();
  var TypeOverrides = require_type_overrides();
  var { DatabaseError } = require_dist();
  var { escapeIdentifier, escapeLiteral } = require_utils();
  var poolFactory = (Client) => {
    return class BoundPool extends Pool {
      constructor(options) {
        super(options, Client);
      }
    };
  };
  var PG = function(clientConstructor) {
    this.defaults = defaults;
    this.Client = clientConstructor;
    this.Query = this.Client.Query;
    this.Pool = poolFactory(this.Client);
    this._pools = [];
    this.Connection = Connection;
    this.types = require_pg_types();
    this.DatabaseError = DatabaseError;
    this.TypeOverrides = TypeOverrides;
    this.escapeIdentifier = escapeIdentifier;
    this.escapeLiteral = escapeLiteral;
    this.Result = Result;
    this.utils = utils;
  };
  var clientConstructor = Client;
  var forceNative = false;
  try {
    forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
  } catch {}
  if (forceNative) {
    clientConstructor = require_client2();
  }
  module.exports = new PG(clientConstructor);
  Object.defineProperty(module.exports, "native", {
    configurable: true,
    enumerable: false,
    get() {
      let native = null;
      try {
        native = new PG(require_client2());
      } catch (err) {
        if (err.code !== "MODULE_NOT_FOUND") {
          throw err;
        }
      }
      Object.defineProperty(module.exports, "native", {
        value: native
      });
      return native;
    }
  });
});

// server/handlers.ts
import { randomUUID } from "node:crypto";

// node_modules/pg/esm/index.mjs
var import_lib = __toESM(require_lib2(), 1);
var Client = import_lib.default.Client;
var Pool = import_lib.default.Pool;
var Connection = import_lib.default.Connection;
var types = import_lib.default.types;
var Query = import_lib.default.Query;
var DatabaseError = import_lib.default.DatabaseError;
var escapeIdentifier = import_lib.default.escapeIdentifier;
var escapeLiteral = import_lib.default.escapeLiteral;
var Result = import_lib.default.Result;
var TypeOverrides = import_lib.default.TypeOverrides;
var defaults = import_lib.default.defaults;

// server/seed.json
var seed_default = [
  {
    criadoEm: "2026-06-13T09:55:55-03:00",
    prefixo: "ITM 303",
    matricula: "19191",
    nome: "EDGLEYSON MENEZES DE SOUSA",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GOMAN",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "B",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-06-13T09:56:22-03:00",
    prefixo: "MA-MRA-E001M",
    matricula: "12737",
    nome: "ITALO TIAGO SILVA SOUSA",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "C",
      "C",
      "A",
      "B",
      "A",
      "D",
      "C",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-06-13T09:56:56-03:00",
    prefixo: "303",
    matricula: "18458",
    nome: "JOSE RIBAMAR MAGALHAES",
    funcao: "MOTORISTA OP DE GUINCHO",
    base: "ITM",
    gerencia: "GOMAN",
    respostas: [
      "B",
      "C",
      "C",
      "C",
      "A",
      "D",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-06-13T09:57:01-03:00",
    prefixo: "ARI-E001",
    matricula: "16003",
    nome: "KAIO RYELSON ASSUNCAO DA SILVA",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "B",
      "C",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-06-13T09:57:40-03:00",
    prefixo: "MA-E001M",
    matricula: "13546",
    nome: "WALLACE ALVES AMARAL",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "D",
      "C",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-06-13T09:58:34-03:00",
    prefixo: "MA_MRA_E001M",
    matricula: "12805",
    nome: "MARCIO RAFAEL BRAGA DA SILVA",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "D",
      "C",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-06-13T09:59:22-03:00",
    prefixo: "MA-MRA-E001M",
    matricula: "2370",
    nome: "ITALO TIAGO SILVA SOUSA",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "C",
      "C",
      "A",
      "B",
      "A",
      "D",
      "C",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-06-13T09:59:45-03:00",
    prefixo: "MA-MRA-E001M",
    matricula: "17741",
    nome: "MOIZANIEL COSTA FIGUEIREDO",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "D",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-06-30T10:14:51-03:00",
    prefixo: "MA-STI-F001M",
    matricula: "16935",
    nome: "JOAO VICTOR BARBOSA OLIVEIRA",
    funcao: "ELETRICISTA",
    base: "STI",
    gerencia: "GSTC",
    respostas: [
      "A",
      "C",
      "A",
      "A",
      "B",
      "B",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-06-30T10:17:31-03:00",
    prefixo: "BCB F009",
    matricula: "16083",
    nome: "ROGERIO OLIVEIRA DA SILVA",
    funcao: "ELETRICISTA",
    base: "BCB",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "B",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-06-30T10:17:39-03:00",
    prefixo: "BCB-F007M",
    matricula: "21573",
    nome: "MARCIO OLIVEIRA SILVA",
    funcao: "ELETRICISTA",
    base: "BCB",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "B",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-06-30T10:18:01-03:00",
    prefixo: "BCBF007M",
    matricula: "21440",
    nome: "RAIMUNDO THIAGO MOUTA DE OLIVEIRA",
    funcao: "ELETRICISTA",
    base: "BCB",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "B",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-06-30T10:21:39-03:00",
    prefixo: "BCB F009",
    matricula: "21803",
    nome: "RAIMUNDO NONATO FERREIRA ERICEIRA DE SOUSA",
    funcao: "ELETRICISTA",
    base: "PDT",
    gerencia: "SPOT",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "B",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-08-13T15:40:06-03:00",
    prefixo: "Sesmt",
    matricula: "18436",
    nome: "ANTONIO MARCOS NOGUEIRA CARVALHO",
    funcao: "ENCARREGADO LINHA VIVA DE DISTRIBUIÇÃO",
    base: "BDC",
    gerencia: "GSTC",
    respostas: [
      "A",
      "A",
      "A",
      "A",
      "A",
      "B",
      "C",
      "B",
      "A",
      "A"
    ]
  },
  {
    criadoEm: "2026-08-13T17:24:33-03:00",
    prefixo: "ITM -C002M",
    matricula: "23049",
    nome: "JOILSON ARAUJO DOS SANTOS",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "A",
      "C",
      "A",
      "B",
      "A",
      "D",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-08-13T19:46:32-03:00",
    prefixo: "MA-ITM-M001M",
    matricula: "23049",
    nome: "ALEXSANDRO LIMA LOPES",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "A",
      "A",
      "B",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-08-14T09:58:08-03:00",
    prefixo: "ITM -C002M",
    matricula: "23049",
    nome: "JOILSON ARAUJO DOS SANTOS",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "D",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-08-14T10:32:25-03:00",
    prefixo: "ITM",
    matricula: "23049",
    nome: "JOILSON ARAUJO DOS SANTOS",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "B",
      "A",
      "C",
      "C",
      "C"
    ]
  },
  {
    criadoEm: "2026-09-04T13:28:22-03:00",
    prefixo: "Pdt 007",
    matricula: "12991",
    nome: "FELIPE RODRIGUES DA SILVA BATISTA",
    funcao: "ELETRICISTA",
    base: "PDT",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "B",
      "C",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-09-04T13:33:58-03:00",
    prefixo: "Pdt f006",
    matricula: "22477",
    nome: "JOSE WILES ROQUE MARTINS",
    funcao: "ELETRICISTA",
    base: "PDT",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "A",
      "A",
      "A",
      "C",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-09-04T13:34:30-03:00",
    prefixo: "PDTF006",
    matricula: "24445",
    nome: "FRANCISCO DE ASSIS SILVA COSTA",
    funcao: "ELETRICISTA",
    base: "PDT",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "A",
      "A",
      "B",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-09-04T13:56:14-03:00",
    prefixo: "Pdt 007",
    matricula: "12991",
    nome: "FELIPE RODRIGUES DA SILVA BATISTA",
    funcao: "ELETRICISTA",
    base: "PDT",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-09-05T10:40:27-03:00",
    prefixo: "MA-PDS-E002M",
    matricula: "19421",
    nome: "HUDSON SOUSA FELICIANO",
    funcao: "ELETRICISTA",
    base: "PDS",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "B",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-09-05T10:40:33-03:00",
    prefixo: "MA-PDS-E002M",
    matricula: "20550",
    nome: "LUIS FELIPE LIMA GONCALVES",
    funcao: "ELETRICISTA",
    base: "PDS",
    gerencia: "GSTC",
    respostas: [
      "B",
      "A",
      "A",
      "B",
      "A",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-09-05T10:59:38-03:00",
    prefixo: "MA-PDS-E002M",
    matricula: "12821",
    nome: "JOSE ROBERTO DA SILVA OLIVEIRA",
    funcao: "ELETRICISTA MONTADOR",
    base: "PDS",
    gerencia: "GSTC",
    respostas: [
      "B",
      "B",
      "B",
      "B",
      "A",
      "D",
      "B",
      "C",
      "B",
      "D"
    ]
  },
  {
    criadoEm: "2026-09-07T11:01:16-03:00",
    prefixo: "MA-SDM-M001M",
    matricula: "22414",
    nome: "ELIAS DOS REIS SANTOS",
    funcao: "ELETRICISTA",
    base: "PDT",
    gerencia: "GSTC",
    respostas: [
      "B",
      "B",
      "A",
      "B",
      "A",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-09-07T11:22:30-03:00",
    prefixo: "SDM-M001M",
    matricula: "14362",
    nome: "JORBSON NASCIMENTO ASSUNCAO",
    funcao: "ELETRICISTA",
    base: "PDT",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "A",
      "A",
      "B",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-09-23T14:53:44-03:00",
    prefixo: "MA-STI-F002M",
    matricula: "21441",
    nome: "RODRIGO GOMES MONTEIRO",
    funcao: "ELETRICISTA",
    base: "STI",
    gerencia: "GSTC",
    respostas: [
      "A",
      "C",
      "A",
      "B",
      "A",
      "B",
      "C",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-03T11:29:47-03:00",
    prefixo: "PDS-M001M",
    matricula: "15886",
    nome: "FRANCIEL DOS SANTOS LIMA",
    funcao: "ELETRICISTA",
    base: "PDS",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "A",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-03T11:30:02-03:00",
    prefixo: "MA-PDS-C001M",
    matricula: "22427",
    nome: "RAI DA SILVA LEITE",
    funcao: "ELETRICISTA",
    base: "PDS",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "D",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-03T11:30:49-03:00",
    prefixo: "PDS F003",
    matricula: "24823",
    nome: "FERNANDO SILVA FRAZAO",
    funcao: "ELETRICISTA",
    base: "PDS",
    gerencia: "GSTC",
    respostas: [
      "B",
      "A",
      "A",
      "B",
      "A",
      "B",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-03T11:32:36-03:00",
    prefixo: "Gstc",
    matricula: "22212",
    nome: "RAFAEL LEONARDO PEREIRA DE BRITO",
    funcao: "ELETRICISTA",
    base: "PDS",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-03T11:49:08-03:00",
    prefixo: "MA-PDS-M001M",
    matricula: "12888",
    nome: "HELIO LOURENCO SANTOS",
    funcao: "ELETRICISTA",
    base: "PDS",
    gerencia: "GSTC",
    respostas: [
      "B",
      "D",
      "A",
      "B",
      "A",
      "B",
      "C",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-09T10:09:43-03:00",
    prefixo: "MA-BMJ-E001M",
    matricula: "13038",
    nome: "ADILBERTO DE MORAES CAMELO",
    funcao: "ELETRICISTA MONTADOR",
    base: "STI",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "B",
      "B",
      "B",
      "B",
      "C",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-09T13:47:16-03:00",
    prefixo: "Ma PDT f006",
    matricula: "22477",
    nome: "JOSE WILES ROQUE MARTINS",
    funcao: "ELETRICISTA",
    base: "PDT",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "B",
      "A",
      "A",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-09T16:56:57-03:00",
    prefixo: "MA-PDS-E002M",
    matricula: "12821",
    nome: "JOSE ROBERTO DA SILVA OLIVEIRA",
    funcao: "ELETRICISTA MONTADOR",
    base: "PDS",
    gerencia: "GSTC",
    respostas: [
      "B",
      "A",
      "A",
      "B",
      "A",
      "B",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-15T10:43:44-03:00",
    prefixo: "MA PDT F 04",
    matricula: "24820",
    nome: "PAULO JEOVAH FRANCA MOREIRA",
    funcao: "ELETRICISTA",
    base: "PDT",
    gerencia: "GSTC",
    respostas: [
      "A",
      "B",
      "A",
      "A",
      "B",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-15T10:43:59-03:00",
    prefixo: "MA-PDT-F004M",
    matricula: "13768",
    nome: "DANIZAR DE PAIVA VALE",
    funcao: "ELETRICISTA",
    base: "PDT",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "B",
      "A",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-15T10:48:53-03:00",
    prefixo: "MA-CTD-E001M",
    matricula: "13282",
    nome: "LUIS ANTONIO DA SILVA MIRANDA",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "B",
      "A",
      "A",
      "B",
      "A",
      "D",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-15T10:50:12-03:00",
    prefixo: "MA PDT F04",
    matricula: "24820",
    nome: "PAULO JEOVAH FRANCA MOREIRA",
    funcao: "ELETRICISTA",
    base: "PDT",
    gerencia: "GSTC",
    respostas: [
      "B",
      "C",
      "A",
      "A",
      "A",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-15T10:52:31-03:00",
    prefixo: "MA-CTD-E001M",
    matricula: "12722",
    nome: "JOSE DE MARIA DA SILVA OLIVEIRA FILHO",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "B",
      "B",
      "A",
      "B",
      "B",
      "D",
      "B",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-22T10:30:18-03:00",
    prefixo: "MA-VGD-E001M",
    matricula: "23100",
    nome: "MOYSIELL MARTINS DE SOUSA",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "B",
      "A",
      "A",
      "B",
      "A",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-22T10:30:20-03:00",
    prefixo: "MA-ITM-C002M",
    matricula: "23073",
    nome: "JOAO BATISTA MORAES CORREA",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "A",
      "A",
      "A",
      "B",
      "A",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-22T10:30:20-03:00",
    prefixo: "MA-ITM-C002M",
    matricula: "25044",
    nome: "DEUSONETO DA SILVA JUNIOR",
    funcao: "",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "A",
      "A",
      "A",
      "B",
      "A",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-22T10:50:02-03:00",
    prefixo: "MA-VGD-E001M",
    matricula: "12729",
    nome: "ALTELINO DUTRA DA SILVA",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "A",
      "A",
      "A",
      "B",
      "A",
      "B",
      "A",
      "C",
      "B",
      "C"
    ]
  },
  {
    criadoEm: "2026-10-28T10:49:31-03:00",
    prefixo: "MA-ANJ-E001M",
    matricula: "12787",
    nome: "NICODEMOS VIANA DOS SANTOS",
    funcao: "ELETRICISTA",
    base: "ITM",
    gerencia: "GSTC",
    respostas: [
      "B",
      "A",
      "A",
      "B",
      "A",
      "D",
      "B",
      "C",
      "B",
      "C"
    ]
  }
];

// server/gabarito.ts
var GABARITO = ["B", "C", "A", "B", "A", "B", "A", "C", "B", "C"];

// src/shared/questoes.ts
var o = (...t) => t.map((texto, i) => ({ letra: "ABCD"[i], texto }));
var QUESTOES = [
  {
    id: 1,
    enunciado: "Marque a alternativa que corresponde a abertura do sistema em chave fusível na estrutura tipo T?",
    opcoes: o("Primeiro a mais distante da chave do meio, segundo a chave do meio, terceiro a mais próxima da estrutura.", "Primeira a mais próxima da chave do meio, segundo a mais distante da chave do meio, terceiro a chave do meio.", "Primeiro a mais distante da estrutura, segundo a mais próxima da chave do meio, e terceiro a mais próxima da chave do meio.", "Terceiro a mais próxima da estrutura, segundo a mais distante da chave do meio e primeira a mais distante da estrutura.")
  },
  {
    id: 2,
    enunciado: "Qual a sequência correta para abertura do sistema em chave fusível na estrutura tipo beco?",
    opcoes: o("Primeiro a mais próxima da estrutura, segundo a mais distante do meio da estrutura, e terceiro a mais distante da estrutura.", "Primeiro a mais distante da estrutura, segundo a mais próxima do meio da estrutura, e terceiro a mais distante do meio da estrutura.", "Primeiro a do meio da estrutura, segundo a mais distante da estrutura, terceiro a mais próxima da estrutura.", "Mais distante da estrutura do meio, a mais próxima da estrutura e a mais distante.")
  },
  {
    id: 3,
    enunciado: "Qual o papel do Guardião da Vida?",
    opcoes: o("Atuar de forma efetiva no gerenciamento dos desvios comportamentais de forma a corrigir, disciplinar e orientar os membros da equipe e/ou parceiro de trabalho quando constatar tal.", "Todas as atividades de risco acentuado deverão ter a presença do Guardião da Vida situação.", "Somente supervisionar a atividade.", "Ficar no Tablet preenchendo formulário e dar baixa de serviço.")
  },
  {
    id: 4,
    enunciado: "Descreva o significado APR – ANÁLISE PRELIMINAR DE RISCO",
    opcoes: o("Avaliação da atividade percebendo os riscos existentes.", "Identificação, análise, avaliação e controle dos riscos existentes.", "Marcação dos riscos existentes e controle.", "Conferir apenas o local de trabalho.")
  },
  {
    id: 5,
    enunciado: "Descreva o passo a passo para o Trabalho em Altura",
    opcoes: o("Montagem do KIT, amarração do solo, cinto de segurança, talabarte, linha de vida e trava queda.", "Amarrar escada centro e topo, linha de vida, cinto de segurança e trava queda.", "Utilizar cinto de segurança, talabarte, linha de vida e amarração da escada.", "Posicionar somente a escada para escalada.")
  },
  {
    id: 6,
    enunciado: "Desligamento programado para realizar substituição de uma estrutura. Quantos aterramentos temporários são necessários nesta atividade.",
    opcoes: o("2", "3", "1", "4")
  },
  {
    id: 7,
    enunciado: "Desligamento programado para realizar substituição de uma estrutura. Quantos aterramentos temporários são necessários nesta atividade.",
    opcoes: o("4", "3", "2", "1")
  },
  {
    id: 8,
    enunciado: "Durante uma atividade em rede energizada, qual EPI é indispensável para proteção contra arco elétrico e contato acidental?",
    opcoes: o("Óculos de sol.", "Capacete sem jugular.", "Protetor facial e mangas isolantes adequadas à atividade.", "Luvas de vaqueta apenas.")
  },
  {
    id: 9,
    enunciado: "Qual é a principal finalidade do aterramento temporário em uma atividade de manutenção em rede elétrica?",
    opcoes: o("Melhorar a comunicação entre os membros da equipe.", "Proteger os trabalhadores contra energização acidental e tensões induzidas.", "Facilitar o transporte de ferramentas.", "Delimitar a área de trabalho.")
  },
  {
    id: 10,
    enunciado: "Ao identificar uma condição insegura durante a execução de uma atividade, qual deve ser a atitude correta do colaborador?",
    opcoes: o("Continuar a atividade para não atrasar o serviço.", "Corrigir a situação somente após finalizar a tarefa.", "Interromper a atividade, comunicar a equipe e adotar as medidas de controle necessárias.", "Registrar a condição insegura apenas ao final do expediente.")
  }
];

// src/shared/constantes.ts
var DURACAO_SEG = 20 * 60;
var TOLERANCIA_FOTO_SEG = 10 * 60;
var NOTA_MINIMA = 7;
var notaMinima = (total) => Math.ceil(total * 0.7);
var QUESTOES_ORIGINAIS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
var HORAS_POR_PARTICIPACAO = 3;
var BASES = ["BCB", "BDC", "ITM", "PDS", "PDT", "STI"];
var GERENCIAS = ["GERE", "GOMAN", "GSTC", "ADM", "ALMOXARIFE", "FROTA", "SESMT", "PERDAS", "QSMS", "SPOT"];

// server/db.ts
var url = process.env.SUPABASE_DB_URL ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url)
  throw new Error("DATABASE_URL não configurada (veja o README).");
var pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 3 });
function consulta(strings, values) {
  const text = strings.reduce((t, s, i) => t + s + (i < values.length ? "$" + (i + 1) : ""), "");
  return {
    text,
    values,
    then: (ok, erro) => pool.query(text, values).then((r) => r.rows, undefined).then(ok, erro)
  };
}
var sql = Object.assign((strings, ...values) => consulta(strings, values), {
  async transaction(consultas) {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const out = [];
      for (const q of consultas)
        out.push((await c.query(q.text, q.values)).rows);
      await c.query("COMMIT");
      return out;
    } catch (e) {
      await c.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  }
});
var pronto = null;
function iniciarBanco() {
  return pronto ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS escola_tentativas (
        id            TEXT PRIMARY KEY,
        iniciada_em   TEXT NOT NULL,
        finalizada_em TEXT,
        nome          TEXT NOT NULL,
        matricula     TEXT,
        prefixo       TEXT,
        funcao        TEXT,
        base          TEXT,
        gerencia      TEXT,
        respostas     TEXT,
        duracao_seg   INTEGER,
        tem_foto      BOOLEAN NOT NULL DEFAULT FALSE,
        local         TEXT,
        lat           DOUBLE PRECISION,
        lng           DOUBLE PRECISION,
        carimbo       TEXT,
        origem        TEXT NOT NULL DEFAULT 'app'
      )`;
    await sql`CREATE TABLE IF NOT EXISTS escola_fotos (id TEXT PRIMARY KEY, dados TEXT NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS escola_falhas_login (ip TEXT PRIMARY KEY, n INTEGER NOT NULL, ate BIGINT NOT NULL)`;
    await sql`
      CREATE TABLE IF NOT EXISTS escola_colaboradores (
        id        SERIAL PRIMARY KEY,
        nome      TEXT NOT NULL,
        nome_norm TEXT NOT NULL UNIQUE,
        matricula TEXT,
        prefixo   TEXT,
        funcao    TEXT,
        base      TEXT,
        gerencia  TEXT,
        situacao  TEXT
      )`;
    await sql`ALTER TABLE escola_colaboradores ADD COLUMN IF NOT EXISTS situacao TEXT`;
    await sql`ALTER TABLE escola_colaboradores ADD COLUMN IF NOT EXISTS gerente TEXT`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS escola_colaboradores_matricula_uq ON escola_colaboradores (matricula)`;
    await sql`
      CREATE TABLE IF NOT EXISTS escola_usuarios (
        id           SERIAL PRIMARY KEY,
        usuario      TEXT NOT NULL,
        usuario_norm TEXT NOT NULL UNIQUE,
        senha_hash   TEXT NOT NULL,
        nome         TEXT,
        chapa        TEXT,
        funcao       TEXT,
        base         TEXT,
        gerencia     TEXT,
        processo     TEXT,
        ativo        BOOLEAN NOT NULL DEFAULT TRUE
      )`;
    await sql`ALTER TABLE escola_usuarios ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE escola_usuarios ADD COLUMN IF NOT EXISTS admin BOOLEAN NOT NULL DEFAULT FALSE`;
    await sql`ALTER TABLE escola_usuarios ADD COLUMN IF NOT EXISTS trocar_senha BOOLEAN NOT NULL DEFAULT FALSE`;
    await sql`ALTER TABLE escola_usuarios ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMPTZ`;
    await sql`
      CREATE TABLE IF NOT EXISTS escola_questoes (
        id        SERIAL PRIMARY KEY,
        ordem     INTEGER NOT NULL,
        enunciado TEXT NOT NULL,
        opcoes    TEXT NOT NULL,
        correta   TEXT NOT NULL,
        ativa     BOOLEAN NOT NULL DEFAULT TRUE
      )`;
    await sql`ALTER TABLE escola_questoes ENABLE ROW LEVEL SECURITY`;
    await sql`ALTER TABLE escola_tentativas ADD COLUMN IF NOT EXISTS questoes TEXT`;
    await sql`ALTER TABLE escola_tentativas ADD COLUMN IF NOT EXISTS acertos TEXT`;
    const [{ nq }] = await sql`SELECT COUNT(*)::int AS nq FROM escola_questoes`;
    if (nq === 0) {
      await sql.transaction([
        ...QUESTOES.map((q, i) => sql`
            INSERT INTO escola_questoes (id, ordem, enunciado, opcoes, correta, ativa)
            VALUES (${q.id}, ${i + 1}, ${q.enunciado}, ${JSON.stringify(q.opcoes.map((o) => o.texto))}, ${GABARITO[i]}, TRUE)
            ON CONFLICT (id) DO NOTHING`),
        sql`SELECT setval(pg_get_serial_sequence('escola_questoes', 'id'), (SELECT MAX(id) FROM escola_questoes))`
      ]);
    }
    const antigas = await sql`SELECT id, respostas FROM escola_tentativas WHERE finalizada_em IS NOT NULL AND acertos IS NULL`;
    if (antigas.length) {
      await sql.transaction(antigas.map((t) => {
        const resp = JSON.parse(t.respostas ?? "[]");
        const acertos = GABARITO.map((g, i) => resp[i] === g);
        return sql`UPDATE escola_tentativas SET questoes = ${JSON.stringify(QUESTOES_ORIGINAIS)}, acertos = ${JSON.stringify(acertos)} WHERE id = ${t.id}`;
      }));
    }
    await sql`CREATE TABLE IF NOT EXISTS escola_meta (chave TEXT PRIMARY KEY, valor TEXT NOT NULL)`;
    await sql`ALTER TABLE escola_meta ENABLE ROW LEVEL SECURITY`;
    const [semente] = await sql`SELECT valor FROM escola_meta WHERE chave = 'carga_forms'`;
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM escola_tentativas WHERE origem = 'importado'`;
    if (!semente)
      await sql`INSERT INTO escola_meta (chave, valor) VALUES ('carga_forms', '1') ON CONFLICT (chave) DO NOTHING`;
    if (n === 0 && !semente) {
      await sql.transaction(seed_default.map((r, i) => sql`
            INSERT INTO escola_tentativas (id, iniciada_em, finalizada_em, nome, matricula, prefixo, funcao, base, gerencia, respostas, origem)
            VALUES (${`seed-${i + 1}`}, ${r.criadoEm}, ${r.criadoEm}, ${r.nome}, ${r.matricula}, ${r.prefixo}, ${r.funcao}, ${r.base}, ${r.gerencia}, ${JSON.stringify(r.respostas)}, 'importado')
            ON CONFLICT (id) DO NOTHING`));
    }
  })().catch((e) => {
    pronto = null;
    throw e;
  });
}

// server/questoes.ts
var LETRAS = ["A", "B", "C", "D"];
var MAX_OPCOES = LETRAS.length;
var json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
var erro = (msg, status = 400) => json({ erro: msg }, status);
var limpa = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
var doBanco = (r) => ({ id: r.id, ordem: r.ordem, enunciado: r.enunciado, opcoes: JSON.parse(r.opcoes), correta: r.correta, ativa: r.ativa });
async function listarQuestoes() {
  return (await sql`SELECT * FROM escola_questoes ORDER BY ordem, id`).map(doBanco);
}
var questoesAtivas = async () => (await listarQuestoes()).filter((q) => q.ativa);
async function usosPorQuestao() {
  const rs = await sql`
    SELECT q.id::int AS id, COUNT(*)::int AS n
    FROM escola_tentativas t, jsonb_array_elements_text(t.questoes::jsonb) AS q(id)
    WHERE t.finalizada_em IS NOT NULL AND t.questoes IS NOT NULL
    GROUP BY 1`;
  return new Map(rs.map((r) => [r.id, r.n]));
}
function validar(b) {
  const enunciado = limpa(b?.enunciado, 600);
  if (enunciado.length < 5)
    return "Escreva o enunciado da questão.";
  const todas = Array.isArray(b?.opcoes) ? b.opcoes.slice(0, MAX_OPCOES).map((o) => limpa(o, 400)) : [];
  while (todas.length && !todas[todas.length - 1])
    todas.pop();
  if (todas.length < 2)
    return "Informe pelo menos duas alternativas.";
  if (todas.some((o) => !o))
    return "Preencha todas as alternativas ou remova as vazias do final.";
  const correta = String(b?.correta ?? "").toUpperCase();
  if (!LETRAS.slice(0, todas.length).includes(correta))
    return "Marque qual alternativa é a correta.";
  return { enunciado, opcoes: todas, correta, ativa: b?.ativa !== false };
}
async function reaplicarGabarito(id, correta) {
  const rs = await sql`
    SELECT id, respostas, questoes, acertos FROM escola_tentativas
    WHERE finalizada_em IS NOT NULL AND questoes IS NOT NULL AND acertos IS NOT NULL AND questoes::jsonb @> ${JSON.stringify([id])}::jsonb`;
  const ops = rs.flatMap((t) => {
    const ids = JSON.parse(t.questoes);
    const pos = ids.indexOf(id);
    if (pos < 0)
      return [];
    const respostas = JSON.parse(t.respostas ?? "[]");
    const acertos = JSON.parse(t.acertos);
    acertos[pos] = respostas[pos] === correta;
    return [sql`UPDATE escola_tentativas SET acertos = ${JSON.stringify(acertos)} WHERE id = ${t.id}`];
  });
  if (ops.length)
    await sql.transaction(ops);
  return ops.length;
}
async function rotasQuestoes(req, rota) {
  if (rota === "/api/admin/questoes" && req.method === "GET") {
    const usos = await usosPorQuestao();
    const questoes = (await listarQuestoes()).map((q) => ({ ...q, usos: usos.get(q.id) ?? 0 }));
    return json({ questoes });
  }
  if (rota === "/api/admin/questoes" && req.method === "POST") {
    const v = validar(await req.json().catch(() => null));
    if (typeof v === "string")
      return erro(v);
    const [{ prox }] = await sql`SELECT COALESCE(MAX(ordem), 0)::int + 1 AS prox FROM escola_questoes`;
    const [nova] = await sql`
      INSERT INTO escola_questoes (ordem, enunciado, opcoes, correta, ativa)
      VALUES (${prox}, ${v.enunciado}, ${JSON.stringify(v.opcoes)}, ${v.correta}, ${v.ativa}) RETURNING id`;
    return json({ ok: true, id: nova.id });
  }
  const m = /^\/api\/admin\/questoes\/(\d+)(\/mover)?$/.exec(rota);
  if (!m)
    return null;
  const id = Number(m[1]);
  const [atual] = await sql`SELECT * FROM escola_questoes WHERE id = ${id}`;
  if (!atual)
    return erro("Questão não encontrada.", 404);
  if (m[2] && req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    const todas = await listarQuestoes();
    const i = todas.findIndex((q) => q.id === id);
    const j = b?.direcao === "cima" ? i - 1 : b?.direcao === "baixo" ? i + 1 : -1;
    if (j < 0 || j >= todas.length)
      return json({ ok: true });
    const nova = [...todas];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    await sql.transaction(nova.map((q, k) => sql`UPDATE escola_questoes SET ordem = ${k + 1} WHERE id = ${q.id}`));
    return json({ ok: true });
  }
  if (req.method === "PUT") {
    const b = await req.json().catch(() => null);
    const v = validar(b);
    if (typeof v === "string")
      return erro(v);
    if (!v.ativa && atual.ativa) {
      const [{ outras }] = await sql`SELECT COUNT(*)::int AS outras FROM escola_questoes WHERE ativa AND id <> ${id}`;
      if (!outras)
        return erro("Mantenha pelo menos uma questão ativa.");
    }
    await sql`UPDATE escola_questoes SET enunciado = ${v.enunciado}, opcoes = ${JSON.stringify(v.opcoes)}, correta = ${v.correta}, ativa = ${v.ativa} WHERE id = ${id}`;
    const reaplicadas = b?.reaplicar === true ? await reaplicarGabarito(id, v.correta) : 0;
    return json({ ok: true, reaplicadas });
  }
  return null;
}

// server/auth.ts
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
var SESSAO_S = 12 * 60 * 60;
function config() {
  const usuario = process.env.ADMIN_USER;
  const senha = process.env.ADMIN_PASS;
  if (!usuario || !senha)
    throw new Error("ADMIN_USER e ADMIN_PASS precisam estar configuradas.");
  return { usuario, senha, segredo: process.env.SESSION_SECRET ?? `escola:${senha}` };
}
var ehDesenvolvedor = (usuario) => !!process.env.ADMIN_USER && usuario.trim().toLowerCase() === process.env.ADMIN_USER.toLowerCase();
function igual(a, b) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function hashSenha(senha) {
  const sal = randomBytes(16).toString("hex");
  return ["scrypt", sal, scryptSync(senha, sal, 32).toString("hex")].join("$");
}
function confere(senha, guardado) {
  const [, sal, hash] = (guardado ?? "scrypt$00$00").split("$");
  const calc = scryptSync(senha, sal ?? "", 32).toString("hex");
  return !!guardado && igual(calc, hash ?? "");
}
var assinar = (corpo, segredo) => createHmac("sha256", segredo).update(corpo).digest("hex");
var b64 = (s) => Buffer.from(s).toString("base64url");
function emitir(chave, segredo, agora) {
  const corpo = `${b64(chave)}.${Math.floor(agora / 1000) + SESSAO_S}`;
  return `${corpo}.${assinar(corpo, segredo)}`;
}
async function tentarLogin(ip, usuario, senha) {
  const c = config();
  const agora = Date.now();
  const [f] = await sql`SELECT n, ate FROM escola_falhas_login WHERE ip = ${ip}`;
  const ativa = f && Number(f.ate) > agora;
  if (ativa && f.n >= 5)
    return { erro: "Muitas tentativas. Aguarde alguns minutos." };
  const chave = usuario.trim().toLowerCase();
  const [u] = await sql`SELECT senha_hash FROM escola_usuarios WHERE usuario_norm = ${chave} AND ativo`;
  const valido = confere(senha, u?.senha_hash) || ehDesenvolvedor(usuario) && igual(senha, c.senha);
  if (!valido) {
    const n = (ativa ? f.n : 0) + 1;
    await sql`INSERT INTO escola_falhas_login (ip, n, ate) VALUES (${ip}, ${n}, ${agora + 5 * 60 * 1000})
              ON CONFLICT (ip) DO UPDATE SET n = ${n}, ate = ${agora + 5 * 60 * 1000}`;
    return { erro: "Usuário ou senha inválidos." };
  }
  await sql`DELETE FROM escola_falhas_login WHERE ip = ${ip}`;
  await sql`UPDATE escola_usuarios SET ultimo_acesso = now() WHERE usuario_norm = ${chave}`;
  return { token: emitir(chave, c.segredo, agora) };
}
async function sessaoDe(req) {
  const t = /(?:^|;\s*)sessao=([\w-]+\.\d+\.[a-f0-9]+)/.exec(req.headers.get("cookie") ?? "")?.[1];
  if (!t)
    return null;
  const [chaveB64, exp, mac] = t.split(".");
  if (!(Number(exp) > Date.now() / 1000) || !igual(mac, assinar(`${chaveB64}.${exp}`, config().segredo)))
    return null;
  const chave = Buffer.from(chaveB64, "base64url").toString();
  const [u] = await sql`SELECT usuario, nome, admin, ativo, trocar_senha FROM escola_usuarios WHERE usuario_norm = ${chave}`;
  if (ehDesenvolvedor(chave))
    return { usuario: u?.usuario ?? chave, nome: u?.nome || "Desenvolvedor", admin: true, desenvolvedor: true, trocarSenha: false };
  if (!u || !u.ativo)
    return null;
  return { usuario: u.usuario, nome: u.nome || u.usuario, admin: u.admin, desenvolvedor: false, trocarSenha: u.trocar_senha };
}
function erroSenhaNova(nova, atual, usuario) {
  if (nova.length < 8)
    return "A nova senha precisa ter pelo menos 8 caracteres.";
  if (nova.length > 100)
    return "A nova senha é longa demais.";
  if (!/[A-Za-z]/.test(nova) || !/\d/.test(nova))
    return "Use letras e números na nova senha.";
  if (nova === atual)
    return "A nova senha precisa ser diferente da atual.";
  if (nova.toLowerCase().replace("@", "") === usuario.toLowerCase().replace("@", ""))
    return "A senha não pode ser igual ao usuário.";
  return null;
}
async function alterarSenha(ip, usuario, atual, nova) {
  if (ehDesenvolvedor(usuario))
    return "A senha da conta do desenvolvedor é definida nas variáveis de ambiente.";
  const chaveIp = `senha|${ip}`;
  const agora = Date.now();
  const [f] = await sql`SELECT n, ate FROM escola_falhas_login WHERE ip = ${chaveIp}`;
  const ativa = f && Number(f.ate) > agora;
  if (ativa && f.n >= 5)
    return "Muitas tentativas. Aguarde alguns minutos.";
  const chave = usuario.trim().toLowerCase();
  const [u] = await sql`SELECT senha_hash FROM escola_usuarios WHERE usuario_norm = ${chave} AND ativo`;
  if (!u || !confere(atual, u.senha_hash)) {
    const n = (ativa ? f.n : 0) + 1;
    await sql`INSERT INTO escola_falhas_login (ip, n, ate) VALUES (${chaveIp}, ${n}, ${agora + 5 * 60 * 1000})
              ON CONFLICT (ip) DO UPDATE SET n = ${n}, ate = ${agora + 5 * 60 * 1000}`;
    return "A senha atual está incorreta.";
  }
  const erro = erroSenhaNova(nova, atual, usuario);
  if (erro)
    return erro;
  await sql`UPDATE escola_usuarios SET senha_hash = ${hashSenha(nova)}, trocar_senha = FALSE WHERE usuario_norm = ${chave}`;
  await sql`DELETE FROM escola_falhas_login WHERE ip = ${chaveIp}`;
  return null;
}
var seguro = (req) => new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
var cookieSessao = (token, req) => `sessao=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSAO_S}${seguro(req) ? "; Secure" : ""}`;
var cookieLimpo = "sessao=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0";

// server/usuarios.ts
var json2 = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
var erro2 = (msg, status = 400) => json2({ erro: msg }, status);
var limpa2 = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
async function listar() {
  const rs = await sql`SELECT id, usuario, nome, chapa, funcao, base, gerencia, processo, admin, ativo, trocar_senha, ultimo_acesso FROM escola_usuarios ORDER BY nome, usuario`;
  return rs.map(({ trocar_senha, ultimo_acesso, ...u }) => ({
    ...u,
    trocarSenha: !!trocar_senha,
    ultimoAcesso: ultimo_acesso ? new Date(ultimo_acesso).toISOString() : null,
    desenvolvedor: ehDesenvolvedor(u.usuario)
  }));
}
var nomeAcesso = (v) => {
  const s = limpa2(v, 40).replace(/\s/g, "");
  return s ? s.startsWith("@") ? s : `@${s}` : "";
};
function campos(b, parcial) {
  const ok = {};
  const tem = (k) => b && b[k] !== undefined;
  if (!parcial || tem("usuario")) {
    const u = nomeAcesso(b?.usuario);
    if (u.length < 4)
      return { erro: "Informe o usuário de acesso (mínimo de 3 caracteres)." };
    ok.usuario = u;
  }
  if (!parcial || tem("nome")) {
    const n = limpa2(b?.nome, 100).toUpperCase();
    if (n.split(" ").length < 2)
      return { erro: "Informe o nome completo." };
    ok.nome = n;
  }
  for (const [k, max] of [["chapa", 20], ["funcao", 80], ["processo", 60]]) {
    if (!parcial || tem(k))
      ok[k] = limpa2(b?.[k], max).toUpperCase();
  }
  if (!parcial || tem("base")) {
    const v = limpa2(b?.base, 10).toUpperCase();
    if (v && !BASES.includes(v))
      return { erro: "Base inválida." };
    ok.base = v;
  }
  if (!parcial || tem("gerencia")) {
    const v = limpa2(b?.gerencia, 12).toUpperCase();
    if (v && !GERENCIAS.includes(v))
      return { erro: "Gerência inválida." };
    ok.gerencia = v;
  }
  if (tem("admin"))
    ok.admin = b.admin === true;
  if (tem("ativo"))
    ok.ativo = b.ativo === true;
  return { ok };
}
function senhaValida(s) {
  const v = String(s ?? "");
  if (v.length < 4)
    return "A senha precisa ter pelo menos 4 caracteres.";
  if (v.length > 100)
    return "A senha é longa demais.";
  return null;
}
async function outrosAdmins(idExcluido) {
  const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM escola_usuarios WHERE admin AND ativo AND id <> ${idExcluido}`;
  return n;
}
async function rotasUsuarios(req, rota, eu) {
  if (rota === "/api/admin/usuarios" && req.method === "GET")
    return json2({ usuarios: await listar() });
  if (rota === "/api/admin/usuarios" && req.method === "POST") {
    const b = await req.json().catch(() => null);
    const c = campos(b, false);
    if ("erro" in c)
      return erro2(c.erro);
    const e = senhaValida(b?.senha);
    if (e)
      return erro2(e);
    const u = c.ok;
    const [dup] = await sql`SELECT 1 FROM escola_usuarios WHERE usuario_norm = ${u.usuario.toLowerCase()}`;
    if (dup || ehDesenvolvedor(u.usuario))
      return erro2("Já existe um usuário com este nome de acesso.", 409);
    const [novo] = await sql`
      INSERT INTO escola_usuarios (usuario, usuario_norm, senha_hash, nome, chapa, funcao, base, gerencia, processo, admin, ativo, trocar_senha)
      VALUES (${u.usuario}, ${u.usuario.toLowerCase()}, ${hashSenha(String(b.senha))}, ${u.nome}, ${u.chapa}, ${u.funcao}, ${u.base}, ${u.gerencia}, ${u.processo}, ${u.admin === true}, ${u.ativo !== false}, TRUE)
      RETURNING id`;
    return json2({ ok: true, id: novo.id });
  }
  const m = /^\/api\/admin\/usuarios\/(\d+)$/.exec(rota);
  if (!m)
    return null;
  const id = Number(m[1]);
  const [atual] = await sql`SELECT * FROM escola_usuarios WHERE id = ${id}`;
  if (!atual)
    return erro2("Usuário não encontrado.", 404);
  const proprio = atual.usuario_norm === eu.usuario.toLowerCase();
  const dev = ehDesenvolvedor(atual.usuario);
  if (req.method === "DELETE") {
    if (proprio)
      return erro2("Você não pode excluir o seu próprio acesso.");
    if (dev)
      return erro2("Esta é a conta do desenvolvedor e não pode ser excluída.");
    if (atual.admin && atual.ativo && !await outrosAdmins(id))
      return erro2("Mantenha pelo menos um administrador ativo.");
    await sql`DELETE FROM escola_usuarios WHERE id = ${id}`;
    return json2({ ok: true });
  }
  if (req.method === "PUT") {
    const b = await req.json().catch(() => null);
    const c = campos(b, true);
    if ("erro" in c)
      return erro2(c.erro);
    const novo = { ...atual, ...c.ok };
    if ("usuario" in c.ok) {
      if (proprio && novo.usuario.toLowerCase() !== atual.usuario_norm)
        return erro2("Você não pode alterar o seu próprio usuário de acesso.");
      if (dev && novo.usuario.toLowerCase() !== atual.usuario_norm)
        return erro2("O usuário do desenvolvedor não pode ser alterado.");
      const [dup] = await sql`SELECT 1 FROM escola_usuarios WHERE usuario_norm = ${novo.usuario.toLowerCase()} AND id <> ${id}`;
      if (dup || !dev && ehDesenvolvedor(novo.usuario))
        return erro2("Já existe um usuário com este nome de acesso.", 409);
    }
    const perdeAdmin = atual.admin && atual.ativo && (!novo.admin || !novo.ativo);
    if (perdeAdmin) {
      if (proprio)
        return erro2("Você não pode remover o seu próprio acesso de administrador nem desativar a sua conta.");
      if (dev)
        return erro2("A conta do desenvolvedor é sempre administradora e ativa.");
      if (!await outrosAdmins(id))
        return erro2("Mantenha pelo menos um administrador ativo.");
    }
    let hash = null;
    if (b?.senha !== undefined && String(b.senha) !== "") {
      const e = senhaValida(b.senha);
      if (e)
        return erro2(e);
      hash = hashSenha(String(b.senha));
    }
    await sql`
      UPDATE escola_usuarios SET usuario = ${novo.usuario}, usuario_norm = ${novo.usuario.toLowerCase()}, nome = ${novo.nome}, chapa = ${novo.chapa},
        funcao = ${novo.funcao}, base = ${novo.base}, gerencia = ${novo.gerencia}, processo = ${novo.processo}, admin = ${novo.admin}, ativo = ${novo.ativo},
        senha_hash = COALESCE(${hash}, senha_hash),
        trocar_senha = (trocar_senha OR (${hash}::text IS NOT NULL AND NOT ${proprio}::boolean))
      WHERE id = ${id}`;
    return json2({ ok: true });
  }
  return null;
}

// src/shared/texto.ts
var chaveNome = (n) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

// src/shared/coordenadores.ts
var REGRAS_COORDENADORES = [
  { gerencia: "GOMAN", bases: ["BCB", "STI", "ITM"], gerente: "LUIS C." },
  { gerencia: "GOMAN", bases: ["PDS"], gerente: "THIAGO F." },
  { gerencia: "GOMAN", bases: ["PDT"], gerente: "RAFAELA" },
  { gerencia: "GOMAN", bases: ["BDC"], gerente: "JACKSON" },
  { gerencia: "GERE", gerente: "ANTONIO M." },
  { gerencia: "GSTC", bases: ["BCB", "ITM", "STI"], gerente: "AFONSO" },
  { gerencia: "GSTC", bases: ["PDS", "PDT", "BDC"], gerente: "PAULO" },
  { gerencia: "ADM", gerente: "PRYSCILLA" },
  { gerencia: "ALMOXARIFE", gerente: "CAMILA" },
  { gerencia: "FROTA", gerente: "RUAN" },
  { gerencia: "SESMT", gerente: "DANIEL" }
];
var COORDENADORES = [...new Set(REGRAS_COORDENADORES.map((r) => r.gerente))];
function gerenteDe(gerencia, base) {
  const r = REGRAS_COORDENADORES.find((x) => x.gerencia === gerencia && (!x.bases || x.bases.includes(base)));
  return r?.gerente ?? "";
}

// server/registros.ts
async function registros() {
  const linhas = await sql`SELECT * FROM escola_tentativas WHERE finalizada_em IS NOT NULL ORDER BY finalizada_em`;
  const cadastro = new Map((await sql`SELECT nome_norm, gerente, situacao FROM escola_colaboradores`).map((c) => [c.nome_norm, { gerente: c.gerente ?? "", situacao: c.situacao || "ATIVO" }]));
  return linhas.map((l) => {
    const respostas = JSON.parse(l.respostas ?? "[]");
    const questoes = l.questoes ? JSON.parse(l.questoes) : QUESTOES_ORIGINAIS;
    const acertos = l.acertos ? JSON.parse(l.acertos) : GABARITO.map((g, i) => respostas[i] === g);
    const pontos = acertos.filter(Boolean).length;
    const total = acertos.length || 1;
    return {
      id: l.id,
      data: l.finalizada_em,
      nome: l.nome,
      matricula: l.matricula,
      prefixo: l.prefixo,
      funcao: l.funcao,
      base: l.base,
      gerencia: l.gerencia,
      questoes,
      respostas,
      acertos,
      nota: total === 10 ? pontos : Math.round(pontos / total * 1000) / 100,
      aprovado: pontos >= notaMinima(total),
      horas: HORAS_POR_PARTICIPACAO,
      coordenador: cadastro.get(chaveNome(l.nome))?.gerente || gerenteDe(l.gerencia, l.base),
      situacao: cadastro.get(chaveNome(l.nome))?.situacao ?? "SEM CADASTRO",
      temFoto: l.tem_foto,
      local: l.local
    };
  });
}

// server/respostas.ts
var json3 = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
var erro3 = (msg, status = 400) => json3({ erro: msg }, status);
var limpa3 = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
var LETRAS2 = ["A", "B", "C", "D"];
async function rotasRespostas(req, rota) {
  if (rota === "/api/admin/respostas" && req.method === "GET") {
    const extras = new Map((await sql`SELECT id, origem, iniciada_em, duracao_seg FROM escola_tentativas WHERE finalizada_em IS NOT NULL`).map((t) => [t.id, t]));
    const lista = (await registros()).map((r) => ({ ...r, origem: extras.get(r.id)?.origem ?? "app", iniciadaEm: extras.get(r.id)?.iniciada_em ?? null, duracaoSeg: extras.get(r.id)?.duracao_seg ?? null })).sort((a, b) => Date.parse(b.data) - Date.parse(a.data));
    const questoes = (await listarQuestoes()).map((q, i) => ({ id: q.id, numero: i + 1, enunciado: q.enunciado, opcoes: q.opcoes, correta: q.correta, ativa: q.ativa }));
    return json3({ registros: lista, questoes });
  }
  if (rota === "/api/admin/respostas/excluir" && req.method === "POST") {
    const b = await req.json().catch(() => null);
    const ids = Array.isArray(b?.ids) ? b.ids.map((x) => String(x)).slice(0, 500) : [];
    if (!ids.length)
      return erro3("Nenhum registro selecionado.");
    await sql.transaction([
      sql`DELETE FROM escola_fotos WHERE id = ANY(${ids}::text[])`,
      sql`DELETE FROM escola_tentativas WHERE id = ANY(${ids}::text[]) AND finalizada_em IS NOT NULL`
    ]);
    return json3({ ok: true, excluidos: ids.length });
  }
  const m = /^\/api\/admin\/respostas\/([\w-]+)$/.exec(rota);
  if (!m)
    return null;
  const id = m[1];
  const [t] = await sql`SELECT * FROM escola_tentativas WHERE id = ${id} AND finalizada_em IS NOT NULL`;
  if (!t)
    return erro3("Registro não encontrado.", 404);
  if (req.method === "DELETE") {
    await sql.transaction([sql`DELETE FROM escola_fotos WHERE id = ${id}`, sql`DELETE FROM escola_tentativas WHERE id = ${id}`]);
    return json3({ ok: true });
  }
  if (req.method === "PUT") {
    const b = await req.json().catch(() => null);
    if (!b)
      return erro3("Requisição inválida.");
    const nome = limpa3(b.nome, 100).toUpperCase();
    if (nome.split(" ").length < 2)
      return erro3("Informe o nome completo.");
    const base = limpa3(b.base, 10).toUpperCase();
    const gerencia = limpa3(b.gerencia, 12).toUpperCase();
    if (base && !BASES.includes(base))
      return erro3("Base inválida.");
    if (gerencia && !GERENCIAS.includes(gerencia))
      return erro3("Gerência inválida.");
    let data = null;
    if (b.data) {
      const ms = Date.parse(String(b.data));
      if (!Number.isFinite(ms))
        return erro3("Data inválida.");
      data = new Date(ms).toISOString();
    }
    const ids = t.questoes ? JSON.parse(t.questoes) : QUESTOES_ORIGINAIS;
    let respostas = t.respostas ?? "[]";
    let acertos = t.acertos;
    if (Array.isArray(b.respostas)) {
      if (b.respostas.length !== ids.length)
        return erro3("Número de respostas diferente do número de questões da avaliação.");
      const info = new Map((await sql`SELECT id, correta, opcoes FROM escola_questoes WHERE id = ANY(${ids}::int[])`).map((q) => [q.id, { correta: q.correta, n: JSON.parse(q.opcoes).length }]));
      const novas = [];
      for (let i = 0;i < ids.length; i++) {
        const r = b.respostas[i];
        if (r === null || r === "" || r === undefined)
          novas.push(null);
        else if (LETRAS2.includes(r) && LETRAS2.indexOf(r) < (info.get(ids[i])?.n ?? 0))
          novas.push(r);
        else
          return erro3(`Resposta inválida na questão ${i + 1}.`);
      }
      respostas = JSON.stringify(novas);
      acertos = JSON.stringify(ids.map((qid, i) => novas[i] === info.get(qid)?.correta));
    }
    await sql`
      UPDATE escola_tentativas SET nome = ${nome}, matricula = ${limpa3(b.matricula, 20)}, prefixo = ${limpa3(b.prefixo, 30).toUpperCase()},
        funcao = ${limpa3(b.funcao, 80).toUpperCase()}, base = ${base}, gerencia = ${gerencia},
        finalizada_em = COALESCE(${data}, finalizada_em), respostas = ${respostas}, questoes = ${JSON.stringify(ids)}, acertos = ${acertos}
      WHERE id = ${id}`;
    return json3({ ok: true });
  }
  return null;
}

// server/mapa.ts
var json4 = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function rotasMapa(req, rota) {
  if (rota !== "/api/admin/mapa-calor" || req.method !== "GET")
    return null;
  const participantes = new Map;
  for (const r of await registros()) {
    const k = chaveNome(r.nome);
    const p = participantes.get(k) ?? { nome: r.nome, base: r.base, gerencia: r.gerencia, coordenador: r.coordenador, situacao: r.situacao, ultima: "", participacoes: [], notificacoes: [] };
    p.participacoes.push(r.data);
    if (!p.ultima || Date.parse(r.data) >= Date.parse(p.ultima))
      Object.assign(p, { nome: r.nome, base: r.base, gerencia: r.gerencia, coordenador: r.coordenador, situacao: r.situacao, ultima: r.data });
    participantes.set(k, p);
  }
  let fonte = { notificacoes: 0, de: null, ate: null, disponivel: true };
  try {
    const notif = await sql`SELECT data::text AS data, base, gerencia, status, eletricistas FROM notificacoes WHERE data IS NOT NULL`;
    let de = null;
    let ate = null;
    for (const n of notif) {
      if (!de || n.data < de)
        de = n.data;
      if (!ate || n.data > ate)
        ate = n.data;
      for (const k of new Set((n.eletricistas ?? []).map((e) => chaveNome(String(e))))) {
        participantes.get(k)?.notificacoes.push({ data: n.data, base: n.base ?? "", gerencia: n.gerencia ?? "", status: n.status ?? "" });
      }
    }
    fonte = { notificacoes: notif.length, de, ate, disponivel: true };
  } catch (e) {
    if (e?.code !== "42P01")
      throw e;
    fonte = { notificacoes: 0, de: null, ate: null, disponivel: false };
  }
  const lista = [...participantes.values()].map(({ ultima: _, ...p }) => ({ ...p, participacoes: p.participacoes.sort(), notificacoes: p.notificacoes.sort((a, b) => a.data.localeCompare(b.data)) })).sort((a, b) => a.nome.localeCompare(b.nome));
  return json4({ participantes: lista, fonte });
}

// server/insights.ts
var json5 = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
var TEMAS = [
  { nome: "Comunicação", treinavel: false, re: /comunicac/ },
  { nome: "Veículos, transporte e içamento", treinavel: true, re: /transport|acondicion|guincho|guindauto|munck|veiculo|carga\b|pneu|motociclista|freio|icament|cruzeta/ },
  { nome: "Escadas e trabalho em altura", treinavel: true, re: /escada|altura|linha de vida|talabarte|cinto|spiq|trava ?quedas?|queda|antiqueda|daqc/ },
  { nome: "Sinalização e isolamento da área", treinavel: true, re: /sinaliz|isolad|isolamento|\bcone|delimit|bandeirol/ },
  { nome: "APR e procedimentos", treinavel: true, re: /\bapr\b|procedimento|permiss|analise preliminar|ordem de servico|check ?list|condicao insegura|emissao da os|seccionament|controle do coi|cumprir normas|instrucoes|improvis|coordenac/ },
  { nome: "Ferramentas e equipamentos", treinavel: true, re: /ferrament|vara de manobra|bastao|nr-?10|detector|motosserra|maquina/ },
  { nome: "Operação e manobras de rede", treinavel: true, re: /chave fusivel|abertura|desligament|religament|rede energizada|energizad|aterramento|manobra|estrutura/ },
  { nome: "Crachá e documentação", treinavel: false, re: /cracha|qr code|document|identificac|credenc/ },
  { nome: "Atenção e comportamento", treinavel: true, re: /desatent|comportament|atencao|guardiao|desvio|pressa|habilidade/ },
  { nome: "Instalações e alojamento", treinavel: false, re: /alojament|arejad|higiene|lazer|banheiro|vestiario|refeitor|limpeza|conservac|agua potavel|chuveiro|papel higienico|lavatorio|glp|piso|iluminac|alimentac|sabonete|devassamento/ },
  { nome: "EPI e EPC", treinavel: true, re: /\bepi\b|\bepc\b|protetor|vestiment|calcad|luva|manga|capacete|bota|oculos|ensaio|danificad|perneira|balaclava|lencol isolante|cobertura|macacao|barra de seguranca/ }
];
var semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function temaDe(texto) {
  const t = semAcento(texto);
  return TEMAS.find((x) => x.re.test(t)) ?? { nome: "Outros", treinavel: false };
}
var dia = (iso) => {
  const d = new Date(Date.parse(iso) - 3 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};
var dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
var pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
var taxa = (n, pessoasDia) => pessoasDia > 0 ? Math.round(n / pessoasDia * 3000 * 10) / 10 : 0;
var mais = (m) => [...m].sort((a, b) => b[1] - a[1])[0]?.[0];
async function rotasInsights(req, rota) {
  if (rota !== "/api/admin/insights" || req.method !== "GET")
    return null;
  const regs = await registros();
  const questoes = (await listarQuestoes()).filter((q) => q.ativa);
  const cadastro = await sql`SELECT nome_norm, base, gerencia, situacao, gerente FROM escola_colaboradores`;
  const efetivo = cadastro.filter((c) => (c.situacao ?? "ATIVO") !== "DESLIGADO");
  const cad = new Map(cadastro.map((c) => [c.nome_norm, c]));
  let notif = [];
  let disponivel = true;
  try {
    notif = (await sql`SELECT data::text AS data, base, gerencia, nao_conformidade, tratado, dias, status, coordenador, processo, eletricistas FROM notificacoes WHERE data IS NOT NULL`).map((n) => ({
      data: n.data,
      base: n.base ?? "",
      gerencia: n.gerencia ?? "",
      nc: String(n.nao_conformidade ?? "").trim(),
      tratado: !!n.tratado,
      dias: n.dias == null ? null : Number(n.dias),
      status: String(n.status ?? ""),
      coord: String(n.coordenador ?? "").trim(),
      processo: String(n.processo ?? "").trim().toUpperCase(),
      pessoas: [...new Set((n.eletricistas ?? []).map((e) => chaveNome(String(e))))]
    }));
  } catch (e) {
    if (e?.code !== "42P01")
      throw e;
    disponivel = false;
  }
  const dMin = notif.reduce((a, n) => n.data < a ? n.data : a, "9999-12-31");
  const dMax = notif.reduce((a, n) => n.data > a ? n.data : a, "0000-01-01");
  const nomeDe = new Map;
  const escola = new Map;
  for (const r of [...regs].sort((a, b) => Date.parse(a.data) - Date.parse(b.data))) {
    const k = chaveNome(r.nome);
    const p = escola.get(k) ?? { nome: r.nome, base: r.base, gerencia: r.gerencia, coordenador: r.coordenador, dias: [], ultimaAprovada: r.aprovado, ultimoDia: "" };
    p.dias.push(dia(r.data));
    Object.assign(p, { nome: r.nome, base: r.base, gerencia: r.gerencia, coordenador: r.coordenador, ultimaAprovada: r.aprovado, ultimoDia: dia(r.data) });
    escola.set(k, p);
    nomeDe.set(k, r.nome);
  }
  const porPessoa = new Map;
  for (const n of notif) {
    for (const k of n.pessoas) {
      const p = porPessoa.get(k) ?? { datas: [], bases: new Map, ger: new Map };
      p.datas.push(n.data);
      if (n.base)
        p.bases.set(n.base, (p.bases.get(n.base) ?? 0) + 1);
      if (n.gerencia)
        p.ger.set(n.gerencia, (p.ger.get(n.gerencia) ?? 0) + 1);
      porPessoa.set(k, p);
    }
  }
  let antes = 0, depois = 0, diasAntes = 0, diasDepois = 0, reincidiram = 0, notificadosAntes = 0, reincDeNotificados = 0;
  const demorasAteEscola = [];
  const reincidentes = [];
  for (const [k, p] of escola) {
    const marco = p.dias[0];
    const ns = porPessoa.get(k)?.datas ?? [];
    const a = ns.filter((d) => d <= marco).length;
    const d = ns.filter((x) => x > marco).length;
    if (disponivel) {
      if (dias(dMin, marco) > 0) {
        antes += a;
        diasAntes += dias(dMin, marco);
      }
      if (dias(marco, dMax) > 0) {
        depois += d;
        diasDepois += dias(marco, dMax);
      }
    }
    if (a > 0) {
      notificadosAntes++;
      if (d > 0)
        reincDeNotificados++;
      const primeira = ns.filter((x) => x <= marco).sort()[0];
      demorasAteEscola.push(dias(primeira, marco));
    }
    if (d > 0) {
      reincidiram++;
      reincidentes.push({ nome: p.nome, n: d, ultima: ns.sort().at(-1), base: p.base, coord: p.coordenador });
    }
  }
  let ctrlN = 0, ctrlDias = 0, ctrlPessoas = 0;
  for (const [k, p] of porPessoa) {
    if (escola.has(k))
      continue;
    const ds = [...p.datas].sort();
    const janela = dias(ds[0], dMax);
    if (janela <= 0)
      continue;
    ctrlPessoas++;
    ctrlDias += janela;
    ctrlN += ds.filter((d) => d > ds[0]).length;
  }
  const taxaAntes = taxa(antes, diasAntes);
  const taxaDepois = taxa(depois, diasDepois);
  const taxaRef = taxa(ctrlN, ctrlDias);
  const variacao = taxaAntes > 0 ? Math.round((taxaDepois - taxaAntes) / taxaAntes * 100) : null;
  const tempoAteEscola = demorasAteEscola.length ? Math.round(demorasAteEscola.reduce((a, b) => a + b, 0) / demorasAteEscola.length) : null;
  const mes = (d) => d.slice(0, 7);
  const meses = new Map;
  for (const n of notif)
    meses.set(mes(n.data), { notificacoes: (meses.get(mes(n.data))?.notificacoes ?? 0) + 1, participacoes: meses.get(mes(n.data))?.participacoes ?? 0 });
  for (const r of regs) {
    const m = mes(dia(r.data));
    meses.set(m, { notificacoes: meses.get(m)?.notificacoes ?? 0, participacoes: (meses.get(m)?.participacoes ?? 0) + 1 });
  }
  const porMes = [...meses].sort((a, b) => a[0].localeCompare(b[0])).map(([m, v]) => ({ mes: m, ...v }));
  const questoesPorTema = new Map;
  for (const q of questoes) {
    const t = temaDe(`${q.enunciado} ${q.opcoes.join(" ")}`).nome;
    questoesPorTema.set(t, (questoesPorTema.get(t) ?? 0) + 1);
  }
  const contTema = new Map;
  const contNC = new Map;
  for (const n of notif) {
    if (!n.nc)
      continue;
    const t = temaDe(n.nc).nome;
    contTema.set(t, (contTema.get(t) ?? 0) + 1);
    contNC.set(n.nc, (contNC.get(n.nc) ?? 0) + 1);
  }
  const totalNC = [...contTema.values()].reduce((a, b) => a + b, 0);
  const temas = [...contTema].map(([tema, n]) => ({ tema, n, pct: pct(n, totalNC), questoes: questoesPorTema.get(tema) ?? 0, treinavel: TEMAS.find((x) => x.nome === tema)?.treinavel ?? false })).sort((a, b) => b.n - a.n);
  const topNCs = [...contNC].map(([texto, n]) => ({ texto, n })).sort((a, b) => b.n - a.n).slice(0, 10);
  const cobertura = (campo) => {
    const nots = new Map;
    for (const n of notif)
      if (n[campo])
        nots.set(n[campo], (nots.get(n[campo]) ?? 0) + 1);
    const part = new Map;
    for (const p of escola.values())
      if (p[campo])
        part.set(p[campo], (part.get(p[campo]) ?? 0) + 1);
    const efet = new Map;
    for (const c of efetivo)
      if (c[campo])
        efet.set(c[campo], (efet.get(c[campo]) ?? 0) + 1);
    const totalN = [...nots.values()].reduce((a, b) => a + b, 0);
    const totalP = [...part.values()].reduce((a, b) => a + b, 0);
    return [...new Set([...nots.keys(), ...part.keys()])].map((k) => ({
      nome: k,
      notificacoes: nots.get(k) ?? 0,
      pctNotificacoes: pct(nots.get(k) ?? 0, totalN),
      participantes: part.get(k) ?? 0,
      pctParticipantes: pct(part.get(k) ?? 0, totalP),
      efetivo: efet.get(k) ?? 0,
      cobertura: pct(part.get(k) ?? 0, efet.get(k) ?? 0)
    })).sort((a, b) => b.notificacoes - a.notificacoes);
  };
  const porBase = cobertura("base");
  const porGerencia = cobertura("gerencia");
  const aprovadas = regs.filter((r) => r.aprovado).length;
  const mediaNota = regs.length ? regs.reduce((a, r) => a + r.nota, 0) / regs.length : 0;
  const repetentes = [...escola.values()].filter((p) => p.dias.length > 1).length;
  const reprovadosSemNova = [...escola.values()].filter((p) => !p.ultimaAprovada);
  const erros = questoes.map((q, i) => {
    let aplic = 0, err = 0;
    for (const r of regs) {
      const idx = r.questoes.indexOf(q.id);
      if (idx < 0)
        continue;
      aplic++;
      if (!r.acertos[idx])
        err++;
    }
    return { numero: i + 1, enunciado: q.enunciado, aplicadas: aplic, erros: err, taxa: pct(err, aplic), tema: temaDe(`${q.enunciado} ${q.opcoes.join(" ")}`).nome };
  }).filter((q) => q.aplicadas >= 10).sort((a, b) => b.taxa - a.taxa);
  const pendentes = notif.filter((n) => !n.tratado).length;
  const diasMedios = notif.filter((n) => n.dias != null);
  const tempoResposta = diasMedios.length ? Math.round(diasMedios.reduce((a, n) => a + (n.dias ?? 0), 0) / diasMedios.length * 10) / 10 : null;
  const convocar = [...porPessoa].filter(([k, p]) => !escola.has(k) && p.datas.length >= 2 && (cad.get(k)?.situacao ?? "ATIVO") !== "DESLIGADO").map(([k, p]) => ({ nome: nomeDe.get(k) ?? cad.get(k)?.nome_norm ?? k, chave: k, n: p.datas.length, base: cad.get(k)?.base || mais(p.bases) || "", gerencia: cad.get(k)?.gerencia || mais(p.ger) || "" })).sort((a, b) => b.n - a.n || a.chave.localeCompare(b.chave));
  const deslocar = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);
  const hoje = new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);
  const chaveCoord = (n) => {
    const k = chaveNome(n).split(" ")[0] ?? "";
    return k === "SEM" ? "" : k;
  };
  const prioritarios = [...porPessoa].filter(([, p]) => p.datas.length >= 2);
  const notificadosQueParticiparam = [...porPessoa.keys()].filter((k) => escola.has(k)).length;
  const prioritariosQueParticiparam = prioritarios.filter(([k]) => escola.has(k)).length;
  const aprovadosPessoas = [...escola.values()].filter((p) => p.ultimaAprovada).length;
  const funil = {
    etapas: [
      { etapa: "Efetivo cadastrado", valor: efetivo.length },
      ...disponivel ? [{ etapa: "Notificados ao menos 1 vez", valor: porPessoa.size }] : [],
      { etapa: "Participaram da Escola", valor: escola.size },
      { etapa: "Aprovados na última avaliação", valor: aprovadosPessoas },
      ...disponivel ? [{ etapa: "Sem notificação depois da Escola", valor: escola.size - reincidiram }] : []
    ],
    notificados: porPessoa.size,
    coberturaNotificados: pct(notificadosQueParticiparam, porPessoa.size),
    prioritarios: prioritarios.length,
    coberturaPrioritarios: pct(prioritariosQueParticiparam, prioritarios.length)
  };
  const contagens = [...porPessoa.values()].map((p) => p.datas.length).sort((a, b) => b - a);
  const totalMencoes = contagens.reduce((a, b) => a + b, 0);
  const faixaDe = (n) => n >= 4 ? "4 ou mais" : String(n);
  const faixas = ["1", "2", "3", "4 ou mais"].map((f) => {
    const doGrupo = contagens.filter((c) => faixaDe(c) === f);
    const m = doGrupo.reduce((a, b) => a + b, 0);
    return { faixa: f === "1" ? "1 notificação" : f === "4 ou mais" ? "4 ou mais" : `${f} notificações`, pessoas: doGrupo.length, mencoes: m, pctPessoas: pct(doGrupo.length, contagens.length), pctMencoes: pct(m, totalMencoes) };
  });
  const topPessoas = Math.max(1, Math.ceil(contagens.length * 0.1));
  const concentracao = {
    faixas,
    totalPessoas: contagens.length,
    totalMencoes,
    top10Pessoas: topPessoas,
    top10PctMencoes: pct(contagens.slice(0, topPessoas).reduce((a, b) => a + b, 0), totalMencoes)
  };
  const demoras = [
    { faixa: "Até 30 dias", n: demorasAteEscola.filter((d) => d <= 30).length },
    { faixa: "31 a 90 dias", n: demorasAteEscola.filter((d) => d > 30 && d <= 90).length },
    { faixa: "91 a 180 dias", n: demorasAteEscola.filter((d) => d > 90 && d <= 180).length },
    { faixa: "Mais de 180 dias", n: demorasAteEscola.filter((d) => d > 180).length }
  ];
  const d90 = deslocar(dMax, -90);
  const d180 = deslocar(dMax, -180);
  const tRec = new Map;
  const tAnt = new Map;
  for (const n of notif) {
    if (!n.nc)
      continue;
    const t = temaDe(n.nc).nome;
    if (n.data > d90)
      tRec.set(t, (tRec.get(t) ?? 0) + 1);
    else if (n.data > d180)
      tAnt.set(t, (tAnt.get(t) ?? 0) + 1);
  }
  const tendenciaTemas = [...new Set([...tRec.keys(), ...tAnt.keys()])].map((tema) => {
    const rec = tRec.get(tema) ?? 0;
    const ant = tAnt.get(tema) ?? 0;
    return { tema, anterior: ant, recente: rec, variacao: ant >= 5 ? Math.round((rec - ant) / ant * 100) : null, treinavel: TEMAS.find((x) => x.nome === tema)?.treinavel ?? false };
  }).filter((t) => t.anterior + t.recente >= 8).sort((a, b) => b.recente - a.recente).slice(0, 8);
  const temasTop = temas.filter((t) => t.tema !== "Outros").slice(0, 7).map((t) => t.tema);
  const basesOrdem = porBase.map((b) => b.nome);
  const baseTema = {
    bases: basesOrdem,
    temas: temasTop,
    valores: temasTop.map((tema) => basesOrdem.map((b) => notif.filter((n) => n.base === b && n.nc && temaDe(n.nc).nome === tema).length))
  };
  const cNot = new Map;
  for (const n of notif) {
    const k = chaveCoord(n.coord);
    if (!k)
      continue;
    const c = cNot.get(k) ?? { nomes: new Map, n: 0, pend: 0 };
    c.n++;
    if (!n.tratado)
      c.pend++;
    c.nomes.set(n.coord.toUpperCase(), (c.nomes.get(n.coord.toUpperCase()) ?? 0) + 1);
    cNot.set(k, c);
  }
  const cPart = new Map;
  for (const p of escola.values()) {
    const k = chaveCoord(p.coordenador);
    if (k)
      cPart.set(k, (cPart.get(k) ?? 0) + 1);
  }
  const cEfet = new Map;
  for (const c of efetivo) {
    const k = chaveCoord(c.gerente ?? "");
    if (k)
      cEfet.set(k, (cEfet.get(k) ?? 0) + 1);
  }
  const cReinc = new Map;
  for (const r of reincidentes) {
    const k = chaveCoord(r.coord);
    if (k)
      cReinc.set(k, (cReinc.get(k) ?? 0) + 1);
  }
  const coordenadores = [...new Set([...cNot.keys(), ...cPart.keys()])].map((k) => {
    const c = cNot.get(k);
    return {
      nome: c ? mais(c.nomes) ?? k : k,
      notificacoes: c?.n ?? 0,
      pctNotificacoes: pct(c?.n ?? 0, notif.length),
      pendentes: c?.pend ?? 0,
      tratadasPct: c?.n ? pct(c.n - c.pend, c.n) : 0,
      participantes: cPart.get(k) ?? 0,
      efetivo: cEfet.get(k) ?? 0,
      cobertura: pct(cPart.get(k) ?? 0, cEfet.get(k) ?? 0),
      reincidentes: cReinc.get(k) ?? 0
    };
  }).filter((c) => c.notificacoes > 0 || c.participantes > 0).sort((a, b) => b.notificacoes - a.notificacoes);
  const pr = new Map;
  for (const n of notif) {
    if (!n.processo)
      continue;
    const v = pr.get(n.processo) ?? { n: 0, pend: 0 };
    v.n++;
    if (!n.tratado)
      v.pend++;
    pr.set(n.processo, v);
  }
  const processos = [...pr].map(([nome, v]) => ({ nome, n: v.n, pct: pct(v.n, notif.length), pendentes: v.pend })).sort((a, b) => b.n - a.n).slice(0, 8);
  const palavras = (t) => new Set(semAcento(t).split(/\W+/).filter((w) => w.length > 3));
  const jaccard = (a, b) => {
    const inter = [...a].filter((x) => b.has(x)).length;
    return a.size + b.size ? inter / (a.size + b.size - inter) : 0;
  };
  const textos = questoes.map((q) => palavras(`${q.enunciado} ${q.opcoes.join(" ")}`));
  const qualidadeQuestoes = questoes.map((q, i) => {
    let aplic = 0, err = 0;
    for (const r of regs) {
      const idx = r.questoes.indexOf(q.id);
      if (idx < 0)
        continue;
      aplic++;
      if (!r.acertos[idx])
        err++;
    }
    const taxaErro = pct(err, aplic);
    const nivel = aplic < 10 ? "Poucos dados" : taxaErro >= 60 ? "Muito difícil" : taxaErro >= 30 ? "Difícil" : taxaErro >= 10 ? "Adequada" : "Muito fácil";
    const igual = textos.findIndex((t, j) => j < i && jaccard(t, textos[i]) >= 0.85);
    return { numero: i + 1, enunciado: q.enunciado, tema: temaDe(`${q.enunciado} ${q.opcoes.join(" ")}`).nome, aplicadas: aplic, taxaErro, nivel, repeteDe: igual >= 0 ? igual + 1 : null };
  });
  const ab = new Map;
  for (const r of regs) {
    if (!r.base)
      continue;
    const v = ab.get(r.base) ?? { n: 0, ok: 0, soma: 0 };
    v.n++;
    if (r.aprovado)
      v.ok++;
    v.soma += r.nota;
    ab.set(r.base, v);
  }
  const aprovacaoPorBase = [...ab].map(([nome, v]) => ({ nome, participacoes: v.n, aprovacao: pct(v.ok, v.n), media: Math.round(v.soma / v.n * 100) / 100 })).sort((a, b) => b.participacoes - a.participacoes);
  const novos90 = [...escola.values()].filter((p) => p.dias[0] > deslocar(hoje, -90)).length;
  const ritmoMes = Math.round(novos90 / 3 * 10) / 10;
  const faltam = convocar.length;
  const ritmo = {
    novosPorMes: ritmoMes,
    prioritariosPendentes: faltam,
    mesesNoRitmoAtual: ritmoMes > 0 && faltam > 0 ? Math.ceil(faltam / ritmoMes) : null,
    necessarioPorMes3Meses: Math.ceil(faltam / 3)
  };
  const acoes = [];
  const fmt = (n) => n.toLocaleString("pt-BR");
  if (disponivel && convocar.length) {
    acoes.push({
      prioridade: "alta",
      tipo: "alerta",
      titulo: `Convocar ${convocar.length} colaboradores notificados mais de uma vez`,
      evidencia: `${convocar.length} pessoas têm 2 ou mais notificações e ainda não participaram da Escola de Segurança. As maiores têm ${convocar[0].n} notificações.`,
      acao: "Incluí-los nas próximas turmas, começando pelos com mais notificações, e combinar a convocação com o coordenador de cada um.",
      itens: convocar.slice(0, 10).map((c) => `${c.nome.toUpperCase()} — ${[c.base, c.gerencia].filter(Boolean).join("/") || "sem base"} — ${c.n} notificações`)
    });
  }
  if (disponivel && reincidentes.length) {
    acoes.push({
      prioridade: "alta",
      tipo: "alerta",
      titulo: reincidentes.length === 1 ? "1 participante recebeu notificação depois da Escola" : `${reincidentes.length} participantes receberam notificação depois da Escola`,
      evidencia: `${pct(reincidentes.length, escola.size)}% dos participantes tiveram notificação depois de participar (${reincidentes.reduce((a, r) => a + r.n, 0)} no total).`,
      acao: "Fazer acompanhamento individual com a liderança, entender se a causa é falta de conhecimento ou de comportamento e reforçar com treinamento prático em campo.",
      itens: reincidentes.sort((a, b) => b.n - a.n).map((r) => `${r.nome.toUpperCase()} — ${r.base} — ${r.n} notificação(ões) depois da Escola`)
    });
  }
  if (disponivel) {
    for (const t of temas.filter((x) => x.treinavel && x.questoes === 0 && x.pct >= 8).slice(0, 2)) {
      acoes.push({
        prioridade: "alta",
        tipo: "oportunidade",
        titulo: `Tema "${t.tema}" não está na avaliação`,
        evidencia: `Responde por ${t.pct}% das notificações (${fmt(t.n)}) e não tem nenhuma questão ativa na avaliação da Escola.`,
        acao: `Incluir um módulo de conteúdo e questões sobre "${t.tema}" na aba Questões, e reaplicar para quem já participou.`
      });
    }
    const baixos = temas.filter((x) => x.treinavel && x.questoes === 1 && x.pct >= 10).slice(0, 1);
    for (const t of baixos) {
      acoes.push({
        prioridade: "media",
        tipo: "oportunidade",
        titulo: `Tema "${t.tema}" tem pouca cobertura`,
        evidencia: `${t.pct}% das notificações, com apenas 1 questão na avaliação.`,
        acao: "Ampliar o número de questões e o conteúdo do tema."
      });
    }
    const criticas = porBase.filter((b) => b.pctNotificacoes >= 12 && b.pctParticipantes < b.pctNotificacoes * 0.6);
    if (criticas.length) {
      acoes.push({
        prioridade: "alta",
        tipo: "alerta",
        titulo: `${criticas.map((b) => b.nome).join(", ")}: muitas notificações e pouca participação na Escola`,
        evidencia: criticas.map((b) => `${b.nome} tem ${b.pctNotificacoes}% das notificações e ${b.pctParticipantes}% dos participantes (${b.participantes} de ${fmt(b.efetivo)} do efetivo).`).join(" "),
        acao: "Programar turmas dedicadas nessas bases, de preferência presenciais, até a participação acompanhar a proporção de notificações."
      });
    }
    const gerCriticas = porGerencia.filter((g) => g.pctNotificacoes >= 15 && g.pctParticipantes < g.pctNotificacoes * 0.6);
    if (gerCriticas.length) {
      acoes.push({
        prioridade: "media",
        tipo: "alerta",
        titulo: `Gerência ${gerCriticas.map((g) => g.nome).join(", ")} com baixa participação frente às notificações`,
        evidencia: gerCriticas.map((g) => `${g.nome}: ${g.pctNotificacoes}% das notificações e ${g.pctParticipantes}% dos participantes.`).join(" "),
        acao: "Alinhar com os coordenadores da gerência um calendário de participação."
      });
    }
  }
  if (disponivel && questoes.length >= 4) {
    const exc = [...questoesPorTema].find(([t, q]) => q / questoes.length >= 0.4 && (temas.find((x) => x.tema === t)?.pct ?? 0) < 5);
    if (exc) {
      const [t, q] = exc;
      acoes.push({
        prioridade: "media",
        tipo: "oportunidade",
        titulo: "Conteúdo da avaliação concentrado em um tema com poucas notificações",
        evidencia: `${q} de ${questoes.length} questões (${pct(q, questoes.length)}%) são sobre "${t}", tema com ${temas.find((x) => x.tema === t)?.pct ?? 0}% das notificações.`,
        acao: "Redistribuir as questões entre os temas que mais geram notificações, como os listados em Não conformidades x conteúdo da Escola."
      });
    }
  }
  if (erros.length && erros[0].taxa >= 30) {
    acoes.push({
      prioridade: "media",
      tipo: "alerta",
      titulo: "Questões com maior taxa de erro",
      evidencia: `A questão ${erros[0].numero} tem ${erros[0].taxa}% de erro (${erros[0].erros} de ${erros[0].aplicadas}).`,
      acao: "Revisar o conteúdo e a redação dessas questões e conferir o gabarito. Se muitos erram a mesma questão, o ponto pode estar mal explicado no treinamento.",
      itens: erros.slice(0, 3).map((q) => `Questão ${q.numero} (${q.tema}) — ${q.taxa}% de erro — ${q.enunciado.slice(0, 90)}${q.enunciado.length > 90 ? "…" : ""}`)
    });
  }
  if (reprovadosSemNova.length) {
    acoes.push({
      prioridade: "media",
      tipo: "oportunidade",
      titulo: `${reprovadosSemNova.length} colaboradores reprovados não refizeram a avaliação`,
      evidencia: `A última avaliação de ${reprovadosSemNova.length} pessoas ficou abaixo da nota mínima e não houve nova tentativa.`,
      acao: "Reforçar o conteúdo com a liderança e reaplicar a avaliação.",
      itens: reprovadosSemNova.slice(0, 10).map((p) => `${p.nome.toUpperCase()} — ${p.base}/${p.gerencia}`)
    });
  }
  if (disponivel && pendentes > 0) {
    acoes.push({
      prioridade: "media",
      tipo: "alerta",
      titulo: `${pendentes} notificações ainda sem tratamento`,
      evidencia: `${pct(pendentes, notif.length)}% das notificações não foram tratadas${tempoResposta != null ? `; o tempo médio de resposta registrado é de ${tempoResposta} dias` : ""}.`,
      acao: "Cobrar o tratamento com os coordenadores responsáveis, pois uma não conformidade sem tratamento tende a se repetir."
    });
  }
  const efetivoN = efetivo.length;
  if (efetivoN && escola.size / efetivoN < 0.2) {
    acoes.push({
      prioridade: "media",
      tipo: "oportunidade",
      titulo: "Baixa cobertura do efetivo",
      evidencia: `${escola.size} colaboradores passaram pela Escola, o que representa ${pct(escola.size, efetivoN)}% dos ${fmt(efetivoN)} cadastrados.`,
      acao: "Definir uma meta de participação por gerência e um calendário de turmas, priorizando quem já tem notificação."
    });
  }
  if (disponivel && notificadosAntes >= 5 && reincDeNotificados === 0) {
    acoes.push({
      prioridade: "info",
      tipo: "positivo",
      titulo: "Ninguém que já tinha sido notificado voltou a ser notificado depois da Escola",
      evidencia: `Dos ${notificadosAntes} participantes que tinham notificação antes de participar, nenhum recebeu nova notificação depois.`,
      acao: "Resultado favorável, mas o período de acompanhamento ainda é curto; continuar monitorando."
    });
  }
  if (disponivel && variacao != null) {
    acoes.push({
      prioridade: "info",
      tipo: variacao < 0 ? "positivo" : "alerta",
      titulo: variacao < 0 ? `Queda de ${Math.abs(variacao)}% nas notificações por pessoa depois da Escola` : `As notificações por pessoa subiram ${variacao}% depois da Escola`,
      evidencia: `Participantes: ${taxaAntes} notificações por 100 pessoas-mês antes e ${taxaDepois} depois. Quem foi notificado e não participou: ${taxaRef} no mesmo critério.`,
      acao: variacao < 0 ? "O sinal é favorável; manter o ritmo de turmas e acompanhar nos próximos meses." : "Revisar conteúdo e método do treinamento e acompanhar os participantes em campo."
    });
  }
  if (disponivel && faltam > 0 && ritmo.mesesNoRitmoAtual != null && ritmo.mesesNoRitmoAtual > 6) {
    acoes.push({
      prioridade: "alta",
      tipo: "alerta",
      titulo: `No ritmo atual, atender quem tem 2 ou mais notificações levaria ${ritmo.mesesNoRitmoAtual} meses`,
      evidencia: `Entram cerca de ${fmt(ritmoMes)} participantes novos por mês e há ${fmt(faltam)} pessoas com 2 ou mais notificações aguardando. Para atendê-las em 3 meses seria preciso cerca de ${fmt(ritmo.necessarioPorMes3Meses)} por mês.`,
      acao: "Aumentar a frequência e o tamanho das turmas (turmas semanais, em cada base) e começar por quem tem mais notificações; considerar uma versão presencial curta para o campo."
    });
  }
  if (disponivel && concentracao.top10PctMencoes >= 25) {
    acoes.push({
      prioridade: "media",
      tipo: "oportunidade",
      titulo: `10% das pessoas concentram ${concentracao.top10PctMencoes}% das notificações`,
      evidencia: `${fmt(concentracao.top10Pessoas)} colaboradores, entre ${fmt(concentracao.totalPessoas)} notificados, aparecem em ${concentracao.top10PctMencoes}% das menções. Quem tem 4 ou mais notificações soma ${faixas[3].pessoas} pessoas.`,
      acao: "Tratar esse grupo com um plano individual (acompanhamento do coordenador e treinamento prático), em vez de apenas a turma geral. É onde o ganho por pessoa é maior."
    });
  }
  for (const t of tendenciaTemas.filter((x) => x.treinavel && x.variacao != null && x.variacao >= 40 && x.recente >= 8).slice(0, 2)) {
    acoes.push({
      prioridade: "media",
      tipo: "alerta",
      titulo: `"${t.tema}" está crescendo nas notificações`,
      evidencia: `${t.recente} notificações nos últimos 90 dias contra ${t.anterior} nos 90 anteriores (+${t.variacao}%).`,
      acao: "Antecipar uma ação de reforço sobre o tema nas bases mais afetadas, antes que vire o principal problema do próximo trimestre."
    });
  }
  if (disponivel && notif.length) {
    const medCob = pct(escola.size, efetivo.length);
    const fracos = coordenadores.filter((c) => c.pctNotificacoes >= 15 && c.cobertura < medCob * 0.6);
    if (fracos.length) {
      acoes.push({
        prioridade: "media",
        tipo: "alerta",
        titulo: `Coordenação ${fracos.map((c) => c.nome).join(", ")} com muitas notificações e baixa participação`,
        evidencia: fracos.map((c) => `${c.nome}: ${c.pctNotificacoes}% das notificações, ${c.participantes} participante(s) para ${fmt(c.efetivo)} do efetivo (${c.cobertura}%).`).join(" "),
        acao: "Alinhar com o coordenador uma meta de participação e um calendário de turmas para a equipe."
      });
    }
    const comPendencia = coordenadores.filter((c) => c.pendentes >= 5);
    if (comPendencia.length) {
      acoes.push({
        prioridade: "media",
        tipo: "alerta",
        titulo: "Notificações sem tratamento concentradas em poucos coordenadores",
        evidencia: `${comPendencia.reduce((a, c) => a + c.pendentes, 0)} das ${pendentes} pendências estão com ${comPendencia.length} coordenador(es).`,
        acao: "Cobrar o tratamento dessas notificações na reunião de acompanhamento.",
        itens: comPendencia.map((c) => `${c.nome} — ${c.pendentes} pendentes de ${c.notificacoes} (${c.tratadasPct}% tratadas)`)
      });
    }
  }
  const repetidas = qualidadeQuestoes.filter((q) => q.repeteDe != null);
  if (repetidas.length) {
    acoes.push({
      prioridade: "media",
      tipo: "alerta",
      titulo: "Questões praticamente repetidas na avaliação",
      evidencia: repetidas.map((q) => `A questão ${q.numero} tem texto quase igual ao da questão ${q.repeteDe}`).join("; ") + ".",
      acao: "Conferir se a repetição é intencional. Se não for, reescrever ou desativar uma delas na aba Questões, pois pesa duas vezes na nota sem medir um conhecimento novo."
    });
  }
  const faceis = qualidadeQuestoes.filter((q) => q.nivel === "Muito fácil");
  if (faceis.length) {
    acoes.push({
      prioridade: "info",
      tipo: "oportunidade",
      titulo: `${faceis.length} questão(ões) muito fácil(eis)`,
      evidencia: `Menos de 10% de erro em ${faceis.map((q) => `Q${q.numero}`).join(", ")}: quase todos acertam.`,
      acao: "Usar essas posições para temas ainda não cobertos (como EPI), com perguntas que realmente separem quem sabe de quem não sabe."
    });
  }
  const fracasBase = aprovacaoPorBase.filter((b) => b.participacoes >= 8 && b.aprovacao < 70);
  if (fracasBase.length) {
    acoes.push({
      prioridade: "media",
      tipo: "alerta",
      titulo: `Aprovação baixa em ${fracasBase.map((b) => b.nome).join(", ")}`,
      evidencia: fracasBase.map((b) => `${b.nome}: ${b.aprovacao}% de aprovação em ${b.participacoes} participações.`).join(" "),
      acao: "Verificar se o conteúdo chega bem nessas bases (instrutor, horário, material) e reforçar antes de reaplicar."
    });
  }
  if (disponivel && tempoAteEscola != null && tempoAteEscola > 90) {
    acoes.push({
      prioridade: "media",
      tipo: "oportunidade",
      titulo: `A Escola chega, em média, ${tempoAteEscola} dias depois da primeira notificação`,
      evidencia: `Entre os participantes que já tinham notificação, a demora média foi de ${tempoAteEscola} dias.`,
      acao: "Definir um prazo (por exemplo, 30 dias após a segunda notificação) para encaminhar à Escola, de forma que o treinamento acompanhe o desvio."
    });
  }
  const resumo = [];
  resumo.push({ tipo: "neutro", texto: `${fmt(escola.size)} colaboradores participaram da Escola (${pct(escola.size, efetivoN)}% do efetivo cadastrado), com aprovação de ${pct(aprovadas, regs.length)}% nas participações.` });
  if (disponivel) {
    resumo.push({
      tipo: funil.coberturaNotificados < 25 ? "alerta" : "neutro",
      texto: `Entre as ${fmt(funil.notificados)} pessoas notificadas no período, ${funil.coberturaNotificados}% já passaram pela Escola; entre as ${fmt(funil.prioritarios)} com 2 ou mais notificações, ${funil.coberturaPrioritarios}%.`
    });
    if (variacao != null) {
      resumo.push({
        tipo: variacao < 0 ? "positivo" : "alerta",
        texto: variacao < 0 ? `Quem participou teve ${Math.abs(variacao)}% menos notificações por pessoa-mês depois da Escola (${taxaAntes} para ${taxaDepois}), sinal favorável que ainda precisa de mais tempo de acompanhamento.` : `As notificações por pessoa-mês dos participantes subiram ${variacao}% depois da Escola (${taxaAntes} para ${taxaDepois}).`
      });
    }
    const lacuna = temas.find((t) => t.treinavel && t.questoes === 0 && t.pct >= 8);
    if (lacuna)
      resumo.push({ tipo: "oportunidade", texto: `A maior lacuna de conteúdo é "${lacuna.tema}": ${lacuna.pct}% das notificações e nenhuma questão na avaliação.` });
    if (concentracao.top10PctMencoes >= 25)
      resumo.push({ tipo: "oportunidade", texto: `Uma minoria concentra o problema: 10% dos notificados respondem por ${concentracao.top10PctMencoes}% das notificações.` });
    if (ritmo.mesesNoRitmoAtual != null && ritmo.mesesNoRitmoAtual > 6)
      resumo.push({ tipo: "alerta", texto: `No ritmo atual (${fmt(ritmoMes)} participantes novos por mês), atender quem tem 2 ou mais notificações levaria ${ritmo.mesesNoRitmoAtual} meses.` });
  }
  const ordem = { alta: 0, media: 1, info: 2 };
  acoes.sort((a, b) => ordem[a.prioridade] - ordem[b.prioridade]);
  return json5({
    disponivel,
    periodo: { de: disponivel ? dMin : null, ate: disponivel ? dMax : null },
    programa: {
      participacoes: regs.length,
      participantes: escola.size,
      efetivo: efetivoN,
      cobertura: pct(escola.size, efetivoN),
      aprovacao: pct(aprovadas, regs.length),
      mediaNota: Math.round(mediaNota * 100) / 100,
      repetentes,
      reprovadosSemNova: reprovadosSemNova.length
    },
    efetividade: {
      participantes: escola.size,
      notificadosAntes,
      reincidiram,
      taxaReincidencia: pct(reincidiram, escola.size),
      reincidenciaDosNotificados: pct(reincDeNotificados, notificadosAntes),
      taxaAntes,
      taxaDepois,
      taxaReferencia: taxaRef,
      variacao,
      pessoasReferencia: ctrlPessoas,
      tempoAteEscola,
      notificacoesAntes: antes,
      notificacoesDepois: depois
    },
    notificacoes: { total: notif.length, tratadas: notif.length - pendentes, pendentes, tempoResposta, temas, topNCs },
    porMes,
    porBase,
    porGerencia,
    erros: erros.slice(0, 5),
    funil,
    concentracao,
    demoras,
    tendenciaTemas,
    baseTema,
    coordenadores,
    processos,
    qualidade: { questoes: qualidadeQuestoes, aprovacaoPorBase },
    ritmo,
    resumo,
    acoes
  });
}

// server/gerentes.ts
async function aplicarRegraGerentes(somenteVazios) {
  const linhas = REGRAS_COORDENADORES.flatMap((r) => (r.bases ?? ["*"]).map((b) => ({ gerencia: r.gerencia, base: b, gerente: r.gerente })));
  const rs = await sql`
    UPDATE escola_colaboradores AS c SET gerente = r.gerente
    FROM unnest(${linhas.map((l) => l.gerencia)}::text[], ${linhas.map((l) => l.base)}::text[], ${linhas.map((l) => l.gerente)}::text[]) AS r(gerencia, base, gerente)
    WHERE c.gerencia = r.gerencia AND (r.base = '*' OR c.base = r.base)
      AND c.gerente IS DISTINCT FROM r.gerente AND (${!somenteVazios} OR COALESCE(c.gerente, '') = '')
    RETURNING c.id`;
  return rs.length;
}

// server/colaboradores.ts
var json6 = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
var erro4 = (msg, status = 400) => json6({ erro: msg }, status);
var txt = (v, max = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
function limpar(b) {
  return {
    chapa: txt(b?.chapa, 20),
    nome: txt(b?.nome, 100).toUpperCase(),
    funcao: txt(b?.funcao, 100).toUpperCase(),
    base: txt(b?.base, 20).toUpperCase(),
    gerencia: txt(b?.gerencia, 30).toUpperCase(),
    gerente: txt(b?.gerente, 100).toUpperCase(),
    situacao: txt(b?.situacao, 20).toUpperCase() || "ATIVO"
  };
}
function validar2(c) {
  if (!/^[A-Za-z0-9._-]{1,20}$/.test(c.chapa))
    return "chapa ausente ou inválida";
  if (c.nome.split(" ").length < 2)
    return "nome incompleto";
  if (!c.funcao)
    return "função ausente";
  if (!BASES.includes(c.base))
    return `base "${c.base || "—"}" não cadastrada`;
  if (!GERENCIAS.includes(c.gerencia))
    return `gerência "${c.gerencia || "—"}" não cadastrada`;
  return null;
}
var linha = (l) => ({
  id: l.id,
  chapa: l.matricula,
  nome: l.nome,
  funcao: l.funcao ?? "",
  base: l.base ?? "",
  gerencia: l.gerencia ?? "",
  gerente: l.gerente ?? "",
  situacao: l.situacao ?? "ATIVO"
});
var CAMPOS = [
  ["nome", "nome"],
  ["funcao", "função"],
  ["base", "base"],
  ["gerencia", "gerência"],
  ["gerente", "coordenador"],
  ["situacao", "situação"]
];
async function importar(b) {
  const entrada = Array.isArray(b?.linhas) ? b.linhas : [];
  if (!entrada.length)
    return erro4("A planilha não tem linhas para importar.");
  if (entrada.length > 5000)
    return erro4("Planilha grande demais (máximo de 5.000 linhas).");
  const temGerente = !!b.temGerente;
  const aplicar = !!b.aplicar;
  const remover = !!b.remover;
  const invalidos = [];
  const porChapa = new Map;
  entrada.forEach((raw, i) => {
    const c = limpar(raw);
    if (!c.gerente)
      c.gerente = gerenteDe(c.gerencia, c.base);
    const motivo = validar2(c);
    if (motivo)
      return invalidos.push({ linha: i + 2, motivo: `${c.chapa || "?"} ${c.nome || ""}: ${motivo}`.trim() });
    if (!porChapa.has(c.chapa))
      porChapa.set(c.chapa, c);
  });
  const novoSet = [...porChapa.values()];
  const atuais = (await sql`SELECT id, nome, matricula, funcao, base, gerencia, gerente, situacao FROM escola_colaboradores`).map(linha);
  const atualPorChapa = new Map(atuais.map((c) => [c.chapa, c]));
  const novos = [];
  const alterados = [];
  const nomesUsados = new Map(atuais.map((c) => [chaveNome(c.nome), c.chapa]));
  const chapasNovoSet = new Set(novoSet.map((c) => c.chapa));
  const vistosNome = new Set;
  for (const c of novoSet) {
    const norm = chaveNome(c.nome);
    const dono = nomesUsados.get(norm);
    if (dono && dono !== c.chapa && chapasNovoSet.has(dono) === false || vistosNome.has(norm)) {
      invalidos.push({ linha: 0, motivo: `${c.chapa} ${c.nome}: nome já cadastrado com outra chapa` });
      continue;
    }
    vistosNome.add(norm);
    const atual = atualPorChapa.get(c.chapa);
    if (!atual) {
      novos.push(c);
      continue;
    }
    const mudancas = CAMPOS.filter(([k]) => (k !== "gerente" || temGerente) && c[k] !== atual[k]).map(([k, rot]) => `${rot}: ${atual[k] || "—"} → ${c[k] || "—"}`);
    if (mudancas.length)
      alterados.push({ c, id: atual.id, mudancas });
  }
  const presentes = new Set(entrada.map((r) => txt(r?.chapa, 20)));
  const removidos = atuais.filter((c) => !presentes.has(c.chapa));
  if (aplicar) {
    const ops = [];
    if (novos.length)
      ops.push(sql`INSERT INTO escola_colaboradores (nome, nome_norm, matricula, prefixo, funcao, base, gerencia, gerente, situacao)
        SELECT * FROM unnest(${novos.map((c) => c.nome)}::text[], ${novos.map((c) => chaveNome(c.nome))}::text[], ${novos.map((c) => c.chapa)}::text[],
          ${novos.map(() => "")}::text[], ${novos.map((c) => c.funcao)}::text[], ${novos.map((c) => c.base)}::text[],
          ${novos.map((c) => c.gerencia)}::text[], ${novos.map((c) => c.gerente)}::text[], ${novos.map((c) => c.situacao)}::text[])`);
    if (alterados.length)
      ops.push(sql`UPDATE escola_colaboradores AS t SET nome = v.nome, nome_norm = v.norm, funcao = v.funcao, base = v.base, gerencia = v.gerencia,
          gerente = CASE WHEN ${temGerente} THEN v.gerente ELSE t.gerente END, situacao = v.situacao
        FROM (SELECT * FROM unnest(${alterados.map((a) => a.id)}::int[], ${alterados.map((a) => a.c.nome)}::text[], ${alterados.map((a) => chaveNome(a.c.nome))}::text[],
          ${alterados.map((a) => a.c.funcao)}::text[], ${alterados.map((a) => a.c.base)}::text[], ${alterados.map((a) => a.c.gerencia)}::text[],
          ${alterados.map((a) => a.c.gerente)}::text[], ${alterados.map((a) => a.c.situacao)}::text[]) AS x(id, nome, norm, funcao, base, gerencia, gerente, situacao)) AS v
        WHERE t.id = v.id`);
    if (remover && removidos.length)
      ops.push(sql`DELETE FROM escola_colaboradores WHERE id = ANY(${removidos.map((c) => c.id)}::int[])`);
    if (ops.length)
      await sql.transaction(ops);
  }
  const amostra = (xs) => xs.slice(0, 60);
  return json6({
    aplicado: aplicar,
    resumo: { lidos: entrada.length, novos: novos.length, alterados: alterados.length, removidos: removidos.length, invalidos: invalidos.length, semMudanca: novoSet.length - novos.length - alterados.length },
    novos: amostra(novos.map((c) => ({ chapa: c.chapa, nome: c.nome, base: c.base, gerencia: c.gerencia }))),
    alterados: amostra(alterados.map((a) => ({ chapa: a.c.chapa, nome: a.c.nome, mudancas: a.mudancas }))),
    removidos: amostra(removidos.map((c) => ({ chapa: c.chapa, nome: c.nome, base: c.base, gerencia: c.gerencia }))),
    invalidos: amostra(invalidos)
  });
}
async function rotasColaboradores(req, rota) {
  if (rota === "/api/admin/colaboradores") {
    if (req.method === "GET") {
      const rs = await sql`SELECT id, nome, matricula, funcao, base, gerencia, gerente, situacao FROM escola_colaboradores ORDER BY nome_norm`;
      return json6({ colaboradores: rs.map(linha), bases: BASES, gerencias: GERENCIAS });
    }
    if (req.method === "POST") {
      const c = limpar(await req.json().catch(() => null));
      if (!c.gerente)
        c.gerente = gerenteDe(c.gerencia, c.base);
      const motivo = validar2(c);
      if (motivo)
        return erro4(`Dados inválidos: ${motivo}.`);
      const [dup] = await sql`SELECT 1 FROM escola_colaboradores WHERE matricula = ${c.chapa} OR nome_norm = ${chaveNome(c.nome)}`;
      if (dup)
        return erro4("Já existe colaborador com essa chapa ou esse nome.", 409);
      const [novo] = await sql`INSERT INTO escola_colaboradores (nome, nome_norm, matricula, prefixo, funcao, base, gerencia, gerente, situacao)
        VALUES (${c.nome}, ${chaveNome(c.nome)}, ${c.chapa}, '', ${c.funcao}, ${c.base}, ${c.gerencia}, ${c.gerente}, ${c.situacao}) RETURNING id`;
      return json6({ ok: true, id: novo.id }, 201);
    }
  }
  if (rota === "/api/admin/colaboradores/gerentes" && req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    return json6({ ok: true, alterados: await aplicarRegraGerentes(!!b?.somenteVazios) });
  }
  if (rota === "/api/admin/colaboradores/importar" && req.method === "POST")
    return importar(await req.json().catch(() => null));
  const id = Number(/^\/api\/admin\/colaboradores\/(\d+)$/.exec(rota)?.[1]);
  if (id) {
    if (req.method === "PUT") {
      const c = limpar(await req.json().catch(() => null));
      if (!c.gerente)
        c.gerente = gerenteDe(c.gerencia, c.base);
      const motivo = validar2(c);
      if (motivo)
        return erro4(`Dados inválidos: ${motivo}.`);
      const [dup] = await sql`SELECT 1 FROM escola_colaboradores WHERE id <> ${id} AND (matricula = ${c.chapa} OR nome_norm = ${chaveNome(c.nome)})`;
      if (dup)
        return erro4("Outro colaborador já usa essa chapa ou esse nome.", 409);
      const r = await sql`UPDATE escola_colaboradores SET nome = ${c.nome}, nome_norm = ${chaveNome(c.nome)}, matricula = ${c.chapa}, funcao = ${c.funcao},
        base = ${c.base}, gerencia = ${c.gerencia}, gerente = ${c.gerente}, situacao = ${c.situacao} WHERE id = ${id} RETURNING id`;
      return r.length ? json6({ ok: true }) : erro4("Colaborador não encontrado.", 404);
    }
    if (req.method === "DELETE") {
      const r = await sql`DELETE FROM escola_colaboradores WHERE id = ${id} RETURNING id`;
      return r.length ? json6({ ok: true }) : erro4("Colaborador não encontrado.", 404);
    }
  }
  return null;
}

// server/handlers.ts
var json7 = (data, status = 200, headers = {}) => Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
var erro5 = (msg, status = 400) => json7({ erro: msg }, status);
var limpa4 = (v, max = 120) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
var LETRAS_ARR = ["A", "B", "C", "D"];
var LETRAS3 = new Set(LETRAS_ARR);
var ipDe = (req) => req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
async function iniciar(req) {
  const b = await req.json().catch(() => null);
  if (!b)
    return erro5("Requisição inválida.");
  const nome = limpa4(b.nome, 100).toUpperCase();
  const matricula = limpa4(b.matricula, 20);
  const prefixo = limpa4(b.prefixo, 30).toUpperCase();
  const funcao = limpa4(b.funcao, 80).toUpperCase();
  const base = limpa4(b.base, 10).toUpperCase();
  const gerencia = limpa4(b.gerencia, 10).toUpperCase();
  if (nome.split(" ").length < 2)
    return erro5("Informe o nome completo.");
  if (!matricula || !prefixo || !funcao)
    return erro5("Preencha todos os campos.");
  if (!BASES.includes(base))
    return erro5("Base inválida.");
  if (!GERENCIAS.includes(gerencia))
    return erro5("Coordenação inválida.");
  const ativas = await questoesAtivas();
  if (!ativas.length)
    return erro5("Nenhuma questão disponível no momento.", 503);
  const id = randomUUID();
  await sql`INSERT INTO escola_tentativas (id, iniciada_em, nome, matricula, prefixo, funcao, base, gerencia, questoes)
            VALUES (${id}, ${new Date().toISOString()}, ${nome}, ${matricula}, ${prefixo}, ${funcao}, ${base}, ${gerencia}, ${JSON.stringify(ativas.map((q) => q.id))})`;
  const questoes = ativas.map((q) => ({ id: q.id, enunciado: q.enunciado, opcoes: q.opcoes.map((texto, i) => ({ letra: LETRAS_ARR[i], texto })) }));
  return json7({ id, duracaoSeg: DURACAO_SEG, questoes });
}
async function finalizar(req) {
  const b = await req.json().catch(() => null);
  if (!b)
    return erro5("Requisição inválida.");
  const [t] = await sql`SELECT * FROM escola_tentativas WHERE id = ${limpa4(b.id, 60)}`;
  if (!t || t.origem !== "app")
    return erro5("Avaliação não encontrada.", 404);
  if (t.finalizada_em)
    return erro5("Esta avaliação já foi finalizada.", 409);
  const agora = Date.now();
  const decorrido = Math.round((agora - Date.parse(t.iniciada_em)) / 1000);
  if (decorrido > DURACAO_SEG + TOLERANCIA_FOTO_SEG)
    return erro5("O tempo da avaliação esgotou. Inicie novamente.", 410);
  const ids = t.questoes ? JSON.parse(t.questoes) : QUESTOES_ORIGINAIS;
  const corretas = new Map((await sql`SELECT id, correta, opcoes FROM escola_questoes WHERE id = ANY(${ids}::int[])`).map((q) => [q.id, { correta: q.correta, n: JSON.parse(q.opcoes).length }]));
  const respostas = ids.map((id, i) => {
    const r = Array.isArray(b.respostas) ? b.respostas[i] : null;
    return LETRAS3.has(r) && LETRAS_ARR.indexOf(r) < (corretas.get(id)?.n ?? 0) ? r : null;
  });
  const acertos = ids.map((id, i) => respostas[i] === corretas.get(id)?.correta);
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(b.foto ?? ""));
  if (!m)
    return erro5("A foto é obrigatória para finalizar a avaliação.");
  const bytes = Buffer.from(m[1], "base64");
  if (bytes.length < 2000 || bytes.length > 3.5 * 1024 * 1024 || bytes[0] !== 255 || bytes[1] !== 216)
    return erro5("Foto inválida.");
  const local = limpa4(b.local, 300);
  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!local || !Number.isFinite(lat) || !Number.isFinite(lng))
    return erro5("A localização é obrigatória.");
  await sql.transaction([
    sql`INSERT INTO escola_fotos (id, dados) VALUES (${t.id}, ${m[1]}) ON CONFLICT (id) DO UPDATE SET dados = EXCLUDED.dados`,
    sql`UPDATE escola_tentativas SET finalizada_em = ${new Date(agora).toISOString()}, respostas = ${JSON.stringify(respostas)},
          questoes = ${JSON.stringify(ids)}, acertos = ${JSON.stringify(acertos)},
          duracao_seg = ${Math.min(decorrido, DURACAO_SEG)}, tem_foto = TRUE, local = ${local}, lat = ${lat}, lng = ${lng},
          carimbo = ${limpa4(b.carimbo, 40)} WHERE id = ${t.id}`
  ]);
  await sql`UPDATE escola_colaboradores SET prefixo = ${t.prefixo} WHERE nome_norm = ${chaveNome(t.nome)}`;
  const nota = acertos.filter(Boolean).length;
  return json7({ nota, total: ids.length, aprovado: nota >= notaMinima(ids.length), notaMinima: notaMinima(ids.length) });
}
async function api(req) {
  const { pathname } = new URL(req.url);
  const rota = pathname.replace(/\/+$/, "");
  try {
    await iniciarBanco();
    if (rota === "/api/colaboradores" && req.method === "GET") {
      const q = chaveNome(new URL(req.url).searchParams.get("q") ?? "").slice(0, 60);
      const digitos = /^\d+$/.test(q);
      if (q.length < 2)
        return json7({ resultados: [] });
      const seguro = q.replace(/[\\%_]/g, (m) => `\\${m}`);
      const padrao = `%${seguro}%`;
      const inicio = `${seguro}%`;
      const rs = digitos ? await sql`SELECT id, nome, base, matricula FROM escola_colaboradores WHERE matricula LIKE ${inicio} ORDER BY matricula LIMIT 8` : await sql`SELECT id, nome, base, matricula FROM escola_colaboradores WHERE nome_norm LIKE ${padrao}
                    ORDER BY (nome_norm LIKE ${inicio}) DESC, nome_norm LIMIT 8`;
      return json7({ resultados: rs });
    }
    const colab = /^\/api\/colaboradores\/(\d+)$/.exec(rota)?.[1];
    if (colab && req.method === "GET") {
      const [c] = await sql`SELECT nome, matricula, prefixo, funcao, base, gerencia FROM escola_colaboradores WHERE id = ${Number(colab)}`;
      return c ? json7(c) : erro5("Colaborador não encontrado.", 404);
    }
    if (rota === "/api/avaliacao/info" && req.method === "GET") {
      const total = (await questoesAtivas()).length;
      return json7({ total, notaMinima: notaMinima(total), duracaoSeg: DURACAO_SEG });
    }
    if (rota === "/api/avaliacao/iniciar" && req.method === "POST")
      return await iniciar(req);
    if (rota === "/api/avaliacao/finalizar" && req.method === "POST")
      return await finalizar(req);
    if (rota === "/api/admin/login" && req.method === "POST") {
      const b = await req.json().catch(() => ({}));
      const r = await tentarLogin(ipDe(req), String(b.usuario ?? ""), String(b.senha ?? ""));
      if (!r.token)
        return erro5(r.erro ?? "Falha no login.", 401);
      return json7({ ok: true }, 200, { "Set-Cookie": cookieSessao(r.token, req) });
    }
    if (rota === "/api/admin/logout" && req.method === "POST")
      return json7({ ok: true }, 200, { "Set-Cookie": cookieLimpo });
    if (rota === "/api/admin/sessao")
      return json7({ autenticado: !!await sessaoDe(req) });
    if (rota.startsWith("/api/admin/")) {
      const eu = await sessaoDe(req);
      if (!eu)
        return erro5("Não autorizado.", 401);
      if (rota === "/api/admin/senha" && req.method === "POST") {
        const b = await req.json().catch(() => ({}));
        const e = await alterarSenha(ipDe(req), eu.usuario, String(b.atual ?? ""), String(b.nova ?? ""));
        return e ? erro5(e) : json7({ ok: true });
      }
      if (eu.trocarSenha)
        return json7({ erro: "É preciso definir uma nova senha antes de continuar.", trocarSenha: true }, 403);
      if (/^\/api\/admin\/(colaboradores|questoes|usuarios|respostas)(\/|$)/.test(rota) && !eu.admin)
        return erro5("Acesso restrito aos administradores.", 403);
      const usr = await rotasUsuarios(req, rota, eu);
      if (usr)
        return usr;
      const resp = await rotasRespostas(req, rota);
      if (resp)
        return resp;
      const mapa = await rotasMapa(req, rota);
      if (mapa)
        return mapa;
      const ins = await rotasInsights(req, rota);
      if (ins)
        return ins;
      const colab = await rotasColaboradores(req, rota);
      if (colab)
        return colab;
      const quest = await rotasQuestoes(req, rota);
      if (quest)
        return quest;
      if (rota === "/api/admin/registros") {
        const questoes = (await listarQuestoes()).map((q, i) => ({ id: q.id, numero: i + 1, enunciado: q.enunciado, ativa: q.ativa }));
        return json7({ registros: await registros(), questoes, notaMinima: NOTA_MINIMA, eu: { nome: eu.nome, usuario: eu.usuario, admin: eu.admin, desenvolvedor: eu.desenvolvedor } });
      }
      const id = /^\/api\/admin\/foto\/([\w-]+)$/.exec(rota)?.[1];
      if (id) {
        const [f] = await sql`SELECT dados FROM escola_fotos WHERE id = ${id}`;
        if (!f)
          return erro5("Foto não encontrada.", 404);
        return new Response(Buffer.from(f.dados, "base64"), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" } });
      }
    }
    return erro5("Rota não encontrada.", 404);
  } catch (e) {
    console.error(e);
    return erro5("Erro interno. Tente novamente.", 500);
  }
}

// server/vercel.ts
var vercel_default = {
  fetch(req) {
    const u = new URL(req.url);
    const p = u.searchParams.get("p");
    if (p) {
      u.pathname = `/api/${p.replace(/^\/+/, "")}`;
      u.searchParams.delete("p");
    }
    return api(new Request(u, req));
  }
};
export {
  vercel_default as default
};
