const button = document.getElementById("attendanceButton");
const countdownText = document.getElementById("countdownText");
const attendanceHint = document.getElementById("attendanceHint");
const attendanceUrlBase = "https://app.boardingware.com/nfc/tag?v=5&u=04E3C43A561490&c=";
const attendanceCodeBase = 0x000978;
const attendanceCodeStep = 0x5;
const asmCarryStep = 0x50;
const asmDurationMinutes = 30;
const storagePrefix = "asmAttendance";

function formatCode(code) {
  return code.toString(16).toUpperCase().padStart(6, "0");
}

function getAsmKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getStorageKey(name, asmKey) {
  return `${storagePrefix}:${name}:${asmKey}`;
}

function getAsmStart(now) {
  const start = new Date(now);
  start.setHours(9, 55, 0, 0);
  return start;
}

function getAsmEnd(start) {
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + asmDurationMinutes);
  return end;
}

function getPreviousAsmStart(start) {
  const previous = new Date(start);
  previous.setDate(previous.getDate() - 7);
  return previous;
}

function getStoredCode(name, asmKey) {
  const value = localStorage.getItem(getStorageKey(name, asmKey));
  return value === null ? null : Number.parseInt(value, 10);
}

function storeCode(name, asmKey, code) {
  localStorage.setItem(getStorageKey(name, asmKey), String(code));
}

function getAsmStartCode(start) {
  const asmKey = getAsmKey(start);
  const storedStartCode = getStoredCode("startCode", asmKey);

  if (storedStartCode !== null) {
    return storedStartCode;
  }

  const previousAsmKey = getAsmKey(getPreviousAsmStart(start));
  const previousEndCode = getStoredCode("endCode", previousAsmKey);
  const startCode = previousEndCode === null
    ? attendanceCodeBase
    : previousEndCode + asmCarryStep;

  storeCode("startCode", asmKey, startCode);
  return startCode;
}

function getAsmEndCode(start) {
  return getAsmStartCode(start) + ((asmDurationMinutes - 1) * attendanceCodeStep);
}

function saveCompletedAsmCode(now) {
  const recentAsmStart = getMostRecentTuesdayAt955(now);
  const recentAsmEnd = getAsmEnd(recentAsmStart);

  if (now < recentAsmEnd) {
    return;
  }

  const recentAsmKey = getAsmKey(recentAsmStart);

  if (localStorage.getItem(getStorageKey("endCode", recentAsmKey)) !== null) {
    return;
  }

  storeCode("endCode", recentAsmKey, getAsmEndCode(recentAsmStart));
}

function getAttendanceCode(now) {
  const asmStart = getAsmStart(now);
  const minutesSinceStart = Math.floor((now - asmStart) / (60 * 1000));
  const currentCode = getAsmStartCode(asmStart) + (minutesSinceStart * attendanceCodeStep);
  return formatCode(currentCode);
}

function isAttendanceWindow(now) {
  const day = now.getDay();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  const isTuesday = day === 2;
  const afterStart =
    hours > 9 || (hours === 9 && minutes >= 55);
  const beforeEnd =
    hours < 10 || (hours === 10 && minutes < 25);

  return isTuesday && afterStart && beforeEnd;
}

button.addEventListener("click", () => {
  const now = new Date();

  if (!isAttendanceWindow(now)) {
    countdownText.textContent = "Scanning opens Tuesday at 9:55 AM";
    return;
  }

  window.location.href = `${attendanceUrlBase}${getAttendanceCode(now)}`;
});

function getNextTuesdayAt955(now) {
  const next = new Date(now);
  const currentDay = now.getDay(); // Sunday=0, Tuesday=2
  const daysUntilTuesday = (2 - currentDay + 7) % 7;

  next.setHours(9, 55, 0, 0);
  next.setDate(now.getDate() + daysUntilTuesday);

  if (daysUntilTuesday === 0 && now >= next) {
    next.setDate(next.getDate() + 7);
  }

  return next;
}

function getMostRecentTuesdayAt955(now) {
  const recent = new Date(now);
  const currentDay = now.getDay();
  const daysSinceTuesday = (currentDay - 2 + 7) % 7;

  recent.setHours(9, 55, 0, 0);
  recent.setDate(now.getDate() - daysSinceTuesday);

  if (daysSinceTuesday === 0 && now < recent) {
    recent.setDate(recent.getDate() - 7);
  }

  return recent;
}

function updateCountdown() {
  const now = new Date();
  saveCompletedAsmCode(now);

  if (isAttendanceWindow(now)) {
    countdownText.textContent = "Ready to scan";
    attendanceHint.textContent = `The attendance button is active right now. Current code: ${getAttendanceCode(now)}.`;
    button.disabled = false;
    return;
  }

  const nextASM = getNextTuesdayAt955(now);
  const diffMs = nextASM - now;

  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / (60 * 60 * 24));
  const hoursLeft = Math.floor((totalSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutesLeft = Math.floor((totalSeconds % (60 * 60)) / 60);
  const secondsLeft = totalSeconds % 60;

  countdownText.textContent =
    `Next ASM in ${days}d ${String(hoursLeft).padStart(2, "0")}h ` +
    `${String(minutesLeft).padStart(2, "0")}m ` +
    `${String(secondsLeft).padStart(2, "0")}s`;
  attendanceHint.textContent = `The attendance button unlocks during the Tuesday ASM window. Next start code: ${formatCode(getAsmStartCode(nextASM))}.`;
  button.disabled = true;
}

updateCountdown();
setInterval(updateCountdown, 1000);
