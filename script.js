const button = document.getElementById("attendanceButton");
const countdownText = document.getElementById("countdownText");
const attendanceHint = document.getElementById("attendanceHint");
const attendanceUrl = "https://app.boardingware.com/nfc/tag?v=5&u=04E3C43A561490&c=000978";

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
  if (!isAttendanceWindow(new Date())) {
    countdownText.textContent = "Scanning opens Tuesday at 9:55 AM";
    return;
  }

  window.location.href = attendanceUrl;
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

function updateCountdown() {
  const now = new Date();

  if (isAttendanceWindow(now)) {
    countdownText.textContent = "Ready to scan";
    attendanceHint.textContent = "The attendance button is active right now.";
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
  attendanceHint.textContent = "The attendance button unlocks during the Tuesday ASM window.";
  button.disabled = true;
}

updateCountdown();
setInterval(updateCountdown, 1000);
