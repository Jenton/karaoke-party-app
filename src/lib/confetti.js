import confetti from 'canvas-confetti'

const colors = ['#f43f5e', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#facc15']

export function confettiBurst() {
  confetti({ particleCount: 140, spread: 90, origin: { y: 0.6 }, colors })
}

export function confettiCannons() {
  const end = Date.now() + 2500
  const frame = () => {
    confetti({ particleCount: 6, angle: 60, spread: 60, origin: { x: 0, y: 0.8 }, colors })
    confetti({ particleCount: 6, angle: 120, spread: 60, origin: { x: 1, y: 0.8 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}
