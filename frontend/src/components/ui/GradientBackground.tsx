'use client'

export default function GradientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-orange/20 rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-orange-dark/15 rounded-full blur-3xl"
        style={{
          animation: 'float 20s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-0 left-1/3 w-[350px] h-[350px] bg-orange/10 rounded-full blur-3xl"
        style={{
          animation: 'float 15s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-orange-dark/20 rounded-full blur-3xl"
        style={{
          animation: 'float 25s ease-in-out infinite',
        }}
      />

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(50px, 50px);
          }
        }
      `}</style>
    </div>
  )
}
